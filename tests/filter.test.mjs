import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const FILTER = resolve(import.meta.dirname, "../filter-packages/filter.mjs");

function run(packages, filter = "*", exclude = "") {
	const args = ["--packages", JSON.stringify(packages)];
	if (filter) args.push("--filter", filter);
	if (exclude) args.push("--exclude", exclude);
	const out = execFileSync("node", [FILTER, ...args], { encoding: "utf-8" });
	return JSON.parse(out.trim());
}

const PACKAGES = [
	{ name: "@acme/core", version: "1.0.0" },
	{ name: "@acme/cli", version: "1.0.0" },
	{ name: "@acme/web", version: "1.0.0" },
	{ name: "@acme/dashboard", version: "1.0.0" },
	{ name: "@other/lib", version: "2.0.0" },
];

describe("filter-packages", () => {
	it("wildcard returns all", () => {
		assert.equal(run(PACKAGES, "*").length, 5);
	});

	it("exact match returns one", () => {
		const result = run(PACKAGES, "@acme/cli");
		assert.equal(result.length, 1);
		assert.equal(result[0].name, "@acme/cli");
	});

	it("scope glob matches prefix", () => {
		const result = run(PACKAGES, "@acme/*");
		assert.equal(result.length, 4);
		assert.ok(result.every((p) => p.name.startsWith("@acme/")));
	});

	it("comma-separated matches multiple", () => {
		const result = run(PACKAGES, "@acme/core,@acme/cli");
		assert.equal(result.length, 2);
	});

	it("exclude removes specific packages", () => {
		const result = run(PACKAGES, "@acme/*", "@acme/dashboard");
		assert.equal(result.length, 3);
		assert.ok(!result.some((p) => p.name === "@acme/dashboard"));
	});

	it("exclude with comma-separated list", () => {
		const result = run(PACKAGES, "*", "@acme/dashboard,@other/lib");
		assert.equal(result.length, 3);
	});

	it("no match returns empty array", () => {
		assert.equal(run(PACKAGES, "@nonexistent/*").length, 0);
	});

	it("empty input returns empty", () => {
		assert.equal(run([], "*").length, 0);
	});

	it("preserves all fields", () => {
		const result = run(PACKAGES, "@other/lib");
		assert.equal(result[0].version, "2.0.0");
	});
});
