import DetailHero from '../../entrypoints/popup/components/detailHero';
import DetailStickyBar from '../../entrypoints/popup/components/detailStickyBar';
import type { Game } from '@arenaswap/core/types';
import { resolveGameColors } from '@arenaswap/ui/src/components/gameSurface';
import type { MonoLogos } from '../../entrypoints/popup/components/useSummaryData';

// Baltimore and Indianapolis: a purple and a navy, both dark. Pittsburgh and Iowa: two golds, the
// lightest pair a stage has to carry white type over.
const liveGame: Game = {
	id: 'g1',
	league: 'nfl',
	sportType: 'football',
	status: 'in',
	period: 2,
	clockSeconds: 300,
	awayTeam: { id: 'a', name: 'Baltimore Ravens', nickname: 'Ravens', abbreviation: 'BAL', score: 14, color: '#29126F', alternateColor: '#000000' },
	homeTeam: { id: 'h', name: 'Indianapolis Colts', nickname: 'Colts', abbreviation: 'IND', score: 10, color: '#003B75', alternateColor: '#FFFFFF' },
};

const goldGame: Game = {
	...liveGame,
	awayTeam: { ...liveGame.awayTeam, name: 'Pittsburgh Steelers', nickname: 'Steelers', abbreviation: 'PIT', color: '#FFB612', alternateColor: '#101820' },
	homeTeam: { ...liveGame.homeTeam, name: 'Iowa Hawkeyes', nickname: 'Hawkeyes', abbreviation: 'IOWA', color: '#FFCD00', alternateColor: '#000000' },
};

const markUrl = (side: string) => `https://a.espncdn.com/combiner/i?img=/guid/${side}/logos/primary_logo_white.png&w=120&h=120`;
const mono: MonoLogos = { away: { white: markUrl('a') }, home: { white: markUrl('h') } };

const mountStage = (game: Game, monoLogos = mono) => {
	cy.mount(
		<div className='popup-container dt' style={{ height: 'auto' }}>
			<DetailHero
				game={game}
				seriesInfo={null}
				records={{ home: '3-1', away: '2-2' }}
				monoLogos={monoLogos}
				label='Tab 2'
				powerScore={game.status === 'in' ? 71 : null}
				favoriteTeamIds={new Set<string>()}
				onToggleFavoriteTeam={() => {}}
				dismiss='back'
				onBack={() => {}}
			/>
		</div>,
	);
};

type rgb = [number, number, number];

const hexToRgb = (value: string): rgb => {
	const clean = value.trim().replace('#', '');
	return [0, 2, 4].map(offset => parseInt(clean.slice(offset, offset + 2), 16)) as rgb;
};

const parseColor = (value: string): { color: rgb; alpha: number } => {
	const matched = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(value)!;
	return { color: [Number(matched[1]), Number(matched[2]), Number(matched[3])], alpha: matched[4] === undefined ? 1 : Number(matched[4]) };
};

const mix = (over: rgb, under: rgb, share: number): rgb => over.map((channel, i) => channel * share + under[i]! * (1 - share)) as rgb;

const luminance = (color: rgb): number => {
	const linear = color.map(channel => {
		const scaled = channel / 255;
		return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
	});
	return (0.2126 * linear[0]!) + (0.7152 * linear[1]!) + (0.0722 * linear[2]!);
};

const contrast = (a: rgb, b: rgb): number => {
	const [light, dark] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
	return (light! + 0.05) / (dark! + 0.05);
};

// The field is the two team colours under a veil that thickens downwards, so the thinnest part of
// the veil over the lighter colour is the hardest place on the stage for white type.
const hardestBackgrounds = (stage: HTMLElement): rgb[] => {
	const style = stage.style;
	const veil = style.getPropertyValue('--stage-veil-rgb').split(',').map(Number) as rgb;
	const top = Number(style.getPropertyValue('--stage-veil-top'));
	return ['--stage-away', '--stage-home'].map(name => mix(veil, hexToRgb(style.getPropertyValue(name)), top));
};

const worstContrast = (element: HTMLElement, stage: HTMLElement): number => {
	const ink = parseColor(getComputedStyle(element).color);
	return Math.min(...hardestBackgrounds(stage).map(background => contrast(mix(ink.color, background, ink.alpha), background)));
};

const expectReadable = (selector: string, label: string, floor = 4.5) => {
	cy.get('.dt-hero').then(([stage]: JQuery<HTMLElement>) => {
		cy.get(selector).should('exist').each($el => {
			expect(worstContrast($el[0]!, stage), label).to.be.at.least(floor);
		});
	});
};

