export interface diffedItem<T> {
	item: T;
	removed: boolean;
}

export interface setupDiff<T> {
	items: diffedItem<T>[];
	added: number;
	removed: number;
}

// What a list will hold after a replace, in its own order, followed by what it is about to lose.
export const diffList = <T>(next: readonly T[], now: readonly T[] | undefined, keyOf: (item: T) => string): setupDiff<T> => {
	if (!now) return { items: next.map(item => ({ item, removed: false })), added: 0, removed: 0 };
	const nowKeys = new Set(now.map(keyOf));
	const nextKeys = new Set(next.map(keyOf));
	const lost = now.filter(item => !nextKeys.has(keyOf(item)));
	return {
		items: [...next.map(item => ({ item, removed: false })), ...lost.map(item => ({ item, removed: true }))],
		added: next.filter(item => !nowKeys.has(keyOf(item))).length,
		removed: lost.length,
	};
};
