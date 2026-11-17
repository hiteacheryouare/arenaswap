import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '../../');

const workspaces = [
	'',
	'apps/docs/',
	'apps/extension/',
	'apps/film/',
	'packages/chromatic/',
	'packages/core/',
	'packages/powerscore/',
	'packages/powerscore-tools/',
	'packages/sideline/',
	'packages/ui/',
];

export interface Dependency {
	name: string;
	version: string;
	licence: string;
	url: string;
}

const isOwn = (name: string) => name.startsWith('@arenaswap/') || name === 'powerscore';

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));

const resolveInstalled = (name: string, workspace: string) => {
	for (const candidate of [`${workspace}node_modules/${name}`, `node_modules/${name}`]) {
		const file = path.join(repoRoot, candidate, 'package.json');
		if (fs.existsSync(file)) return readJson(file);
	}
	throw new Error(`Cannot resolve ${name} for the licence list. Run npm install.`);
};

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
