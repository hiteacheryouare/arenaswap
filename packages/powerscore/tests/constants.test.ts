import {
	scoreMaxCloseness,
	scoreMaxLateGame,
	scoreMaxMomentum,
	scoreMaxLeadChanges,
	scoreMaxComeback,
	scoreMaxTotal,
	scorerTunables,
	allLeagueIds,
	leagueConfigMap,
	sportTypeConfigs,
} from '../src/constants';

describe('scoreMaxTotal', () => {
	it('equals the sum of all signal maxes', () => {
		expect(scoreMaxTotal).toBe(
			scoreMaxCloseness + scoreMaxLateGame + scoreMaxMomentum + scoreMaxLeadChanges + scoreMaxComeback
		);
	});
});

describe('scorerTunables max-score alignment', () => {
	it('closeness.tied equals scoreMaxCloseness', () => {
		expect(scorerTunables.scores.closeness.tied).toBe(scoreMaxCloseness);
	});
	it('lateGame.overtime equals scoreMaxLateGame', () => {
		expect(scorerTunables.scores.lateGame.overtime).toBe(scoreMaxLateGame);
	});
	it('momentum.bigRun equals scoreMaxMomentum', () => {
		expect(scorerTunables.scores.momentum.bigRun).toBe(scoreMaxMomentum);
	});
	it('leadChanges.multiple equals scoreMaxLeadChanges', () => {
		expect(scorerTunables.scores.leadChanges.multiple).toBe(scoreMaxLeadChanges);
	});
	it('comeback.big equals scoreMaxComeback', () => {
		expect(scorerTunables.scores.comeback.big).toBe(scoreMaxComeback);
	});
});

describe('leagueConfigMap coverage', () => {
	it('contains an entry for every allLeagueIds value', () => {
		for (const id of allLeagueIds) {
			expect(leagueConfigMap[id]).toBeDefined();
			expect(leagueConfigMap[id].id).toBe(id);
		}
	});
});

describe('sportTypeConfigs late-game curve config', () => {
	it('defines curve tunables for every sport with a matching model', () => {
		for (const config of sportTypeConfigs) {
			if (config.clockBased) {
				expect(config.lateGameCurve.model).toBe('clock');
				if (config.lateGameCurve.model === 'clock') {
					expect(config.lateGameCurve.finalPeriodCurve.maxScore).toBeLessThanOrEqual(scoreMaxLateGame);
					expect(config.lateGameCurve.previousPeriodCurve.maxScore).toBeLessThanOrEqual(scoreMaxLateGame);
				}
				continue;
			}

			expect(config.lateGameCurve.model).toBe('baseball');
			if (config.lateGameCurve.model === 'baseball') {
				expect(config.lateGameCurve.regulationCurve.maxScore).toBeLessThanOrEqual(scoreMaxLateGame);
				expect(config.lateGameCurve.extraInningsCurve.maxScore).toBeLessThanOrEqual(scoreMaxLateGame);
			}
		}
	});
});
