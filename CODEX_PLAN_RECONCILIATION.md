# Checkout reconciliation — 2026-09-16

Follow-up: the obsolete top-level source directory is now preserved at
`.local-archive/counter-strike/` inside this checkout. All references below to
original-checkout evidence resolve there. See [CHECKOUT.md](CHECKOUT.md).

Request: finish the local reconciliation before setting up a CI/CD pipeline that
automatically merges after PR review. Pipeline work was paused during this phase. This
document covers only the local snapshot consolidation; the later authorized
workflow definition is recorded in [AUTO_MERGE_SETUP.md](AUTO_MERGE_SETUP.md).

## Ownership and evidence

- Related inventory issue/epic: JKH-126 / JKH-119, read live before editing.
  This comparison supplements their records; it does not reopen or close them.
- Coordinator: `/root`; documentation builder: `/root/consolidation_docs`; fresh
  independent reviewer: `/root/consolidation_final_review`, using the immutable candidate.
- Candidate: `integration/jkh-119-local-consolidation` in
  `/private/tmp/counter-strike-reconciliation-19Nfv9/repo`, destination base
  `b15c1a9f329edd000fe7cec7f3fc5ed220f19ec4`; no worktree was created.
- Snapshot source: `integration/jkh-144-glock` at
  `94b2f4ef79c9c97c4d17eca04427a0b7947e8108`. Original root `main` is separately
  recorded at `0e99b59fbbb358b94f11fe64fff8673094775519`.
- Builder owns only reconciled documentation/ignore files and routing docs. Root
  owns manifests, hash/preservation evidence, Git actions, remote validation, and
  the source checkout. No publication, deployment, Linear state change, PR,
  merge, or pipeline edit is in scope.

## Sequence and acceptance

1. Root imported 376 non-overlap source paths exactly and preserved four overlaps.
2. Retain destination workflow/configuration; combine source factory, visual, and
   local-development instructions into the overlap documents.
3. Add dated routing distinguishing inherited and fresh evidence, included source
   content and outstanding branches. Preserve the historical handoff body.
4. Independently verify import hashes/modes, protected scaffold files, links,
   scope, and source preservation. Root runs only authorized remote static/unit/
   build checks; no browser smoke is required for this byte-identical game import. Full CT/T, visual, and 60 FPS gates remain outside import.

## Progress

- Snapshot import: 375 source paths unchanged, four overlaps reconciled and one
  historical execution document given a current-authority preamble. Protected
  delivery scaffold and source hosting identity are unchanged.
- Remote validation: install, repository checks, lint, type checking, 675
  regressions and build passed. The unchanged performance test failed at p95
  1.6230 ms against 0.5 ms; `npm test` therefore failed overall. The initial build
  failure from absent archive Git metadata is retained alongside its passing retry.
- Independent import/documentation review and activation are recorded by exact
  candidate SHA in the original checkout's
  `outputs/local-consolidation-2026-09-16/independent-review.md` and `delivery.json`.
  Those records govern whether the candidate was reviewed and installed; this
  checklist alone does not grant acceptance.
- Full gameplay, visual, performance acceptance, remote enforcement, PR, main
  merge, deployment, Linear closure and pipeline changes are not performed.
