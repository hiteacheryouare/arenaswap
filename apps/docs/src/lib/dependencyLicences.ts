import fs from 'node:fs';
import path from 'node:path';

// Read at build time from the workspace manifests and from each package's own package.json, because
// a hand-typed licence list on a legal page is a list that is wrong by the next `npm install`.
//
// Both `dependencies` and `devDependencies`, deliberately: the split in a manifest says nothing
// about what reaches a browser. React, Bootstrap and Bootstrap Icons are devDependencies of the
// extension and all three ship inside the popup. Rather than guess which half of each manifest ends
// up in a bundle, this lists everything the project depends on directly and claims nothing about
// where each package ends up.

// Resolved from the working directory rather than from `import.meta.url`: this module is bundled
// into a prerender chunk whose path bears no relation to its source path.
const repoRoot = path.resolve(process.cwd(), '../../');

const workspaces = [
	'',
	'apps/docs/',
	'apps/extension/',
	'packages/core/',
	'packages/powerscore/',
	'packages/ui/',
];

export interface Dependency {
	name: string;
	version: string;
	licence: string;
	/** The package's declared homepage, or its npm page when it declares none. */
	url: string;
}

// ArenaSwap's own workspaces, covered by the ISC section rather than by this list.
const isOwn = (name: string) => name.startsWith('@arenaswap/') || name === 'powerscore';

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));

// npm hoists to the root, but a version conflict leaves a copy inside the workspace, so look there
// first.
const resolveInstalled = (name: string, workspace: string) => {
	for (const candidate of [`${workspace}node_modules/${name}`, `node_modules/${name}`]) {
		const file = path.join(repoRoot, candidate, 'package.json');
		if (fs.existsSync(file)) return readJson(file);
	}
	// Loudly, on purpose: a legal page that quietly drops a dependency it could not resolve is worse
	// than a build that stops.
	throw new Error(`Cannot resolve ${name} for the licence list. Run npm install.`);
};

// A package's own `homepage` is where its author wants you sent — docs for astro and react, a
// README for the smaller ones. npm is the fallback for the handful that declare nothing.
const urlOf = (pkg: Record<string, unknown>, name: string): string => (
	typeof pkg.homepage === 'string' && pkg.homepage.startsWith('http')
		? pkg.homepage
		: `https://www.npmjs.com/package/${name}`
);

const licenceOf = (pkg: Record<string, unknown>): string => {
	const { license } = pkg;
	if (typeof license === 'string') return license;
	if (license && typeof license === 'object' && 'type' in license) return String(license.type);
	throw new Error(`${String(pkg.name)} declares no licence.`);
};

/** Every direct dependency of every workspace, de-duplicated and sorted by name. */
export const directDependencies = (): Dependency[] => {
	const found = new Map<string, Dependency>();

	for (const workspace of workspaces) {
		const manifest = readJson(path.join(repoRoot, workspace, 'package.json'));

		for (const section of ['dependencies', 'devDependencies'] as const) {
			for (const name of Object.keys(manifest[section] ?? {})) {
				if (isOwn(name) || found.has(name)) continue;
				const pkg = resolveInstalled(name, workspace);
				found.set(name, {
					name,
					version: String(pkg.version),
					licence: licenceOf(pkg),
					url: urlOf(pkg, name),
				});
			}
		}
	}

	return [...found.values()].toSorted((a, b) => a.name.localeCompare(b.name));
};
