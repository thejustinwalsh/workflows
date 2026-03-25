---
"@thejustinwalsh/generate-changesets": patch
---

> Branch: fix/sigpipe-bid-calculation
> PR: https://github.com/thejustinwalsh/workflows/pull/13

### 76bd0992515485e65b291fd80177c8c3679bdbb5
fix: avoid SIGPIPE in changeset bid calculation
When there are many commits in the range, `git log | head -1` causes
a SIGPIPE because head exits after reading the first line while git log
is still writing. Under bash's pipefail (set by GitHub Actions' composite
shell), this surfaces as exit code 141 and fails the step.

Appending `|| true` suppresses the non-zero exit from the broken pipe
while still capturing the first timestamp correctly.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
Files: generate-changesets/action.yml
Stats: 1 file changed, 1 insertion(+), 1 deletion(-)
