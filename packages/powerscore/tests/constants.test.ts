import {
	SCORE_MAX_CLOSENESS,
	SCORE_MAX_LATE_GAME,
	SCORE_MAX_MOMENTUM,
	SCORE_MAX_LEAD_CHANGES,
	SCORE_MAX_COMEBACK,
	SCORE_MAX_TOTAL,
	SCORER_TUNABLES,
	ALL_LEAGUE_IDS,
	LEAGUE_CONFIG_MAP,
	SPORT_TYPE_CONFIGS,
} from '../src/constants';

describe('SCORE_MAX_TOTAL', () => {
	it('equals the sum of all signal maxes', () => {
		expect(SCORE_MAX_TOTAL).toBe(
			SCORE_MAX_CLOSENESS + SCORE_MAX_LATE_GAME + SCORE_MAX_MOMENTUM + SCORE_MAX_LEAD_CHANGES + SCORE_MAX_COMEBACK
		);
	});
});

describe('SCORER_TUNABLES max-score alignment', () => {
	it('closeness.tied equals SCORE_MAX_CLOSENESS', () => {
		expect(SCORER_TUNABLES.scores.closeness.tied).toBe(SCORE_MAX_CLOSENESS);
	});
	it('lateGame.overtime equals SCORE_MAX_LATE_GAME', () => {
		expect(SCORER_TUNABLES.scores.lateGame.overtime).toBe(SCORE_MAX_LATE_GAME);
	});
	it('momentum.bigRun equals SCORE_MAX_MOMENTUM', () => {
		expect(SCORER_TUNABLES.scores.momentum.bigRun).toBe(SCORE_MAX_MOMENTUM);
	});
	it('leadChanges.multiple equals SCORE_MAX_LEAD_CHANGES', () => {
		expect(SCORER_TUNABLES.scores.leadChanges.multiple).toBe(SCORE_MAX_LEAD_CHANGES);
	});
	it('comeback.big equals SCORE_MAX_COMEBACK', () => {
		expect(SCORER_TUNABLES.scores.comeback.big).toBe(SCORE_MAX_COMEBACK);
	});
});

describe('LEAGUE_CONFIG_MAP coverage', () => {
	it('contains an entry for every ALL_LEAGUE_IDS value', () => {
		for (const id of ALL_LEAGUE_IDS) {
			expect(LEAGUE_CONFIG_MAP[id]).toBeDefined();
			expect(LEAGUE_CONFIG_MAP[id].id).toBe(id);
		}
	});
});

describe('SPORT_TYPE_CONFIGS late-game curve config', () => {
	it('defines curve tunables for every sport with a matching model', () => {
		for (const config of SPORT_TYPE_CONFIGS) {
			if (config.clockBased) {
				expect(config.lateGameCurve.model).toBe('clock');
				if (config.lateGameCurve.model === 'clock') {
					expect(config.lateGameCurve.finalPeriodCurve.maxScore).toBeLessThanOrEqual(SCORE_MAX_LATE_GAME);
					expect(config.lateGameCurve.previousPeriodCurve.maxScore).toBeLessThanOrEqual(SCORE_MAX_LATE_GAME);
				}
				continue;
			}

			expect(config.lateGameCurve.model).toBe('baseball');
			if (config.lateGameCurve.model === 'baseball') {
				expect(config.lateGameCurve.regulationCurve.maxScore).toBeLessThanOrEqual(SCORE_MAX_LATE_GAME);
				expect(config.lateGameCurve.extraInningsCurve.maxScore).toBeLessThanOrEqual(SCORE_MAX_LATE_GAME);
			}
		}
	});
});
