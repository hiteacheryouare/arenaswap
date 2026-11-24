export const lookupPath = (bundle: unknown, key: string): unknown =>
	key.split('.').reduce<unknown>(
		(node, segment) =>
			node !== null && typeof node === 'object' ? (node as Record<string, unknown>)[segment] : undefined,
		bundle,
	);

export const flattenStrings = (node: unknown, prefix = '', into: Record<string, string> = {}) => {
	if (node === null || typeof node !== 'object') return into;
	for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof value === 'string') into[path] = value;
		else flattenStrings(value, path, into);
	}
	return into;
};
