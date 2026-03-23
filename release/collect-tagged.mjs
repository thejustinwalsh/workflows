#!/usr/bin/env node
/**
 * Workspace discovery and package listing utility.
 * Used by tests to verify workspace resolution logic.
 *
 * Reads the list of npm-published packages from CHANGESETS_PUBLISHED env var,
 * discovers all workspace packages, and outputs the private ones that
 * were not npm-published.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// --- Workspace discovery ---
// NOTE: This function is duplicated in generate-changesets/generate.mjs.
// If you change the workspace resolution logic, update both files.

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
					packages.push({ name: pkg.name, version: pkg.version, private: pkg.private === true });
				}
			} catch {}
		}
	}
	return packages;
}

// --- Main ---

const publishedRaw = process.env.CHANGESETS_PUBLISHED || "[]";
const published = new Set(JSON.parse(publishedRaw).map((p) => p.name));

const tagged = listPackages(process.cwd())
	.filter((pkg) => pkg.private && !published.has(pkg.name))
	.map(({ name, version }) => ({ name, version }));

console.log(JSON.stringify(tagged));
