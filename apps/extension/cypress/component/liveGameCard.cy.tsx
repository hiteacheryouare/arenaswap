import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';

const baseGame: Game = {
	id: 'g1',
	status: 'in',
	league: 'nba',
	sportType: 'basketball',
	period: 2,
	clockSeconds: 300,
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 50 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 48 },
};

const baseResult: PowerScoreResult = {
	gameId: 'g1',
	total: 42,
	closeness: 10,
	lateGame: 8,
	momentum: 6,
	leadChanges: 4,
	comeback: 0,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	stalled: false,
	reason: 'Close game',
};

const channels = (value: string): [number, number, number] => {
	const matched = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value)!;
	return [Number(matched[1]), Number(matched[2]), Number(matched[3])];
};

const luminance = (value: string): number => {
	const linear = channels(value).map(channel => {
		const scaled = channel / 255;
		return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
	});
	return (0.2126 * linear[0]!) + (0.7152 * linear[1]!) + (0.0722 * linear[2]!);
};

const contrastRatio = (a: string, b: string): number => {
	const [high, low] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
	return (high! + 0.05) / (low! + 0.05);
};

const defaultProps = {
	game: baseGame,
	excitementResult: baseResult,
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: () => {},
	onOpenGameDetail: () => {},
	bettingPrefs: { bettingEnabled: false },
};

describe('liveGameCard PowerScore bar', () => {
	it('renders PowerScore progress bar when excitementResult is provided', () => {
		cy.mount(<LiveGameCard {...defaultProps} />);
		cy.get('[role="progressbar"]').should('exist');
		cy.contains(/PowerScore/i).should('exist');
	});

	it('does not render PowerScore bar when excitementResult is undefined', () => {
		cy.mount(<LiveGameCard {...defaultProps} excitementResult={undefined} />);
		cy.get('[role="progressbar"]').should('not.exist');
	});

	it('progress bar has correct aria value', () => {
		cy.mount(<LiveGameCard {...defaultProps} />);
		cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '42');
	});

	it('displays total and max score', () => {
		cy.mount(<LiveGameCard {...defaultProps} />);
		cy.contains('42 / 100').should('exist');
	});
});

describe('liveGameCard inning half indicator', () => {
	const mlbGame: Game = { ...baseGame, league: 'mlb', sportType: 'baseball', period: 7 };

	it('renders an up caret icon for the top of the inning', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={{ ...mlbGame, topOfInning: true }} />);
		cy.get('.inning-half-icon')
			.should('have.class', 'bi-caret-up-fill')
			.and('have.attr', 'aria-label', 'Top of inning');
	});

	it('renders a down caret icon for the bottom of the inning', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={{ ...mlbGame, topOfInning: false }} />);
		cy.get('.inning-half-icon')
			.should('have.class', 'bi-caret-down-fill')
			.and('have.attr', 'aria-label', 'Bottom of inning');
	});

	it('renders no indicator when the inning half is unknown', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={mlbGame} />);
		cy.contains('Inn 7').should('exist');
		cy.get('.inning-half-icon').should('not.exist');
	});

	it('renders no indicator for clock sports', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={{ ...baseGame, topOfInning: true }} />);
		cy.get('.inning-half-icon').should('not.exist');
	});
});

