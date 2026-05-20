import { computeStandbyStreamDecision } from '../utils/standbyStreamLogic';

const makeScores = (...totals: number[]) => totals.map(total => ({ total }));

const base = {
	standbyStreamEnabled: true,
	standbyStreamTabId: 42,
	standbyStreamThreshold: 20,
	registeredScores: makeScores(10, 5),
	onStandbyStream: false,
	activeTabIsStandby: false,
};

describe('computeStandbyStreamDecision', () => {
	test('returns none when standbyStreamEnabled is false', () => {
		expect(computeStandbyStreamDecision({ ...base, standbyStreamEnabled: false })).toBe('none');
	});

	test('returns none when standbyStreamTabId is null', () => {
		expect(computeStandbyStreamDecision({ ...base, standbyStreamTabId: null })).toBe('none');
	});

	test('returns none when registeredScores is empty', () => {
		expect(computeStandbyStreamDecision({ ...base, registeredScores: [] })).toBe('none');
	});

	test('returns switchToStandby when all games are below threshold and not on standby', () => {
		expect(computeStandbyStreamDecision({ ...base, registeredScores: makeScores(5, 10, 15) })).toBe('switchToStandby');
	});

	test('returns stayOnStandby when all games are below threshold and already on standby tab', () => {
		expect(computeStandbyStreamDecision({
			...base,
			onStandbyStream: true,
			activeTabIsStandby: true,
		})).toBe('stayOnStandby');
	});

	test('returns resume when onStandbyStream is true but user navigated away from standby tab', () => {
		expect(computeStandbyStreamDecision({
			...base,
			onStandbyStream: true,
			activeTabIsStandby: false,
		})).toBe('resume');
	});

	test('returns resume when a game crosses back above threshold while on standby', () => {
		expect(computeStandbyStreamDecision({
			...base,
			registeredScores: makeScores(5, 50),
			onStandbyStream: true,
			activeTabIsStandby: true,
		})).toBe('resume');
	});

	test('returns none when all games are above threshold and not on standby', () => {
		expect(computeStandbyStreamDecision({ ...base, registeredScores: makeScores(50, 80) })).toBe('none');
	});

	test('returns none when a game is exactly at the threshold (strict less-than)', () => {
		expect(computeStandbyStreamDecision({ ...base, registeredScores: makeScores(20, 10) })).toBe('none');
	});

	test('returns none when one game is above threshold and one is below (not ALL below)', () => {
		expect(computeStandbyStreamDecision({ ...base, registeredScores: makeScores(5, 25) })).toBe('none');
	});

	test('handles a single registered game below threshold', () => {
		expect(computeStandbyStreamDecision({ ...base, registeredScores: makeScores(1) })).toBe('switchToStandby');
	});

	test('handles a single registered game at threshold (no switch)', () => {
		expect(computeStandbyStreamDecision({ ...base, registeredScores: makeScores(20) })).toBe('none');
	});
});
