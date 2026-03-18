# generate-changesets

Auto-generate [changeset](https://github.com/changesets/changesets) files from conventional commits on a PR branch. Optionally enhances raw commit details into polished changelog entries via [GitHub Copilot CLI](https://github.com/github/copilot).

## Usage

### Basic

```yaml
- uses: actions/checkout@v6
  with:
    ref: ${{ github.event.pull_request.head.ref }}
    fetch-depth: 0

- uses: thejustinwalsh/workflows/generate-changesets@v1
```

### With Copilot enhancement

```yaml
- uses: actions/checkout@v6
  with:
    ref: ${{ github.event.pull_request.head.ref }}
    fetch-depth: 0

- uses: thejustinwalsh/workflows/generate-changesets@v1
  with:
    copilot-pat: ${{ secrets.COPILOT_PAT }}
```

### With custom base branch

```yaml
- uses: thejustinwalsh/workflows/generate-changesets@v1
  with:
    base: origin/develop
```

### Full workflow file

```yaml
name: Generate Changeset
on:
  pull_request:
    branches: [main]
    types: [opened, synchronize]

jobs:
  changeset:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ github.event.pull_request.head.ref }}
          fetch-depth: 0

      - uses: thejustinwalsh/workflows/generate-changesets@v1
        with:
          copilot-pat: ${{ secrets.COPILOT_PAT }}
```

## How it works

1. Scans commits between `base..HEAD` for conventional commit messages
2. Maps changed files to workspace packages (auto-discovers from `package.json` workspaces or `pnpm-workspace.yaml`)
3. Determines semver bump per package: `feat:` = minor, `fix:`/`perf:`/`refactor:` = patch, `!`/`BREAKING CHANGE` = major
4. Writes `.changeset/auto-<package>-<id>.md` per affected package
5. If `copilot-pat` provided: Copilot CLI reads each commit's diff and rewrites the body into concise changelog bullets
6. Commits and pushes changeset files to the PR branch

Commits prefixed with `docs:`, `test:`, `ci:`, `chore:`, `style:`, or `build:` are skipped.

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `base` | `origin/main` | Base branch to diff against |
| `cap-major` | `true` | Cap major bumps to minor (useful pre-1.0) |
| `copilot-pat` | `""` | GitHub PAT with Copilot access for AI changelog enhancement |

## Workspace support

Packages are discovered automatically from:
- `package.json` `"workspaces"` field (npm, bun, yarn — array and object forms)
- `pnpm-workspace.yaml`

Both glob patterns (`packages/*`) and direct paths (`my-action`) are supported.
