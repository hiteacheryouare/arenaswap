import { isResumedGame } from '../src/components/gameCardShared';

const now = Date.parse('2026-08-26T23:00:00Z');
const twoMonthsAgo = '2026-06-26T23:07:00Z';

describe('isResumedGame', () => {
	test('a live baseball game that started days ago is a suspended game picking back up', () => {
		expect(isResumedGame({ status: 'in', league: 'mlb', startTime: twoMonthsAgo }, now)).toBe(true);
	});

	test('a game in its first few hours is not', () => {
		expect(isResumedGame({ status: 'in', league: 'mlb', startTime: '2026-08-26T20:10:00Z' }, now)).toBe(false);
	});

	test('only baseball resumes on a later day, so an old live game anywhere else is a stuck feed', () => {
		expect(isResumedGame({ status: 'in', league: 'nba', startTime: twoMonthsAgo }, now)).toBe(false);
	});

	test('a final or a game with no start time never is', () => {
		expect(isResumedGame({ status: 'post', league: 'mlb', startTime: twoMonthsAgo }, now)).toBe(false);
		expect(isResumedGame({ status: 'in', league: 'mlb' }, now)).toBe(false);
	});
});
