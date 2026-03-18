# release

Handles the changeset release lifecycle: creates a release PR, publishes npm packages (if any), creates a unified git tag, and outputs everything downstream jobs need to build artifacts and create GitHub Releases.

The action does **not** create a GitHub Release — that's your job, because only you know what artifacts to attach.

## Usage

### Minimal (private packages, no npm)

```yaml
- uses: actions/checkout@v6
- run: npm install

- id: release
  uses: thejustinwalsh/workflows/release@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- if: steps.release.outputs.published == 'true'
  run: echo "Released v${{ steps.release.outputs.version }}"
```

### With bun and custom version command

```yaml
- uses: actions/checkout@v6
- uses: oven-sh/setup-bun@v2
- run: bun install

- id: release
  uses: thejustinwalsh/workflows/release@v1
  with:
    version-command: bun run changeset:version
    version-package: ./packages/core/package.json
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Unified release with artifacts

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    outputs:
      published: ${{ steps.release.outputs.published }}
      version: ${{ steps.release.outputs.version }}
    steps:
      - uses: actions/checkout@v6
      - run: npm install
      - id: release
        uses: thejustinwalsh/workflows/release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build-and-release:
    needs: release
    if: needs.release.outputs.published == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: ./build.sh
      - run: |
          gh release create "v${{ needs.release.outputs.version }}" \
            --generate-notes \
            dist/my-artifact.zip
        env:
          GH_TOKEN: ${{ github.token }}
```

### Per-package releases for private packages

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    outputs:
      published: ${{ steps.release.outputs.published }}
      tagged: ${{ steps.release.outputs.tagged-packages }}
    steps:
      - uses: actions/checkout@v6
      - run: npm install
      - id: release
        uses: thejustinwalsh/workflows/release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy:
    needs: release
    if: needs.release.outputs.published == 'true'
    strategy:
      matrix:
        pkg: ${{ fromJson(needs.release.outputs.tagged-packages) }}
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy ${{ matrix.pkg.name }}@${{ matrix.pkg.version }}"
```

### Floating major tag (GitHub Actions repos)

```yaml
- id: release
  uses: thejustinwalsh/workflows/release@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- if: steps.release.outputs.published == 'true'
  run: |
    major="v$(echo "${{ steps.release.outputs.version }}" | cut -d. -f1)"
    git tag -f "$major"
    git push origin "$major" --force
```

## How it works

1. `changesets/action` creates a release PR when changesets are pending, or runs `changeset publish` when the release PR is merged
2. `changeset publish` publishes public packages to npm (creates per-package tags) and tags private packages silently (with `privatePackages.tag: true`)
3. Detects new repo-level version by comparing `version-package` against existing git tags
4. Creates a unified `v<version>` git tag
5. Collects private tagged-but-not-published packages
6. Outputs `published`, `version`, `published-packages`, and `tagged-packages`

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `version-command` | `npx changeset version` | Command to bump versions |
| `title` | `chore: release` | Release PR title |
| `commit` | `chore: release` | Release PR commit message |
| `version-package` | `./package.json` | Package.json to read version from for unified tag |

## Outputs

| Output | Contains | Use case |
|--------|----------|----------|
| `published` | `true` when a new version is released | Gate all downstream jobs |
| `version` | Repo-level version (e.g. `1.2.0`) | `gh release create v1.2.0` |
| `published-packages` | JSON `[{name, version}]` of npm-published packages | Attach artifacts to existing per-package releases |
| `tagged-packages` | JSON `[{name, version}]` of private tagged packages | Create per-package releases for private packages |
