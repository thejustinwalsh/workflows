# Security

## Reporting vulnerabilities

Please report security issues via GitHub Issues on this repository.

## Scope

These composite actions run in your CI environment with the permissions you grant them. They:

- **Read** your git history and workspace files to generate changesets
- **Write** changeset files to your repo (via `git push` from the PR branch)
- **Use** `GITHUB_TOKEN` to create PRs, tags, and releases
- **Optionally use** `COPILOT_PAT` to enhance changelogs via GitHub Copilot CLI

They do not transmit data to external services beyond GitHub's own APIs.

## Pinning

Pin to an exact version tag (e.g. `@v1.2.0`) for maximum reproducibility. The floating major tag (`@v1`) includes all minor and patch updates automatically.
