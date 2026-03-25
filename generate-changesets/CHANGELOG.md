# @thejustinwalsh/generate-changesets

## 1.2.3

### Patch Changes

- [#11](https://github.com/thejustinwalsh/workflows/pull/11) [`86e5073`](https://github.com/thejustinwalsh/workflows/commit/86e50739f786b4b0257e68fdbd4778a20ca41f02) Thanks [@thejustinwalsh](https://github.com/thejustinwalsh)! - > Branch: fix-changeset-ignore-list

  > PR: https://github.com/thejustinwalsh/workflows/pull/11

  ### cba930715ebbceec09ae0cc2ed2fb2b6f980ad6f

  fix: skip ignored packages when generating changesets
  Read .changeset/config.json ignore list and filter those packages out
  before processing commits, preventing changeset files from being
  generated for packages that changeset:version will never consume.

  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  Files: generate-changesets/generate.mjs
  Stats: 1 file changed, 17 insertions(+)

## 1.2.2

### Patch Changes

- [#6](https://github.com/thejustinwalsh/workflows/pull/6) [`7cd1714`](https://github.com/thejustinwalsh/workflows/commit/7cd17147db30d6553817a97772f055266beb502d) Thanks [@thejustinwalsh](https://github.com/thejustinwalsh)! - > Branch: feat-fixed-release

  > PR: https://github.com/thejustinwalsh/workflows/pull/6

  ### c9e1910ec96f5637919ca55fd6b97d8914020d71

  fix: security fixes
  Files: .github/workflows/ci.yml, .github/zizmor.yml, filter-packages/action.yml, fixed-github-release/action.yml, generate-changesets/action.yml, release/action.yml
  Stats: 6 files changed, 64 insertions(+), 25 deletions(-)

## 1.2.1

## 1.2.0

### Minor Changes

- [`4f93733`](https://github.com/thejustinwalsh/workflows/commit/4f937339029ea14f801501a9637cba148396352d) Thanks [@thejustinwalsh](https://github.com/thejustinwalsh)! - > Branch: main

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

## 1.1.0

### Minor Changes

- [`76f6a44`](https://github.com/thejustinwalsh/workflows/commit/76f6a445947b13b508e8bae9be88174d1cc2ee23) Thanks [@thejustinwalsh](https://github.com/thejustinwalsh)! - > Branch: main

  ### bf793454b30723574cfab741ea8437875a6f8cda

  feat: enhance workspace entry detection for npm, bun, and yarn
  Files: generate-changesets/generate.mjs
  Stats: 1 file changed, 6 insertions(+), 2 deletions(-)

  ### e8566781764782bd2769f68551209dedcb2d91b7

  feat: scan workspace entries for changeset gen
  Files: .changeset/config.json, generate-changesets/generate.mjs, generate-changesets/package.json
  Stats: 3 files changed, 36 insertions(+), 19 deletions(-)
