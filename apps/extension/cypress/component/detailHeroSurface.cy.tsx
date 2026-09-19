import DetailHero from '../../entrypoints/popup/components/detailHero';
import DetailPosterHero from '../../entrypoints/popup/components/detailPosterHero';
import DetailStickyBar from '../../entrypoints/popup/components/detailStickyBar';
import type { Game } from '@arenaswap/core/types';
import type { MonoLogos } from '../../entrypoints/popup/components/useSummaryData';

// Baltimore and Indianapolis: a purple and a navy, the pair that used to come out of the resolver as
// black against white. Both are dark, which is what makes them the right fixture for a hero whose
// whole job is now to carry white type over team colour.
const awayColor = '#29126F';
const homeColor = '#003B75';

const liveGame: Game = {
	id: 'g1',
	league: 'nfl',
	sportType: 'football',
	status: 'in',
	period: 2,
	clockSeconds: 300,
	awayTeam: { id: 'a', name: 'Baltimore Ravens', abbreviation: 'BAL', score: 14, color: awayColor, alternateColor: '#000000' },
	homeTeam: { id: 'h', name: 'Indianapolis Colts', abbreviation: 'IND', score: 10, color: homeColor, alternateColor: '#FFFFFF' },
};

const heroStyle = {
	backgroundImage:
		'linear-gradient(180deg, rgba(3, 7, 12, 0.18) 0%, rgba(3, 7, 12, 0.52) 100%), '
		+ `linear-gradient(to right, ${awayColor} 0%, ${awayColor} 38%, ${homeColor} 62%, ${homeColor} 100%)`,
};

const markUrl = (side: string) => `https://a.espncdn.com/combiner/i?img=/guid/${side}/logos/primary_logo_white.png&w=120&h=120`;
const mono: MonoLogos = { away: { white: markUrl('a') }, home: { white: markUrl('h') } };