// ESPN freezes a shootout match's score at the 120-minute scoreline and reports period 5, so
// without the secondary readout the card would sit on "1 – 1" while the tie is being decided.
describe('liveGameCard penalty shootout', () => {
	const shootoutGame: Game = {
		...baseGame,
		league: 'ucl',
		sportType: 'soccer',
		period: 5,
		clockSeconds: 7200,
		homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 1, shootoutScore: 5 },
		awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 1, shootoutScore: 3 },
	};

	it('labels the period PENS rather than a third extra-time period', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={shootoutGame} />);
		cy.contains('PENS').should('exist');
	});

	it('shows the shootout tally alongside the frozen scoreline, away team first', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={shootoutGame} />);
		cy.get('.game-shootout-score').should('contain.text', '3').and('contain.text', '5');
		cy.get('.game-score-value').first().should('contain.text', '1');
	});

	it('renders no shootout line when ESPN has not supplied a tally', () => {
		const noTally: Game = {
			...shootoutGame,
			homeTeam: { ...shootoutGame.homeTeam, shootoutScore: undefined },
			awayTeam: { ...shootoutGame.awayTeam, shootoutScore: undefined },
		};
		cy.mount(<LiveGameCard {...defaultProps} game={noTally} />);
		cy.get('.game-shootout-score').should('not.exist');
	});

	// The tally line already reads "PENS 3–5", so a period label above it would print PENS twice.
	it('drops the period label while the tally is showing, so PENS appears once', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={shootoutGame} />);
		cy.get('.game-period').should('not.exist');
		cy.get('.game-card').invoke('text').then(text => {
			expect(text.match(/PENS/g)).to.have.length(1);
		});
	});

	it('keeps the period label when there is no tally to replace it', () => {
		const noTally: Game = {
			...shootoutGame,
			homeTeam: { ...shootoutGame.homeTeam, shootoutScore: undefined },
			awayTeam: { ...shootoutGame.awayTeam, shootoutScore: undefined },
		};
		cy.mount(<LiveGameCard {...defaultProps} game={noTally} />);
		cy.get('.game-period').should('contain.text', 'PENS');
	});

	it('labels the extra-time halves ET1 and ET2', () => {
		const extraTime: Game = {
			...shootoutGame,
			period: 3,
			homeTeam: { ...shootoutGame.homeTeam, shootoutScore: undefined },
			awayTeam: { ...shootoutGame.awayTeam, shootoutScore: undefined },
		};
		cy.mount(<LiveGameCard {...defaultProps} game={extraTime} />);
		cy.contains('ET1').should('exist');
		cy.mount(<LiveGameCard {...defaultProps} game={{ ...extraTime, period: 4 }} />);
		cy.contains('ET2').should('exist');
	});
});

describe('liveGameCard down & distance', () => {
	const nflGame: Game = {
		...baseGame,
		league: 'nfl',
		sportType: 'football',
		period: 3,
		clockSeconds: 421,
		homeTeam: { id: 'h', name: 'Arizona Cardinals', abbreviation: 'ARI', score: 24 },
		awayTeam: { id: 'a', name: 'Carolina Panthers', abbreviation: 'CAR', score: 21 },
		downDistance: '2nd & 11',
		fieldPosition: 'ARI 34',
	};

	it('joins the field position onto the down & distance', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={nflGame} />);
		cy.get('.game-card-center').should('contain.text', '2nd & 11 at ARI 34');
	});

	it('falls back to the bare down & distance when ESPN omits the field position', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={{ ...nflGame, fieldPosition: undefined }} />);
		cy.get('.game-card-center').should('contain.text', '2nd & 11').and('not.contain.text', ' at ');
	});

	it('renders nothing when there is no down & distance, even with a field position', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={{ ...nflGame, downDistance: undefined }} />);
		cy.get('.game-card-center').should('not.contain.text', 'ARI 34');
	});
});

describe('liveGameCard balls/strikes/outs', () => {
	const mlbGame: Game = {
		...baseGame,
		league: 'mlb',
		sportType: 'baseball',
		period: 7,
		topOfInning: false,
		bso: { balls: 1, strikes: 1, outs: 1 },
	};

	// `bi-circle` is a ring one sixteenth of its em box, so at 0.45rem the stroke is under half a
	// pixel and the colour is all that carries it. Left to inherit, it takes the popup's near-white
	// body ink onto the card's white plate and the unfilled half of the count stops being drawn.
	it('keeps the unfilled dots readable on the card', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={mlbGame} />);
		cy.get('.bso-dot.is-empty').should('have.length', 4);
		cy.get('.game-card').then(([card]: JQuery<HTMLElement>) => {
			const plate = getComputedStyle(card).backgroundColor;
			cy.get('.bso-dot.is-empty').each(($dot: JQuery<HTMLElement>) => {
				const ink = getComputedStyle($dot[0]!).color;
				expect(ink, 'the dot is not left to inherit the body ink').to.not.equal('rgb(230, 237, 243)');
				expect(contrastRatio(ink, plate), `${ink} on ${plate}`).to.be.at.least(4.5);
			});
		});
	});

	it('still reads the filled dots as the state they are', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={mlbGame} />);
		cy.get('.bso-dot').not('.is-empty').should('have.length', 3).each(($dot: JQuery<HTMLElement>) => {
			cy.get('.bso-dot.is-empty').first().then(($empty: JQuery<HTMLElement>) => {
				expect(getComputedStyle($dot[0]!).color).to.not.equal(getComputedStyle($empty[0]!).color);
			});
		});
	});
});

