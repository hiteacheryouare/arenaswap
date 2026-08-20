#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1-}" ]; then
	echo "Usage: $0 <version>"
	echo "Example: $0 1.2.3"
	exit 1
fi

version="$1"

if ! echo "$version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
	echo "Error: version must be in semver format (e.g. 1.2.3)"
	exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
updated=0

while IFS= read -r file; do
	if [[ "$file" == *"/node_modules/"* ]]; then
		continue
	fi

	current=$(grep -m1 '"version"' "$file" | sed 's/.*"version": *"\([^"]*\)".*/\1/')

	if [ -z "$current" ]; then
		continue
	fi

	tmp="$(mktemp)"
	sed "s/\"version\": \"$current\"/\"version\": \"$version\"/" "$file" > "$tmp"
	mv "$tmp" "$file"

	echo "  $file  $current ~> $version"
	updated=$((updated + 1))
done < <(find "$root" -name "package.json" \
	-not -path "*/node_modules/*" \
	-not -path "*/.output/*" \
	-not -path "*/dist/*" \
	-not -path "*/.astro/*")

readme=""
if [ -f "$root/.github/README.md" ]; then
	readme="$root/.github/README.md"
elif [ -f "$root/README.md" ]; then
	readme="$root/README.md"
fi

if [ -n "$readme" ]; then
	node - "$root" "$version" "$readme" <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
const version = process.argv[3];
const readmePath = process.argv[4];

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const getDependencyVersion = (pkg, name) =>
	pkg.dependencies?.[name] ?? pkg.devDependencies?.[name] ?? '';
const cleanVersion = (value) => String(value || '').replace(/^[^\d]*/, '').split('-')[0];
const majorVersion = (value) => cleanVersion(value).split('.')[0] || '';
const majorMinorVersion = (value) => {
	const parts = cleanVersion(value).split('.');
	if (parts.length < 2) {
		return parts[0] || '';
	}

	return `${parts[0]}.${parts[1]}`;
};

const rootPackage = readJson(path.join(root, 'package.json'));
const extensionPackage = readJson(path.join(root, 'apps/extension/package.json'));
const docsPackage = readJson(path.join(root, 'apps/docs/package.json'));
const tsconfig = readJson(path.join(root, 'tsconfig.base.json'));
const npmVersion = (rootPackage.packageManager || '').match(/^npm@(\d+)/)?.[1] || '';
const esTarget = tsconfig.compilerOptions?.target || '';

const nextBadgeValues = {
	React: majorVersion(getDependencyVersion(extensionPackage, 'react')),
	TypeScript: majorVersion(getDependencyVersion(rootPackage, 'typescript')),
	JavaScript: esTarget,
	WXT: majorMinorVersion(getDependencyVersion(extensionPackage, 'wxt')),
	// Tailwind is a docs-site dependency, not an extension one. Reading it off the extension
	// package silently returned '' and froze the badge instead of failing.
	TailwindCSS: majorVersion(getDependencyVersion(docsPackage, 'tailwindcss')),
	Bootstrap: majorVersion(getDependencyVersion(extensionPackage, 'bootstrap')),
	Turborepo: majorVersion(getDependencyVersion(rootPackage, 'turbo')),
	npm: npmVersion,
	version,
};

const replacements = [
	{ pattern: /(badge\/React-)[^-]+(-61DAFB\?logo=react&logoColor=black\))/g, value: nextBadgeValues.React },
	{ pattern: /(badge\/TypeScript-)[^-]+(-3178C6\?logo=typescript&logoColor=white\))/g, value: nextBadgeValues.TypeScript },
	{ pattern: /(badge\/JavaScript-)[^-]+(-F7DF1E\?logo=javascript&logoColor=black\))/g, value: nextBadgeValues.JavaScript },
	{ pattern: /(badge\/WXT-)[^-]+(-FF6B35\?logo=googlechrome&logoColor=white\))/g, value: nextBadgeValues.WXT },
	{ pattern: /(badge\/TailwindCSS-)[^-]+(-06B6D4\?logo=tailwindcss&logoColor=white\))/g, value: nextBadgeValues.TailwindCSS },
	{ pattern: /(badge\/Bootstrap-)[^-]+(-7952B3\?logo=bootstrap&logoColor=white\))/g, value: nextBadgeValues.Bootstrap },
	{ pattern: /(badge\/Turborepo-)[^-]+(-EF4444\?logo=turborepo&logoColor=white\))/g, value: nextBadgeValues.Turborepo },
	{ pattern: /(badge\/npm-)[^-]+(-CB3837\?logo=npm&logoColor=white\))/g, value: nextBadgeValues.npm },
	{ pattern: /(badge\/version-)[^-]+(-brightgreen\))/g, value: nextBadgeValues.version },
];

let content = fs.readFileSync(readmePath, 'utf8');
let readmeUpdated = false;

// A dependency that moved packages resolves to '' here. Say so rather than leaving a stale badge
// behind, which is how the TailwindCSS badge quietly froze.
for (const [name, value] of Object.entries(nextBadgeValues)) {
	if (!value) {
		console.warn(`  warning: no version resolved for the ${name} badge; leaving it unchanged`);
	}
}

for (const { pattern, value } of replacements) {
	if (!value) {
		continue;
	}

	const nextContent = content.replace(pattern, `$1${value}$2`);
	if (nextContent !== content) {
		readmeUpdated = true;
	}
	content = nextContent;
}

if (readmeUpdated) {
	fs.writeFileSync(readmePath, content);
	console.log(`  ${readmePath}  badges synced`);
} else {
	console.log(`  ${readmePath}  badges already synced`);
}
NODE
fi

echo ""
echo "$updated package.json file(s) updated to $version"
