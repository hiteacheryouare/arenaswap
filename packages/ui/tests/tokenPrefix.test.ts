import tokenPrefix from '../src/tokenPrefix';

const plugin = tokenPrefix({
	css: ':root { --bs-fg-body: #fff; --bs-breakpoint-md: 768px; } .form-range { background: var(--bs-range-fill); }',
	scripts: ['const PROPERTY_FILL = "--bs-range-fill";', 'getPropertyValue(`--bs-breakpoint-${value}`)'],
});

interface Visitors {
	Declaration?: (declaration: { prop: string; value: string }) => void;
	AtRule?: { property: (rule: { params: string }) => void };
}

const compile = (prop: string, value: string, from = 'popup.scss') => {
	const visitors = plugin.prepare({ opts: { from } }) as Visitors;
	const declaration = { prop, value };
	visitors.Declaration?.(declaration);
	return declaration;
};

describe('prefixing Bootstrap tokens', () => {
	test('brands what Bootstrap declares, on both sides of a declaration', () => {
		expect(compile('--fg-body', 'var(--fg-body)')).toEqual({ prop: '--as-fg-body', value: 'var(--as-fg-body)' });
	});

	test('leaves the names its scripts read and write on --bs-, or Range stops filling', () => {
		expect(compile('background', 'calc(var(--range-fill, 0) * 100%)').value).toBe('calc(var(--bs-range-fill, 0) * 100%)');
		expect(compile('--breakpoint-md', '768px').prop).toBe('--bs-breakpoint-md');
	});

	test('does not touch our own tokens or component locals', () => {
		expect(compile('color', 'var(--as-faint)').value).toBe('var(--as-faint)');
		expect(compile('--reveal-open-crest', '4rem').prop).toBe('--reveal-open-crest');
	});

	test('runs twice without stacking prefixes', () => {
		const once = compile('--fg-body', 'var(--range-fill)');
		expect(compile(once.prop, once.value)).toEqual(once);
	});

	test('stays out of stylesheets that are not Sass, such as the site Tailwind entry', () => {
		expect(compile('--fg-body', 'var(--fg-body)', 'tailwind.css')).toEqual({ prop: '--fg-body', value: 'var(--fg-body)' });
	});

	test('reaches Astro component styles, which arrive with a query string', () => {
		expect(compile('--fg-body', '1', 'Nav.astro?astro&type=style&index=0&lang.scss').prop).toBe('--as-fg-body');
	});

	test('renames registered properties', () => {
		const visitors = plugin.prepare({ opts: { from: 'popup.scss' } }) as Visitors;
		const rule = { params: '--fg-body' };
		visitors.AtRule?.property(rule);
		expect(rule.params).toBe('--as-fg-body');
	});
});
