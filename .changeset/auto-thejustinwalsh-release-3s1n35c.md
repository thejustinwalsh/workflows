---
"@thejustinwalsh/release": minor
---

> Branch: main

### 423abb7a5c354c78f09b4fc86687647bca69a1f5
feat: implement collect-tagged script for filtering private packages not published
Files: release/action.yml, release/collect-tagged.mjs, tests/workspace.test.mjs
Stats: 3 files changed, 269 insertions(+), 58 deletions(-)

### 8a26afe3d22fa054da31227fbe8c74e08acb20f8
feat: setup workspaces
Files: package.json, release/package.json
Stats: 2 files changed, 7 insertions(+)

### 44177baafb9d2da63e4a2d70665003012de8529d
fix: ensure our release wrapper handles both public and private release flows
Files: release/action.yml
Stats: 1 file changed, 33 insertions(+), 4 deletions(-)
