# @thejustinwalsh/release

## 1.4.0

### Minor Changes

- [#6](https://github.com/thejustinwalsh/workflows/pull/6) [`68efd92`](https://github.com/thejustinwalsh/workflows/commit/68efd9280b938cc1cd676bcaa123624fba3e2b70) Thanks [@thejustinwalsh](https://github.com/thejustinwalsh)! - > Branch: feat-fixed-release

  > PR: https://github.com/thejustinwalsh/workflows/pull/6

  ### c9e1910ec96f5637919ca55fd6b97d8914020d71

  fix: security fixes
  Files: .github/workflows/ci.yml, .github/zizmor.yml, filter-packages/action.yml, fixed-github-release/action.yml, generate-changesets/action.yml, release/action.yml
  Stats: 6 files changed, 64 insertions(+), 25 deletions(-)

  ### ccfc05a87301fd3c4069d98ab7fc46f64c1955e3

  feat: add fixed-github-release action for aggregated changelogs and releases
  Files: .claude/settings.local.json, README.md, fixed-github-release/README.md, fixed-github-release/action.yml, fixed-github-release/fixed-release.mjs, fixed-github-release/package.json, package-lock.json, package.json, release/README.md, release/action.yml, tests/fixed-release.test.mjs
  Stats: 11 files changed, 797 insertions(+), 9 deletions(-)

## 1.3.0

### Minor Changes

- [#4](https://github.com/thejustinwalsh/workflows/pull/4) [`0b92121`](https://github.com/thejustinwalsh/workflows/commit/0b92121f330b641276c98cec1dcc454817036aa9) Thanks [@thejustinwalsh](https://github.com/thejustinwalsh)! - > Branch: fix-remove-tagged

  > PR: https://github.com/thejustinwalsh/workflows/pull/4

  ### 2b7948ba22b5f9f4492e2e74bc59e292f11ad5ed

  feat: restore collect-tagged utility for workspace package discovery
  Files: release/collect-tagged.mjs, tests/workspace.test.mjs
  Stats: 2 files changed, 74 insertions(+), 38 deletions(-)

  ### ebca0a3f7e3b8ac7c01a45f629f96443462213f9

  fix: remove tagged packages collection and update descriptions in action.yml
  Files: release/action.yml, release/collect-tagged.mjs
  Stats: 2 files changed, 5 insertions(+), 111 deletions(-)

## 1.2.1

### Patch Changes

- [`81214d1`](https://github.com/thejustinwalsh/workflows/commit/81214d137a14102ddd9581bd29e0703b0369aeec) Thanks [@thejustinwalsh](https://github.com/thejustinwalsh)! - > Branch: main

  ### df91939d74bcac9b5561bc3edda54d1866631ca3

  fix: update release action outputs and documentation for consistency
  Files: .github/workflows/release.yml, README.md, release/README.md, release/action.yml
  Stats: 4 files changed, 70 insertions(+), 96 deletions(-)

## 1.2.0

### Minor Changes

- [`4f93733`](https://github.com/thejustinwalsh/workflows/commit/4f937339029ea14f801501a9637cba148396352d) Thanks [@thejustinwalsh](https://github.com/thejustinwalsh)! - > Branch: main

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

## 1.1.0

### Minor Changes

- [`76f6a44`](https://github.com/thejustinwalsh/workflows/commit/76f6a445947b13b508e8bae9be88174d1cc2ee23) Thanks [@thejustinwalsh](https://github.com/thejustinwalsh)! - > Branch: main

  ### 8a26afe3d22fa054da31227fbe8c74e08acb20f8

  feat: setup workspaces
  Files: package.json, release/package.json
  Stats: 2 files changed, 7 insertions(+)

  ### 44177baafb9d2da63e4a2d70665003012de8529d

  fix: ensure our release wrapper handles both public and private release flows
  Files: release/action.yml
  Stats: 1 file changed, 33 insertions(+), 4 deletions(-)
