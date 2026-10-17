// Bootstrap 6 compiled from source emits its tokens unprefixed (`--fg-body`) and leaves prefixing
// to a PostCSS pass, which is how its own dist gets `--bs-`. This is that pass, giving the tokens
// our `--as-` instead. Names Bootstrap's JavaScript reads or writes keep `--bs-`, because the
// scripts hardcode it: Range writes `--bs-range-fill` onto the input.
interface BootstrapSources {
	css: string;
	scripts: string[];
}

interface Declaration {
	prop: string;
	value: string;
}

interface AtRule {
	params: string;
}

interface ProcessResult {
	opts: { from?: string };
}

const bootstrapName = /--bs-([a-z0-9-]+)/g;
const customProperty = /(?<![\w-])--([a-z0-9][a-z0-9-]*)/g;
const sassSource = /\.scss\b/;

const namesIn = (source: string) => Array.from(source.matchAll(bootstrapName)).flatMap(([, name]) => (name ? [name] : []));

export default ({ css, scripts }: BootstrapSources) => {
	const declared = new Set(namesIn(css));
	const scripted = [...new Set(scripts.flatMap(namesIn))];

	const ownedByScript = (name: string) => scripted.some((owned) => (owned.endsWith('-') ? name.startsWith(owned) : name === owned));

	const rename = (text: string) => text.replace(customProperty, (match, name: string) => {
		if (ownedByScript(name)) {
			return `--bs-${name}`;
		}
		return declared.has(name) ? `--as-${name}` : match;
	});

	return {
		postcssPlugin: 'arenaswap-token-prefix',
		prepare: (result: ProcessResult) => {
			if (!sassSource.test(result.opts.from ?? '')) {
				return {};
			}
			return {
				Declaration: (declaration: Declaration) => {
					const prop = rename(declaration.prop);
					const value = rename(declaration.value);
					if (prop !== declaration.prop) {
						declaration.prop = prop;
					}
					if (value !== declaration.value) {
						declaration.value = value;
					}
				},
				AtRule: {
					property: (rule: AtRule) => {
						const params = rename(rule.params);
						if (params !== rule.params) {
							rule.params = params;
						}
					},
				},
			};
		},
	};
};
