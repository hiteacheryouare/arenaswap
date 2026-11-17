export const foldForSearch = (value: string): string =>
	value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
