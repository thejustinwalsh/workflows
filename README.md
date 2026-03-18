# Reusable GitHub Actions

Composite actions for automated changelog generation and releases via [changesets](https://github.com/changesets/changesets).

## Actions

### `generate-changesets` — Auto-generate changelogs from conventional commits

Parses conventional commits on a PR branch, maps changed files to monorepo packages, determines semver bumps, and writes `.changeset/*.md` files. Optionally enhances raw commit details into user-facing changelog entries via GitHub Copilot CLI.

```yaml
# .github/workflows/changeset.yml
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
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.ref }}
          fetch-depth: 0

      - uses: thejustinwalsh/workflows/generate-changesets@v1
        with:
          copilot-pat: ${{ secrets.COPILOT_PAT }}  # optional
```

#### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `base` | `origin/main` | Base branch to diff against |
| `cap-major` | `true` | Cap major bumps to minor (useful pre-1.0) |
| `copilot-pat` | `""` | GitHub PAT with Copilot access. If omitted, raw commit details are kept. |

#### How it works

1. Scans commits between `base..HEAD` for conventional commit messages (`feat:`, `fix:`, etc.)
2. Maps changed files to packages via workspace config (`package.json` workspaces or `pnpm-workspace.yaml`)
3. Writes one `.changeset/auto-<package>-<id>.md` per affected package with the appropriate semver bump
4. If `copilot-pat` is set: Copilot CLI reads each commit's actual diff and rewrites the raw details into concise changelog bullets
5. Commits and pushes the changeset files to the PR branch

### `release` — Changeset-based releases with git tags

Uses `changesets/action` to either create a release PR (when changesets are pending) or tag + publish (when the release PR is merged). Optionally creates a GitHub Release.

```yaml
# .github/workflows/release.yml
name: Release
on:
  workflow_run:
    workflows: [CI]
    branches: [main]
    types: [completed]

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install  # or bun install, pnpm install

      - uses: thejustinwalsh/workflows/release@v1
        with:
          version-command: npx changeset version
          version-package: ./package.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `version-command` | `npx changeset version` | Command to bump versions |
| `publish-command` | `""` | Post-version command (e.g. build). Empty = skip. |
| `title` | `chore: release` | Release PR title |
| `commit` | `chore: release` | Release PR commit message |
| `version-package` | `./package.json` | Package.json to read version from for git tag |
| `create-github-release` | `true` | Create a GitHub Release with auto-generated notes |

#### Outputs

| Output | Description |
|--------|-------------|
| `published` | `true` if a new version was tagged |
| `published-packages` | JSON array of published packages |
| `version` | The version string (e.g. `0.2.0`) |

## License

MIT
