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
	it('is the 100-point headline cap', () => {
		expect(scoreMaxTotal).toBe(100);
	});

	it('is below the sum of per-signal ceilings (overcomplete, so exciting games can saturate)', () => {
		const sumOfCeilings = scoreMaxCloseness + scoreMaxLateGame + scoreMaxMomentum + scoreMaxLeadChanges + scoreMaxComeback;
		expect(sumOfCeilings).toBeGreaterThan(scoreMaxTotal);
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

	it('includes ncaaw as a basketball league with correct ESPN path', () => {
		expect(leagueConfigMap.ncaaw).toBeDefined();
		expect(leagueConfigMap.ncaaw.sportType).toBe('basketball');
		expect(leagueConfigMap.ncaaw.espnPath).toBe('basketball/womens-college-basketball');
		expect(leagueConfigMap.ncaaw.regularPeriods).toBe(4);
		expect(leagueConfigMap.ncaaw.periodFormat).toBe('quarters');
	});

	it('includes epl as a soccer league with correct ESPN path', () => {
		expect(leagueConfigMap.epl).toBeDefined();
		expect(leagueConfigMap.epl.sportType).toBe('soccer');
		expect(leagueConfigMap.epl.espnPath).toBe('soccer/eng.1');
		expect(leagueConfigMap.epl.regularPeriods).toBe(2);
		expect(leagueConfigMap.epl.periodFormat).toBe('halves');
	});

	it('includes fifawc as a soccer league with correct ESPN path', () => {
		expect(leagueConfigMap.fifawc).toBeDefined();
		expect(leagueConfigMap.fifawc.sportType).toBe('soccer');
		expect(leagueConfigMap.fifawc.espnPath).toBe('soccer/fifa.world');
		expect(leagueConfigMap.fifawc.regularPeriods).toBe(2);
		expect(leagueConfigMap.fifawc.periodFormat).toBe('halves');
	});
});

describe('sportTypeConfigs late-game config', () => {
	it('clock sports derive the ramp from period/clock and carry no inning curve', () => {
		for (const config of sportTypeConfigs) {
			if (!config.clockBased) continue;
			expect(config.lateGameCurve).toBeUndefined();
			expect(config.otPreBoostWindowSecs).toBeGreaterThan(0);
		}
	});

	it('baseball defines inning anchors and disables the OT pre-boost', () => {
		const baseball = sportTypeConfigs.find(c => c.id === 'baseball');
		expect(baseball).toBeDefined();
		expect(baseball!.lateGameCurve?.model).toBe('baseball');
		if (baseball!.lateGameCurve?.model === 'baseball') {
			expect(baseball!.lateGameCurve.regulationStartInning).toBeLessThan(baseball!.lateGameCurve.regulationInnings);
			expect(baseball!.lateGameCurve.extraInningsStartInning).toBeGreaterThan(baseball!.lateGameCurve.regulationInnings);
		}
		expect(baseball!.otPreBoostWindowSecs).toBe(0);
	});

	it('every sport defines sport-scaled decay half-lives', () => {
		for (const config of sportTypeConfigs) {
			expect(config.decayHalfLifeMs.momentum).toBeGreaterThan(0);
			expect(config.decayHalfLifeMs.leadChange).toBeGreaterThan(0);
			expect(config.decayHalfLifeMs.comeback).toBeGreaterThan(0);
		}
	});
});
