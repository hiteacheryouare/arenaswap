// Stands in for the `#i18n` virtual module, which resolves through the browser i18n runtime and
// so is unavailable in the Cypress dev-server.
import enJson from '../../locales/en.json';

const messages = enJson as Record<string, unknown>;

const lookup = (key: string): unknown =>
	key.split('.').reduce<unknown>((node, part) => (
		node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined
	), messages);

const applySubstitutions = (template: string, subs: unknown): string => {
	if (Array.isArray(subs)) {
		return template.replace(/\$(\d)/g, (_, n) => String(subs[Number(n) - 1] ?? ''));
	}
	if (subs && typeof subs === 'object') {
		return template.replace(/\{(\w+)\}/g, (_, name) => String((subs as Record<string, unknown>)[name] ?? ''));
	}
	return template;
};

const t = (key: string, subsOrCount?: unknown, subs?: unknown): string => {
	const entry = lookup(key);
	if (typeof entry === 'string') return applySubstitutions(entry, subsOrCount);
	if (entry && typeof entry === 'object' && typeof subsOrCount === 'number') {
		const forms = entry as Record<string, string>;
		const count = subsOrCount;
		const form = forms[String(count)] ?? forms.n ?? forms['1'] ?? '';
		return applySubstitutions(form, subs ?? [count]);
	}
	return key;
};

export const i18n = { t };
