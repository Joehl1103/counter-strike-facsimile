# Factory Control

A Mac menu-bar utility for local project factories. Add a project folder and a
short work instruction, then switch that project On when you want agents working.
Every added project starts Off.

**On:** a read-only Codex coordinator reads the project's instructions and current
task tracker, chooses one ready assignment and dispatches a fresh worker. It checks
again when work finishes, or every five minutes when no task is ready.

**Off:** no more assignments are dispatched, including decisions still being
prepared. Already-dispatched workers finish. The menu app can be closed while a
worker finishes; reopening restores projects Off and recovers local job receipts.

One worker runs per project, with at most two workers across all projects. Failed,
blocked and previously attempted task IDs are not automatically retried. Worker
reports are evidence, not project acceptance. Existing project instructions and
review/publication permissions still apply.

## Install and run

Requires an Apple Silicon Mac with macOS 14+, Xcode command-line tools to build,
Node 22.14+ and a signed-in Codex CLI. The app uses your existing Codex account and
connected tools. Coordinator sessions use your configured model; bounded workers
use `gpt-5.6-luna`, present in the inspected local model catalog.

```sh
bash factory-control/build-mac.sh
open 'factory-control/dist/Factory Control.app'
```

Copy the built app to your Applications folder to keep it. It has a menu-bar icon
and no Dock icon. It does not add itself to Login Items or turn projects On at login.
Agent work runs on your Mac while it is awake; this is not a hosted service.

Choose **Add Project**, select a folder and describe the authorized work. The app
rejects overlapping project roots so two projects cannot edit the same files.
For Git projects, choose the repository root rather than a nested folder.
Git projects receive a separate task branch/worktree based on their committed
current revision. Uncommitted working-tree changes are not copied into workers.
Other folders run a single worker directly in that folder. Existing worktrees are
retained for review; they are never deleted automatically.

Turn a project Off and wait for its agents to finish before removing it. Removing
a project removes its registration, not its source files, worktrees or evidence.
Re-adding a project creates a new registration; inspect old evidence before
retrying earlier work.

## Local data and failures

Registry and private agent receipts live in
`~/Library/Application Support/Factory Control/`. The menu's log action opens the
selected project's retained evidence. Treat logs as private: they can contain code
and task context. No HTTP server or public endpoint is created.

Missing runtime, sign-in, tracker access or invalid coordinator output produces an
error instead of simulated work. A failed worker retains its output. A worker lost
without a receipt is marked interrupted; its task is not silently retried. Turning
a switch On is authorization only for that project's saved instruction, subject
to its existing boundaries. The app does not bypass Codex sandboxing or project
review gates. Workers cannot start nested agents through Codex's multi-agent feature.

## Development checks

```sh
node --test factory-control/*.test.mjs
bash factory-control/build-mac.sh
```

The backend communicates with the native app through private JSON lines on its
standard input/output. `engine.mjs` implements the dispatch state machine;
`bridge.mjs` owns project registration and scheduling; `runtime.mjs` and
`job-runner.mjs` run Codex and retain crash-recovery receipts. Native UI is in `mac/`.
Tests exercise Off races, independent projects, capacity and restart recovery.
They do not establish game quality or acceptance for any registered project.
