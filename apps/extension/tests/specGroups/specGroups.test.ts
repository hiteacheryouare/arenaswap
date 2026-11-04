import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { componentAliases, componentStubs } from '../../cypress/componentResolve';

// Turbo caches each Cypress group on its own inputs, so a group that loads a file its inputs leave
// out replays a stale pass. This walks every spec's imports and fails on any such file, and on any
// spec that no group would run.

const extensionDir = path.resolve(__dirname, '../..');
const repoDir = path.resolve(extensionDir, '../..');
const testingTypes = ['component', 'e2e'] as const;
type testingType = typeof testingTypes[number];

interface turboTask {
	dependsOn?: string[];
	inputs?: string[];
}

const readJson = (file: string) => JSON.parse(readFileSync(file, 'utf8'));

const withoutComments = (jsonc: string) => {
	let out = '';
	let inString = false;
	for (let i = 0; i < jsonc.length; i++) {
		const char = jsonc[i];
		if (inString) {
			out += char;
			if (char === '\\') out += jsonc[++i];
			else if (char === '"') inString = false;
		} else if (char === '"') {
			inString = true;
			out += char;
		} else if (char === '/' && jsonc[i + 1] === '/') {
			while (i < jsonc.length && jsonc[i] !== '\n') i++;
			out += '\n';
		} else {
			out += char;
		}
	}
	return out;
};

const readTurbo = (dir: string): Record<string, turboTask> => JSON.parse(withoutComments(readFileSync(path.join(dir, 'turbo.json'), 'utf8'))).tasks;

const tasks = readTurbo(extensionDir);
const rootTasks = readTurbo(repoDir);
const manifest = readJson(path.join(extensionDir, 'package.json'));
const scripts: Record<string, string> = manifest.scripts;
const ciWorkflow = readFileSync(path.join(repoDir, '.github/workflows/ci.yml'), 'utf8');

const runsInCi = (task: string) => new RegExp(`(?<![\\w:])${task}(?![\\w:])`).test(ciWorkflow);

const repoPath = (file: string) => path.relative(repoDir, file).split(path.sep).join('/');

const workspaceDirs: Record<string, string> = Object.fromEntries(readdirSync(path.join(repoDir, 'packages'))
	.map(name => path.join(repoDir, 'packages', name))
	.filter(dir => existsSync(path.join(dir, 'package.json')))
	.map(dir => [readJson(path.join(dir, 'package.json')).name, dir]));

// A workspace dependency's files reach every group through its `^build` hash, test files aside.
const dependencyDirs = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })
	.filter(name => workspaceDirs[name])
	.map(name => `${repoPath(workspaceDirs[name])}/`);
const coveredByDependency = (file: string) => dependencyDirs.some(dir => file.startsWith(dir)) && !/\.(test|spec)\.tsx?$/.test(file);

const isFile = (file: string) => existsSync(file) && statSync(file).isFile();
const scriptCandidates = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx', '/index.js'];
const probe = (base: string, sass: boolean) => {
	const candidates = sass
		? [base, `${base}.scss`, `${base}.css`, path.join(path.dirname(base), `_${path.basename(base)}.scss`), path.join(base, '_index.scss')]
		: scriptCandidates.map(suffix => base + suffix);
	return candidates.find(isFile);
};

const workspaceTarget = (specifier: string) => {
	const match = /^(@arenaswap\/[^/]+|powerscore)(\/.*)?$/.exec(specifier);
	const dir = match && workspaceDirs[match[1]];
	if (!match || !dir) return undefined;
	const exported = readJson(path.join(dir, 'package.json')).exports?.[`.${match[2] ?? ''}`];
	return path.join(dir, typeof exported === 'string' ? exported : match[2] ?? 'src/index.ts');
};

const resolveImport = (specifier: string, importer: string, stubbed: boolean) => {
	const bare = specifier.replace(/\?.*$/, '');
	const sass = importer.endsWith('.scss');
	if (stubbed && componentStubs[bare]) return componentStubs[bare];
	for (const { find, replacement } of componentAliases) {
		const aliased = typeof find === 'string'
			? (bare === find || bare.startsWith(`${find}/`) ? replacement + bare.slice(find.length) : undefined)
			: (find.test(bare) ? bare.replace(find, replacement) : undefined);
		if (aliased) return probe(aliased, sass);
	}
	if (bare.startsWith('.')) return probe(path.resolve(path.dirname(importer), bare), sass);
	const target = workspaceTarget(bare);
	return target ? probe(target, sass) : undefined;
};

