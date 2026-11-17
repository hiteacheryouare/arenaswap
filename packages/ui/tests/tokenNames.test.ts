import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const repo = join(__dirname, '..', '..', '..');
const skipped = new Set(['node_modules', 'dist', '.output', '.wxt', '.astro', '.build', 'coverage', 'docs', 'temporary']);
const sourceFile = /\.(scss|tsx?|jsx?|astro|html)$/;

const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
	if (skipped.has(entry.name) || entry.name.startsWith('.')) {
		return [];
	}
	const path = join(dir, entry.name);
	if (entry.isDirectory()) {
		return walk(path);
	}
	return sourceFile.test(entry.name) ? [path] : [];
});

const sources = ['apps', 'packages'].flatMap((root) => walk(join(repo, root)))
	.filter((path) => !path.endsWith('tokenNames.test.ts'))
	.map((path) => ({ path, text: readFileSync(path, 'utf8') }));

const bootstrapCss = readFileSync(require.resolve('bootstrap/dist/css/bootstrap.css', { paths: [repo] }), 'utf8');
const bootstrapNames = new Set(Array.from(bootstrapCss.matchAll(/--bs-([a-z0-9-]+)/g), ([, name]) => name));

const declaredByUs = new Set(sources.flatMap(({ text }) => Array.from(text.matchAll(/(?:^|[\s{;'"(])--as-([a-z0-9-]+)\s*['"]?\s*:/gm), ([, name]) => name)));

test('every --as- token we read is one that exists', () => {
	const unknown = sources.flatMap(({ path, text }) => Array.from(text.matchAll(/var\(\s*--as-([a-z0-9-]+)/g))
		.map(([, name]) => name)
		.filter((name) => !bootstrapNames.has(name) && !declaredByUs.has(name))
		.map((name) => `${relative(repo, path)}: --as-${name}`));

	expect([...new Set(unknown)]).toEqual([]);
});

test('every Bootstrap token we override is one Bootstrap still reads', () => {
	const ours = new Set(sources.flatMap(({ path, text }) => path.endsWith('.scss')
		? Array.from(text.matchAll(/^\s*--as-([a-z0-9-]+)\s*:/gm), ([, name]) => name)
		: []));
	const read = new Set(sources.flatMap(({ text }) => Array.from(text.matchAll(/var\(\s*--as-([a-z0-9-]+)/g), ([, name]) => name)));

	const unread = [...ours].filter((name) => !bootstrapNames.has(name) && !read.has(name));

	expect(unread).toEqual([]);
});
