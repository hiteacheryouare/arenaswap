import { createContext, useContext } from 'react';
import { defaultStrings } from './defaultStrings';

type Substitutions = Record<string, string | number>;

// The extension's i18n.t: a number picks a plural form and fills $1, an object fills {names}.
export type Translator = (key: string, countOrSubs?: number | Substitutions, subs?: Substitutions) => string;

// Plural strings outside the extension are written "one | other", the shape WXT compiles them to.
export const translateFrom = (lookup: (key: string) => string | undefined): Translator => (key, countOrSubs, subs) => {
	const count = typeof countOrSubs === 'number' ? countOrSubs : undefined;
	const named = typeof countOrSubs === 'object' ? countOrSubs : subs;
	let str = lookup(key) ?? key;
	if (count !== undefined) {
		const forms = str.split(' | ');
		str = (forms.length === 2 ? forms[count === 1 ? 0 : 1]! : forms[0]!).split('$1').join(String(count));
	}
	if (named) {
		for (const [k, v] of Object.entries(named)) {
			str = str.split(`{${k}}`).join(String(v));
		}
	}
	return str;
};

const defaultT = translateFrom(key => defaultStrings[key]);

export const TranslationContext = createContext<Translator>(defaultT);
export const useT = () => useContext(TranslationContext);

// The language dates and numbers are formatted in. Undefined leaves it to the runtime default.
export const LocaleContext = createContext<string | undefined>(undefined);
export const useDisplayLocale = () => useContext(LocaleContext);
