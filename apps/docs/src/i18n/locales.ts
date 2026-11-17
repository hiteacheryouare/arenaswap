export interface Locale {
	code: string;
	extensionCode: string;
	label: string;
	shortLabel: string;
	flag: string;
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

export const localePrefix = (code: LocaleCode) => (code === defaultLocale ? '' : `${code}/`);

export const localePath = (code: LocaleCode, path = '') =>
	`${import.meta.env.BASE_URL}${localePrefix(code)}${path}`;

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
