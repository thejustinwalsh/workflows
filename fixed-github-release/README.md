# fixed-github-release

Create a single GitHub Release for a changesets [fixed group](https://github.com/changesets/changesets/blob/main/docs/fixed-packages.md) with aggregated changelog notes and artifact support.

Use this when your monorepo versions packages together and you want **one release** instead of per-package releases.

## Usage

### Single fixed group

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    outputs:
      released: ${{ steps.release.outputs.released }}
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }
      - run: npm install
      - id: release
        uses: thejustinwalsh/workflows/release@v1
        with:
          create-github-releases: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build:
    needs: release
    if: needs.release.outputs.released == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: ./build.sh
      - uses: actions/upload-artifact@v4
        with:
          name: release-artifacts
          path: dist/*

  github-release:
    needs: [release, build]
    if: needs.release.outputs.released == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/download-artifact@v4
        with:
          name: release-artifacts
          path: dist
      - uses: thejustinwalsh/workflows/fixed-github-release@v1
        with:
          artifacts: |
            dist/app-x64.tar.gz#App (x64)
            dist/app-arm64.tar.gz#App (arm64)
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Multiple fixed groups

When your `.changeset/config.json` has multiple fixed groups, run this action once per group with a unique `tag-prefix`:

```yaml
# .changeset/config.json: "fixed": [["@acme/core", "@acme/utils"], ["@acme/plugins-a", "@acme/plugins-b"]]

  core-release:
    needs: [release, build]
    if: needs.release.outputs.released == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/download-artifact@v4
        with:
          name: release-artifacts
          path: dist
      - uses: thejustinwalsh/workflows/fixed-github-release@v1
        with:
          fixed-group: 0
          tag-prefix: "core@"
          artifacts: |
            dist/core-x64.tar.gz#Core (x64)
            dist/core-arm64.tar.gz#Core (arm64)
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  plugins-release:
    needs: [release, build]
    if: needs.release.outputs.released == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/download-artifact@v4
        with:
          name: release-artifacts
          path: dist
      - uses: thejustinwalsh/workflows/fixed-github-release@v1
        with:
          fixed-group: 1
          tag-prefix: "plugins@"
          artifacts: |
            dist/plugins-a.tar.gz#Plugin A
            dist/plugins-b.tar.gz#Plugin B
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## How it works

1. Reads `.changeset/config.json` to find the fixed group at the given index
2. Discovers workspace packages and reads their `CHANGELOG.md` files
3. Extracts the section for the group's current version from each changelog
4. Builds combined release notes with per-package headings that link to their git tags
5. Creates a GitHub Release at `{tag-prefix}{version}` (e.g., `v1.3.0`)
6. Uploads artifacts individually with `--clobber` so partial failures don't block others

The action is **idempotent** — if the release already exists, it skips creation and sets `released=false`. This means it's safe to re-run and handles the case where a fixed group wasn't bumped in a particular release.

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `fixed-group` | `0` | Index into the `fixed` array in `.changeset/config.json` |
| `tag-prefix` | `v` | Prefix for the release tag. Use a unique prefix per group when releasing multiple fixed groups. |
| `artifacts` | `""` | Newline-separated list of files to attach. Supports `path#Display Label` format for named assets. |

## Outputs

| Output | Contains | Use case |
|--------|----------|----------|
| `released` | `true` if a release was created | Gate downstream jobs |
| `release-url` | URL of the created release | Link in notifications |
| `release-tag` | Tag of the release (e.g., `v1.3.0`) | Floating tag updates |
| `version` | Version from the fixed group (e.g., `1.3.0`) | Build scripts, notifications |
