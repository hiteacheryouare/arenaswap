import { createContext, useContext } from 'react';
import { defaultStrings } from './defaultStrings';

type Translator = (key: string, subs?: Record<string, string | number> | number) => string;

const defaultT: Translator = (key, subs) => {
	let str = defaultStrings[key] ?? key;
	// A count stands in for the extension's plural forms, which the fallbacks write as `$1`.
	if (typeof subs === 'number') return str.split('$1').join(String(subs));
	if (subs) {
		for (const [k, v] of Object.entries(subs)) {
			str = str.split(`{${k}}`).join(String(v));
		}
	}
	return str;
};

export const TranslationContext = createContext<Translator>(defaultT);
export const useT = () => useContext(TranslationContext);
