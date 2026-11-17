import { defaultStrings } from '@arenaswap/ui/src/components/defaultStrings';
import { TranslationContext, translateFrom } from '@arenaswap/ui/src/components/i18nContext';

export const islandTranslator = (strings: Record<string, string> | undefined) => translateFrom(key => strings?.[key] ?? defaultStrings[key]);

export interface Slot {
	slot: string;
}

export const tokenize = (template: string): (string | Slot)[] =>
	template
		.split(/(\{[a-zA-Z][a-zA-Z0-9]*\})/)
		.filter(part => part !== '')
		.map(part => (/^\{[a-zA-Z][a-zA-Z0-9]*\}$/.test(part) ? { slot: part.slice(1, -1) } : part));

export { TranslationContext };
