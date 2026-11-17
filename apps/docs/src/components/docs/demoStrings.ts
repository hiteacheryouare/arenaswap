import { findLocale, type LocaleCode } from '../../i18n/locales';

const bundles = import.meta.glob<Record<string, unknown>>('../../../../extension/locales/*.json', { eager: true, import: 'default' });

const bundleFor = (locale: LocaleCode) => bundles[`../../../../extension/locales/${findLocale(locale).extensionCode}.json`]!;

const lookup = (node: unknown, key: string) =>
	key.split('.').reduce<unknown>((value, part) => (value as Record<string, unknown> | undefined)?.[part], node);

const flatten = (node: unknown, prefix = '', into: Record<string, string> = {}) => {
	for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof value === 'string') into[path] = value;
		else if (value && typeof value === 'object') flatten(value, path, into);
	}
	return into;
};

export const extensionString = (locale: LocaleCode, key: string) => lookup(bundleFor(locale), key);

export type DemoStringKey = string;

export type DemoTranslator = (key: DemoStringKey, subs?: Record<string, string | number>) => string;

export const demoTranslator = (locale: LocaleCode): DemoTranslator => (key, subs = {}) => {
	const template = lookup(bundleFor(locale), key);
	if (typeof template !== 'string') throw new Error(`Missing extension string for a docs demo: ${locale} ${key}`);
	return Object.entries(subs).reduce(
		(text, [name, value]) => text.split(name.startsWith('$') ? name : `{${name}}`).join(String(value)),
		template,
	);
};

export const tiedReason = (demoText: DemoTranslator) => demoText('powerScore.reasonJoinWhen', {
	sentence: demoText('powerScore.reasonScoreTied'),
	when: demoText('powerScore.reasonWhenClock', { clock: '2:10' }),
});

export const demoUiStrings = (locale: LocaleCode) => flatten(bundleFor(locale));
