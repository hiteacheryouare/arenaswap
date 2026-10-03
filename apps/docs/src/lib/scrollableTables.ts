import type { HastPluginEntry } from 'satteri';

// The page clips anything that spills sideways, so a seven-column table on a phone lost its right
// half with no way to reach it. The wrapper scrolls instead, and the table keeps its full width.
const scrollableTables: HastPluginEntry = {
	name: 'scrollable-tables',
	element: {
		filter: ['table'],
		visit: (node, ctx) => {
			ctx.wrapNode(node, { raw: '<div class="prose-table" tabindex="0"></div>' });
		},
	},
};

export default scrollableTables;
