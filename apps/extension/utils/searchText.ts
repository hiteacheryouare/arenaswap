// "Atletico" finds "Atlético Madrid" and "montreal" finds "CF Montréal": accents and case are
// folded out of both sides before comparing.
export const foldForSearch = (value: string): string =>
	value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
