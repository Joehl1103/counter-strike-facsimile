import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync } from "node:fs";
import path from "node:path";
import { codexArguments, prepareWorkspace, readJSON, runtimeEnvironment, workerPrompt, writeJSON } from "./runtime.mjs";

const jobDirectory = process.argv[2];

// This detached wrapper owns the completion receipt even if the menu app exits.
async function runJob() {
  const dispatchPath = path.join(jobDirectory, "dispatch.json");
  // A bridge crash before the handoff cannot leave an untracked coding worker.
  for (let attempt = 0; attempt < 50 && !existsSync(dispatchPath); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!existsSync(dispatchPath) || readJSON(dispatchPath).pid !== process.pid) {
    throw new Error("Worker launch was interrupted before its durable handoff. No Codex task started.");
  }
  const request = readJSON(path.join(jobDirectory, "request.json"));
  const workspace = prepareWorkspace(request.project, request.task, jobDirectory);
  const output = path.join(jobDirectory, "outcome.json");
  const events = openSync(path.join(jobDirectory, "events.jsonl"), "a", 0o600);
  const errors = openSync(path.join(jobDirectory, "stderr.log"), "a", 0o600);
  const argumentsList = codexArguments({ directory: workspace, schema: path.join(request.moduleDirectory, "worker-schema.json"), output, worker: true });
  try {
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(request.binary, argumentsList, { cwd: workspace, env: runtimeEnvironment(), stdio: ["pipe", events, errors] });
      writeJSON(path.join(jobDirectory, "child.json"), { pid: child.pid });
      child.once("error", reject);
      child.once("close", resolve);
      child.stdin.on("error", () => {});
      child.stdin.end(workerPrompt(request.project, request.task));
    });
    if (exitCode !== 0) {
      throw new Error(`Codex worker exited (${exitCode}). Its original logs are retained.`);
    }
    const result = readJSON(output);
    if (!["complete", "blocked"].includes(result.outcome) || typeof result.message !== "string") {
      throw new Error("Worker returned an invalid completion report.");
    }
    let status = "completed";
    if (result.outcome === "blocked") {
      status = "blocked";
    }
    writeJSON(path.join(jobDirectory, "result.json"), { status, message: result.message.slice(0, 4000), finishedAt: new Date().toISOString() });
  } finally {
    closeSync(events);
    closeSync(errors);
  }
}

runJob().catch((error) => {
  console.error(error.message);
  writeJSON(path.join(jobDirectory, "result.json"), { status: "failed", message: error.message, finishedAt: new Date().toISOString() });
  process.exitCode = 1;
});
