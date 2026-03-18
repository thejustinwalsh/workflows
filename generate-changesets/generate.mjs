#!/usr/bin/env node
/**
 * Generates changesets from conventional commits on a PR branch.
 *
 * Parses commits between a base branch and HEAD, maps changed files to
 * packages, determines semver bump types, and writes
 * `.changeset/auto-<package>-<id>.md` files (one per package).
 *
 * Discovers packages by scanning directories listed in the workspace
 * globs from package.json (or pnpm-workspace.yaml), falling back to
 * packages/ and apps/.
 *
 * Usage:
 *   node generate.mjs --branch jw/my-feature
 *   node generate.mjs --branch jw/my-feature --base origin/main --cap-major
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const CHANGESET_DIR = join(ROOT, ".changeset");
const MAX_TS = 9999999999;

let capMajor = false;

// --- Conventional commit → bump mapping ---

const BUMP_MAP = {
	feat: "minor",
	fix: "patch",
	perf: "patch",
	refactor: "patch",
};

const SKIP_TYPES = new Set(["docs", "test", "ci", "chore", "style", "build"]);

// --- Branch ID ---

function branchId(base) {
	try {
		const output = execSync(`git log --format="%ct" --reverse ${base}..HEAD`, {
			cwd: ROOT, encoding: "utf-8",
		}).trim();
		const firstLine = output.split("\n")[0];
		if (!firstLine) return MAX_TS.toString(36).padStart(7, "0");
		const ts = parseInt(firstLine, 10);
		return (MAX_TS - ts).toString(36).padStart(7, "0");
	} catch {
		return MAX_TS.toString(36).padStart(7, "0");
	}
}

// --- Package discovery ---

function getWorkspaceDirs() {
	// Try package.json workspaces
	try {
		const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
		if (Array.isArray(pkg.workspaces)) {
			return pkg.workspaces.map((w) => w.replace(/\/\*$/, ""));
		}
	} catch {}

	// Try pnpm-workspace.yaml
	try {
		const yaml = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf-8");
		const dirs = [];
		for (const line of yaml.split("\n")) {
			const match = line.match(/^\s*-\s*['"]?([^'"*\s]+)/);
			if (match) dirs.push(match[1].replace(/\/\*$/, ""));
		}
		if (dirs.length > 0) return dirs;
	} catch {}

	// Fallback
	return ["packages", "apps"];
}

function discoverPackages() {
	const mapping = new Map();
	for (const dir of getWorkspaceDirs()) {
		const absDir = join(ROOT, dir);
		if (!existsSync(absDir)) continue;
		for (const entry of readdirSync(absDir)) {
			const pkgPath = join(absDir, entry, "package.json");
			if (!existsSync(pkgPath)) continue;
			try {
				const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
				if (pkg.name) {
					mapping.set(`${dir}/${entry}/`, pkg.name);
				}
			} catch {}
		}
	}
	return mapping;
}

// --- Git helpers ---

function getCommitRange(base) {
	try {
		const output = execSync(`git log --format="%H" ${base}..HEAD`, {
			cwd: ROOT, encoding: "utf-8",
		}).trim();
		if (!output) return [];
		return output.split("\n").map((s) => s.trim());
	} catch {
		return [];
	}
}

function getCommitMessage(sha) {
	const subject = execSync(`git log --format="%s" -1 ${sha}`, {
		cwd: ROOT, encoding: "utf-8",
	}).trim();
	const body = execSync(`git log --format="%b" -1 ${sha}`, {
		cwd: ROOT, encoding: "utf-8",
	}).trim();
	return { subject, body };
}

function getChangedFiles(sha) {
	try {
		const output = execSync(`git diff-tree --no-commit-id --name-only -r ${sha}`, {
			cwd: ROOT, encoding: "utf-8",
		}).trim();
		if (!output) return [];
		return output.split("\n").map((f) => f.trim());
	} catch {
		return [];
	}
}

function getShortStat(sha) {
	try {
		return execSync(`git diff-tree --no-commit-id --shortstat -r ${sha}`, {
			cwd: ROOT, encoding: "utf-8",
		}).trim();
	} catch {
		return "";
	}
}

// --- Conventional commit parsing ---

const CONVENTIONAL_RE = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)/;

function parseConventionalCommit(sha, packageMap) {
	const { subject, body } = getCommitMessage(sha);
	const match = subject.match(CONVENTIONAL_RE);
	if (!match) return null;

	const [, type, scope, bang, description] = match;
	const breakingInBody = body.includes("BREAKING CHANGE");
	const breaking = !!bang || breakingInBody;

	let bump = breaking ? "major" : (BUMP_MAP[type] ?? null);
	if (bump && capMajor && bump === "major") bump = "minor";

	if (!bump && SKIP_TYPES.has(type)) return null;

	const files = getChangedFiles(sha);
	const packages = mapFilesToPackages(files, packageMap);
	if (packages.length === 0) return null;

	return { sha, type, scope: scope || null, breaking, description, body, bump, files, shortstat: getShortStat(sha), packages };
}

function mapFilesToPackages(files, packageMap) {
	const matched = new Set();
	for (const file of files) {
		for (const [prefix, name] of packageMap) {
			if (file.startsWith(prefix)) matched.add(name);
		}
	}
	return [...matched];
}

// --- Aggregation ---

const BUMP_ORDER = { patch: 1, minor: 2, major: 3 };

function highestBump(a, b) {
	return BUMP_ORDER[a] >= BUMP_ORDER[b] ? a : b;
}

function aggregateByPackage(commits) {
	const map = new Map();
	for (const commit of commits) {
		if (!commit.bump) continue;
		for (const pkg of commit.packages) {
			const existing = map.get(pkg);
			if (existing) {
				existing.bump = highestBump(existing.bump, commit.bump);
				existing.commits.push(commit);
			} else {
				map.set(pkg, { name: pkg, bump: commit.bump, commits: [commit] });
			}
		}
	}
	return [...map.values()];
}

// --- Changeset file generation ---

function sanitizeName(name) {
	return name.replace(/[@/]/g, "-").replace(/^-+/, "");
}

function generateChangesetContent(changeset, meta) {
	const { name, bump, commits } = changeset;
	const frontmatter = `---\n"${name}": ${bump}\n---`;

	const metaLines = [`> Branch: ${meta.branch}`];
	if (meta.repo && meta.pr) {
		metaLines.push(`> PR: https://github.com/${meta.repo}/pull/${meta.pr}`);
	}

	const entries = commits.map((c) => {
		const lines = [`### ${c.sha}`, `${c.type}: ${c.description}`];
		if (c.body) lines.push(c.body);
		lines.push(`Files: ${c.files.join(", ")}`);
		if (c.shortstat) lines.push(`Stats: ${c.shortstat}`);
		return lines.join("\n");
	});

	return `${frontmatter}\n\n${metaLines.join("\n")}\n\n${entries.join("\n\n")}\n`;
}

function cleanBranchChangesets(id) {
	if (!existsSync(CHANGESET_DIR)) return;
	const suffix = `-${id}.md`;
	for (const file of readdirSync(CHANGESET_DIR)) {
		if (file.startsWith("auto-") && file.endsWith(suffix)) {
			rmSync(join(CHANGESET_DIR, file));
		}
	}
}

function writeChangeset(id, changeset, meta) {
	const filename = `auto-${sanitizeName(changeset.name)}-${id}.md`;
	const filepath = join(CHANGESET_DIR, filename);
	writeFileSync(filepath, generateChangesetContent(changeset, meta));
	console.log(`  ${changeset.bump} ${changeset.name} → .changeset/${filename}`);
}

// --- Main ---

function parseArgs() {
	const args = process.argv.slice(2);
	let base = "origin/main";
	let branch = null;
	let repo = null;
	let pr = null;
	let cap = false;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--base" && args[i + 1]) { base = args[++i]; }
		else if (args[i] === "--branch" && args[i + 1]) { branch = args[++i]; }
		else if (args[i] === "--repo" && args[i + 1]) { repo = args[++i]; }
		else if (args[i] === "--pr" && args[i + 1]) { pr = parseInt(args[++i], 10); }
		else if (args[i] === "--cap-major") { cap = true; }
	}
	return { base, branch, repo, pr, capMajor: cap };
}

function main() {
	const args = parseArgs();
	capMajor = args.capMajor;

	if (!args.branch) {
		console.error("Error: --branch <name> is required");
		process.exit(1);
	}

	const id = branchId(args.base);
	console.log(`Scanning conventional commits: ${args.base}..HEAD (branch: ${args.branch}, id: ${id})\n`);

	const packageMap = discoverPackages();
	if (packageMap.size === 0) {
		console.log("No packages found.");
		return;
	}
	console.log("Packages:", [...packageMap.values()].join(", "), "\n");

	const shas = getCommitRange(args.base);
	if (shas.length === 0) {
		console.log("No commits found in range.");
		cleanBranchChangesets(id);
		return;
	}
	console.log(`Found ${shas.length} commit(s)\n`);

	const commits = [];
	for (const sha of shas) {
		const parsed = parseConventionalCommit(sha, packageMap);
		if (parsed) commits.push(parsed);
	}

	if (commits.length === 0) {
		console.log("No conventional commits that affect packages.");
		cleanBranchChangesets(id);
		return;
	}

	const changesets = aggregateByPackage(commits);
	const meta = { branch: args.branch, repo: args.repo ?? undefined, pr: args.pr ?? undefined };

	cleanBranchChangesets(id);
	console.log(`Generating ${changesets.length} changeset(s):\n`);
	for (const cs of changesets) {
		writeChangeset(id, cs, meta);
	}
	console.log("\nDone.");
}

main();
