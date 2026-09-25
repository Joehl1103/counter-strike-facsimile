import assert from "node:assert/strict";
import test from "node:test";

import { FactoryEngine } from "./engine.mjs";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function validTask(issueId = "studio.task_9") {
  return {
    issueId,
    title: "Implement the bounded task",
    instructions: "Make the scoped change and return evidence.",
    ownedFiles: ["factory-control/engine.mjs"],
  };
}

function createEngine({ plan, launch = () => ({ id: "run-1" }), save = () => {}, initialRuns = [] } = {}) {
  return new FactoryEngine({
    plan: plan ?? (async () => ({ task: validTask(), reason: "One task is ready." })),
    launch,
    save,
    initialRuns,
    clock: () => "2026-09-24T12:00:00.000Z",
  });
}

test("engine starts Off and a restored running worker blocks new planning", async () => {
  let plannerCalls = 0;
  const engine = createEngine({
    initialRuns: [{ id: "restored-run", issueId: "project-B.12", title: "Existing work", status: "running" }],
    plan: async () => {
      plannerCalls += 1;
      return { task: validTask() };
    },
  });

  assert.equal(engine.snapshot().enabled, false);
  await engine.tick();
  assert.equal(plannerCalls, 0);

  engine.setEnabled(true);
  await engine.tick();
  assert.equal(plannerCalls, 0);
  assert.equal(engine.snapshot().runs[0].status, "running");
});

test("Off during planning rejects a late assignment and leaves the worker unlaunched", async () => {
  const selection = deferred();
  let launchCalls = 0;
  const engine = createEngine({
    plan: () => selection.promise,
    launch: () => {
      launchCalls += 1;
      return { id: "unexpected-run" };
    },
  });

  engine.setEnabled(true);
  const tick = engine.tick();
  engine.setEnabled(false);
  selection.resolve({ task: validTask() });
  await tick;

  assert.equal(engine.snapshot().enabled, false);
  assert.equal(launchCalls, 0);
  assert.equal(engine.snapshot().runs.length, 0);
});

test("rapid Off then On does not revive a plan from the earlier On period", async () => {
  const firstSelection = deferred();
  let plannerCalls = 0;
  let launchCalls = 0;
  const engine = createEngine({
    plan: () => {
      plannerCalls += 1;
      return firstSelection.promise;
    },
    launch: () => {
      launchCalls += 1;
      return { id: "run-1" };
    },
  });

  engine.setEnabled(true);
  const oldTick = engine.tick();
  engine.setEnabled(false);
  engine.setEnabled(true);
  firstSelection.resolve({ task: validTask() });
  await oldTick;

  assert.equal(plannerCalls, 1);
  assert.equal(launchCalls, 0);
  assert.equal(engine.snapshot().enabled, true);
  assert.equal(engine.snapshot().runs.length, 0);
});

test("a rejection from a stale planner cannot turn a newer On period Off", async () => {
  const oldSelection = deferred();
  const engine = createEngine({ plan: () => oldSelection.promise });

  engine.setEnabled(true);
  const oldTick = engine.tick();
  engine.setEnabled(false);
  engine.setEnabled(true);
  oldSelection.reject(new Error("stale coordinator failure"));
  await oldTick;

  assert.equal(engine.snapshot().enabled, true);
  assert.equal(engine.snapshot().planning, false);
  assert.equal(engine.snapshot().runs.length, 0);
});

test("repeated On and overlapping ticks share one planner request", async () => {
  const selection = deferred();
  let plannerCalls = 0;
  let launchCalls = 0;
  const engine = createEngine({
    plan: () => {
      plannerCalls += 1;
      return selection.promise;
    },
    launch: () => {
      launchCalls += 1;
      return { id: "run-1" };
    },
  });

  engine.setEnabled(true);
  engine.setEnabled(true);
  const firstTick = engine.tick();
  const secondTick = engine.tick();
  assert.equal(plannerCalls, 1);

  selection.resolve({ task: validTask() });
  await Promise.all([firstTick, secondTick]);

  assert.equal(launchCalls, 1);
  assert.equal(engine.snapshot().runs[0].status, "running");
});

