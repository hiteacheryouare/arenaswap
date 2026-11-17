import type { HastPluginEntry } from 'satteri';

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