describe('liveGameCard team rank', () => {
	it('puts the rank in front of the tricode without replacing it', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={{
			...baseGame,
			league: 'ncaab',
			homeTeam: { ...baseGame.homeTeam, abbreviation: 'ALA', rank: 2 },
			awayTeam: { ...baseGame.awayTeam, abbreviation: 'UGA', rank: 14 },
		}} />);

		cy.get('.team-abbreviation').first().should('have.text', '#14UGA');
		cy.get('.team-abbreviation').last().should('have.text', '#2ALA');
		cy.get('.team-rank').should('have.length', 2);
	});

	it('draws nothing for an unranked team', () => {
		// 99 is ESPN's code for unranked and never reaches the card — parseCuratedRank drops it —
		// so an unranked side arrives here as an absent field rather than as a number.
		cy.mount(<LiveGameCard {...defaultProps} game={{
			...baseGame,
			homeTeam: { ...baseGame.homeTeam, rank: 5 },
		}} />);
		cy.get('.team-rank').should('have.length', 1).should('have.text', '#5');
	});
});

describe('liveGameCard timeout dots', () => {
	const withTimeouts = (home: number, away: number): Game => ({
		...baseGame,
		league: 'nfl',
		sportType: 'football',
		homeTeam: { ...baseGame.homeTeam, timeouts: home },
		awayTeam: { ...baseGame.awayTeam, timeouts: away },
	});

	it('lights one dot per timeout left, against the full allotment', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={withTimeouts(2, 3)} />);

		cy.get('.timeout-dots').should('have.length', 2);
		cy.get('.timeout-dots').last().find('.timeout-dot').should('have.length', 3);
		cy.get('.timeout-dots').last().find('.timeout-dot').not('.is-empty').should('have.length', 2);
		cy.get('.timeout-dots').last().find('.timeout-dot.is-empty').should('have.length', 1);
	});

	it('draws an empty row rather than nothing when a team is out of timeouts', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={withTimeouts(0, 3)} />);
		cy.get('.timeout-dots').last().find('.timeout-dot.is-empty').should('have.length', 3);
		cy.get('.timeout-dots').last().find('.timeout-dot').not('.is-empty').should('have.length', 0);
	});

	it('names the count for a screen reader, which cannot see the dots', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={withTimeouts(2, 3)} />);
		cy.get('.timeout-dots').last().should('have.attr', 'aria-label', 'HOM: 2 timeouts left');
	});

	it('falls back to a numeral for a sport with more timeouts than fit', () => {
		// The NBA carries seven. Seven rings do not fit a 60px column, and a row silently clipped
		// to three would misreport the count rather than merely look wrong.
		cy.mount(
			<LiveGameCard {...defaultProps} game={{
				...baseGame,
				homeTeam: { ...baseGame.homeTeam, timeouts: 6 },
			}} />,
		);
		cy.get('.timeout-dots-numeric').should('have.length', 1).should('have.text', '6 TO');
		cy.get('.timeout-dot').should('not.exist');
	});

	it('draws nothing when the sport sends no timeouts at all', () => {
		cy.mount(<LiveGameCard {...defaultProps} game={baseGame} />);
		cy.get('.timeout-dots').should('not.exist');
	});
});