test("a worker can finish while Off without turning dispatch back on", async () => {
  const engine = createEngine();
  engine.setEnabled(true);
  await engine.tick();
  engine.setEnabled(false);

  const result = await engine.finishRun("run-1", { status: "completed", message: "Evidence saved." });

  assert.equal(result.enabled, false);
  assert.equal(result.runs[0].status, "completed");
  assert.equal(result.runs[0].message, "Evidence saved.");
});

test("planner failure turns dispatch Off and retains a useful error", async () => {
  const engine = createEngine({
    plan: async () => {
      throw new Error("Linear is unavailable");
    },
  });

  engine.setEnabled(true);
  const result = await engine.tick();

  assert.equal(result.enabled, false);
  assert.match(result.message, /Linear is unavailable/);
});

test("planner cannot schedule an issue that already has a recorded run", async () => {
  const engine = createEngine({
    initialRuns: [{ id: "old-run", issueId: "clientA-170", title: "Earlier attempt", status: "failed" }],
    plan: async () => ({ task: validTask("clientA-170") }),
  });

  engine.setEnabled(true);
  const result = await engine.tick();

  assert.equal(result.enabled, false);
  assert.equal(result.runs.length, 1);
  assert.match(result.message, /already has a recorded run/);
});

test("issue reservation is saved before launch", async () => {
  const events = [];
  const engine = createEngine({
    save: (snapshot) => {
      events.push(`save:${snapshot.runs[0]?.status ?? "empty"}`);
    },
    launch: () => {
      events.push("launch");
      return { id: "run-1" };
    },
  });

  engine.setEnabled(true);
  await engine.tick();

  const reservationSaveIndex = events.indexOf("save:launching");
  const launchIndex = events.indexOf("launch");
  assert.notEqual(reservationSaveIndex, -1);
  assert.ok(reservationSaveIndex < launchIndex);
});

test("invalid planner output and state-save failures fail closed", async (context) => {
  await context.test("invalid task", async () => {
    const engine = createEngine({ plan: async () => ({ task: { ...validTask(), issueId: "task with spaces" } }) });
    engine.setEnabled(true);
    const result = await engine.tick();

    assert.equal(result.enabled, false);
    assert.match(result.message, /invalid issue ID/);
  });

  await context.test("owned path cannot escape the project", async () => {
    const engine = createEngine({
      plan: async () => ({ task: { ...validTask(), ownedFiles: ["../private-file"] } }),
    });
    engine.setEnabled(true);
    const result = await engine.tick();

    assert.equal(result.enabled, false);
    assert.match(result.message, /outside the project/);
  });

  await context.test("save error", async () => {
    const engine = createEngine({ save: () => { throw new Error("disk full"); } });
    engine.setEnabled(true);

    assert.equal(engine.snapshot().enabled, false);
    assert.match(engine.snapshot().message, /disk full/);
    await engine.tick();
    assert.equal(engine.snapshot().runs.length, 0);
  });
});

test("run IDs stay unique and snapshots do not expose nested run state", async (context) => {
  await context.test("duplicate launcher ID fails closed", async () => {
    const engine = createEngine({
      initialRuns: [{ id: "same-run", issueId: "project.1", title: "Past work", status: "failed" }],
      launch: () => ({ id: "same-run" }),
    });
    engine.setEnabled(true);
    const result = await engine.tick();

    assert.equal(result.enabled, false);
    assert.equal(result.runs.length, 2);
    assert.equal(result.runs[1].status, "failed");
    assert.match(result.message, /duplicate run ID/);
  });

  await context.test("ambiguous restored IDs cannot finish the wrong run", () => {
    const engine = createEngine({
      initialRuns: [
        { id: "reused-id", issueId: "one-1", title: "First", status: "running" },
        { id: "reused-id", issueId: "two-1", title: "Second", status: "running" },
      ],
    });

    assert.throws(
      () => engine.finishRun("reused-id", { status: "completed" }),
      /Run ID is ambiguous/,
    );
  });

  await context.test("nested snapshot values are copied", () => {
    const engine = createEngine({
      initialRuns: [{ id: "restored-run", issueId: "project.2", details: { files: ["src/a.mjs"] }, status: "failed" }],
    });
    const snapshot = engine.snapshot();
    snapshot.runs[0].details.files.push("src/b.mjs");

    assert.deepEqual(engine.snapshot().runs[0].details.files, ["src/a.mjs"]);
  });
});
