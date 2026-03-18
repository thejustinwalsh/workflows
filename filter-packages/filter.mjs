#!/usr/bin/env node
/**
 * Filters a JSON array of packages by name pattern.
 *
 * Supports:
 *   --filter "*"                     → all packages (default)
 *   --filter "@acme/action"         → exact match
 *   --filter "@acme/*"              → scope prefix match
 *   --filter "@acme/action,@acme/cli" → comma-separated exact matches
 *   --exclude "@acme/dashboard"     → remove specific packages
 *   --exclude "@acme/dashboard,@acme/setup" → comma-separated excludes
 *
 * Usage:
 *   node filter.mjs --packages '[{"name":"@acme/action","version":"1.0.0"}]' --filter '@acme/*'
 */

function parseArgs() {
	const args = process.argv.slice(2);
	let packages = "[]";
	let filter = "*";
	let exclude = "";

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--packages" && args[i + 1]) packages = args[++i];
		else if (args[i] === "--filter" && args[i + 1]) filter = args[++i];
		else if (args[i] === "--exclude" && args[i + 1]) exclude = args[++i];
	}

	return { packages: JSON.parse(packages), filter, exclude };
}

function matchesPattern(name, pattern) {
	if (pattern === "*") return true;
	if (pattern.endsWith("/*")) {
		const prefix = pattern.slice(0, -1); // "@scope/" from "@scope/*"
		return name.startsWith(prefix);
	}
	return name === pattern;
}

function matchesAny(name, patterns) {
	return patterns.some((p) => matchesPattern(name, p));
}

function main() {
	const { packages, filter, exclude } = parseArgs();

	const includePatterns = filter.split(",").map((s) => s.trim()).filter(Boolean);
	const excludePatterns = exclude ? exclude.split(",").map((s) => s.trim()).filter(Boolean) : [];

	const result = packages.filter((pkg) => {
		if (!matchesAny(pkg.name, includePatterns)) return false;
		if (excludePatterns.length > 0 && matchesAny(pkg.name, excludePatterns)) return false;
		return true;
	});

	console.log(JSON.stringify(result));
}

main();
