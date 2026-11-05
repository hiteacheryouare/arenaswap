import type { ReactNode } from 'react';
import { LocaleContext, TranslationContext } from '@arenaswap/ui/src/components/i18nContext';
import { i18n, setStubLocale } from '#i18n';
import de from '../../../locales/de.json';
import en from '../../../locales/en.json';
import es from '../../../locales/es.json';
import fil from '../../../locales/fil.json';
import fr from '../../../locales/fr.json';
import itLocale from '../../../locales/it.json';
import ja from '../../../locales/ja.json';
import ko from '../../../locales/ko.json';
import ptBR from '../../../locales/pt_BR.json';
import ptPT from '../../../locales/pt_PT.json';
import zhCN from '../../../locales/zh_CN.json';
import zhTW from '../../../locales/zh_TW.json';

export interface shippedLocale {
	// The folder name under locales/, which is also what a failing test is named after.
	folder: string;
	// The language tag dates and numbers are formatted in.
	tag: string;
	messages: typeof en;
}

export const shippedLocales: readonly shippedLocale[] = [
	{ folder: 'de', tag: 'de', messages: de },
	{ folder: 'en', tag: 'en', messages: en },
	{ folder: 'es', tag: 'es', messages: es },
	{ folder: 'fil', tag: 'fil', messages: fil },
	{ folder: 'fr', tag: 'fr', messages: fr },
	{ folder: 'it', tag: 'it', messages: itLocale },
	{ folder: 'ja', tag: 'ja', messages: ja },
	{ folder: 'ko', tag: 'ko', messages: ko },
	{ folder: 'pt_BR', tag: 'pt-BR', messages: ptBR },
	{ folder: 'pt_PT', tag: 'pt-PT', messages: ptPT },
	{ folder: 'zh_CN', tag: 'zh-CN', messages: zhCN },
	{ folder: 'zh_TW', tag: 'zh-TW', messages: zhTW },
];

export const english = shippedLocales.find(locale => locale.folder === 'en')!;

beforeEach(() => {
	setStubLocale();
	document.documentElement.lang = english.tag;
});

// Switches the `#i18n` stub and wraps the tree in the same two contexts the popup's main.jsx and
// app.tsx provide, so both extension components and shared @arenaswap/ui ones read the locale.
export const withLocale = (locale: shippedLocale, node: ReactNode) => {
	setStubLocale(locale.messages);
	document.documentElement.lang = locale.tag;
	return (
		<LocaleContext.Provider value={locale.tag}>
			<TranslationContext.Provider value={i18n.t}>
				{node}
			</TranslationContext.Provider>
		</LocaleContext.Provider>
	);
};

// One test per shipped locale, named after it, so a failure says which translation broke the layout.
export const inEveryLocale = (title: string, body: (locale: shippedLocale) => void) => {
	for (const locale of shippedLocales) {
		it(`${title} (${locale.folder})`, () => body(locale));
	}
};
