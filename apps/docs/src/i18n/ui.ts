import { defaultLocale, isLocaleCode, type LocaleCode } from './locales';
import en from './strings/en.json';
import de from './strings/de.json';
import es from './strings/es.json';
import fil from './strings/fil.json';
import fr from './strings/fr.json';
import it from './strings/it.json';
import ja from './strings/ja.json';
import ko from './strings/ko.json';
import ptBR from './strings/pt-BR.json';
import ptPT from './strings/pt-PT.json';
import zhCN from './strings/zh-CN.json';
import zhTW from './strings/zh-TW.json';

const bundles: Record<LocaleCode, unknown> = {
	en,
	de,
	es,
	fil,
	fr,
	it,
	ja,
	ko,
	'pt-BR': ptBR,
	'pt-PT': ptPT,
	'zh-CN': zhCN,
	'zh-TW': zhTW,
};

export type SiteStrings = typeof en;

const lookup = (bundle: unknown, key: string): unknown =>
	key.split('.').reduce<unknown>(
		(node, segment) =>
			node !== null && typeof node === 'object' ? (node as Record<string, unknown>)[segment] : undefined,
		bundle,
	);

const substitute = (value: string, subs?: Record<string, string | number>) => {
	if (!subs) return value;
	return Object.entries(subs).reduce(
		(text, [name, replacement]) => text.split(`{${name}}`).join(String(replacement)),
		value,
	);
};

const shapeOf = (node: unknown, prefix = ''): string[] => {
	if (Array.isArray(node)) {
		return [`${prefix}[${node.length}]`, ...node.flatMap((item, index) => shapeOf(item, `${prefix}[${index}]`))];
	}
	if (node !== null && typeof node === 'object') {
		return Object.entries(node as Record<string, unknown>)
			.flatMap(([key, value]) => shapeOf(value, prefix ? `${prefix}.${key}` : key));
	}
	return [prefix];
};

const englishShape = shapeOf(en).join('\n');

for (const [code, bundle] of Object.entries(bundles)) {
	if (code === defaultLocale) continue;
	const shape = shapeOf(bundle).join('\n');
	if (shape === englishShape) continue;

	const english = new Set(shapeOf(en));
	const theirs = new Set(shapeOf(bundle));
	const missing = [...english].filter(key => !theirs.has(key));
	const extra = [...theirs].filter(key => !english.has(key));
	throw new Error(
		`Locale bundle ${code}.json does not match en.json.`
		+ (missing.length > 0 ? `\n  Missing: ${missing.join(', ')}` : '')
		+ (extra.length > 0 ? `\n  Unexpected: ${extra.join(', ')}` : ''),
	);
}

export { tokenize, type Slot } from './islandStrings';

export interface Translator {
	(key: string, subs?: Record<string, string | number>): string;
	list: <T>(key: string) => T[];
	locale: LocaleCode;
}

export const useTranslations = (locale: LocaleCode): Translator => {
	const bundle = bundles[locale] ?? bundles[defaultLocale];

	const translate = ((key: string, subs?: Record<string, string | number>) => {
		const value = lookup(bundle, key) ?? lookup(bundles[defaultLocale], key);
		if (typeof value !== 'string') {
			throw new Error(`Missing site string: ${key}`);
		}
		return substitute(value, subs);
	}) as Translator;

	translate.list = <T,>(key: string): T[] => {
		const value = lookup(bundle, key) ?? lookup(bundles[defaultLocale], key);
		if (!Array.isArray(value)) {
			throw new Error(`Missing site string list: ${key}`);
		}
		return value as T[];
	};

	translate.locale = locale;
	return translate;
};

export const currentLocale = (candidate: string | undefined): LocaleCode =>
	isLocaleCode(candidate) ? candidate : defaultLocale;

const flatten = (node: unknown, prefix: string, into: Record<string, string>) => {
	if (node === null || typeof node !== 'object') return into;
	for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof value === 'string') into[path] = value;
		else flatten(value, path, into);
	}
	return into;
};

export const uiStrings = (locale: LocaleCode): Record<string, string> => ({
	...flatten(lookup(bundles[defaultLocale], 'ui'), '', {}),
	...flatten(lookup(bundles[locale] ?? bundles[defaultLocale], 'ui'), '', {}),
});
