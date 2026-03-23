#!/usr/bin/env node
/**
 * Generate release notes for a changesets fixed group.
 *
 * Reads .changeset/config.json to find the fixed group, discovers workspace
 * packages, extracts CHANGELOG.md sections for the group's current version,
 * and outputs JSON with the tag and combined release body.
 *
 * Usage:
 *   node fixed-release.mjs --fixed-group 0 --tag-prefix v --repo owner/repo
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// --- Argument parsing ---

function parseArgs() {
	const args = process.argv.slice(2);
	let fixedGroup = 0;
	let tagPrefix = "v";
	let repo = "";

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--fixed-group" && args[i + 1]) fixedGroup = Number(args[++i]);
		else if (args[i] === "--tag-prefix" && args[i + 1]) tagPrefix = args[++i];
		else if (args[i] === "--repo" && args[i + 1]) repo = args[++i];
	}

	return { fixedGroup, tagPrefix, repo };
}

// --- Workspace discovery ---
// NOTE: This function is duplicated in release/collect-tagged.mjs and
// generate-changesets/generate.mjs. If you change the workspace resolution
// logic, update all files.

function getWorkspaceEntries(root) {
	try {
		const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
		const ws = pkg.workspaces;
		if (Array.isArray(ws)) return ws;
		if (ws && Array.isArray(ws.packages)) return ws.packages;
	} catch {}
	try {
		const yaml = readFileSync(join(root, "pnpm-workspace.yaml"), "utf-8");
		const entries = [];
		for (const line of yaml.split("\n")) {
			const match = line.match(/^\s*-\s*['"]?([^'"}\s]+)/);
			if (match) entries.push(match[1]);
		}
		if (entries.length > 0) return entries;
	} catch {}
	return [];
}

function listPackages(root) {
	const packages = [];
	for (const entry of getWorkspaceEntries(root)) {
		const dirs = [];
		if (entry.endsWith("/*")) {
			const parent = entry.slice(0, -2);
			const absParent = join(root, parent);
			if (!existsSync(absParent)) continue;
			for (const child of readdirSync(absParent)) {
				dirs.push(join(parent, child));
			}
		} else {
			dirs.push(entry.replace(/\/$/, ""));
		}
		for (const dir of dirs) {
			const pkgPath = join(root, dir, "package.json");
			if (!existsSync(pkgPath)) continue;
			try {
				const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
				if (pkg.name) {
					packages.push({ name: pkg.name, version: pkg.version, dir });
				}
			} catch {}
		}
	}
	return packages;
}

// --- Changelog extraction ---

/**
 * Extract the content for a specific version from a CHANGELOG.md file.
 * Returns the text between `## {version}` and the next `## ` heading (or EOF).
 * Returns null if the version heading is not found or the section is empty.
 */
function extractVersionEntry(changelogPath, version) {
	if (!existsSync(changelogPath)) return null;

	const content = readFileSync(changelogPath, "utf-8");
	const lines = content.split("\n");

	let capturing = false;
	const captured = [];

	for (const line of lines) {
		if (capturing) {
			// Stop at the next version heading
			if (/^## /.test(line)) break;
			captured.push(line);
		} else if (line.trim() === `## ${version}`) {
			capturing = true;
		}
	}

	if (!capturing) return null;

	const text = captured.join("\n").trim();
	return text.length > 0 ? text : null;
}

// --- Main ---

function main() {
	const { fixedGroup, tagPrefix, repo } = parseArgs();
	const root = process.cwd();

	// Read changeset config
	const configPath = join(root, ".changeset", "config.json");
	if (!existsSync(configPath)) {
		console.error("Error: .changeset/config.json not found");
		process.exit(1);
	}

	const config = JSON.parse(readFileSync(configPath, "utf-8"));
	const fixedGroups = config.fixed || [];

	if (fixedGroups.length === 0) {
		console.error("Error: no fixed groups defined in .changeset/config.json");
		process.exit(1);
	}

	if (fixedGroup < 0 || fixedGroup >= fixedGroups.length) {
		console.error(`Error: fixed group index ${fixedGroup} is out of range (0..${fixedGroups.length - 1})`);
		process.exit(1);
	}

	const groupPackageNames = fixedGroups[fixedGroup];

	// Discover workspace packages
	const allPackages = listPackages(root);
	const packagesByName = new Map(allPackages.map((p) => [p.name, p]));

	// Resolve fixed group packages
	const groupPackages = [];
	for (const name of groupPackageNames) {
		const pkg = packagesByName.get(name);
		if (!pkg) {
			console.error(`Error: fixed group package "${name}" not found in workspace`);
			process.exit(1);
		}
		groupPackages.push(pkg);
	}

	// Determine version from the first package (all same in a fixed group)
	const version = groupPackages[0].version;
	const tag = `${tagPrefix}${version}`;

	// Build release notes
	const sections = [];
	for (const pkg of groupPackages) {
		const changelogPath = join(root, pkg.dir, "CHANGELOG.md");
		const entry = extractVersionEntry(changelogPath, version);
		if (!entry) continue;

		const tagLink = repo
			? `[${pkg.name}](https://github.com/${repo}/tree/${pkg.name}@${version})`
			: pkg.name;

		sections.push(`## ${tagLink}\n\n${entry}`);
	}

	const body = sections.length > 0
		? sections.join("\n\n")
		: "No changelog entries for this version.";

	console.log(JSON.stringify({ version, tag, body }));
}

main();
