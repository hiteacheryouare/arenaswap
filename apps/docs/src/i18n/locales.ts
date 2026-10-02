// The twelve locales ArenaSwap ships. The list is the extension's, because a visitor who reads the
// site in a language and then installs the extension should not be handed a different language
// back — apps/extension/locales holds a file for each code below.
//
// The two codings are not interchangeable. `code` is BCP 47 and goes in URLs, `hreflang` and the
// `lang` attribute. `extensionCode` is the underscore form the browsers require of a `_locales`
// directory, and is only useful for finding the matching extension file.

export interface Locale {
	code: string;
	extensionCode: string;
	// Endonym: how the language names itself. A switcher that lists languages in English is only
	// readable by someone who already reads English.
	label: string;
	// What fits beside the globe in a 64px navigation bar that already carries five links and a
	// call to action. Only the two Portuguese variants differ from `label`.
	shortLabel: string;
	// Decoration next to a name that already says what the language is, so it is marked
	// aria-hidden where it renders. A flag names a country and a locale names a language, and the
	// two only line up because every locale here happens to have one place it is most read: `es`
	// takes Mexico rather than Spain because the Spanish that ships is Latin American, and `en`
	// takes the United States because the copy is written in American spelling.
	//
	// Windows ships no colour flag glyphs, so these render there as boxed letter pairs — US, DE —
	// which still reads, and is why the name beside it is doing the work.
	flag: string;
	// Open Graph wants language_TERRITORY, and the territory is the one the flag already names.
	ogLocale: string;
}

export const locales = [
	{ code: 'en', extensionCode: 'en', label: 'English', shortLabel: 'English', flag: '🇺🇸', ogLocale: 'en_US' },
	{ code: 'de', extensionCode: 'de', label: 'Deutsch', shortLabel: 'Deutsch', flag: '🇩🇪', ogLocale: 'de_DE' },
	{ code: 'es', extensionCode: 'es', label: 'Español', shortLabel: 'Español', flag: '🇲🇽', ogLocale: 'es_MX' },
	{ code: 'fil', extensionCode: 'fil', label: 'Filipino', shortLabel: 'Filipino', flag: '🇵🇭', ogLocale: 'fil_PH' },
	{ code: 'fr', extensionCode: 'fr', label: 'Français', shortLabel: 'Français', flag: '🇫🇷', ogLocale: 'fr_FR' },
	{ code: 'it', extensionCode: 'it', label: 'Italiano', shortLabel: 'Italiano', flag: '🇮🇹', ogLocale: 'it_IT' },
	{ code: 'ja', extensionCode: 'ja', label: '日本語', shortLabel: '日本語', flag: '🇯🇵', ogLocale: 'ja_JP' },
	{ code: 'ko', extensionCode: 'ko', label: '한국어', shortLabel: '한국어', flag: '🇰🇷', ogLocale: 'ko_KR' },
	{ code: 'pt-BR', extensionCode: 'pt_BR', label: 'Português (Brasil)', shortLabel: 'Português BR', flag: '🇧🇷', ogLocale: 'pt_BR' },
	{ code: 'pt-PT', extensionCode: 'pt_PT', label: 'Português (Portugal)', shortLabel: 'Português PT', flag: '🇵🇹', ogLocale: 'pt_PT' },
	{ code: 'zh-CN', extensionCode: 'zh_CN', label: '简体中文', shortLabel: '简体中文', flag: '🇨🇳', ogLocale: 'zh_CN' },
	{ code: 'zh-TW', extensionCode: 'zh_TW', label: '繁體中文', shortLabel: '繁體中文', flag: '🇹🇼', ogLocale: 'zh_TW' },
] as const satisfies readonly Locale[];

export type LocaleCode = (typeof locales)[number]['code'];

export const defaultLocale = 'en' satisfies LocaleCode;

export const localeCodes = locales.map(locale => locale.code) as LocaleCode[];

export const isLocaleCode = (value: unknown): value is LocaleCode =>
	typeof value === 'string' && (localeCodes as string[]).includes(value);

export const findLocale = (code: LocaleCode) => locales.find(locale => locale.code === code)!;

// English sits at the root, so its prefix is empty and every URL it had before this existed is the
// URL it still has. Anything else takes one segment.
export const localePrefix = (code: LocaleCode) => (code === defaultLocale ? '' : `${code}/`);

// `path` is written without a locale and without the base, e.g. `legal/privacy/`. Both are added
// here, so no call site has to remember the order they go in.
export const localePath = (code: LocaleCode, path = '') =>
	`${import.meta.env.BASE_URL}${localePrefix(code)}${path}`;

// The rest parameter is `undefined` for English, which is what keeps `/arenaswap/` free of a
// prefix, and the locale code for everything else. Every localized page maps its routes with this.
// `pathname` arrives as a full URL path — base, maybe a locale segment, then the page. What comes
// back is the page on its own, which is what the language switcher needs in order to offer the same
// page in another language rather than dropping everyone on the home page.
export const stripLocale = (pathname: string) => {
	const base = import.meta.env.BASE_URL;
	const withoutBase = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, '');
	const [first, ...rest] = withoutBase.split('/');
	return isLocaleCode(first) && first !== defaultLocale ? rest.join('/') : withoutBase;
};

export const localeRoutes = () =>
	locales.map(locale => ({
		params: { locale: locale.code === defaultLocale ? undefined : locale.code },
		props: { locale: locale.code as LocaleCode },
	}));

// The same twelve routes crossed with a page's own parameters, for the trees that have more than
// one page under them. The documentation and the release notes are English, but they are still
// built once per locale so that following a link out of a translated page does not silently change
// the language of everything around it.
export const localeRoutesFor = <TParams extends Record<string, string>, TProps>(
	entries: { params: TParams; props: TProps }[],
) =>
	locales.flatMap(locale =>
		entries.map(entry => ({
			params: {
				...entry.params,
				locale: locale.code === defaultLocale ? undefined : locale.code,
			},
			props: { ...entry.props, locale: locale.code as LocaleCode },
		})),
	);
