import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const COLLECT_TAGGED = join(import.meta.dirname, "../release/collect-tagged.mjs");

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

function writePnpmWorkspace(entries) {
	const lines = ["packages:"].concat(entries.map((e) => `  - "${e}"`));
	writeFileSync(join(testDir, "pnpm-workspace.yaml"), lines.join("\n"));
}

function runCollectTagged(published = []) {
	const out = execFileSync("node", [COLLECT_TAGGED], {
		encoding: "utf-8",
		cwd: testDir,
		env: { ...process.env, CHANGESETS_PUBLISHED: JSON.stringify(published) },
	});
	return JSON.parse(out.trim());
}

describe("workspace discovery — npm/bun workspaces with glob", () => {
	it("discovers packages under packages/*", () => {
		writeRoot({ name: "root", workspaces: ["packages/*"] });
		writePkg("packages/shared", { name: "@test/shared", version: "1.0.0", private: true });
		writePkg("packages/web", { name: "@test/web", version: "1.0.0", private: true });

		const result = runCollectTagged();
		assert.equal(result.length, 2);
		assert.ok(result.some((p) => p.name === "@test/shared"));
		assert.ok(result.some((p) => p.name === "@test/web"));
	});

	it("skips directories without package.json", () => {
		writeRoot({ name: "root", workspaces: ["packages/*"] });
		writePkg("packages/real", { name: "@test/real", version: "1.0.0", private: true });
		mkdirSync(join(testDir, "packages/empty"), { recursive: true });

		const result = runCollectTagged();
		assert.equal(result.length, 1);
	});
});

describe("workspace discovery — direct path entries", () => {
	it("discovers packages at direct paths", () => {
		writeRoot({ name: "root", workspaces: ["my-action", "my-release"] });
		writePkg("my-action", { name: "@test/action", version: "2.0.0", private: true });
		writePkg("my-release", { name: "@test/release", version: "2.0.0", private: true });

		const result = runCollectTagged();
		assert.equal(result.length, 2);
	});
});

describe("workspace discovery — yarn classic object form", () => {
	it("reads workspaces.packages array", () => {
		writeRoot({ name: "root", workspaces: { packages: ["packages/*"] } });
		writePkg("packages/core", { name: "@test/core", version: "1.0.0", private: true });

		const result = runCollectTagged();
		assert.equal(result.length, 1);
		assert.equal(result[0].name, "@test/core");
	});
});

describe("workspace discovery — pnpm-workspace.yaml", () => {
	it("reads pnpm workspace entries", () => {
		writeRoot({ name: "root" }); // no workspaces field
		writePnpmWorkspace(["packages/*"]);
		writePkg("packages/lib", { name: "@test/lib", version: "1.0.0", private: true });

		const result = runCollectTagged();
		assert.equal(result.length, 1);
	});
});

describe("mixed workspace patterns", () => {
	it("handles glob + direct paths together", () => {
		writeRoot({ name: "root", workspaces: ["packages/*", "my-tool"] });
		writePkg("packages/core", { name: "@test/core", version: "1.0.0", private: true });
		writePkg("my-tool", { name: "@test/tool", version: "1.0.0", private: true });

		const result = runCollectTagged();
		assert.equal(result.length, 2);
	});

	it("handles nonexistent workspace dir gracefully", () => {
		writeRoot({ name: "root", workspaces: ["packages/*", "does-not-exist/*"] });
		writePkg("packages/core", { name: "@test/core", version: "1.0.0", private: true });

		const result = runCollectTagged();
		assert.equal(result.length, 1);
	});
});
