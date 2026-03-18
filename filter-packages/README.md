# filter-packages

Filter a JSON package array by name pattern, scope, or exclusion list. Designed to work with the `published-packages` and `tagged-packages` outputs from the [release](../release) action.

Use this to select specific packages for downstream matrix jobs without allocating runners for packages you don't care about.

## Usage

### Filter by scope

```yaml
- id: filter
  uses: thejustinwalsh/workflows/filter-packages@v1
  with:
    packages: ${{ needs.release.outputs.tagged-packages }}
    filter: "@acme/*"
```

### Exact match

```yaml
- id: filter
  uses: thejustinwalsh/workflows/filter-packages@v1
  with:
    packages: ${{ needs.release.outputs.tagged-packages }}
    filter: "@acme/cli"
```

### Comma-separated list

```yaml
- id: filter
  uses: thejustinwalsh/workflows/filter-packages@v1
  with:
    packages: ${{ needs.release.outputs.tagged-packages }}
    filter: "@acme/cli,@acme/web"
```

### Scope with exclusions

```yaml
- id: filter
  uses: thejustinwalsh/workflows/filter-packages@v1
  with:
    packages: ${{ needs.release.outputs.tagged-packages }}
    filter: "@acme/*"
    exclude: "@acme/dashboard,@acme/docs"
```

### Use as a matrix source

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    outputs:
      published: ${{ steps.release.outputs.published }}
      tagged: ${{ steps.release.outputs.tagged-packages }}
    steps:
      - id: release
        uses: thejustinwalsh/workflows/release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy:
    needs: release
    if: needs.release.outputs.published == 'true'
    runs-on: ubuntu-latest
    steps:
      - id: filter
        uses: thejustinwalsh/workflows/filter-packages@v1
        with:
          packages: ${{ needs.release.outputs.tagged }}
          filter: "@acme/platform-*"

      - if: steps.filter.outputs.empty == 'false'
        run: echo "Deploying ${{ steps.filter.outputs.count }} platform packages"
        # Use steps.filter.outputs.packages as matrix input in a downstream job
```

### Check if a specific package was released

```yaml
- id: check
  uses: thejustinwalsh/workflows/filter-packages@v1
  with:
    packages: ${{ needs.release.outputs.tagged-packages }}
    filter: "@acme/cli"

- if: steps.check.outputs.empty == 'false'
  run: echo "CLI was released — build installer"
```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `packages` | (required) | JSON `[{name, version}]` array — typically from release action outputs |
| `filter` | `*` | Name pattern: exact (`@acme/cli`), scope glob (`@acme/*`), or comma-separated list |
| `exclude` | `""` | Names to exclude — same format as filter |

## Outputs

| Output | Description |
|--------|-------------|
| `packages` | Filtered JSON array |
| `count` | Number of packages that matched |
| `empty` | `true` if nothing matched — use to skip downstream jobs |
