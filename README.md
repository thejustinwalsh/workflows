# Reusable GitHub Actions

Composite actions for automated changelog generation and releases via [changesets](https://github.com/changesets/changesets).

## Actions

### `generate-changesets`

Auto-generate changeset files from conventional commits on a PR. Optionally uses [GitHub Copilot CLI](https://github.com/github/copilot) to rewrite raw commit details into polished changelog entries.

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

#### What it does

1. Scans `base..HEAD` for conventional commits (`feat:`, `fix:`, `perf:`, `refactor:`)
2. Maps changed files to packages via `package.json` workspaces or `pnpm-workspace.yaml`
3. Writes `.changeset/auto-<package>-<id>.md` per affected package with the semver bump in frontmatter
4. **Copilot enhancement** (if `copilot-pat` provided): installs Copilot CLI, reads each commit's actual diff via `git show`, and rewrites the raw commit details into concise user-facing changelog bullets. Runs with `continue-on-error` — if Copilot is unavailable, the raw details are kept.
5. Commits and pushes the changeset files to the PR branch

Commits prefixed with `docs:`, `test:`, `ci:`, `chore:`, `style:`, or `build:` are skipped.

#### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `base` | `origin/main` | Base branch to diff against |
| `cap-major` | `true` | Cap major bumps to minor (useful pre-1.0) |
| `copilot-pat` | `""` | GitHub PAT with Copilot access for AI changelog enhancement |

---

### `release`

Wraps `changesets/action` with idempotent git tagging and GitHub Release creation. Safe for both npm-published and private packages — checks for existing tags and releases before creating, so it never duplicates what changesets already did.

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
      - run: npm install

      - uses: thejustinwalsh/workflows/release@v1
        with:
          version-command: npx changeset version
          version-package: ./package.json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### What it does

1. Delegates to `changesets/action@v1` — creates a release PR when changesets are pending, or runs the publish command when the release PR is merged
2. After publish: reads the version from `version-package` and checks if a `v<version>` git tag already exists
3. **If tag missing** (private packages that skip `changeset publish`): creates the git tag and pushes it
4. **If tag exists** (npm publish already created per-package tags): skips — no double-tag
5. Same check for GitHub Releases — creates one only if changesets didn't already

This means the action works correctly whether your packages are public (npm publish creates tags/releases) or private (our action fills the gap).

#### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `version-command` | `npx changeset version` | Command to bump versions |
| `publish-command` | `""` | Post-version command (build, npm publish, etc.) |
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

---

## Secrets

| Secret | Used by | Required | Purpose |
|--------|---------|----------|---------|
| `GITHUB_TOKEN` | release | Yes (auto-provided) | PR creation, tagging, releases |
| `COPILOT_PAT` | generate-changesets | No | GitHub PAT with Copilot access for AI-enhanced changelogs |

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
