import { defaultStrings } from '@arenaswap/ui/src/components/defaultStrings';
import { TranslationContext, translateFrom } from '@arenaswap/ui/src/components/i18nContext';

// An island is hydrated with props alone — it cannot read Astro frontmatter — so a component that
// renders a shared @arenaswap/ui piece is handed the flat string map and puts it on the context the
// shared components already read. Without this the demo popup on a German page speaks English while
// everything around it does not.
//
// The same substitution rule as the extension's translator: named `{placeholders}`, replaced in
// place, and a key the site's bundle lacks falls back to the shared English, then to itself, rather
// than throwing, since an island failing to hydrate would take the whole demo down over one label.
export const islandTranslator = (strings: Record<string, string> | undefined) => translateFrom(key => strings?.[key] ?? defaultStrings[key]);

export interface Slot {
	slot: string;
}

// A sentence with markup in the middle of it cannot be substituted into, because what goes in the
// hole is an element rather than text. Splitting on the placeholder works until a language puts the
// holes in the other order, so the template is broken into an ordered run of literal text and named
// slots instead, and the call site renders each slot wherever the translation put it.
//
// It lives here rather than in ui.ts because islands import from this file and ui.ts pulls in all
// twelve string bundles — none of which belong in a browser.
export const tokenize = (template: string): (string | Slot)[] =>
	template
		.split(/(\{[a-zA-Z][a-zA-Z0-9]*\})/)
		.filter(part => part !== '')
		.map(part => (/^\{[a-zA-Z][a-zA-Z0-9]*\}$/.test(part) ? { slot: part.slice(1, -1) } : part));

export { TranslationContext };
