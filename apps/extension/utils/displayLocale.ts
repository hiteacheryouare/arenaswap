import { browser } from 'wxt/browser';

// The locale folders we ship, as language tags. Portuguese and Chinese ship only regional variants.
const shippedLocales = ['de', 'en', 'es', 'fil', 'fr', 'it', 'ja', 'ko', 'pt-BR', 'pt-PT', 'zh-CN', 'zh-TW'];

// The browser shows our strings from the folder that matches its UI language exactly, then from
// the bare language, then from English. Dates and numbers follow the same choice, so a Dutch
// browser reading English strings gets English weekdays rather than "Starts" next to "ma 5 okt".
// A language we do ship keeps its region: en-GB still gets day-first dates.
export const resolveDisplayLocale = (uiLanguage: string): string => {
	const lowered = uiLanguage.toLowerCase();
	const language = lowered.split('-')[0];
	const shipped = shippedLocales.some(locale => locale.toLowerCase() === lowered || locale === language);
	return shipped ? uiLanguage : 'en';
};

export const displayLocale = (): string => resolveDisplayLocale(browser.i18n.getUILanguage());
