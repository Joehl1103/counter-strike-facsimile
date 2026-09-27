import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const source = fileURLToPath(new URL("./mac/FactoryLock.c", import.meta.url));

function compileHelper(context) {
  const directory = mkdtempSync(path.join(tmpdir(), "factory-lock-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const helper = path.join(directory, "factory-lock");
  const compiled = spawnSync("cc", ["-Wall", "-Wextra", "-Werror", source, "-o", helper], { encoding: "utf8" });
  assert.equal(compiled.status, 0, compiled.stderr);
  return { directory, helper, lock: path.join(directory, "dispatcher.lock") };
}

test("native lock survives exec, rejects a second dispatcher and releases after a crash", { timeout: 10000 }, async (context) => {
  const { directory, helper, lock } = compileHelper(context);
  const held = path.join(directory, "hold.mjs");
  writeFileSync(held, 'import { fstatSync } from "node:fs"; fstatSync(Number(process.env.FACTORY_LOCK_FD)); console.log("locked"); setInterval(() => {}, 1000);\n');
  const first = spawn(helper, [lock, process.execPath, held], { stdio: ["ignore", "pipe", "pipe"] });
  context.after(() => { first.kill("SIGKILL"); });
  const ready = await once(first.stdout, "data");
  assert.match(ready[0].toString(), /locked/);

  const second = spawnSync(helper, [lock, process.execPath, held], { encoding: "utf8", timeout: 2000 });
  assert.equal(second.status, 1);
  assert.match(second.stdout, /already running/i);

  const exited = once(first, "exit");
  first.kill("SIGKILL");
  await exited;
  const completed = path.join(directory, "complete.mjs");
  writeFileSync(completed, 'console.log("restarted");\n');
  const restarted = spawnSync(helper, [lock, process.execPath, completed], { encoding: "utf8", timeout: 2000 });
  assert.equal(restarted.status, 0, restarted.stderr);
  assert.match(restarted.stdout, /restarted/);
});

test("packaged bridge accepts only its matching inherited native lock", { timeout: 10000 }, (context) => {
  const { directory, helper, lock } = compileHelper(context);
  const bridge = fileURLToPath(new URL("./bridge.mjs", import.meta.url));
  const environment = { ...process.env, FACTORY_STATE_DIRECTORY: directory };
  const direct = spawnSync(process.execPath, [bridge], { encoding: "utf8", env: { ...environment, FACTORY_LOCK_FD: "" } });
  assert.equal(direct.status, 1);
  assert.match(direct.stdout, /exclusive process lock/);

  const launched = spawnSync(helper, [lock, process.execPath, bridge], {
    encoding: "utf8", env: environment,
    input: '{"id":"check","method":"status"}\n{"id":"quit","method":"shutdown"}\n',
    timeout: 5000,
  });
  assert.equal(launched.status, 0, launched.stderr);
  const states = launched.stdout.trim().split("\n").map((line) => JSON.parse(line));
  assert.ok(states.some((state) => state.id === "check" && state.projects.length === 0));
  assert.ok(states.some((state) => state.id === "quit"));
});
