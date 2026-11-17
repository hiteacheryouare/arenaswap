export const parseClockToSeconds = (clock: string): number => {
	// Soccer prime notation: "85'" or "90'+8'" (base minutes + optional stoppage)
	if (clock.includes("'")) {
		const primeMatch = /^(\d+)'\+(\d+)'$/.exec(clock) ?? /^(\d+)'$/.exec(clock);
		if (primeMatch) {
			const base = parseInt(primeMatch[1]!, 10);
			const stoppage = primeMatch[2] ? parseInt(primeMatch[2], 10) : 0;
			return (base + stoppage) * 60;
		}
		return 0;
	}
	const parts = clock.split(':');
	// A clock with no colon is seconds, decimals and all. The basketball leagues switch to this
	// form under a minute and never send `0:xx`; hockey and gridiron stay on `M:SS` the whole way
	// down.
	if (parts.length === 1) {
		const n = Number(parts[0]);
		if (!Number.isFinite(n) || n <= 0) return 0;
		return Math.max(1, Math.floor(n));
	}
	if (parts.length !== 2) return 0;
	const min = Number(parts[0]);
	const sec = Number(parts[1]);
	if (!Number.isFinite(min) || !Number.isFinite(sec)) return 0;
	return (min * 60) + Math.floor(sec);
};

export const parseClockTenths = (clock: string): number | undefined => {
	if (!/^\d+(?:\.\d+)?$/.test(clock)) return undefined;
	return Math.round(Number(clock) * 10);
};

export const parseStoppageMinutes = (clock: string): number | undefined => {
	const added = /^\d+'\+(\d+)'$/.exec(clock)?.[1];
	return added ? parseInt(added, 10) || undefined : undefined;
};