const mountLive = (game: Game, monoLogos = mono, isDelayed = false) => {
	cy.mount(
		<div style={{ width: '320px', background: '#0d1117', padding: '0.75rem' }}>
			<DetailHero
				game={game}
				seriesInfo={null}
				records={{ home: '3-1', away: '2-2' }}
				monoLogos={monoLogos}
				isDelayed={isDelayed}
				isInningSport={game.sportType === 'baseball'}
				status={{ text: 'Q2 • 5:00', tabular: true }}
				heroStyle={heroStyle}
				awayColor={awayColor}
				homeColor={homeColor}
			/>
		</div>,
	);
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

// The hero paints a gradient with a scrim over it, so there is no single background colour to read
// off the element. The darkest the scrimmed team colour can be is what the ink has to clear, and the
// two teams here are the darkest pair in the product.
const darkestHeroBackground = 0.0121;
const contrastOnHero = (ink: string): number => (
	(luminance(ink) + 0.05) / (darkestHeroBackground + 0.05)
);

describe('the detail hero surface', () => {
	it('carries the scrimmed team gradient when the game is live', () => {
		mountLive(liveGame);
		cy.get('.gd-hero-live').should('exist').then($hero => {
			const image = getComputedStyle($hero[0]!).backgroundImage;
			expect(image, 'the two team colours').to.include('rgb(41, 18, 111)').and.to.include('rgb(0, 59, 117)');
			expect(image, 'the scrim over them').to.include('rgba(3, 7, 12, 0.18)');
			// The white plate the live hero used to be.
			expect(getComputedStyle($hero[0]!).backgroundColor).to.not.equal('rgb(255, 255, 255)');
		});
	});

	it('re-tones every line of the hero for the scrim', () => {
		mountLive(liveGame);
		const readable = (selector: string, label: string) => {
			cy.get(selector).first().then($el => {
				expect(contrastOnHero(getComputedStyle($el[0]!).color), label).to.be.greaterThan(4.5);
			});
		};
		readable('.game-detail-score-value', 'the score');
		readable('.game-detail-team-name', 'the team name');
		readable('.game-detail-team-record', 'the record');
		readable('.game-detail-period', 'the clock');
	});

	// The card's own rule for these is a light-surface grey, and it has to lose to the hero's here.
	// A default written at the same specificity would put `#4b5563` on the scrim without a word.
	it('re-tones the balls/strikes/outs count for the scrim', () => {
		mountLive({ ...liveGame, league: 'mlb', sportType: 'baseball', period: 7, bso: { balls: 1, strikes: 1, outs: 1 } });
		cy.get('.gd-hero-live .bso-dot.is-empty').should('have.length', 4).each($dot => {
			expect(contrastOnHero(getComputedStyle($dot[0]!).color), 'an unfilled dot').to.be.greaterThan(4.5);
		});
		cy.get('.gd-hero-live .bso-label').first().then($label => {
			expect(contrastOnHero(getComputedStyle($label[0]!).color), 'the B/S/O label').to.be.greaterThan(4.5);
		});
	});

	// A crest is drawn in the team's own colours with nothing behind it. Which of the three
	// treatments it ends up with depends on measuring its own pixels against the surface, so an
	// unmeasured crest is the colour artwork, bare. `teamCrest.cy.tsx` drives all three.
	it('draws the crests bare rather than plating them by default', () => {
		mountLive(liveGame);
		cy.get('.game-detail-team-logo-shell').should('have.length', 2).each($shell => {
			expect($shell[0]!.className).to.include('is-bare');
			expect(getComputedStyle($shell[0]!).backgroundImage).to.equal('none');
			expect(getComputedStyle($shell[0]!).boxShadow).to.equal('none');
		});
	});

	// A delay used to dim the hero to 40% opacity, which on a dark surface is a disappearance.
	it('marks a delay without draining the hero', () => {
		mountLive(liveGame, mono, true);
		cy.get('.gd-hero-live.is-delayed').should('exist').then($hero => {
			expect(getComputedStyle($hero[0]!).boxShadow).to.include('rgba(241, 196, 15');
		});
		cy.get('.game-detail-score-value').first().then($score => {
			expect(Number(getComputedStyle($score[0]!).opacity)).to.equal(1);
		});
	});

	it('gives the pre-game poster the same surface it always had', () => {
		cy.mount(
			<div style={{ width: '320px', background: '#0d1117', padding: '0.75rem' }}>
				<DetailPosterHero
					game={{ ...liveGame, status: 'pre', startTime: new Date(Date.now() + 3_600_000).toISOString() }}
					seriesInfo={null}
					records={{ home: '3-1', away: '2-2' }}
					monoLogos={mono}
					statusText=''
					heroStyle={heroStyle}
					awayColor={awayColor}
					homeColor={homeColor}
					favoriteTeamIds={new Set<string>()}
					onToggleFavoriteTeam={() => {}}
				/>
			</div>,
		);
		cy.get('.gd-poster').should('exist');
		cy.get('.gd-poster-crest.is-bare').should('have.length', 2).each($crest => {
			expect(getComputedStyle($crest[0]!).boxShadow).to.equal('none');
		});
	});
});

// The sticky bar draws an 18px crest with three letters beside it and nothing else to go on, on the
// shell's own background rather than on team colour. A navy monogram there is a blank box, so it
// takes the same three treatments the hero below it does.
describe('the sticky bar crests', () => {
	it('draws them through the same rule as the hero', () => {
		cy.mount(
			<div style={{ width: '320px', background: '#0d1117' }}>
				<DetailStickyBar
					game={liveGame}
					status={{ text: 'Q2 • 5:00', tabular: true }}
					compact
					monoLogos={mono}
					onBack={() => {}}
				/>
			</div>,
		);
		cy.get('.gd-bar-logo-shell').should('have.length', 2);
		// Bare until something measures otherwise, the same as everywhere else.
		cy.get('.gd-bar-logo-shell.is-bare').should('have.length', 2);
		cy.get('.gd-bar-logo').should('have.length', 2);
	});
});

