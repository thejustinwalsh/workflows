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

## LLM Setup Prompt

Use the following prompt to instruct an LLM (Claude, Copilot, etc.) to set up or migrate a repo to use these actions:

<details>
<summary>Copy this prompt</summary>

```
Set up automated changelog generation and releases using the composite actions
from thejustinwalsh/workflows. Here is what needs to happen:

1. Install @changesets/cli and @changesets/changelog-github as devDependencies.

2. Create .changeset/config.json with:
   - "changelog": ["@changesets/changelog-github", { "repo": "<owner>/<repo>" }]
   - "commit": false
   - "access": "restricted" (unless publishing to npm, then "public")
   - "baseBranch": "main"
   - "updateInternalDependencies": "patch"
   - "privatePackages": { "version": true, "tag": true }
   - "fixed": [[...list all packages that should version together...]]
   - "ignore": [...any packages that should not generate changelogs like examples or docs...]

3. Add these scripts to the root package.json:
   - "changeset": "changeset"
   - "changeset:version": "changeset version"

4. Create .github/workflows/changeset.yml:

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
             copilot-pat: ${{ secrets.COPILOT_PAT }}

5. Create .github/workflows/release.yml that:
   - Triggers after CI passes on main (workflow_run) or via workflow_dispatch
   - Sets permissions: contents: write, pull-requests: write
   - Checks out code, installs deps, builds
   - Uses thejustinwalsh/workflows/release@v1 with:
     - version-command set to your package manager's changeset version command
     - version-package pointing to the package.json to read the version from
     - GITHUB_TOKEN passed via env
   - Add any repo-specific post-release jobs (like building artifacts) that
     trigger when the release action outputs published == 'true'

6. Create .changeset/README.md explaining that changesets are auto-generated
   from conventional commits on PRs.

The repo must use conventional commits (feat:, fix:, perf:, refactor:, etc.)
for the changeset generation to work. Commits prefixed with docs:, test:, ci:,
chore:, style:, or build: are skipped.

The generate-changesets action auto-discovers packages from package.json
workspaces or pnpm-workspace.yaml. No manual package list needed.

If COPILOT_PAT secret is configured, the raw changeset files will be enhanced
by GitHub Copilot CLI which reads the actual git diffs and rewrites commit
details into concise user-facing changelog bullets. This step is optional and
continues on error if Copilot is unavailable.
```

</details>

## License

MIT
