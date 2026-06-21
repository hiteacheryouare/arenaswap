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

describe('baseball & softball league configs', () => {
	it('cbase is a 9-inning baseball league', () => {
		expect(leagueConfigMap.cbase).toBeDefined();
		expect(leagueConfigMap.cbase.sportType).toBe('baseball');
		expect(leagueConfigMap.cbase.espnPath).toBe('baseball/college-baseball');
		expect(leagueConfigMap.cbase.regularPeriods).toBe(9);
		expect(leagueConfigMap.cbase.periodFormat).toBe('innings');
	});

	it('csoft is a 7-inning softball league', () => {
		expect(leagueConfigMap.csoft).toBeDefined();
		expect(leagueConfigMap.csoft.sportType).toBe('softball');
		expect(leagueConfigMap.csoft.espnPath).toBe('baseball/college-softball');
		expect(leagueConfigMap.csoft.regularPeriods).toBe(7);
		expect(leagueConfigMap.csoft.periodFormat).toBe('innings');
	});

	it('olybb is a 9-inning baseball league with the correct Olympics ESPN path', () => {
		expect(leagueConfigMap.olybb).toBeDefined();
		expect(leagueConfigMap.olybb.sportType).toBe('baseball');
		expect(leagueConfigMap.olybb.espnPath).toBe('baseball/olympics-baseball');
		expect(leagueConfigMap.olybb.regularPeriods).toBe(9);
	});

	it('wbbc is a 9-inning baseball league', () => {
		expect(leagueConfigMap.wbbc).toBeDefined();
		expect(leagueConfigMap.wbbc.sportType).toBe('baseball');
		expect(leagueConfigMap.wbbc.espnPath).toBe('baseball/world-baseball-classic');
	});
});

describe('Olympic basketball league configs', () => {
	it('olybkm is FIBA-spec basketball (10-min quarters)', () => {
		expect(leagueConfigMap.olybkm).toBeDefined();
		expect(leagueConfigMap.olybkm.sportType).toBe('basketball');
		expect(leagueConfigMap.olybkm.espnPath).toBe('basketball/mens-olympics-basketball');
		expect(leagueConfigMap.olybkm.regularPeriods).toBe(4);
		expect(leagueConfigMap.olybkm.periodDurationSecs).toBe(600);
		expect(leagueConfigMap.olybkm.periodFormat).toBe('quarters');
	});

	it('olybkw is FIBA-spec womens basketball (10-min quarters)', () => {
		expect(leagueConfigMap.olybkw).toBeDefined();
		expect(leagueConfigMap.olybkw.sportType).toBe('basketball');
		expect(leagueConfigMap.olybkw.espnPath).toBe('basketball/womens-olympics-basketball');
		expect(leagueConfigMap.olybkw.regularPeriods).toBe(4);
		expect(leagueConfigMap.olybkw.periodDurationSecs).toBe(600);
	});
});

describe('hockey league configs — new', () => {
	it('olymih is Olympic mens ice hockey with correct ESPN path', () => {
		expect(leagueConfigMap.olymih).toBeDefined();
		expect(leagueConfigMap.olymih.sportType).toBe('hockey');
		expect(leagueConfigMap.olymih.espnPath).toBe('hockey/olympics-mens-ice-hockey');
		expect(leagueConfigMap.olymih.regularPeriods).toBe(3);
	});

	it('olywih is Olympic womens ice hockey with correct ESPN path', () => {
		expect(leagueConfigMap.olywih).toBeDefined();
		expect(leagueConfigMap.olywih.sportType).toBe('hockey');
		expect(leagueConfigMap.olywih.espnPath).toBe('hockey/olympics-womens-ice-hockey');
		expect(leagueConfigMap.olywih.regularPeriods).toBe(3);
	});
});

describe('UFL league config', () => {
	it('ufl is a football league with correct ESPN path', () => {
		expect(leagueConfigMap.ufl).toBeDefined();
		expect(leagueConfigMap.ufl.sportType).toBe('football');
		expect(leagueConfigMap.ufl.espnPath).toBe('football/ufl');
		expect(leagueConfigMap.ufl.regularPeriods).toBe(4);
		expect(leagueConfigMap.ufl.periodDurationSecs).toBe(900);
		expect(leagueConfigMap.ufl.periodFormat).toBe('quarters');
	});
});

describe('softball sport type config', () => {
	it('exists in sportTypeConfigs', () => {
		const softball = sportTypeConfigs.find(c => c.id === 'softball');
		expect(softball).toBeDefined();
	});

	it('is not clock-based and uses 7-inning lateGameCurve', () => {
		const softball = sportTypeConfigs.find(c => c.id === 'softball');
		expect(softball!.clockBased).toBe(false);
		expect(softball!.lateGameCurve?.model).toBe('baseball');
		if (softball!.lateGameCurve?.model === 'baseball') {
			expect(softball!.lateGameCurve.regulationInnings).toBe(7);
			expect(softball!.lateGameCurve.regulationStartInning).toBeLessThan(softball!.lateGameCurve.regulationInnings);
			expect(softball!.lateGameCurve.extraInningsStartInning).toBeGreaterThan(softball!.lateGameCurve.regulationInnings);
		}
	});

	it('disables the OT pre-boost (no clock)', () => {
		const softball = sportTypeConfigs.find(c => c.id === 'softball');
		expect(softball!.otPreBoostWindowSecs).toBe(0);
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
