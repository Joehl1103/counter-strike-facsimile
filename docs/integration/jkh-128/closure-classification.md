# JKH-128 closure classification

The JKH-126 `glock-snapshot-98b50c96-closure.json` is the immutable 252-path
source inventory. JKH-128 verifies its already-present common baseline instead
of treating the inventory as a set of cherry-picks.

| Category | Paths | Treatment |
| --- | ---: | --- |
| Runtime modules | 43 | Retain current shared behavior; validate fixed-step, Dust II, and match smoke. |
| Served assets | 10 | Retain; M4 hash is a strict preservation gate. |
| Editable/source assets | 81 | Retain provenance/source without copying or rebuilding. |
| Scripts | 39 | Retain the existing tool chain; use visual-tool commands as game evidence. |
| Tests | 56 | Run the complete suite without threshold changes. |
| Visual tools | 5 | Retain and exercise preview, compare, replay, and replay verification. |
| Documentation/reference | 14 | Supersede only workflow coordination metadata where current records require it. |
| Dependency metadata | 2 | Preserve package manifest and lockfile; no audit remediation. |
| Repository metadata / config | 2 | Retain JKH-127 maintenance; do not copy `.codex` local state. |

The unaccepted visual boundary is deliberate: this inventory includes map,
character, weapon, and visual work that later issues still own. Retention here
does not accept those visuals or import later Glock, character, or sampling
branches.
