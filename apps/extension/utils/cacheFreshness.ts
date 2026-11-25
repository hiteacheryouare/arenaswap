export const weekMs = 7 * 24 * 60 * 60 * 1000;

export const isFreshWithin = (fetchedAt: number, ttlMs: number, now: number): boolean => now >= fetchedAt && now - fetchedAt < ttlMs;
