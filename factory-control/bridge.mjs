import { existsSync, fstatSync, mkdirSync, realpathSync, statSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { FactoryEngine } from "./engine.mjs";
import { CodexRuntime, findCodex, readJSON, writeJSON } from "./runtime.mjs";

const defaultDirectory = path.join(homedir(), "Library/Application Support/Factory Control");
const pollInterval = 5 * 60 * 1000;

function isActive(run) {
  return run.status === "running" || run.status === "launching";
}

// One host coordinates independent engines; two workers total keeps a laptop responsive.
export class FactoryHost {
  constructor({ stateDirectory = defaultDirectory, runtime, emit = () => {}, now = Date.now } = {}) {
    this.directory = stateDirectory;
    this.filename = path.join(stateDirectory, "projects.json");
    this.runtime = runtime ?? new CodexRuntime({ stateDirectory });
    this.emit = emit;
    this.now = now;
    this.projects = new Map();
    this.planning = false;
    this.closing = false;
    this.cursor = 0;
    mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });

    if (existsSync(this.filename)) {
      const saved = readJSON(this.filename);
      if (!Array.isArray(saved.projects)) {
        throw new Error("Saved project data is invalid. Restore projects.json from a backup; it was not overwritten.");
      }
      for (const project of saved.projects) {
        const recovered = this.runtime.recover(project);
        const runsByIssue = new Map();
        for (const run of project.runs ?? []) {
          if (isActive(run)) {
            run.status = "interrupted";
            run.message = "Dispatch interrupted before a worker receipt was saved. No automatic retry.";
          }
          runsByIssue.set(run.issueId, run);
        }
        for (const run of recovered) {
          runsByIssue.set(run.issueId, run);
        }
        this.attach(project, [...runsByIssue.values()]);
      }
    }
    this.persist();
  }

  attach(project, initialRuns = []) {
    const record = { id: project.id, name: project.name, path: project.path, goal: project.goal, nextCheck: 0 };
    record.engine = new FactoryEngine({
      initialRuns,
      plan: (context) => this.runtime.plan(record, context),
      launch: (task) => this.runtime.launch(record, task),
      save: () => { this.persist(); this.publish(); },
    });
    this.projects.set(record.id, record);
    return record;
  }

  snapshot() {
    const projects = [];
    for (const project of this.projects.values()) {
      projects.push({
        id: project.id, name: project.name, path: project.path, goal: project.goal,
        logsPath: this.runtime.jobsDirectory(project.id),
        ...project.engine.snapshot(),
      });
    }
    return { type: "state", projects };
  }

  persist() {
    writeJSON(this.filename, this.snapshot());
  }

  publish(extra = {}) {
    this.emit({ ...this.snapshot(), ...extra });
  }

  add(projectPath, goal) {
    if (typeof projectPath !== "string" || !path.isAbsolute(projectPath)) {
      throw new Error("Choose an existing project folder.");
    }
    if (typeof goal !== "string" || goal.trim().length < 5 || goal.length > 8000) {
      throw new Error("Describe the work this project's factory is allowed to do.");
    }
    const resolved = realpathSync(projectPath);
    if (!statSync(resolved).isDirectory()) {
      throw new Error("Choose a folder, not a file.");
    }
    for (const project of this.projects.values()) {
      const overlaps = resolved === project.path || resolved.startsWith(`${project.path}${path.sep}`) || project.path.startsWith(`${resolved}${path.sep}`);
      if (overlaps) {
        throw new Error("This folder overlaps an existing project. Add each project only once.");
      }
    }
    const project = { id: randomUUID(), name: path.basename(resolved), path: resolved, goal: goal.trim() };
    this.attach(project);
    this.persist();
    return project.id;
  }

  toggle(projectId, enabled) {
    const project = this.requireProject(projectId);
    if (typeof enabled !== "boolean") {
      throw new Error("The project switch must be On or Off.");
    }
    if (enabled) {
      if (this.closing) {
        throw new Error("Factory Control is shutting down.");
      }
      findCodex();
      if (!existsSync(project.path)) {
        throw new Error("The project folder is missing. Restore it before turning On.");
      }
    }
    project.engine.setEnabled(enabled);
    project.nextCheck = 0;
  }

  remove(projectId) {
    const project = this.requireProject(projectId);
    const state = project.engine.snapshot();
    if (state.enabled || state.planning || state.runs.some(isActive)) {
      throw new Error("Turn this project Off and let its current agents finish before removing it.");
    }
    this.projects.delete(projectId);
    this.persist();
  }

  requireProject(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error("That project is no longer in Factory Control.");
    }
    return project;
  }

  reconcile() {
    for (const project of this.projects.values()) {
      const recovered = this.runtime.recover(project);
      for (const receipt of recovered) {
        const existing = project.engine.snapshot().runs.find((run) => run.id === receipt.id);
        if (existing && isActive(existing) && !isActive(receipt)) {
          project.engine.finishRun(receipt.id, receipt);
          project.nextCheck = 0;
        }
      }
    }
  }

  async pump() {
    if (this.closing || this.planning) {
      return;
    }
    try {
      this.reconcile();
      const records = [...this.projects.values()];
      const runningCount = records.flatMap((project) => project.engine.snapshot().runs).filter(isActive).length;
      if (runningCount >= 2 || records.length === 0) {
        return;
      }
      for (let offset = 0; offset < records.length; offset += 1) {
        const index = (this.cursor + offset) % records.length;
        const project = records[index];
        const state = project.engine.snapshot();
        if (!state.enabled || state.runs.some(isActive) || this.now() < project.nextCheck) {
          continue;
        }
        this.cursor = (index + 1) % records.length;
        this.planning = true;
        try {
          await project.engine.tick();
        } finally {
          project.nextCheck = this.now() + pollInterval;
          this.planning = false;
          this.publish();
        }
        break;
      }
    } catch (error) {
      this.stop();
      this.publish({ error: `Dispatch stopped: ${error.message}` });
    }
  }

  stop() {
    this.closing = true;
    for (const project of this.projects.values()) {
      project.engine.setEnabled(false);
    }
    this.runtime.stopPlanning();
  }

  command(message) {
    switch (message.method) {
      case "add":
        this.add(message.path, message.goal);
        break;
      case "toggle":
        this.toggle(message.projectId, message.enabled);
        break;
      case "remove":
        this.remove(message.projectId);
        break;
      case "shutdown":
        this.stop();
        break;
      case "status":
        break;
      default:
        throw new Error("Unknown factory command.");
    }
    this.publish({ id: message.id });
  }
}

