import { useRef, useState } from 'react';
import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import MainView from '../../entrypoints/popup/components/mainView';
import { sportWrapAllowanceMs } from '@arenaswap/core/constants';
import type { Game, PowerScoreResult, PowerScoreSnapshot, ScoreSnapshot, UserPreferences } from '@arenaswap/core/types';
import de from '../../locales/de.json';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fil from '../../locales/fil.json';
import fr from '../../locales/fr.json';
// Not `it` — that would shadow Mocha's global it() and break every test in this file.
import itLocale from '../../locales/it.json';
import ja from '../../locales/ja.json';
import ko from '../../locales/ko.json';
import ptBR from '../../locales/pt_BR.json';
import ptPT from '../../locales/pt_PT.json';
import zhCN from '../../locales/zh_CN.json';
import zhTW from '../../locales/zh_TW.json';

const locales = { de, en, es, fil, fr, it: itLocale, ja, ko, pt_BR: ptBR, pt_PT: ptPT, zh_CN: zhCN, zh_TW: zhTW };

const startedAt = new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString();
const startMs = new Date(startedAt).getTime();

const finalGame: Game = {
	id: 'final-1',
	league: 'nba',
	sportType: 'basketball',
	status: 'post',
	period: 4,
	clockSeconds: 0,
	startTime: startedAt,
	venueName: 'Xfinity Mobile Arena',
	venueLocation: 'Philadelphia, PA',
	attendance: 20478,
	broadcasts: ['TNT'],
	homeTeam: { id: 'h', name: 'Philadelphia 76ers', abbreviation: 'PHI', score: 112, color: '#006BB6' },
	awayTeam: { id: 'a', name: 'Chicago Bulls', abbreviation: 'CHI', score: 104, color: '#CE1141' },
};

// No attendance: ESPN only fills the figure in when it flips the status, so a live game carrying
// one is not a state the extension can be in.
const liveGame: Game = { ...finalGame, id: 'live-1', status: 'in', period: 3, clockSeconds: 284, attendance: undefined };

const excitement: PowerScoreResult = {
	gameId: 'final-1',
	total: 61,
	closeness: 22,
	lateGame: 19,
	momentum: 11,
	leadChanges: 6,
	comeback: 3,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	stalled: false,
	reason: 'close game',
};

// Both arguments come back off a computed style, so they arrive as 'rgb(r, g, b)' rather than as
// hex. Reading the plate rather than hardcoding it is the point: a card whose background moved
// would otherwise leave the ink measured against a colour it no longer sits on.
const channelsOf = (color: string): number[] => (
	(color.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number)
);

