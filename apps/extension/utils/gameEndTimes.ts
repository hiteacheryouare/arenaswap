import type { Game } from '@arenaswap/core/types';

// ESPN publishes no completion timestamp, so the only way to know when most games actually ended is
// to be watching when the status flips. Held in `storage.local` because an MV3 worker is discarded
// between polls, and a game seen live by one worker is usually seen final by the next.
export const gameEndTimesKey = 'arenaswap.gameEndTimes';

// The guide's slate reaches two local days back, so a record older than three has nothing to draw.
export const gameEndRetentionMs = 3 * 24 * 60 * 60 * 1000;

export interface gameEndRecord {
	seenLiveAt?: number;
	endedAt?: number;
}

export type gameEndRecords = Record<string, gameEndRecord>;

const isStamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const readGameEndRecords = (stored: unknown): gameEndRecords => {
	if (typeof stored !== 'object' || stored === null) return {};
	const records: gameEndRecords = {};
	for (const [id, entry] of Object.entries(stored as Record<string, unknown>)) {
		const { seenLiveAt, endedAt } = (entry ?? {}) as gameEndRecord;
		if (!isStamp(seenLiveAt) && !isStamp(endedAt)) continue;
		records[id] = {
			...(isStamp(seenLiveAt) ? { seenLiveAt } : {}),
			...(isStamp(endedAt) ? { endedAt } : {}),
		};
	}
	return records;
};

// `seenLiveAt` is the last time the game was seen live, refreshed this often rather than on every poll
// so a live game costs one storage write every few minutes.
const liveRefreshMs = 5 * 60_000;

// A final is only stamped when it turns up this soon after the game was last seen live. Anything later
// ended at some point nobody saw, and stamping it with the moment it was found would stretch a noon
// kickoff into the evening, or, after a night with the browser closed, into the next morning.
const trustedEndGapMs = 10 * 60_000;

// Null when nothing changed, which is what keeps this from writing to storage on every poll.
export const recordGameEnds = (records: gameEndRecords, fetched: Game[], now: number): gameEndRecords | null => {
	let next: gameEndRecords | null = null;
	for (const game of fetched) {
		const existing = records[game.id];
		if (game.status === 'in') {
			// A suspended game arrives as final and later comes back live, so its stamped end was never the end.
			const resumed = existing?.endedAt !== undefined;
			const stale = existing?.seenLiveAt === undefined || now - existing.seenLiveAt >= liveRefreshMs;
			if (!resumed && !stale) continue;
			next ??= { ...records };
			next[game.id] = { seenLiveAt: now };
		} else if (
			game.status === 'post'
			&& existing?.seenLiveAt !== undefined
			&& existing.endedAt === undefined
			&& now - existing.seenLiveAt <= trustedEndGapMs
		) {
			next ??= { ...records };
			next[game.id] = { ...existing, endedAt: now };
		}
	}
	return next;
};

export const pruneGameEndRecords = (records: gameEndRecords, now: number): gameEndRecords => (
	Object.fromEntries(Object.entries(records).filter(([, record]) => (
		now - Math.max(record.seenLiveAt ?? 0, record.endedAt ?? 0) <= gameEndRetentionMs
	)))
);

export const gameEndTimes = (records: gameEndRecords): Record<string, number> => (
	Object.fromEntries(Object.entries(records).flatMap(([id, record]) => (
		record.endedAt === undefined ? [] : [[id, record.endedAt]]
	)))
);

// Finals nobody saw end, in the sports whose summary says how long they took.
export const gamesNeedingDuration = (games: Game[], records: gameEndRecords): Game[] => games.filter(game => (
	game.status === 'post'
	&& (game.sportType === 'baseball' || game.sportType === 'softball')
	&& records[game.id]?.endedAt === undefined
));
