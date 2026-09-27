# JKH-171: trusted chunked review implementation plan

Scope: second part of JKH-171, per Joseph's supplied acceptance criteria; preserve
commits ea15bae and 5fd7c1b. Public delivery scaffold only. No network or push.
Linear issue/parent/dependency contents are unavailable offline.

1. Write real-git planner/packet tests and aggregate gate failure tests first.
2. Build deterministic git-object planning, bounded chunks, full lock diffs,
   digest verification, and nested plain-file HEAD packets from trusted base code.
3. Wire pending → plan → matrix reviewer → aggregate gate, retaining the relay,
   restricted reviewer, pinned actions, base validator, and exact status contract.
4. Document exclusions, overflow, activation on main, and runner-minute cost.
5. Run local tests, CI policy and YAML parsing; commit locally with JKH-171.

The gate regenerates the manifest from immutable git objects and compares its
SHA-256 digest with the plan job. Reports travel as separate chunk artifacts.
No candidate code, configuration, or symlink is executed or installed.

Local result: implemented planner/packet, matrix workflow and aggregate gate.
The 83 planner/gate tests pass. Full suite: 176 pass, three existing relay
loopback tests fail with sandbox `listen EPERM` on 127.0.0.1. CI policy, YAML
parsing and whitespace checks pass. Live Actions/Ollama execution is unverified;
activation requires these trusted files on main. No push performed.

Follow-up: defaults increased to 100,000 characters and 60 chunks using the
supplied PR #9 sizing; cost estimate is chunks × roughly three runner minutes.
Same-attempt uploads may overwrite artifacts; reruns now use new attempt names.
Regression tests cover skipped
matrices on overflow through the gate CLI, uncovered-file summary and actual
status-publishing script; duplicate and extra chunk reports remain rejected.

Current review corrections: binary skips require an explicit asset extension,
HEAD mode 100644 and a matching bounded header signature outside .github. All
lockfiles, build outputs and text deletions receive full-diff review. Reports
remain flat regular files with strict chunk identity checks. Context covers the
entire HEAD tree's regular text, with 2 MiB/file and 100 MiB total caps. Symlink
targets and submodules are listings only; omitted context is named in the prompt,
and a missing required caller/dependency means complete=false. Prior lock
summaries, extension-only skips and changed-file-only context are superseded.
Actual PR sizing must be recalculated under this coverage policy.

Third re-review plan (447f2bd): write adversarial tests first, then reject all
zero-chunk plans, scan asset prefixes for code-like payloads (including the short
BMP assignment regression), and include typed SHA-256 asset listings in every
prompt. Bind trusted report envelopes and artifact names to run/attempt/digest,
retain independent gate regeneration and exact chunk coverage, document reruns,
run full local checks, and commit with JKH-171 without pushing.

Implemented: zero-chunk gates fail with the human-review summary; all skipped
HEAD assets carry detected type and streaming blob SHA-256 evidence. The first
64 KiB gets a post-signature printable-run heuristic plus the short BMP guard.
Code-loading rules appear in every prompt. Report envelopes and artifact names
bind run ID/attempt/digest/chunk; prior-attempt and missing envelopes fail closed.
Use Re-run all jobs. Heuristics are not proof of inertness; live Actions remains
unverified. Test-first checks exposed the old behavior before implementation.

Trusted-ref follow-up (base 38fd7bc): add workflow checkout/guard regression
tests and extend the planner/render/gate CLI test with a later trusted main
commit. Check out github.sha in all three jobs, validate both review objects
and base ancestry, and clarify the prompt and coordinator documentation while
preserving exact PR base/head binding. Run the full Node test suite and CI
policy, then commit locally with Joseph's requested message. Do not push.