describe('the detail stage surface', () => {
	// Today's picker decides the pair, the same one every other surface of the product paints.
	it('carries the two team colours under the veil', () => {
		mountStage(liveGame);
		const [away, home] = resolveGameColors(liveGame);
		cy.get('.dt-hero.as-stage').should(([stage]: JQuery<HTMLElement>) => {
			expect(stage.style.getPropertyValue('--stage-away').toLowerCase()).to.equal(away.toLowerCase());
			expect(stage.style.getPropertyValue('--stage-home').toLowerCase()).to.equal(home.toLowerCase());
			expect(getComputedStyle(stage, '::after').backgroundImage, 'the veil over them').to.include('linear-gradient');
			expect(getComputedStyle(stage).backgroundColor).to.not.equal('rgb(255, 255, 255)');
		});
	});

	for (const [name, game] of [['a dark pair', liveGame], ['two golds', goldGame]] as const) {
		it(`keeps every line of the stage readable on ${name}`, () => {
			mountStage(game);
			expectReadable('.dt-hero .as-match-team b', 'the team name');
			expectReadable('.dt-hero .as-match-record', 'the record');
			expectReadable('.dt-hero .as-clock', 'the clock');
			expectReadable('.dt-hero .as-top-tab', 'the tab label');
			expectReadable('.dt-hero .dt-back', 'the back control');
			expectReadable('.dt-hero .dt-league', 'the league');
			expectReadable('.dt-hero .as-stage-power small', 'the PowerScore label');
			// Display sizes, so large-text contrast. The trailing score dims, and still has to hold.
			expectReadable('.dt-hero .as-match-score', 'the scores', 3);
			expectReadable('.dt-hero .as-stage-power strong', 'the PowerScore', 3);
		});
	}

	// The old card's rule for these is a light-surface grey, and it has to lose to the stage's.
	it('draws the balls/strikes/outs count in the stage\'s ink', () => {
		mountStage({ ...liveGame, league: 'mlb', sportType: 'baseball', period: 7, bso: { balls: 1, strikes: 1, outs: 1 }, baseRunners: { first: true, second: false, third: false } });
		cy.get('.dt-hero .bso-dot.is-empty').should('have.length', 4);
		expectReadable('.dt-hero .bso-label', 'the B/S/O label');
		expectReadable('.dt-hero .bso-dot:not(.is-empty)', 'a lit dot', 3);
	});

	// A crest is drawn in the team's own colours with nothing behind it. Which treatment it ends up
	// with depends on measuring its own pixels, so an unmeasured crest is the colour artwork, bare.
	it('draws the crests bare rather than plating them by default', () => {
		mountStage(liveGame);
		cy.get('.dt-hero .as-crest').should('have.length', 2).each($shell => {
			expect($shell[0]!.className).to.include('is-bare');
			expect(getComputedStyle($shell[0]!).boxShadow).to.equal('none');
		});
	});

	// A delay used to dim the hero, which on a dark surface is a disappearance.
	it('warms the veil for a delay without draining the stage', () => {
		mountStage({ ...liveGame, delayed: true, delayDescription: 'Weather Delay' });
		cy.get('.dt-hero').should(([stage]: JQuery<HTMLElement>) => {
			expect(stage.style.getPropertyValue('--stage-veil-rgb')).to.equal('28, 22, 3');
			expect(Number(getComputedStyle(stage).opacity)).to.equal(1);
		});
		cy.get('.dt-hero .as-clock.is-delayed').should('have.text', 'Weather Delay');
		expectReadable('.dt-hero .as-clock.is-delayed', 'the delay');
	});

	it('gives a scheduled game the same stage, with its start between the teams', () => {
		mountStage({ ...liveGame, status: 'pre', startTime: new Date(Date.now() + 3_600_000).toISOString() });
		cy.get('.dt-hero.is-pre .as-centre-time').invoke('text').should('match', /\d/);
		cy.get('.dt-hero .as-match-score').should('not.exist');
		cy.get('.dt-hero .as-stage-power').should('not.exist');
		cy.get('.dt-hero .as-crest.is-bare').should('have.length', 2);
		expectReadable('.dt-hero .as-stage-note', 'the countdown sentence');
	});

	// Minnesota puts up three digits most nights, and "Timberwolves" is wider than the column that
	// leaves. It shrinks to fit rather than losing its last letter to the next line.
	it('keeps a long name whole and clear of a three-digit score', () => {
		mountStage({
			...liveGame,
			league: 'nba',
			sportType: 'basketball',
			awayTeam: { ...liveGame.awayTeam, name: 'Minnesota Timberwolves', nickname: 'Timberwolves', abbreviation: 'MIN', score: 107 },
			homeTeam: { ...liveGame.homeTeam, name: 'Cleveland Cavaliers', nickname: 'Cavaliers', abbreviation: 'CLE', score: 108 },
		});
		cy.document().its('fonts.ready');
		cy.get('.dt-hero .as-match-team b').should($names => {
			const awayScore = document.querySelector('.dt-hero .as-match-score.is-away')!.getBoundingClientRect();
			const homeScore = document.querySelector('.dt-hero .as-match-score.is-home')!.getBoundingClientRect();
			const [away, home] = [...$names].map(name => name.getBoundingClientRect());
			for (const name of $names) {
				expect(name.scrollWidth, `${name.textContent} fits its column`).to.be.at.most(name.clientWidth);
				expect(name.getClientRects().length, `${name.textContent} stays on one line`).to.equal(1);
			}
			expect(away!.right, 'the away name stays in its column').to.be.at.most(awayScore.left);
			expect(home!.left, 'the home name stays in its column').to.be.at.least(homeScore.right);
		});
		cy.contains('.dt-hero .as-match-team b', 'Cavaliers').should($name => {
			const fit = Number($name[0]!.style.getPropertyValue('--name-fit') || 1);
			expect(fit, 'a shorter name barely shrinks').to.be.at.least(0.8);
		});
	});
});

