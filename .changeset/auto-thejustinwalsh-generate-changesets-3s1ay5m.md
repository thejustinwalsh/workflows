---
"@thejustinwalsh/generate-changesets": patch
---

> Branch: fix-changeset-ignore-list
> PR: https://github.com/thejustinwalsh/workflows/pull/11

### cba930715ebbceec09ae0cc2ed2fb2b6f980ad6f
fix: skip ignored packages when generating changesets
Read .changeset/config.json ignore list and filter those packages out
before processing commits, preventing changeset files from being
generated for packages that changeset:version will never consume.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
Files: generate-changesets/generate.mjs
Stats: 1 file changed, 17 insertions(+)
