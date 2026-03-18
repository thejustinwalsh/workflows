---
"@thejustinwalsh/generate-changesets": minor
---

> Branch: main

### 33388492fc26fecd63e6f65b88cc67ffd7489375
fix: enhance fetch step to ensure base branch is available
Files: generate-changesets/action.yml
Stats: 1 file changed, 7 insertions(+), 2 deletions(-)

### 06cb8577fd2c883580b3216068e41771f66f62ab
refactor: reorganize workspace discovery and conventional commit mapping logic
Files: generate-changesets/generate.mjs
Stats: 1 file changed, 35 insertions(+), 45 deletions(-)

### bf793454b30723574cfab741ea8437875a6f8cda
feat: enhance workspace entry detection for npm, bun, and yarn
Files: generate-changesets/generate.mjs
Stats: 1 file changed, 6 insertions(+), 2 deletions(-)

### e8566781764782bd2769f68551209dedcb2d91b7
feat: scan workspace entries for changeset gen
Files: .changeset/config.json, generate-changesets/generate.mjs, generate-changesets/package.json
Stats: 3 files changed, 36 insertions(+), 19 deletions(-)