// The native launcher holds flock across exec. Kernel process exit releases it;
// stale lock files are never deleted or used as a PID-based ownership decision.
function requireNativeLock(directory) {
  const descriptor = Number(process.env.FACTORY_LOCK_FD);
  if (!Number.isSafeInteger(descriptor) || descriptor < 3) {
    throw new Error("Start Factory Control through its native app so dispatch has an exclusive process lock.");
  }
  const opened = fstatSync(descriptor);
  const expected = statSync(path.join(directory, "dispatcher.lock"));
  if (!opened.isFile() || opened.ino !== expected.ino || opened.dev !== expected.dev) {
    throw new Error("The factory dispatcher does not hold its expected native lock file.");
  }
}

function startBridge() {
  const directory = process.env.FACTORY_STATE_DIRECTORY ?? defaultDirectory;
  requireNativeLock(directory);
  const emit = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
  const host = new FactoryHost({ stateDirectory: directory, emit });
  const input = createInterface({ input: process.stdin });
  const timer = setInterval(() => { void host.pump(); }, 2000);
  let stopping = false;
  const shutdown = () => {
    if (stopping) {
      return;
    }
    stopping = true;
    clearInterval(timer);
    host.stop();
    input.close();
    process.exitCode = 0;
  };
  input.on("line", (line) => {
    let message;
    try {
      message = JSON.parse(line);
      host.command(message);
      if (message.method === "shutdown") {
        shutdown();
      } else {
        void host.pump();
      }
    } catch (error) {
      emit({ ...host.snapshot(), id: message?.id, error: error.message });
    }
  });
  input.on("close", shutdown);
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  host.publish();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    startBridge();
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ type: "state", projects: [], error: error.message })}\n`);
    console.error(error.message);
    process.exitCode = 1;
  }
}
