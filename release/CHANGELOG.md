# @thejustinwalsh/release

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
