import { gameEndRetentionMs, pruneGameEndRecords, readGameEndRecords, recordGameEnds } from '../utils/gameEndTimes';
import type { Game } from '@arenaswap/core/types';

const game = (id: string, status: Game['status']) => ({ id, status }) as Game;

describe('game end records', () => {
	test('drop anything in storage that is not a stamp', () => {
		expect(readGameEndRecords({
			good: { seenLiveAt: 1, endedAt: 2 },
			partial: { endedAt: 5, seenLiveAt: 'soon' },
			junk: { seenLiveAt: Number.NaN },
			empty: null,
		})).toEqual({ good: { seenLiveAt: 1, endedAt: 2 }, partial: { endedAt: 5 } });
		expect(readGameEndRecords('nope')).toEqual({});
	});

	test('change nothing on a poll that saw nothing new', () => {
		const records = { a: { seenLiveAt: 1 }, b: { seenLiveAt: 1, endedAt: 2 } };
		expect(recordGameEnds(records, [game('a', 'in'), game('b', 'post'), game('c', 'pre')], 10)).toBeNull();
	});

	test('never move an end that is already known', () => {
		const next = recordGameEnds({ a: { seenLiveAt: 1, endedAt: 2 } }, [game('a', 'post'), game('b', 'in')], 10);
		expect(next).toEqual({ a: { seenLiveAt: 1, endedAt: 2 }, b: { seenLiveAt: 10 } });
	});

	test('age out once the guide can no longer reach the day', () => {
		const now = 10 * gameEndRetentionMs;
		expect(pruneGameEndRecords({
			fresh: { seenLiveAt: now - gameEndRetentionMs - 1, endedAt: now - 1 },
			stale: { seenLiveAt: now - gameEndRetentionMs - 1 },
		}, now)).toEqual({ fresh: { seenLiveAt: now - gameEndRetentionMs - 1, endedAt: now - 1 } });
	});
});
