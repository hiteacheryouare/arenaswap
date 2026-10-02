import type { LocaleCode } from '../i18n/locales';

// UTC on purpose: a date-only frontmatter value is midnight UTC, and rendering it in the build
// machine's zone shifts it a day west of Greenwich.
export const formatReleaseDate = (date: Date, locale: LocaleCode) => new Intl.DateTimeFormat(locale, {
	month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
}).format(date);

export default formatReleaseDate;
