# release

Handles the changeset release lifecycle: creates a release PR, publishes npm packages (if any), and tags private packages. Outputs what happened so downstream jobs can build artifacts and create GitHub Releases.

## Usage

### Minimal

```yaml
- uses: actions/checkout@v6
- run: npm install

- id: release
  uses: thejustinwalsh/workflows/release@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- if: steps.release.outputs.released == 'true'
  run: echo "Something was released"
```

### With bun

```yaml
- uses: actions/checkout@v6
- uses: oven-sh/setup-bun@v2
- run: bun install

- id: release
  uses: thejustinwalsh/workflows/release@v1
  with:
    version-command: bun run changeset:version
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Build artifacts when private packages are tagged

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    outputs:
      released: ${{ steps.release.outputs.released }}
      tagged: ${{ steps.release.outputs.tagged-packages }}
    steps:
      - uses: actions/checkout@v6
      - run: npm install
      - id: release
        uses: thejustinwalsh/workflows/release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build:
    needs: release
    if: needs.release.outputs.released == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: ./build-artifacts.sh
      # Create a release for a specific package tag
      - run: |
          gh release create "@acme/cli@1.2.0" \
            --generate-notes \
            dist/cli-*
        env:
          GH_TOKEN: ${{ github.token }}
```

### Per-package matrix from tagged packages

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    outputs:
      released: ${{ steps.release.outputs.released }}
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
    if: needs.release.outputs.released == 'true'
    strategy:
      matrix:
        pkg: ${{ fromJson(needs.release.outputs.tagged) }}
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

- if: steps.release.outputs.released == 'true'
  run: |
    # Read version from a workspace package that changesets bumps
    version=$(node -e "console.log(require('./release/package.json').version)")
    major="v$(echo "$version" | cut -d. -f1)"
    git tag -f "$major"
    git push origin "$major" --force
```

## How it works

1. `changesets/action` creates a release PR when changesets are pending, or runs `changeset publish` when the release PR is merged
2. `changeset publish` publishes public packages to npm (creates per-package tags) and tags private packages silently (with `privatePackages.tag: true`)
3. Collects private tagged-but-not-published packages by diffing workspace packages against changesets' npm output
4. Sets `released=true` if either published or tagged arrays are non-empty

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `version-command` | `npx changeset version` | Command to bump versions |
| `title` | `chore: release` | Release PR title |
| `commit` | `chore: release` | Release PR commit message |

## Outputs

| Output | Contains | Use case |
|--------|----------|----------|
| `released` | `true` if anything was published or tagged | Gate all downstream jobs |
| `published-packages` | JSON `[{name, version}]` of npm-published packages | Already have per-package tags from changesets |
| `tagged-packages` | JSON `[{name, version}]` of private tagged packages | Create per-package releases with artifacts |
