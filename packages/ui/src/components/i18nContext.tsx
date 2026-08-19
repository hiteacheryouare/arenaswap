import { createContext, useContext } from 'react';
import { defaultStrings } from './defaultStrings';

type Translator = (key: string, subs?: Record<string, string | number>) => string;

const defaultT: Translator = (key, subs) => {
	let str = defaultStrings[key] ?? key;
	if (subs) {
		for (const [k, v] of Object.entries(subs)) {
			str = str.split(`{${k}}`).join(String(v));
		}
	}
	return str;
};

export const TranslationContext = createContext<Translator>(defaultT);
export const useT = () => useContext(TranslationContext);
