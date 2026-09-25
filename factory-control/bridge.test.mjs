import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { FactoryHost } from "./bridge.mjs";
import { CodexRuntime, codexArguments, prepareWorkspace, readJSON, writeJSON } from "./runtime.mjs";
import { spawnSync } from "node:child_process";

function fixture(context) {
  const directory = mkdtempSync(path.join(tmpdir(), "factory-host-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, "project");
  mkdirSync(root);
  const receipts = new Map();
  const launches = [];
  const runtime = {
    jobsDirectory: (id) => path.join(directory, "jobs", id),
    recover: (project) => receipts.get(project.id) ?? [],
    stopPlanning: () => {},
    plan: async () => ({ task: { issueId: "TASK-1", title: "One task", instructions: "Implement one task", ownedFiles: ["README.md"] }, reason: "Ready" }),
    launch: (project, task) => {
      const run = { id: `run-${project.id}`, issueId: task.issueId, title: task.title, status: "running" };
      launches.push(run);
      receipts.set(project.id, [run]);
      return run;
    },
  };
  const stateDirectory = path.join(directory, "state");
  const host = new FactoryHost({ stateDirectory, runtime });
  return { directory, root, runtime, host, stateDirectory, receipts, launches };
}

test("added projects persist Off and reject overlapping roots", (context) => {
  const { host, root, stateDirectory } = fixture(context);
  host.add(root, "Finish the documented task");
  const nested = path.join(root, "nested");
  mkdirSync(nested);
  assert.throws(() => host.add(nested, "Another task"), /overlaps/);
  const saved = readJSON(path.join(stateDirectory, "projects.json"));
  assert.equal(saved.projects.length, 1);
  assert.equal(saved.projects[0].enabled, false);
});

test("switching one project Off leaves another project eligible", async (context) => {
  const { host, root, directory, launches } = fixture(context);
  const secondRoot = path.join(directory, "second");
  mkdirSync(secondRoot);
  const first = host.add(root, "First authorized task");
  const second = host.add(secondRoot, "Second authorized task");
  host.requireProject(first).engine.setEnabled(true);
  host.requireProject(second).engine.setEnabled(true);
  host.toggle(first, false);
  await host.pump();
  assert.equal(launches.length, 1);
  assert.equal(launches[0].id, `run-${second}`);
  assert.equal(host.snapshot().projects[0].enabled, false);
});

test("restarting reloads Off and preserves a live worker receipt", async (context) => {
  const { host, root, stateDirectory, runtime, launches } = fixture(context);
  const id = host.add(root, "Finish the documented task");
  host.requireProject(id).engine.setEnabled(true);
  await host.pump();
  const restarted = new FactoryHost({ stateDirectory, runtime });
  assert.equal(restarted.snapshot().projects[0].enabled, false);
  assert.equal(restarted.snapshot().projects[0].runs[0].status, "running");
  restarted.requireProject(id).engine.setEnabled(true);
  await restarted.pump();
  assert.equal(launches.length, 1);
});

test("Off workers finish and active projects cannot be removed", async (context) => {
  const { host, root, receipts, launches } = fixture(context);
  const id = host.add(root, "Finish the documented task");
  host.requireProject(id).engine.setEnabled(true);
  await host.pump();
  host.toggle(id, false);
  assert.throws(() => host.remove(id), /finish/);
  receipts.set(id, [{ ...launches[0], status: "completed", message: "Evidence saved" }]);
  await host.pump();
  assert.equal(host.snapshot().projects[0].runs[0].status, "completed");
  assert.equal(launches.length, 1);
  host.remove(id);
  assert.equal(host.snapshot().projects.length, 0);
});

test("global worker capacity is two, even across many projects", async (context) => {
  const { host, directory, launches } = fixture(context);
  for (let index = 0; index < 3; index += 1) {
    const root = path.join(directory, `project-${index}`);
    mkdirSync(root);
    const id = host.add(root, "Finish one bounded task");
    host.requireProject(id).engine.setEnabled(true);
  }
  await host.pump();
  await host.pump();
  await host.pump();
  assert.equal(launches.length, 2);
});

test("shutdown discards a late coordinator assignment", async (context) => {
  const { host, root, runtime, launches } = fixture(context);
  let resolvePlan;
  runtime.plan = () => new Promise((resolve) => { resolvePlan = resolve; });
  const id = host.add(root, "Finish one bounded task");
  host.requireProject(id).engine.setEnabled(true);
  const planning = host.pump();
  host.stop();
  resolvePlan({ task: { issueId: "TASK-2", title: "Late task", instructions: "Must not launch", ownedFiles: ["file.txt"] } });
  await planning;
  assert.equal(launches.length, 0);
  assert.equal(host.snapshot().projects[0].enabled, false);
});

test("a durable receipt wins over an interrupted engine reservation", (context) => {
  const { root, stateDirectory, runtime, receipts } = fixture(context);
  const project = { id: "project-id", name: "project", path: root, goal: "Do a task", enabled: true,
    runs: [{ id: "reservation-id", issueId: "TASK-1", title: "Task", status: "launching" }] };
  writeJSON(path.join(stateDirectory, "projects.json"), { projects: [project] });
  receipts.set(project.id, [{ id: "actual-run", issueId: "TASK-1", title: "Task", status: "running" }]);
  const restored = new FactoryHost({ stateDirectory, runtime });
  assert.equal(restored.snapshot().projects[0].runs.length, 1);
  assert.equal(restored.snapshot().projects[0].runs[0].id, "actual-run");
});

test("a surviving Codex child still blocks dispatch after its wrapper dies", (context) => {
  const { stateDirectory } = fixture(context);
  const runtime = new CodexRuntime({ stateDirectory });
  const job = path.join(runtime.jobsDirectory("project-id"), "run-id");
  writeJSON(path.join(job, "run.json"), { id: "run-id", issueId: "TASK-1", status: "running", pid: 99999999 });
  writeJSON(path.join(job, "child.json"), { pid: process.pid });
  assert.equal(runtime.recover({ id: "project-id" })[0].status, "running");
});

test("worker invocation does not combine mutually exclusive CLI approval flags", () => {
  const args = codexArguments({ directory: "/tmp/project", schema: "/tmp/schema.json", output: "/tmp/result.json", worker: true });
  assert.ok(args.includes("--approve-for-me"));
  assert.ok(!args.includes("--sandbox"));
  assert.deepEqual(args.slice(-1), ["-"]);
});

test("a nested Git folder cannot expand a worker's write boundary", (context) => {
  const { root, directory } = fixture(context);
  const result = spawnSync("git", ["init", "--quiet", root]);
  assert.equal(result.status, 0);
  const nested = path.join(root, "package");
  mkdirSync(nested);
  assert.throws(() => prepareWorkspace({ path: nested }, { issueId: "TEST-1" }, path.join(directory, "job")), /repository root/);
});

test("runner never starts Codex without a durable handoff marker", (context) => {
  const { directory } = fixture(context);
  const job = path.join(directory, "job");
  mkdirSync(job);
  writeJSON(path.join(job, "dispatch.json"), { pid: -1 });
  const runner = new URL("./job-runner.mjs", import.meta.url);
  const result = spawnSync(process.execPath, [runner.pathname, job], { encoding: "utf8" });
  assert.equal(result.status, 1);
  const receipt = readJSON(path.join(job, "result.json"));
  assert.equal(receipt.status, "failed");
  assert.match(receipt.message, /No Codex task started/);
});
