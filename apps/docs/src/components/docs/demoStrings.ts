import { findLocale, type LocaleCode } from '../../i18n/locales';
import { flattenStrings, lookupPath } from '../../i18n/bundle';

const bundles = import.meta.glob<Record<string, unknown>>('../../../../extension/locales/*.json', { eager: true, import: 'default' });

const bundleFor = (locale: LocaleCode) => bundles[`../../../../extension/locales/${findLocale(locale).extensionCode}.json`]!;

export const extensionString = (locale: LocaleCode, key: string) => lookupPath(bundleFor(locale), key);

export type DemoStringKey = string;

export type DemoTranslator = (key: DemoStringKey, subs?: Record<string, string | number>) => string;

export const demoTranslator = (locale: LocaleCode): DemoTranslator => (key, subs = {}) => {
	const template = lookupPath(bundleFor(locale), key);
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

export const demoUiStrings = (locale: LocaleCode) => flattenStrings(bundleFor(locale));
