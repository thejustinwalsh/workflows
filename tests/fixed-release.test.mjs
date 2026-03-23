import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const FIXED_RELEASE = join(import.meta.dirname, "../fixed-github-release/fixed-release.mjs");

let testDir;

beforeEach(() => {
	testDir = join(tmpdir(), `wf-test-${process.pid}-${Date.now()}`);
	mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
	rmSync(testDir, { recursive: true, force: true });
});

function writePkg(dir, pkg) {
	const absDir = join(testDir, dir);
	mkdirSync(absDir, { recursive: true });
	writeFileSync(join(absDir, "package.json"), JSON.stringify(pkg));
}

function writeRoot(pkg) {
	writeFileSync(join(testDir, "package.json"), JSON.stringify(pkg));
}

function writeChangsetConfig(config) {
	const dir = join(testDir, ".changeset");
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "config.json"), JSON.stringify(config));
}

function writeChangelog(dir, content) {
	const absDir = join(testDir, dir);
	mkdirSync(absDir, { recursive: true });
	writeFileSync(join(absDir, "CHANGELOG.md"), content);
}

function runFixedRelease(args = []) {
	const out = execFileSync("node", [FIXED_RELEASE, ...args], {
		encoding: "utf-8",
		cwd: testDir,
	});
	return JSON.parse(out.trim());
}

function runFixedReleaseError(args = []) {
	try {
		execFileSync("node", [FIXED_RELEASE, ...args], {
			encoding: "utf-8",
			cwd: testDir,
			stdio: ["pipe", "pipe", "pipe"],
		});
		return null;
	} catch (err) {
		return err.stderr;
	}
}

// --- Test fixtures ---

function setupBasicWorkspace() {
	writeRoot({ name: "root", workspaces: ["packages/*"] });
	writeChangsetConfig({
		fixed: [["@test/core", "@test/utils"]],
	});
	writePkg("packages/core", { name: "@test/core", version: "2.3.0" });
	writePkg("packages/utils", { name: "@test/utils", version: "2.3.0" });
}

const CORE_CHANGELOG = `# @test/core

## 2.3.0

### Minor Changes

- [\`abc1234\`](https://github.com/test/repo/commit/abc1234) Thanks [@dev](https://github.com/dev)! - feat: add new feature

## 2.2.0

### Patch Changes

- old stuff
`;

const UTILS_CHANGELOG = `# @test/utils

## 2.3.0

### Patch Changes

- [\`def5678\`](https://github.com/test/repo/commit/def5678) Thanks [@dev](https://github.com/dev)! - fix: bug fix

## 2.2.0

### Minor Changes

- old stuff
`;

// --- Tests ---

describe("fixed-release — basic functionality", () => {
	it("extracts changelog entries for the fixed group version", () => {
		setupBasicWorkspace();
		writeChangelog("packages/core", CORE_CHANGELOG);
		writeChangelog("packages/utils", UTILS_CHANGELOG);

		const result = runFixedRelease(["--fixed-group", "0", "--repo", "test/repo"]);
		assert.equal(result.version, "2.3.0");
		assert.equal(result.tag, "v2.3.0");
		assert.ok(result.body.includes("feat: add new feature"));
		assert.ok(result.body.includes("fix: bug fix"));
	});

	it("includes per-package tag links in headings", () => {
		setupBasicWorkspace();
		writeChangelog("packages/core", CORE_CHANGELOG);
		writeChangelog("packages/utils", UTILS_CHANGELOG);

		const result = runFixedRelease(["--fixed-group", "0", "--repo", "test/repo"]);
		assert.ok(result.body.includes("[@test/core](https://github.com/test/repo/tree/@test/core@2.3.0)"));
		assert.ok(result.body.includes("[@test/utils](https://github.com/test/repo/tree/@test/utils@2.3.0)"));
	});

	it("uses package name without link when --repo is omitted", () => {
		setupBasicWorkspace();
		writeChangelog("packages/core", CORE_CHANGELOG);

		const result = runFixedRelease(["--fixed-group", "0"]);
		assert.ok(result.body.includes("## @test/core\n"));
		assert.ok(!result.body.includes("## [@test/core]"));
	});
});

