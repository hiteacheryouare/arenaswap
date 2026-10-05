export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const toFiniteNumber = (value: unknown, fallback = 0): number => (
	typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

export const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

// A null event timestamp (never happened) ages to Infinity, giving a factor of 0.
export const decayFactor = (ageMs: number, halfLifeMs: number): number => {
	if (ageMs <= 0) return 1;
	if (halfLifeMs <= 0) return 0;
	return Math.pow(0.5, ageMs / halfLifeMs);
};

export const ageSince = (timestamp: number | null, now: number): number => (
	timestamp === null ? Infinity : Math.max(0, now - timestamp)
);

export const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