const relativeLuminance = (color: string): number => {
	const [red, green, blue] = channelsOf(color).map(value => {
		const channel = value / 255;
		return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	return (0.2126 * red!) + (0.7152 * green!) + (0.0722 * blue!);
};

const contrastRatio = (a: string, b: string): number => {
	const [high, low] = [relativeLuminance(a), relativeLuminance(b)].toSorted((x, y) => y - x);
	return (high! + 0.05) / (low! + 0.05);
};

// A history whose ends bracket the whole game, and one that only picks it up near the end.
const spanning = (): PowerScoreSnapshot[] => (
	[0, 0.5, 0.95].map(fraction => ({
		gameId: finalGame.id,
		timestamp: startMs + (sportWrapAllowanceMs.basketball * fraction),
		total: 60,
		closeness: 20, lateGame: 20, momentum: 10, leadChanges: 5, comeback: 5,
		signalsSubtotal: 60, favoriteBonus: 0, favoriteTeamCount: 0, stalled: false,
		reason: 'close game',
	}))
);

const fragment = (): PowerScoreSnapshot[] => (
	spanning().map(snapshot => ({ ...snapshot, timestamp: snapshot.timestamp + (sportWrapAllowanceMs.basketball * 0.8) }))
);

const scoreSpan = (): ScoreSnapshot[] => (
	spanning().map(snapshot => ({ gameId: finalGame.id, timestamp: snapshot.timestamp, homeScore: 50, awayScore: 48 }))
);

const mountDetail = (game: Game, over: {
	powerScoreHistory?: PowerScoreSnapshot[];
	scoreHistory?: ScoreSnapshot[];
} = {}) => {
	cy.mount(
		<GameDetailView
			game={game}
			excitementResult={excitement}
			scoreHistory={over.scoreHistory ?? []}
			powerScoreHistory={over.powerScoreHistory ?? []}
			proTipsEnabled={false}
			gameBoosts={{}}
			bettingPrefs={{ bettingEnabled: false }}
			weatherPrefs={{ temperatureUnit: 'F' }}
			decorationPrefs={{ holidayDecorationsEnabled: false, holidaySnowEnabled: false, holidayLightsEnabled: false, holidayLeavesEnabled: false }}
			onSetGameBoost={() => {}}
			onBack={() => {}}
		/>,
	);
};

const listPrefs: UserPreferences = {
	enabled: true,
	enabledLeagues: ['nba'],
	sensitivity: 4,
	cooldownSeconds: 45,
	switchDelaySeconds: 0,
	showUpcomingGames: true,
	keepFinalGames: true,
	finishedTabAction: 'keep' as const,
	proTipsEnabled: false,
	notificationsEnabled: false,
	favoriteTeamBonusPoints: 0,
	favoriteTeamIds: [],
	standbyStreamEnabled: false,
	standbyStreamThreshold: 20,
	bettingEnabled: false,
	temperatureUnit: 'F',
	romerUnlocked: false,
	openRevealEnabled: true,
	theme: 'dark',
	holidayDecorationsEnabled: false,
	holidaySnowEnabled: false,
	holidayLightsEnabled: false,
	holidayLeavesEnabled: false,
	postseasonBoostPoints: 0,
	upcomingGamesDays: 14,
	disabledSignals: [],
};

const StatefulMainView = ({ games, prefs, favoriteTeamIds = new Set<string>(), scores = [], onOpenGameDetail = () => {} }: {
	games: Game[];
	prefs: UserPreferences;
	favoriteTeamIds?: Set<string>;
	scores?: PowerScoreResult[];
	onOpenGameDetail?: (gameId: string) => void;
}) => {
	const scrollOffsetRef = useRef(0);
	const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
	return (
		<MainView
			prefs={prefs}
			prefsLoaded
			isLoading={false}
			hasError={false}
			games={games}
			scores={scores}
			leagueLogos={{}}
			registry={[]}
			favoriteTeamIds={favoriteTeamIds}
			gameBoosts={{}}
			openTabs={[]}
			onStandbyStream={false}
			onOpenGameDetail={onOpenGameDetail}
			onOpenSetup={() => {}}
			suggestionCount={0}
			onReviewSuggestions={() => {}}
			onDismissSuggestions={() => {}}
			onStartWalkthrough={() => {}}
			onOpenGuide={() => {}}
			onRefresh={() => {}}
			showReviewPrompt={false}
			onToggleEnabled={() => {}}
			onDismissReviewPrompt={() => {}}
			onLeaveReview={() => {}}
			onToggleFavoriteTeam={() => {}}
			onRegistryChange={() => {}}
			formatTabLabel={() => 'Tab'}
			scrollOffsetRef={scrollOffsetRef}
			selectedDayKey={selectedDayKey}
			onSelectDay={setSelectedDayKey}
		/>
	);
};

const order = () => cy.get('[data-game]').then($games => [...$games].map(game => game.dataset.game));
const rowOf = (id = 'final-1') => cy.get(`.as-row[data-game="${id}"]`);

describe('a finished game', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	describe('the row', () => {
		const mountRow = (game: Game, scores: PowerScoreResult[] = []) => {
			cy.mount(<StatefulMainView games={[game]} prefs={{ ...listPrefs, showUpcomingGames: false }} scores={scores} />);
		};

		it('says Final instead of a clock, and runs no live marker', () => {
			mountRow(finalGame);
			rowOf().find('.as-centre-word').should('have.text', en.gameCard.final);
			rowOf().should('have.class', 'is-post').and('have.class', 'is-quiet');
		});

		it('offers no tab to assign, because there is nothing to switch to', () => {
			mountRow(finalGame);
			rowOf().find('.game-card-tab-assign').should('not.exist');
		});

		it('shows no PowerScore even when one is handed to it', () => {
			mountRow(finalGame, [excitement]);
			rowOf().find('.as-power-line').should('not.exist');
			rowOf().should('not.contain.text', '61');
		});

		it('dims the loser and leaves the winner at full weight', () => {
			mountRow(finalGame);
			rowOf().find('.as-match-score').eq(0).should('have.class', 'is-behind');
			rowOf().find('.as-match-score').eq(1).should('not.have.class', 'is-behind');
			rowOf().find('.as-match-score').then(([away, home]: JQuery<HTMLElement>) => {
				const loser = getComputedStyle(away!);
				const winner = getComputedStyle(home!);
				expect(Number(winner.fontWeight), 'the winner is the bolder of the two').to.be.greaterThan(Number(loser.fontWeight));
				expect(loser.color, 'and a lighter ink').to.not.equal(winner.color);
			});
		});

		// Receded is not the same as illegible: the dimmed side still owes 3:1 against the page.
		it('dims the loser without dropping it under 3:1', () => {
			mountRow(finalGame);
			cy.get('.popup-container').then(([popup]: JQuery<HTMLElement>) => {
				const page = getComputedStyle(popup!).backgroundColor;
				rowOf().find('.as-match-score.is-behind').then(([loser]: JQuery<HTMLElement>) => {
					const ink = getComputedStyle(loser!).color;
					expect(contrastRatio(ink, page), `${ink} on ${page}`).to.be.at.least(3);
				});
			});
		});

		it('dims whichever side lost, not always the away team', () => {
			mountRow({ ...finalGame, homeTeam: { ...finalGame.homeTeam, score: 98 } });
			rowOf().find('.as-match-score').eq(0).should('not.have.class', 'is-behind');
			rowOf().find('.as-match-score').eq(1).should('have.class', 'is-behind');
		});

		it('dims neither side of a draw', () => {
			mountRow({ ...finalGame, homeTeam: { ...finalGame.homeTeam, score: 104 } });
			rowOf().find('.as-match-score.is-behind').should('not.exist');
		});

		// No team colour anywhere on the scoreline: weight and a receded grey carry the result.
		it('takes no colour from either team', () => {
			mountRow(finalGame);
			rowOf().find('.as-match-score').then(([away, home]: JQuery<HTMLElement>) => {
				for (const el of [away!, home!]) {
					const [red, green, blue] = getComputedStyle(el).color.match(/\d+/g)!.map(Number);
					expect(Math.max(red!, green!, blue!) - Math.min(red!, green!, blue!), 'a neutral ink, not a hue').to.be.at.most(25);
				}
			});
		});

		it('names no broadcast and no attendance, because there is nothing left to tune into', () => {
			mountRow(finalGame);
			rowOf().should('not.contain.text', 'TNT').and('not.contain.text', (20478).toLocaleString());
		});

		// Our sources' own label, taken off `shortDetail` rather than derived from the period, which
		// is the only way SO for a shootout is ever produced.
		it('carries the Final designation when there was extra time', () => {
			for (const suffix of ['OT', '3OT', '10', 'SO']) {
				mountRow({ ...finalGame, finalPeriodSuffix: suffix });
				rowOf().find('.as-centre-word').should('have.text', `${en.gameCard.final}/${suffix}`);
			}
		});

		it('says just Final on a game that ended in regulation', () => {
			mountRow(finalGame);
			rowOf().find('.as-centre-word').should('not.contain.text', '/');
		});

		it('still opens the detail screen when clicked', () => {
			const onOpenGameDetail = cy.spy().as('open');
			cy.mount(<StatefulMainView games={[finalGame]} prefs={{ ...listPrefs, showUpcomingGames: false }} onOpenGameDetail={onOpenGameDetail} />);
			rowOf().click('left');
			cy.get('@open').should('have.been.calledWith', 'final-1');
		});

		it('keeps the status on one line in every locale, suffix included', () => {
			mountRow({ ...finalGame, finalPeriodSuffix: '3OT' });
			rowOf().find('.as-centre-word').then(([label]: JQuery<HTMLElement>) => {
				const oneLine = label!.getBoundingClientRect().height;
				for (const [name, locale] of Object.entries(locales)) {
					label!.textContent = `${(locale.gameCard as unknown as Record<string, string>).final}/3OT`;
					expect(label!.getBoundingClientRect().height, `${name} keeps Final on one line`).to.be.at.most(oneLine + 1);
				}
			});
		});
	});

	describe('the list', () => {
		it('puts finished games under their own title, which names the section', () => {
			cy.mount(<StatefulMainView games={[finalGame]} prefs={listPrefs} />);
			cy.get('#gm-final-title').should('have.text', en.main.sectionFinal);
			cy.get('section.gm-after[aria-labelledby="gm-final-title"] [data-game="final-1"]').should('exist');
		});

		it('puts them under the upcoming games, not above them', () => {
			const upcoming: Game = {
				...finalGame,
				id: 'pre-1',
				status: 'pre',
				period: 0,
				startTime: new Date(Date.now() + (4 * 60 * 60 * 1000)).toISOString(),
			};
			cy.mount(<StatefulMainView games={[finalGame, upcoming]} prefs={listPrefs} />);
			order().should('deep.equal', ['pre-1', 'final-1']);
		});

		it('and under the live games too', () => {
			cy.mount(<StatefulMainView games={[finalGame, liveGame]} prefs={listPrefs} />);
			order().should('deep.equal', ['live-1', 'final-1']);
		});

		it('shows nothing at all while the setting is off', () => {
			cy.mount(<StatefulMainView games={[finalGame]} prefs={{ ...listPrefs, keepFinalGames: false }} />);
			cy.get('[data-game="final-1"]').should('not.exist');
		});

		// A slate of nothing but results is not an empty slate.
		it('does not read as an empty slate when only results are left', () => {
			cy.mount(<StatefulMainView games={[finalGame]} prefs={{ ...listPrefs, showUpcomingGames: false }} />);
			cy.get('[data-testid="empty-no-games"]').should('not.exist');
			cy.get('[data-game="final-1"]').should('exist');
		});

		// And the reverse, so the assertion above is measuring the new clause.
		it('still reads as an empty slate with the setting off and nothing else on', () => {
			cy.mount(<StatefulMainView games={[finalGame]} prefs={{ ...listPrefs, showUpcomingGames: false, keepFinalGames: false }} />);
			cy.get('[data-testid="empty-no-games"]').should('exist');
		});

		it('pins your teams to the top, ahead of a game that ended more recently', () => {
			const older: Game = { ...finalGame, id: 'mine', startTime: new Date(Date.now() - (8 * 60 * 60 * 1000)).toISOString() };
			const newer: Game = {
				...finalGame,
				id: 'theirs',
				homeTeam: { ...finalGame.homeTeam, id: 'other-h' },
				awayTeam: { ...finalGame.awayTeam, id: 'other-a' },
				startTime: new Date(Date.now() - (1 * 60 * 60 * 1000)).toISOString(),
			};
			cy.mount(<StatefulMainView games={[newer, older]} prefs={listPrefs} favoriteTeamIds={new Set(['nba:h'])} />);
			order().should('deep.equal', ['mine', 'theirs']);
		});

		it('and falls back to most recently wrapped with no favourites involved', () => {
			const older: Game = { ...finalGame, id: 'older', startTime: new Date(Date.now() - (8 * 60 * 60 * 1000)).toISOString() };
			const newer: Game = { ...finalGame, id: 'newer', startTime: new Date(Date.now() - (1 * 60 * 60 * 1000)).toISOString() };
			cy.mount(<StatefulMainView games={[older, newer]} prefs={listPrefs} />);
			order().should('deep.equal', ['newer', 'older']);
		});
	});

	describe('the wrap screen', () => {
		it('carries no PowerScore anywhere', () => {
			mountDetail(finalGame, { powerScoreHistory: spanning(), scoreHistory: scoreSpan() });
			cy.get('.powerscore-breakdown').should('not.exist');
			cy.get('.dt-hero .as-stage-power').should('not.exist');
			cy.contains(en.powerScore.heading).should('not.exist');
			cy.contains(en.gameCard.powerScore).should('not.exist');
			cy.contains('61').should('not.exist');
			// The rest of the screen is still there, so the assertions above are measuring the
			// branch rather than a screen that failed to render.
			cy.contains(en.detail.gameInfoHeading).should('exist');
		});

		it('offers no boost, which could only change a number nothing will compute again', () => {
			mountDetail(finalGame, { powerScoreHistory: spanning() });
			cy.get('.dt-boost').should('not.exist');
			cy.get('.powerscore-boost-input').should('not.exist');
		});

		// Both of the above are absences, so they are worth nothing unless the live screen is shown
		// to have the things the wrap is missing.
		it('is missing what a live screen has, rather than the selectors being wrong', () => {
			mountDetail(liveGame, { powerScoreHistory: spanning(), scoreHistory: scoreSpan() });
			cy.get('.powerscore-breakdown').should('exist');
			cy.get('.dt-boost').should('exist');
			cy.get('.dt-hero .as-stage-power').should('exist');
		});

		it('shows the box score and the game info panel', () => {
			mountDetail(finalGame);
			cy.get('.game-info-panel').should('exist');
			cy.get('.game-info-row').should('contain.text', 'Xfinity Mobile Arena');
		});

		it('names the attendance, which is the one screen it can appear on', () => {
			mountDetail(finalGame);
			cy.contains(en.detail.infoAttendance).should('exist');
			cy.contains((20478).toLocaleString()).should('exist');
		});

		it('draws the charts when the history covers the whole game', () => {
			mountDetail(finalGame, { powerScoreHistory: spanning(), scoreHistory: scoreSpan() });
			cy.contains(en.detail.chartPowerScoreTitle).should('exist');
			cy.contains(en.detail.chartScoreTitle).should('exist');
		});

		it('and drops them when it only picked the game up near the end', () => {
			mountDetail(finalGame, { powerScoreHistory: fragment(), scoreHistory: scoreSpan() });
			cy.contains(en.detail.chartPowerScoreTitle).should('not.exist');
			cy.contains(en.detail.chartComponentsTitle).should('not.exist');
		});

		it('drops them when there is no history at all', () => {
			mountDetail(finalGame);
			cy.contains(en.detail.chartPowerScoreTitle).should('not.exist');
			cy.contains(en.detail.chartScoreTitle).should('not.exist');
		});

		// The same fragment is the honest shape of a game still being played, so the rule is the
		// wrap screen's alone.
		it('leaves a live screen free to draw a partial line', () => {
			mountDetail(liveGame, { powerScoreHistory: fragment(), scoreHistory: scoreSpan() });
			cy.contains(en.detail.chartPowerScoreTitle).should('exist');
		});

		it('dims the loser on the stage as well as on the list', () => {
			mountDetail(finalGame);
			cy.get('.dt-hero .as-match-score').should('have.length', 2);
			cy.get('.dt-hero .as-match-score').eq(0).should('have.class', 'is-behind');
			cy.get('.dt-hero .as-match-score').eq(1).should('not.have.class', 'is-behind');
			cy.get('.dt-hero .as-match-score').then(([away, home]: JQuery<HTMLElement>) => {
				expect(getComputedStyle(away!).color, 'the loser reads quieter').to.not.equal(getComputedStyle(home!).color);
			});
		});

		// The stage dims whoever is behind while play goes on, the same on the list and here, so a
		// level game is the case that must dim nobody.
		it('dims neither side of a level game', () => {
			mountDetail({ ...liveGame, homeTeam: { ...liveGame.homeTeam, score: 98 }, awayTeam: { ...liveGame.awayTeam, score: 98 } });
			cy.get('.dt-hero .as-match-score.is-behind').should('not.exist');
		});

		it('still says Final at the top of the stage and in the compact bar', () => {
			mountDetail(finalGame);
			cy.get('.dt-hero .as-centre-word').should('have.text', en.gameCard.final);
			cy.get('.dt-bar-status').should('have.text', en.gameCard.final);
		});
	});
});
