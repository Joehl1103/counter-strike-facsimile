# JKH-171: trusted chunked review implementation plan

Scope: second part of JKH-171, per Joseph's supplied acceptance criteria; preserve
commits ea15bae and 5fd7c1b. Public delivery scaffold only. No network or push.
Linear issue/parent/dependency contents are unavailable offline.

1. Write real-git planner/packet tests and aggregate gate failure tests first.
2. Build deterministic git-object planning, bounded chunks, dependency summaries,
   digest verification, and nested plain-file HEAD packets from trusted base code.
3. Wire pending → plan → matrix reviewer → aggregate gate, retaining the relay,
   restricted reviewer, pinned actions, base validator, and exact status contract.
4. Document exclusions, overflow, activation on main, and runner-minute cost.
5. Run local tests, CI policy and YAML parsing; commit locally with JKH-171.

The gate regenerates the manifest from immutable git objects and compares its
SHA-256 digest with the plan job. Reports travel as separate chunk artifacts.
No candidate code, configuration, or symlink is executed or installed.

Local result: implemented planner/packet, matrix workflow and aggregate gate.
The 53 planner/gate tests pass. Full suite: 146 pass, three existing relay
loopback tests fail with sandbox `listen EPERM` on 127.0.0.1. CI policy, YAML
parsing and whitespace checks pass. Live Actions/Ollama execution is unverified;
activation requires these trusted files on main. No push performed.

Follow-up: defaults increased to 100,000 characters and 60 chunks using the
supplied PR #9 sizing; cost estimate is chunks × roughly three runner minutes.
Reviewer reruns overwrite their prior artifact. Regression tests cover skipped
matrices on overflow through the gate CLI, uncovered-file summary and actual
status-publishing script; duplicate and extra chunk reports remain rejected.

Review corrections: adversarial tests first, then restrict binary skips to the
explicit asset allowlist outside .github (both paths on renames), remove build
output and large-deletion omissions, read flat regular-file artifacts only, and
review full unsummarized lock diffs. Structured lock summaries now expose
integrity changes and flag all non-registry resolved URLs. The old coverage/cost
assumptions are superseded; recompute actual PR sizing under these stricter rules.
