import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const values = (node: unknown): string[] => (
	typeof node === 'string' ? [node] : Object.values(node as Record<string, unknown>).flatMap(values)
);

// Portugal has used the 1990 agreement since 2009: ação, direto, ativo, atualizar. The file used to
// mix both spellings, so any of the old silent consonants coming back is a slip.
test('European Portuguese sticks to the 1990 spelling', () => {
	const strings = values(JSON.parse(readFileSync(join(__dirname, '../locales/pt_PT.json'), 'utf8')));
	const oldSpelling = /activ|actua|direct[oa]|acç|selecç|seleccion|exact|direcç|aspect|respectiv|tecto/i;
	expect(strings.filter(text => oldSpelling.test(text))).toEqual([]);
});
