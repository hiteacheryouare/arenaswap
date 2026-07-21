import { createContext, useContext } from 'react';

type Translator = (key: string, subs?: Record<string, string | number>) => string;

const defaultStrings: Record<string, string> = {
	'gameCard.live': 'LIVE',
	'gameCard.powerScore': 'PowerScore',
	'gameCard.watchLabel': 'Watch:',
	'gameCard.oddsProvidedBy': 'Odds provided by:',
	'gameCard.favorited': 'Favorited',
	'gameCard.addToFavoritesShort': 'Add to favorites',
	'gameCard.vs': 'vs',
	'bso.balls': 'B',
	'bso.strikes': 'S',
	'bso.outs': 'O',
};

const defaultT: Translator = (key, subs) => {
	let str = defaultStrings[key] ?? key;
	if (subs) {
		for (const [k, v] of Object.entries(subs)) {
			str = str.replace(`{${k}}`, String(v));
		}
	}
	return str;
};

export const TranslationContext = createContext<Translator>(defaultT);
export const useT = () => useContext(TranslationContext);
