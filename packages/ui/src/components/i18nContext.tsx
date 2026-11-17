import { createContext, useContext } from 'react';
import { defaultTranslate, translateFrom } from './defaultStrings';
import type { Translator } from './defaultStrings';

export { translateFrom };
export type { Translator };

export const TranslationContext = createContext<Translator>(defaultTranslate);
export const useT = () => useContext(TranslationContext);

export const LocaleContext = createContext<string | undefined>(undefined);
export const useDisplayLocale = () => useContext(LocaleContext);