// The compact bar draws a small crest with three letters beside it on the page rather than on team
// colour. A navy mark there is a blank, so it takes the same three treatments the stage does.
describe('the compact bar crests', () => {
	it('draws them through the same rule as the stage', () => {
		cy.mount(
			<div style={{ width: '320px', position: 'relative' }}>
				<DetailStickyBar game={liveGame} compact monoLogos={mono} onBack={() => {}} />
			</div>,
		);
		cy.get('.dt-bar-crest .as-crest').should('have.length', 2);
		cy.get('.dt-bar-crest .as-crest.is-bare').should('have.length', 2);
		cy.get('.dt-bar-crest').each($box => {
			expect($box[0]!.getBoundingClientRect()).to.deep.include({ width: 14, height: 14 });
		});
	});
});

// A white mark is how a navy crest reads on the dark page, and exactly what vanishes on the light
// one: the bar is judged against the page it actually sits on. Solid PNGs so the measurement runs.
describe('the compact bar crests follow the theme', () => {
	const navy = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFUlEQVR4nGPkUXb4z4AHMOGTHD4KAH25AX7gsIqPAAAAAElFTkSuQmCC';
	const whiteMark = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8////fwY8gAmf5PBRAAAbbgQMid1tCwAAAABJRU5ErkJggg==';
	const blackMark = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAD0lEQVR42mOQwgEYhpYEAJ8xE4HmivYxAAAAAElFTkSuQmCC';
	const navyGame: Game = {
		...liveGame,
		awayTeam: { ...liveGame.awayTeam, logo: navy },
		homeTeam: { ...liveGame.homeTeam, logo: navy },
	};
	const marks: MonoLogos = { away: { white: whiteMark, black: blackMark }, home: { white: whiteMark, black: blackMark } };

	const mountBar = (theme: 'dark' | 'light') => {
		cy.mount(
			<div style={{ width: '320px', position: 'relative' }}>
				<DetailStickyBar game={navyGame} compact monoLogos={marks} onBack={() => {}} theme={theme} />
			</div>,
		);
		cy.get('.dt-bar-crest .as-crest-art').should('have.attr', 'data-crest-state', 'loaded');
	};

	it('swaps a navy crest for its white mark on dark', () => {
		mountBar('dark');
		cy.get('.dt-bar-crest .as-crest-art').first().should('have.class', 'is-mono').find('img').should('have.attr', 'src', whiteMark);
	});

	it('keeps the same crest in its own colours on light', () => {
		mountBar('light');
		cy.get('.dt-bar-crest .as-crest-art').first().should('not.have.class', 'is-mono').find('img').should('have.attr', 'src', navy);
	});
});

// The at-bat pair sits straight on the veil now, so its ink has to clear the veil itself.
describe('the at-bat pair on the stage', () => {
	const withAtBat: Game = {
		...liveGame,
		league: 'mlb',
		sportType: 'baseball',
		period: 7,
		atBat: {
			pitcher: { name: 'Will Dion', jersey: '76', position: 'RP', summary: '1.1 IP, 0 ER, H, BB' },
			batter: { name: 'Nathan Church', jersey: '27', position: 'CF', summary: '0-2, K' },
		},
	};

	it('keeps the names, the lines and the roles readable', () => {
		mountStage(withAtBat);
		expectReadable('.dt-atbat-name', 'the player name');
		expectReadable('.dt-atbat-line', 'our sources\' line');
		expectReadable('.dt-atbat-role', 'the role label');
		mountStage({ ...goldGame, league: 'mlb', sportType: 'baseball', period: 7, atBat: withAtBat.atBat });
		expectReadable('.dt-atbat-name', 'the player name on gold');
		expectReadable('.dt-atbat-role', 'the role label on gold');
	});

	it('is absent on a sport that never has one', () => {
		mountStage(liveGame);
		cy.get('.dt-atbat').should('not.exist');
	});
});