const scriptImport = /(?:^|[\s;])(?:import|export)\s+(?!type\s)(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;
const sassImport = /@(?:use|forward|import)\s+['"]([^'"]+)['"]/g;

const importsOf = (file: string) => {
	if (!/\.(tsx?|jsx?|mjs|cjs|scss)$/.test(file)) return [];
	const pattern = file.endsWith('.scss') ? sassImport : scriptImport;
	return Array.from(readFileSync(file, 'utf8').matchAll(pattern), match => match.slice(1).find(Boolean) as string);
};

const loadedFiles = (roots: string[], stubbed: boolean) => {
	const seen = new Set<string>();
	const pending = [...roots];
	while (pending.length) {
		const file = pending.pop() as string;
		if (seen.has(file)) continue;
		seen.add(file);
		for (const specifier of importsOf(file)) {
			const resolved = resolveImport(specifier, file, stubbed);
			if (resolved && !resolved.includes(`${path.sep}node_modules${path.sep}`)) pending.push(resolved);
		}
	}
	return [...seen];
};

const toRepoGlob = (glob: string) => {
	if (glob === '$TURBO_DEFAULT$') return 'apps/extension/**';
	if (glob.startsWith('$TURBO_ROOT$/')) return glob.slice('$TURBO_ROOT$/'.length);
	return `apps/extension/${glob}`;
};

const inputMatcher = (inputs: string[]) => {
	const included = inputs.filter(glob => !glob.startsWith('!')).map(toRepoGlob);
	const excluded = inputs.filter(glob => glob.startsWith('!')).map(glob => toRepoGlob(glob.slice(1)));
	return (file: string) => included.some(glob => path.matchesGlob(file, glob)) && !excluded.some(glob => path.matchesGlob(file, glob));
};

const specsUnder = (dir: string, recursive: boolean): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
	const full = path.join(dir, entry.name);
	if (entry.isDirectory()) return recursive ? specsUnder(full, true) : [];
	return /\.cy\.tsx?$/.test(entry.name) ? [full] : [];
});

const groupFolders = (type: testingType) => readdirSync(path.join(extensionDir, 'cypress', type), { withFileTypes: true })
	.filter(entry => entry.isDirectory())
	.map(entry => entry.name)
	.toSorted();

const supportFiles: Record<testingType, string[]> = {
	component: ['cypress/support/component.ts', 'cypress/support/component-index.html'],
	e2e: ['cypress/support/e2e.ts'],
};

test('npm test reaches the component groups and the guard', () => {
	expect(rootTasks.test.dependsOn).toEqual(expect.arrayContaining(['test:unit', 'test:component']));
	expect(tasks['test:component'].dependsOn).toContain('test:specGroups');
});

test('CI runs this guard', () => {
	expect(runsInCi('test:specGroups')).toBe(true);
});

describe.each(testingTypes)('cypress %s groups', type => {
	const umbrella = type === 'component' ? 'test:component' : 'test:e2e';
	const groups = groupFolders(type);
	const groupTasks = groups.map(group => `${umbrella}:${group}`);

	test('every spec sits in a group folder', () => {
		expect(specsUnder(path.join(extensionDir, 'cypress', type), false).map(repoPath)).toEqual([]);
	});

	test('every group folder has a turbo task, and every group task has a folder', () => {
		expect(Object.keys(tasks).filter(name => name.startsWith(`${umbrella}:`)).toSorted()).toEqual(groupTasks);
	});

	test(`${umbrella} runs every group`, () => {
		expect((tasks[umbrella].dependsOn ?? []).filter(name => name.startsWith(`${umbrella}:`)).toSorted()).toEqual(groupTasks);
	});

	test.each(groups)('%s has a script that runs only its own folder', group => {
		expect(scripts[`${umbrella}:${group}`]).toBe(`ARENASWAP_SPEC_GROUP=${group} cypress run --${type}`);
	});

	test.each(groups)('%s builds what it tests before it runs', group => {
		expect(tasks[`${umbrella}:${group}`].dependsOn).toContain(type === 'component' ? '^build' : 'build:e2e');
	});

	test('CI runs every group', () => {
		expect(groupTasks.filter(task => !runsInCi(task))).toEqual([]);
	});

	test.each(groups)('%s inputs cover every file its specs load', group => {
		const matches = inputMatcher(tasks[`${umbrella}:${group}`].inputs ?? []);
		const roots = ['cypress.config.ts', ...supportFiles[type]].map(file => path.join(extensionDir, file));
		const uncovered = specsUnder(path.join(extensionDir, 'cypress', type, group), true).flatMap(spec => loadedFiles([spec, ...roots], type === 'component')
			.map(repoPath)
			.filter(file => !file.includes('/.wxt/') && !coveredByDependency(file) && !matches(file))
			.map(file => `${file} (loaded by ${repoPath(spec)})`));
		expect([...new Set(uncovered)]).toEqual([]);
	});
});
