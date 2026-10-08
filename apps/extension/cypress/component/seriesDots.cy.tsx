import DetailHero from '../../entrypoints/popup/components/detailHero';
import type { Game } from '@arenaswap/core/types';
import type { SeriesEvent, SeriesInfo } from '../../entrypoints/popup/components/useSummaryData';

// White Sox at Guardians, as ESPN colours them: a black and a navy, the two that disappeared into
// the hero as published.
const awayColor = '#000000';
const homeColor = '#002B5C';

const finalGame: Game = {
	id: 'g1',
	league: 'mlb',
	sportType: 'baseball',
	status: 'post',
	period: 9,
	clockSeconds: 0,
	awayTeam: { id: '4', name: 'Chicago White Sox', abbreviation: 'CHW', score: 3, color: awayColor, alternateColor: '#C4CED4' },
	homeTeam: { id: '5', name: 'Cleveland Guardians', abbreviation: 'CLE', score: 9, color: homeColor, alternateColor: '#E31937' },
};

const heroStyle = {
	backgroundImage:
		'linear-gradient(180deg, rgba(3, 7, 12, 0.18) 0%, rgba(3, 7, 12, 0.52) 100%), '
		+ `linear-gradient(to right, ${awayColor} 0%, ${awayColor} 30%, ${homeColor} 70%, ${homeColor} 100%)`,
};

const won = (teamId: string): SeriesEvent => ({
	statusType: { completed: true },
	competitors: [{ homeAway: 'home', winner: true, team: { id: teamId } }],
});
const pending = (): SeriesEvent => ({ statusType: { completed: false } });

const mountSeries = (seriesInfo: SeriesInfo) => {
	cy.mount(
		<div style={{ width: '320px', background: '#0d1117', padding: '0.75rem' }}>
			<DetailHero
				game={finalGame}
				seriesInfo={seriesInfo}
				records={{ home: '85-77', away: '84-78' }}
				monoLogos={{ away: null, home: null }}
				isDelayed={false}
				isInningSport
				status={{ text: 'Final', ticking: false }}
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
	const [red, green, blue] = channels(value).map(channel => {
		const scaled = channel / 255;
		return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
	});
	return (0.2126 * red!) + (0.7152 * green!) + (0.0722 * blue!);
};

// The darkest the hero gets, under its scrim.
const contrastOnHero = (value: string): number => (luminance(value) + 0.05) / (luminance('rgb(13, 17, 23)') + 0.05);

describe('series dots', () => {
	it('lifts a navy or black win until it shows on the dark hero, keeping its hue', () => {
		mountSeries({
			type: 'current',
			summary: 'CHW lead series 2-1',
			totalCompetitions: 5,
			events: [pending(), pending(), won('4'), won('4'), won('5')],
		});
		cy.get('.series-dot').should('have.length', 5);
		cy.get('.series-dot.bi-circle-fill').should('have.length', 3).each(([dot]) => {
			expect(contrastOnHero(getComputedStyle(dot!).color)).to.be.at.least(3);
		});
		cy.get('.series-dot.bi-circle-fill').eq(0).should(([dot]) => {
			const [red, green, blue] = channels(getComputedStyle(dot!).color);
			expect(red, 'black lifts to a grey').to.equal(green).and.to.equal(blue);
		});
		cy.get('.series-dot.bi-circle-fill').eq(2).should(([dot]) => {
			const [red, , blue] = channels(getComputedStyle(dot!).color);
			expect(blue, 'navy stays blue').to.be.greaterThan(red * 2);
		});
		cy.get('.series-dot-empty').should('have.length', 2).and('not.have.class', 'is-if-necessary');
	});

	// CIN @ LAD, the 2025 NL Wild Card: swept, so game three never happened.
	it('dashes out the games a clinched series never needed', () => {
		mountSeries({ type: 'playoff', summary: 'LAD win series 2-0', totalCompetitions: 3, events: [won('5'), won('5')] });
		cy.get('.series-dot.bi-circle-fill').should('have.length', 2);
		cy.get('.series-dot-not-needed').should('have.length', 1).and('have.class', 'bi-dash');
		cy.get('.series-dot-empty').should('not.exist');
	});

	it('fades the games that only happen if the trailing side keeps winning', () => {
		mountSeries({
			type: 'playoff',
			summary: 'CLE leads series 3-1',
			totalCompetitions: 7,
			events: [pending(), pending(), pending(), won('5'), won('4'), won('5'), won('5')],
		});
		cy.get('.series-dot-empty').should('have.length', 3);
		cy.get('.series-dot-empty').eq(0).should('not.have.class', 'is-if-necessary').and('have.css', 'opacity', '1');
		cy.get('.series-dot-empty.is-if-necessary').should('have.length', 2).and('have.css', 'opacity', '0.45');
		cy.get('.series-dot-not-needed').should('not.exist');
	});
});
