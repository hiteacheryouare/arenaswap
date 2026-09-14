import { useRef, useState } from 'react';
import GameCard from '../../entrypoints/popup/components/gameCard';
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

const cardProps = {
	excitementResult: undefined,
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: () => {},
	gameBoosts: {},
	openTabs: [],
	registry: [],
	onRegistryChange: () => {},
	formatTabLabel: () => 'Tab',
	onOpenGameDetail: () => {},
	bettingPrefs: { bettingEnabled: false },
	weatherPrefs: { temperatureUnit: 'F' as const },
};

const mountCard = (game: Game, excitementResult?: PowerScoreResult) => {
	cy.mount(<GameCard {...cardProps} game={game} excitementResult={excitementResult} />);
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
	holidayDecorationsEnabled: false,
	holidaySnowEnabled: false,
	holidayLightsEnabled: false,
	holidayLeavesEnabled: false,
	postseasonBoostPoints: 0,
	upcomingGamesDays: 14,
	disabledSignals: [],
};

const StatefulMainView = ({ games, prefs, favoriteTeamIds = new Set<string>() }: {
	games: Game[];
	prefs: UserPreferences;
	favoriteTeamIds?: Set<string>;
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
			scores={[]}
			leagueLogos={{}}
			registry={[]}
			favoriteTeamIds={favoriteTeamIds}
			gameBoosts={{}}
			openTabs={[]}
			onStandbyStream={false}
			onOpenGameDetail={() => {}}
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

describe('a finished game', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
	});

	describe('the card', () => {
		it('says Final instead of running a live dot', () => {
			mountCard(finalGame);
			cy.get('.final-status-label').should('have.text', en.gameCard.final);
			cy.get('.live-dot').should('not.exist');
			cy.get('.live-status-label').should('not.exist');
		});

		it('offers no tab to assign, because there is nothing to switch to', () => {
			mountCard(finalGame);
			cy.get('select').should('not.exist');
		});

		it('draws no PowerScore bar even when a score is handed to it', () => {
			mountCard(finalGame, excitement);
			cy.get('.game-card-ps-bar-row').should('not.exist');
			cy.get('.game-card-ps-progress').should('not.exist');
			cy.contains('61').should('not.exist');
		});

		// Team colour on the scores was built and rejected: on a plate this light it read as two
		// unrelated inks rather than as one scoreline. Weight and a receded grey carry the result.
		it('dims the loser and leaves the winner at full weight', () => {
			mountCard(finalGame);
			cy.get('.game-score-value').eq(0).should('have.class', 'is-loser');
			cy.get('.game-score-value').eq(1).should('not.have.class', 'is-loser');
			cy.get('.game-score-value').then(([away, home]: JQuery<HTMLElement>) => {
				const loser = getComputedStyle(away);
				const winner = getComputedStyle(home);
				expect(Number(winner.fontWeight), 'the winner is the bolder of the two')
					.to.be.greaterThan(Number(loser.fontWeight));
				expect(loser.color, 'and a lighter ink').to.not.equal(winner.color);
				// Pinned, so this cannot pass on whatever a cell happens to inherit.
				expect(loser.color).to.equal('rgb(124, 135, 148)');
				expect(winner.color).to.equal('rgb(17, 24, 39)');
			});
		});

		// Receded is not the same as illegible. A 2.1rem semibold score is large text, so the dimmed
		// side still owes 3:1 against the plate it sits on — the same bar the chart and card colour
		// helpers are built around. The #9aa4b0 this replaced reached 2.33:1 here.
		it('dims the loser without dropping it under 3:1', () => {
			mountCard(finalGame);
			cy.get('.game-card.is-final').then(([card]: JQuery<HTMLElement>) => {
				const plate = getComputedStyle(card!).backgroundColor;
				cy.get('.game-score-value.is-loser').then(([loser]: JQuery<HTMLElement>) => {
					const ink = getComputedStyle(loser!).color;
					expect(contrastRatio(ink, plate), `${ink} on ${plate}`).to.be.at.least(3);
				});
			});
		});

		it('dims whichever side lost, not always the away team', () => {
			mountCard({ ...finalGame, homeTeam: { ...finalGame.homeTeam, score: 98 } });
			cy.get('.game-score-value').eq(0).should('not.have.class', 'is-loser');
			cy.get('.game-score-value').eq(1).should('have.class', 'is-loser');
		});

		it('dims neither side of a draw', () => {
			mountCard({ ...finalGame, homeTeam: { ...finalGame.homeTeam, score: 104 } });
			cy.get('.game-score-value.is-loser').should('not.exist');
			cy.get('.game-score-value').should('have.class', 'fw-bold');
		});

		// No team colour anywhere on the scoreline, which is a decision rather than an oversight.
		it('takes no colour from either team', () => {
			mountCard(finalGame);
			cy.get('.game-score-value').should('not.have.attr', 'style');
			cy.get('.game-score-value').then(([away, home]: JQuery<HTMLElement>) => {
				// CHI red and PHI blue are both on the game; neither reaches the score.
				for (const el of [away, home]) {
					const [red, green, blue] = getComputedStyle(el).color.match(/\d+/g)!.map(Number);
					expect(Math.max(red!, green!, blue!) - Math.min(red!, green!, blue!),
						'a neutral ink, not a hue').to.be.at.most(25);
				}
			});
		});

		// The scores were plain spans first, which measure differently from the .flip-score box the
		// live card puts them in — the difference was visible side by side in the list.
		//
		// Both mounts are enqueued at the top level. A `cy.mount` nested inside a `.then` replaces
		// the root while the surrounding chain still holds the old, now-detached nodes, and a
		// detached node reports an empty computed style rather than failing loudly.
		it('sets the scores in the same box the live card uses', () => {
			const live: { className?: string; fontSize?: string; fontFamily?: string; width?: number; height?: number } = {};

			// The winner's score on both, since the loser is deliberately a lighter weight and would
			// measure narrower for a reason that has nothing to do with the box it sits in.
			mountCard(liveGame);
			cy.get('.game-score-value').eq(1).then(([el]: JQuery<HTMLElement>) => {
				const style = getComputedStyle(el);
				const box = el.getBoundingClientRect();
				live.className = el.className;
				live.fontSize = style.fontSize;
				live.fontFamily = style.fontFamily;
				live.width = box.width;
				live.height = box.height;
			});

			mountCard(finalGame);
			cy.get('.game-score-value').eq(1).should(([el]: JQuery<HTMLElement>) => {
				const style = getComputedStyle(el);
				const box = el.getBoundingClientRect();
				// The harness stubs `./flipScore` down to a plain span, so the wrapper itself is not
				// observable here — what is, and what actually differed, is the class the score
				// carries and the metrics that class produces.
				expect(el.classList.contains('game-score-value')).to.equal(true);
				expect(live.className).to.contain('game-score-value');
				expect(style.fontSize).to.equal(live.fontSize);
				expect(style.fontFamily).to.equal(live.fontFamily);
				expect(box.height).to.be.closeTo(live.height!, 0.5);
				expect(box.width).to.be.closeTo(live.width!, 0.5);
			});
		});

		it('steps back from a live card rather than carrying its team-colour rails', () => {
			mountCard(finalGame);
			cy.get('.game-card').then(([final]: JQuery<HTMLElement>) => {
				const finalBackground = getComputedStyle(final).backgroundColor;
				expect(getComputedStyle(final).borderLeftWidth, 'no 5px team rail').to.not.equal('5px');
				mountCard(liveGame);
				cy.get('.game-card').should(([live]: JQuery<HTMLElement>) => {
					expect(getComputedStyle(live).backgroundColor, 'the two cards do not look alike')
						.to.not.equal(finalBackground);
				});
			});
		});

		it('names no broadcast, because there is nothing left to tune into', () => {
			mountCard(finalGame);
			cy.get('.game-meta-networks').should('not.exist');
			cy.contains(en.gameCard.watchLabel).should('not.exist');
			// The venue survives: where it was played is still true.
			cy.get('.game-meta-venue').should('have.text', 'Xfinity Mobile Arena');
		});

		it('leaves the broadcast on a live card', () => {
			mountCard(liveGame);
			cy.get('.game-meta-networks').should('contain.text', 'TNT');
		});

		it('keeps the attendance off the card entirely', () => {
			mountCard(finalGame);
			cy.contains((20478).toLocaleString()).should('not.exist');
			cy.get('.bi-people').should('not.exist');
		});

		// ESPN's own label, taken off `shortDetail` rather than derived from the period — which is
		// the only way SO for a shootout is ever produced.
		it('carries ESPN\'s own Final designation when there was extra time', () => {
			mountCard({ ...finalGame, finalPeriodSuffix: 'OT' });
			cy.get('.final-status-label').should('have.text', `${en.gameCard.final}/OT`);
			mountCard({ ...finalGame, finalPeriodSuffix: '3OT' });
			cy.get('.final-status-label').should('have.text', `${en.gameCard.final}/3OT`);
			mountCard({ ...finalGame, finalPeriodSuffix: '10' });
			cy.get('.final-status-label').should('have.text', `${en.gameCard.final}/10`);
			mountCard({ ...finalGame, finalPeriodSuffix: 'SO' });
			cy.get('.final-status-label').should('have.text', `${en.gameCard.final}/SO`);
		});

		it('says just Final on a game that ended in regulation', () => {
			mountCard(finalGame);
			cy.get('.final-status-label').should('have.text', en.gameCard.final);
			cy.get('.final-status-label').should('not.contain.text', '/');
		});

		it('still opens the detail screen when clicked', () => {
			const onOpenGameDetail = cy.spy().as('open');
			cy.mount(<GameCard {...cardProps} game={finalGame} onOpenGameDetail={onOpenGameDetail} />);
			cy.get('.game-card').click();
			cy.get('@open').should('have.been.calledWith', 'final-1');
		});

		it('keeps the status label on one line in every locale, suffix included', () => {
			mountCard({ ...finalGame, finalPeriodSuffix: '3OT' });
			cy.get('.final-status-label').then(([label]: JQuery<HTMLElement>) => {
				const oneLine = label.getBoundingClientRect().height;
				for (const [name, locale] of Object.entries(locales)) {
					label.textContent = `${(locale.gameCard as unknown as Record<string, string>).final}/3OT`;
					expect(label.getBoundingClientRect().height, `${name} keeps Final on one line`)
						.to.be.at.most(oneLine + 1);
				}
			});
		});
	});

	describe('the list', () => {
		// `mainView` imports './gameCard', which the component harness replaces with a stub, so
		// these assert placement by test id. The card's own internals are measured by the direct
		// mounts above, which import it by a path the stub does not match.
		it('gives finished games a section of their own', () => {
			cy.mount(<StatefulMainView games={[finalGame]} prefs={listPrefs} />);
			cy.get('.popup-section-title').should('contain.text', en.main.sectionFinal);
			cy.get('[data-testid="game-card-final-1"]').should('exist');
		});

		it('puts that section under Up Next, not above it', () => {
			const upcoming: Game = {
				...finalGame,
				id: 'pre-1',
				status: 'pre',
				period: 0,
				startTime: new Date(Date.now() + (4 * 60 * 60 * 1000)).toISOString(),
			};
			cy.mount(<StatefulMainView games={[finalGame, upcoming]} prefs={listPrefs} />);
			cy.get('.popup-section-title').should('have.length', 2);
			cy.get('.popup-section-title').then(([upNext, final]: JQuery<HTMLElement>) => {
				expect(upNext.textContent).to.equal(en.main.sectionUpNext);
				expect(final.textContent).to.equal(en.main.sectionFinal);
				expect(final.getBoundingClientRect().top, 'Final sits below Up Next')
					.to.be.greaterThan(upNext.getBoundingClientRect().top);
			});
		});

		it('and under the live sections too', () => {
			cy.mount(<StatefulMainView games={[finalGame, liveGame]} prefs={listPrefs} />);
			cy.get('.popup-section-title').then(([live, final]: JQuery<HTMLElement>) => {
				expect(live.textContent).to.equal(en.main.sectionOtherLiveGames);
				expect(final.textContent).to.equal(en.main.sectionFinal);
				expect(final.getBoundingClientRect().top).to.be.greaterThan(live.getBoundingClientRect().top);
			});
		});

		it('shows nothing at all while the setting is off', () => {
			cy.mount(<StatefulMainView games={[finalGame]} prefs={{ ...listPrefs, keepFinalGames: false }} />);
			cy.get('.popup-section-title').should('not.exist');
			cy.get('[data-testid="game-card-final-1"]').should('not.exist');
		});

		// A slate of nothing but results is not an empty slate, and the "no games" state would
		// otherwise sit above a section full of cards.
		it('does not read as an empty slate when only results are left', () => {
			cy.mount(<StatefulMainView games={[finalGame]} prefs={{ ...listPrefs, showUpcomingGames: false }} />);
			cy.get('[data-testid="empty-no-games"]').should('not.exist');
			cy.get('[data-testid="game-card-final-1"]').should('exist');
		});

		// And the reverse, so the assertion above is measuring the new clause rather than a state
		// this view never reaches.
		it('still reads as an empty slate with the setting off and nothing else on', () => {
			cy.mount(<StatefulMainView games={[finalGame]} prefs={{ ...listPrefs, showUpcomingGames: false, keepFinalGames: false }} />);
			cy.get('[data-testid="empty-no-games"]').should('exist');
		});

		// Across the whole section rather than inside each league group: the result you came looking
		// for is your team's, and it should not be a league header down.
		it('pins your teams to the top, ahead of a game that ended more recently', () => {
			const older: Game = {
				...finalGame,
				id: 'mine',
				startTime: new Date(Date.now() - (8 * 60 * 60 * 1000)).toISOString(),
			};
			const newer: Game = {
				...finalGame,
				id: 'theirs',
				homeTeam: { ...finalGame.homeTeam, id: 'other-h' },
				awayTeam: { ...finalGame.awayTeam, id: 'other-a' },
				startTime: new Date(Date.now() - (1 * 60 * 60 * 1000)).toISOString(),
			};
			cy.mount(
				<StatefulMainView
					games={[newer, older]}
					prefs={listPrefs}
					favoriteTeamIds={new Set(['nba:h'])}
				/>,
			);
			cy.get('[data-testid^="game-card-"]').then(cards => {
				expect([...cards].map(c => c.getAttribute('data-testid')))
					.to.deep.equal(['game-card-mine', 'game-card-theirs']);
			});
		});

		it('and falls back to most recently wrapped with no favourites involved', () => {
			const older: Game = { ...finalGame, id: 'older', startTime: new Date(Date.now() - (8 * 60 * 60 * 1000)).toISOString() };
			const newer: Game = { ...finalGame, id: 'newer', startTime: new Date(Date.now() - (1 * 60 * 60 * 1000)).toISOString() };
			cy.mount(<StatefulMainView games={[older, newer]} prefs={listPrefs} />);
			cy.get('[data-testid^="game-card-"]').then(cards => {
				expect([...cards].map(c => c.getAttribute('data-testid')))
					.to.deep.equal(['game-card-newer', 'game-card-older']);
			});
		});

		it('keeps the section heading on one line in every locale', () => {
			cy.mount(<StatefulMainView games={[finalGame]} prefs={listPrefs} />);
			cy.get('.popup-section-title').last().then(([heading]: JQuery<HTMLElement>) => {
				const oneLine = heading.getBoundingClientRect().height;
				for (const [name, locale] of Object.entries(locales)) {
					heading.textContent = (locale.main as unknown as Record<string, string>).sectionFinal;
					expect(heading.getBoundingClientRect().height, `${name} keeps the heading on one line`)
						.to.be.at.most(oneLine + 1);
				}
			});
		});
	});

	describe('the wrap screen', () => {
		it('carries no PowerScore anywhere', () => {
			mountDetail(finalGame, { powerScoreHistory: spanning(), scoreHistory: scoreSpan() });
			cy.get('.powerscore-breakdown').should('not.exist');
			cy.contains(en.powerScore.heading).should('not.exist');
			cy.contains('61').should('not.exist');
			// The rest of the screen is still there, so the assertions above are measuring the
			// branch rather than a screen that failed to render.
			cy.contains(en.detail.gameInfoHeading).should('exist');
		});

		it('offers no boost, which could only change a number nothing will compute again', () => {
			mountDetail(finalGame, { powerScoreHistory: spanning() });
			cy.get('.game-detail-boost-row').should('not.exist');
		});

		// Both of the above are absences, so they are worth nothing unless the live screen is shown
		// to have the things the wrap is missing.
		it('is missing what a live screen has, rather than the selectors being wrong', () => {
			mountDetail(liveGame, { powerScoreHistory: spanning(), scoreHistory: scoreSpan() });
			cy.get('.powerscore-breakdown').should('exist');
			cy.get('.game-detail-boost-row').should('exist');
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

		it('dims the loser in the hero as well as on the card', () => {
			mountDetail(finalGame);
			cy.get('.game-detail-score-value').should('have.length', 2);
			cy.get('.game-detail-score-value').eq(0).should('have.class', 'is-loser');
			cy.get('.game-detail-score-value').eq(1).should('not.have.class', 'is-loser');
			cy.get('.game-detail-score-value').then(([away, home]: JQuery<HTMLElement>) => {
				expect(Number(getComputedStyle(home).fontWeight))
					.to.be.greaterThan(Number(getComputedStyle(away).fontWeight));
				expect(getComputedStyle(away).color).to.not.equal(getComputedStyle(home).color);
			});
		});

		// A dimmed score mid-game would read as the team that is behind rather than the team that
		// lost, and it would flip on every basket.
		it('dims neither side while the game is still being played', () => {
			mountDetail(liveGame);
			cy.get('.game-detail-score-value.is-loser').should('not.exist');
		});

		it('still says Final in the bar at the top', () => {
			mountDetail(finalGame);
			cy.contains(en.detail.final).should('exist');
		});
	});
});