describe("fixed-release — tag prefix", () => {
	it("defaults to v prefix", () => {
		setupBasicWorkspace();
		writeChangelog("packages/core", CORE_CHANGELOG);

		const result = runFixedRelease(["--fixed-group", "0"]);
		assert.equal(result.tag, "v2.3.0");
	});

	it("supports custom tag prefix", () => {
		setupBasicWorkspace();
		writeChangelog("packages/core", CORE_CHANGELOG);

		const result = runFixedRelease(["--fixed-group", "0", "--tag-prefix", "core@"]);
		assert.equal(result.tag, "core@2.3.0");
	});
});

describe("fixed-release — skips empty/missing changelogs", () => {
	it("skips packages with missing CHANGELOG.md", () => {
		setupBasicWorkspace();
		writeChangelog("packages/core", CORE_CHANGELOG);
		// utils has no CHANGELOG.md

		const result = runFixedRelease(["--fixed-group", "0"]);
		assert.ok(result.body.includes("@test/core"));
		assert.ok(!result.body.includes("@test/utils"));
	});

	it("skips packages with empty version section", () => {
		setupBasicWorkspace();
		writeChangelog("packages/core", CORE_CHANGELOG);
		writeChangelog("packages/utils", `# @test/utils\n\n## 2.3.0\n\n## 2.2.0\n\n### Patch Changes\n\n- old\n`);

		const result = runFixedRelease(["--fixed-group", "0"]);
		assert.ok(result.body.includes("@test/core"));
		assert.ok(!result.body.includes("@test/utils"));
	});

	it("returns fallback body when all changelogs are empty", () => {
		setupBasicWorkspace();
		// No changelogs written

		const result = runFixedRelease(["--fixed-group", "0"]);
		assert.equal(result.body, "No changelog entries for this version.");
	});
});

describe("fixed-release — multiple fixed groups", () => {
	it("selects the correct fixed group by index", () => {
		writeRoot({ name: "root", workspaces: ["packages/*"] });
		writeChangsetConfig({
			fixed: [
				["@test/core", "@test/utils"],
				["@test/plugins-a", "@test/plugins-b"],
			],
		});
		writePkg("packages/core", { name: "@test/core", version: "2.3.0" });
		writePkg("packages/utils", { name: "@test/utils", version: "2.3.0" });
		writePkg("packages/plugins-a", { name: "@test/plugins-a", version: "1.5.0" });
		writePkg("packages/plugins-b", { name: "@test/plugins-b", version: "1.5.0" });
		writeChangelog("packages/plugins-a", `# @test/plugins-a\n\n## 1.5.0\n\n### Minor Changes\n\n- plugin feature\n`);

		const result = runFixedRelease(["--fixed-group", "1"]);
		assert.equal(result.version, "1.5.0");
		assert.ok(result.body.includes("plugin feature"));
		assert.ok(!result.body.includes("@test/core"));
	});
});

describe("fixed-release — error cases", () => {
	it("errors when .changeset/config.json is missing", () => {
		writeRoot({ name: "root", workspaces: [] });
		const stderr = runFixedReleaseError(["--fixed-group", "0"]);
		assert.ok(stderr.includes("config.json not found"));
	});

	it("errors when no fixed groups are defined", () => {
		writeRoot({ name: "root", workspaces: [] });
		writeChangsetConfig({ fixed: [] });
		const stderr = runFixedReleaseError(["--fixed-group", "0"]);
		assert.ok(stderr.includes("no fixed groups"));
	});

	it("errors on invalid fixed group index", () => {
		setupBasicWorkspace();
		const stderr = runFixedReleaseError(["--fixed-group", "5"]);
		assert.ok(stderr.includes("out of range"));
	});

	it("errors when fixed group package is not in workspace", () => {
		writeRoot({ name: "root", workspaces: ["packages/*"] });
		writeChangsetConfig({
			fixed: [["@test/core", "@test/missing"]],
		});
		writePkg("packages/core", { name: "@test/core", version: "1.0.0" });
		// @test/missing has no package.json

		const stderr = runFixedReleaseError(["--fixed-group", "0"]);
		assert.ok(stderr.includes("@test/missing"));
		assert.ok(stderr.includes("not found"));
	});
});

describe("fixed-release — does not include content from other versions", () => {
	it("only extracts the target version section", () => {
		setupBasicWorkspace();
		writeChangelog("packages/core", CORE_CHANGELOG);

		const result = runFixedRelease(["--fixed-group", "0"]);
		assert.ok(result.body.includes("feat: add new feature"));
		assert.ok(!result.body.includes("old stuff"));
	});
});
