import { getCollection, type CollectionEntry } from 'astro:content';
import { defaultLocale, isLocaleCode, type LocaleCode } from '../i18n/locales';

type LocalizedCollection = 'docs' | 'releases';

export interface LocalizedEntry<C extends LocalizedCollection> {
	entry: CollectionEntry<C>;
	original: CollectionEntry<C>;
	translated: boolean;
}

const translationLocale = (id: string) => {
	const [first, ...rest] = id.split('/');
	return rest.length > 0 && first !== defaultLocale && isLocaleCode(first) ? first : undefined;
};

const originalId = (id: string) => id.slice(id.indexOf('/') + 1);

// Every published English entry, each swapped for its translation where this locale has one.
export const getLocalizedCollection = async <C extends LocalizedCollection>(collection: C, locale: LocaleCode) => {
	const entries = await getCollection(collection);
	const translations = new Map(entries
		.filter(entry => translationLocale(entry.id) === locale)
		.map(entry => [originalId(entry.id), entry]));

	return entries
		.filter(entry => !translationLocale(entry.id) && !entry.data.draft)
		.map((original): LocalizedEntry<C> => {
			const translation = translations.get(original.id);
			return {
				entry: translation ?? original,
				original,
				translated: locale === defaultLocale || translation !== undefined,
			};
		});
};

export const getOriginals = async <C extends LocalizedCollection>(collection: C) =>
	(await getLocalizedCollection(collection, defaultLocale)).map(({ original }) => original);

export const localizeEntry = async <C extends LocalizedCollection>(collection: C, original: CollectionEntry<C>, locale: LocaleCode) =>
	(await getLocalizedCollection(collection, locale)).find(localized => localized.original.id === original.id)!;
