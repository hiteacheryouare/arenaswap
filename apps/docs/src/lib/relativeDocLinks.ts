import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HastPluginEntry } from 'satteri';

const base = '/arenaswap/';
const docsRoot = '/src/content/docs/';

// An article is rendered once and served under all twelve locale prefixes, so a link written as
// /arenaswap/docs/... sent a German reader back to the English site. Written relative to the
// article's own URL, the same link resolves under whichever prefix the reader arrived on.
const articlePath = (filePath: string) => {
	const [section, file] = filePath.slice(filePath.indexOf(docsRoot) + docsRoot.length).split('/');
	return `docs/${section}/${file!.replace(/\.mdx?$/, '')}/`;
};

const relativeTo = (from: string, href: string) => {
	const [target, hash] = href.slice(base.length).split('#');
	const relative = posix.relative(from, target!) || '.';
	return `${relative}/${hash === undefined ? '' : `#${hash}`}`;
};

const relativeDocLinks: HastPluginEntry = ({ fileURL }) => {
	const filePath = fileURL && fileURLToPath(fileURL).split('\\').join('/');
	if (!filePath?.includes(docsRoot)) return null;
	const from = articlePath(filePath);
	return {
		name: 'relative-doc-links',
		element: {
			filter: ['a'],
			visit: (node, ctx) => {
				const href = node.properties?.href;
				if (typeof href === 'string' && href.startsWith(base)) ctx.setProperty(node, 'href', relativeTo(from, href));
			},
		},
	};
};

export default relativeDocLinks;
