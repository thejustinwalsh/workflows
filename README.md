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

Handles the changeset release lifecycle: creates a release PR, publishes npm packages (if any), creates a git tag, and outputs `published` + `version` so downstream jobs can build artifacts and create GitHub Releases.

The action does **not** create a GitHub Release itself — that's your job, because only you know what artifacts to attach.

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

  # Your downstream job — only runs when a new version is tagged
  publish:
    needs: release
    if: needs.release.outputs.published == 'true'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Build artifacts for v${{ needs.release.outputs.version }}"
      # Build your artifacts here, then:
      - run: |
          gh release create "v${{ needs.release.outputs.version }}" \
            --generate-notes \
            ./my-artifact.zip
        env:
          GH_TOKEN: ${{ github.token }}
```

#### What it does

1. Delegates to `changesets/action@v1` — creates a release PR when changesets are pending, or runs `changeset publish` when the release PR is merged
2. `changeset publish` handles: npm publish for public packages (creates per-package tags + `"New tag:"` output), git tags for private packages with `privatePackages.tag: true` (silent — no stdout)
3. Detects new repo-level version by comparing `version-package` against existing git tags
4. Creates a unified `v<version>` git tag
5. Collects private tagged-but-not-published packages by diffing workspace packages against changesets' npm output
6. Outputs everything downstream jobs need

#### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `version-command` | `npx changeset version` | Command to bump versions |
| `title` | `chore: release` | Release PR title |
| `commit` | `chore: release` | Release PR commit message |
| `version-package` | `./package.json` | Package.json to read version from for unified tag |

#### Outputs

| Output | Contains | Use case |
|--------|----------|----------|
| `published` | `true` when a new version is released | Gate all downstream jobs |
| `version` | Repo-level version (e.g. `1.2.0`) | Unified release: `gh release create v1.2.0` |
| `published-packages` | JSON `[{name, version}]` of npm-published packages | Already have per-package tags. Use to attach artifacts to existing releases. |
| `tagged-packages` | JSON `[{name, version}]` of private packages that were tagged but NOT npm-published | Create per-package releases with artifacts for private packages. |

#### Examples

**Unified release with artifacts (noron — all private, builds ISOs):**
```yaml
jobs:
  release:
    outputs:
      published: ${{ steps.release.outputs.published }}
      version: ${{ steps.release.outputs.version }}
    steps:
      - uses: actions/checkout@v6
      - run: bun install && bun run build
      - id: release
        uses: thejustinwalsh/workflows/release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  build-and-release:
    needs: release
    if: needs.release.outputs.published == 'true'
    steps:
      - run: make collect-dist && sudo ./build-iso.sh
      - run: |
          gh release create "v${{ needs.release.outputs.version }}" \
            --generate-notes \
            dist/*.iso
```

**Per-package npm releases (three-flatland — all public):**

No extra work needed. `changeset publish` already published to npm and created per-package tags. Changesets/action created GitHub Releases. Use `published-packages` only if you need to attach additional artifacts:

```yaml
jobs:
  release:
    outputs:
      published: ${{ steps.release.outputs.published }}
      packages: ${{ steps.release.outputs.published-packages }}
    steps:
      - id: release
        uses: thejustinwalsh/workflows/release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Mixed public + private (zzfx-studio — npm packages + private app):**

Public packages are npm-published automatically. Use `tagged-packages` to create releases for private packages that need artifacts:

```yaml
jobs:
  release:
    outputs:
      published: ${{ steps.release.outputs.published }}
      version: ${{ steps.release.outputs.version }}
      tagged: ${{ steps.release.outputs.tagged-packages }}
    steps:
      - id: release
        uses: thejustinwalsh/workflows/release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy-app:
    needs: release
    if: needs.release.outputs.published == 'true'
    strategy:
      matrix:
        pkg: ${{ fromJson(needs.release.outputs.tagged-packages) }}
    steps:
      - run: echo "Deploy ${{ matrix.pkg.name }}@${{ matrix.pkg.version }}"
```

**GitHub Action repo (workflows — floating major tag, no artifacts):**
```yaml
jobs:
  release:
    steps:
      - id: release
        uses: ./release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - if: steps.release.outputs.published == 'true'
        run: |
          major="v$(echo "${{ steps.release.outputs.version }}" | cut -d. -f1)"
          git tag -f "$major"
          git push origin "$major" --force
```

---

### `filter-packages`

Filter a JSON package array from `published-packages` or `tagged-packages` by name, scope, or exclusion list. Use to select specific packages for downstream matrix jobs without wasting runners on skipped steps.

```yaml
- id: platforms
  uses: thejustinwalsh/workflows/filter-packages@v1
  with:
    packages: ${{ needs.release.outputs.tagged-packages }}
    filter: "@zzfx-studio/*"
    exclude: "@zzfx-studio/app"

- if: steps.platforms.outputs.empty == 'false'
  strategy:
    matrix:
      pkg: ${{ fromJson(steps.platforms.outputs.packages) }}
  run: echo "Build ${{ matrix.pkg.name }}"
```

#### Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `packages` | (required) | JSON `[{name, version}]` array from release outputs |
| `filter` | `*` | Name pattern: exact (`@noron/action`), scope glob (`@noron/*`), or comma-separated list |
| `exclude` | `""` | Names to exclude, same format as filter |

#### Outputs

| Output | Description |
|--------|-------------|
| `packages` | Filtered JSON array |
| `count` | Number of matches |
| `empty` | `true` if nothing matched |

---

## Secrets

| Secret | Used by | Required | Purpose |
|--------|---------|----------|---------|
| `GITHUB_TOKEN` | release | Yes (auto-provided) | PR creation, tagging, npm publish (if applicable) |
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
