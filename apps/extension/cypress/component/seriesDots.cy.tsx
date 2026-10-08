import DetailHero from '../../entrypoints/popup/components/detailHero';
import type { Game } from '@arenaswap/core/types';
import type { SeriesEvent, SeriesInfo } from '../../entrypoints/popup/components/useSummaryData';

// White Sox at Guardians, as ESPN colours them: a black and a navy, the two that disappeared into
// the hero before the dots had rings.
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

describe('series dots', () => {
	it('rings each win in the club\'s other colour', () => {
		mountSeries({
			type: 'current',
			summary: 'CHW lead series 2-1',
			totalCompetitions: 5,
			events: [pending(), pending(), won('4'), won('4'), won('5')],
		});
		cy.get('.series-dot').should('have.length', 5);
		cy.get('.series-dot-core').should('have.length', 3);
		cy.get('.series-dot-core').eq(0).should('have.css', 'color', 'rgb(0, 0, 0)')
			.prev().should('have.css', 'color', 'rgb(196, 206, 212)');
		cy.get('.series-dot-core').eq(2).should('have.css', 'color', 'rgb(0, 43, 92)')
			.prev().should('have.css', 'color', 'rgb(227, 25, 55)');
		cy.get('.series-dot-empty').should('have.length', 2).and('not.have.class', 'is-if-necessary');
	});

	// Measured rather than trusted to flexbox: the core and its ring are two glyphs at two sizes, and
	// Bootstrap Icons nudges every glyph down by an eighth of its own size.
	it('sits the team colour in the middle of its ring', () => {
		mountSeries({ type: 'current', totalCompetitions: 3, events: [won('5'), pending(), pending()] });
		cy.get('.series-dot-core').then(([core]) => {
			const ring = core!.previousElementSibling!;
			const inner = window.getComputedStyle(core!, '::before');
			expect(inner.content).not.to.equal('none');
			const coreBox = core!.getBoundingClientRect();
			const ringBox = ring.getBoundingClientRect();
			expect(Math.abs((coreBox.left + coreBox.right) / 2 - (ringBox.left + ringBox.right) / 2)).to.be.lessThan(0.5);
			expect(Math.abs((coreBox.top + coreBox.bottom) / 2 - (ringBox.top + ringBox.bottom) / 2)).to.be.lessThan(0.5);
			expect((ringBox.width - coreBox.width) / 2).to.be.at.least(1.5);
		});
	});

	// CIN @ LAD, the 2025 NL Wild Card: swept, so game three never happened.
	it('dashes out the games a clinched series never needed', () => {
		mountSeries({ type: 'playoff', summary: 'LAD win series 2-0', totalCompetitions: 3, events: [won('5'), won('5')] });
		cy.get('.series-dot-core').should('have.length', 2);
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
