# Reusable GitHub Actions

Composite actions for automated changelog generation and releases via [changesets](https://github.com/changesets/changesets).

## Actions

### [`generate-changesets`](./generate-changesets)

Auto-generate changeset files from conventional commits on a PR. Maps changed files to workspace packages, determines semver bumps, and optionally enhances changelog entries via [GitHub Copilot CLI](https://github.com/github/copilot).

```yaml
- uses: thejustinwalsh/workflows/generate-changesets@v1
  with:
    copilot-pat: ${{ secrets.COPILOT_PAT }}
```

### [`release`](./release)

Handles the changeset release lifecycle: creates a release PR, publishes npm packages (if any), tags all packages (including private), and outputs `published`, `version`, `published-packages`, and `tagged-packages` for downstream jobs to build artifacts and create GitHub Releases.

```yaml
- id: release
  uses: thejustinwalsh/workflows/release@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### [`filter-packages`](./filter-packages)

Filter a JSON package array by name pattern, scope, or exclusion list. Use with `published-packages` or `tagged-packages` from the release action to select specific packages for downstream matrix jobs.

```yaml
- uses: thejustinwalsh/workflows/filter-packages@v1
  with:
    packages: ${{ needs.release.outputs.tagged-packages }}
    filter: "@acme/*"
    exclude: "@acme/docs"
```

## Secrets

| Secret | Used by | Required | Purpose |
|--------|---------|----------|---------|
| `GITHUB_TOKEN` | release | Yes (auto-provided) | PR creation, tagging, npm publish |
| `COPILOT_PAT` | generate-changesets | No | GitHub PAT with Copilot access for AI-enhanced changelogs |

## LLM Setup Prompt

Use the following prompt to instruct an LLM (Claude, Copilot, etc.) to set up or migrate a repo to use these actions:

<details>
<summary>Copy this prompt</summary>

````
Set up automated changelog generation and releases using the composite actions
from thejustinwalsh/workflows. Follow these steps exactly:

1. Install changesets:
   npm install -D @changesets/cli @changesets/changelog-github
   (or bun/pnpm equivalent)

2. Create .changeset/config.json:
   {
     "$schema": "https://raw.githubusercontent.com/changesets/changesets/main/packages/config/schema.json",
     "changelog": ["@changesets/changelog-github", { "repo": "<owner>/<repo>" }],
     "commit": false,
     "fixed": [[...list packages that should always version together...]],
     "linked": [],
     "access": "restricted",
     "baseBranch": "main",
     "updateInternalDependencies": "patch",
     "privatePackages": { "version": true, "tag": true },
     "ignore": [...packages that should not generate changelogs like examples or docs...]
   }
   Set "access": "public" if any packages publish to npm.

3. Add scripts to root package.json:
   "changeset": "changeset",
   "changeset:version": "changeset version"

4. Create .changeset/README.md:
   # Changesets
   Changesets are auto-generated from conventional commits on PRs.
   To create one manually: `npx changeset`

5. Create .github/workflows/changeset.yml:

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

6. Create .github/workflows/release.yml:

   name: Release
   on:
     workflow_dispatch:
     workflow_run:
       workflows: [CI]
       branches: [main]
       types: [completed]
   permissions:
     contents: write
     pull-requests: write
   concurrency:
     group: ${{ github.workflow }}-${{ github.ref }}
   jobs:
     release:
       runs-on: ubuntu-latest
       if: ${{ github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success' }}
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

     # Add downstream jobs here. Example:
     # build:
     #   needs: release
     #   if: needs.release.outputs.released == 'true'
     #   runs-on: ubuntu-latest
     #   steps:
     #     - uses: actions/checkout@v6
     #     - run: ./build-artifacts.sh
     #     # Attach artifacts to a per-package tag
     #     - run: |
     #         pkg=$(echo '${{ needs.release.outputs.tagged }}' | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8'));console.log(d[0]?.name+'@'+d[0]?.version)")
     #         gh release create "$pkg" --generate-notes dist/*
     #       env:
     #         GH_TOKEN: ${{ github.token }}

   Adjust the install command (npm/bun/pnpm) to match your project.
   The "workflows: [CI]" trigger must match your CI workflow's name exactly.
   Override version-command only if `npx changeset version` doesn't work.

Notes:
- The repo must use conventional commits: feat:, fix:, perf:, refactor:
  generate changesets. docs:, test:, ci:, chore:, style:, build: are skipped.
- Packages are auto-discovered from package.json workspaces or
  pnpm-workspace.yaml. No manual package list needed.
- changeset publish runs automatically inside the release action. It publishes
  public packages to npm and tags private packages (with privatePackages.tag: true).
- The release action outputs:
  - released (boolean) — true if anything was published or tagged
  - published-packages — JSON array of npm-published packages
  - tagged-packages — JSON array of private packages that were tagged
  Use these to gate downstream jobs and create per-package GitHub Releases.
- If COPILOT_PAT secret is configured, changeset files are enhanced by
  GitHub Copilot CLI. Optional — continues on error if unavailable.
````

</details>

## License

MIT
