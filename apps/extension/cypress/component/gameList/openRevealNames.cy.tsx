import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import GameCardReveal from '../../../entrypoints/popup/components/gameCardReveal';
import {
	revealFullRate,
	revealNameBeatMs,
	revealNameSpread,
	revealOpenBeatMs,
	type revealMode,
} from '../../../entrypoints/popup/cardReveal';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';

const svg = (body: string) => `data:image/svg+xml;base64,${btoa(
	`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>${body}</svg>`,
)}`;
const lightMark = svg(`<circle cx='32' cy='32' r='25' fill='#F2F4F7'/><path d='M32 12 L32 52' stroke='#41B6E6' stroke-width='6'/>`);
const darkMark = svg(`<circle cx='32' cy='32' r='26' fill='#111111'/><circle cx='32' cy='32' r='13' fill='none' stroke='#FFB81C' stroke-width='3'/>`);

const awayColor = 'rgb(12, 35, 64)';
const homeColor = 'rgb(255, 184, 28)';

const club = (name: string, nickname?: string) => ({ name, nickname: nickname ?? name.split(' ').slice(-1)[0] });

interface palette {
	away: { color: string; alternateColor?: string };
	home: { color: string; alternateColor?: string };
}

const defaultPalette: palette = { away: { color: '#0C2340' }, home: { color: '#FFB81C' } };

const game = (
	away: { name: string; nickname: string },
	home: { name: string; nickname: string },
	colors: palette = defaultPalette,
) => ({
	id: 'g1',
	status: 'in',
	league: 'mlb',
	sportType: 'baseball',
	period: 5,
	topOfInning: true,
	awayTeam: { id: 'a', ...away, ...colors.away, abbreviation: 'AWY', score: 3, logo: lightMark },
	homeTeam: { id: 'h', ...home, ...colors.home, abbreviation: 'HOM', score: 1, logo: darkMark },
}) as unknown as Game;

const scored: PowerScoreResult = {
	gameId: 'g1',
	total: 72,
	closeness: 20,
	lateGame: 14,
	momentum: 10,
	leadChanges: 6,
	comeback: 0,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	reason: 'Close game',
};

const Harness = ({ mode = 'full', away = club('Miami Marlins'), home = club('Washington Commanders'), powerScore, colors }: {
	mode?: revealMode;
	away?: { name: string; nickname: string };
	home?: { name: string; nickname: string };
	powerScore?: PowerScoreResult;
	colors?: palette;
}) => {
	const subject = game(away, home, colors);
	const shared = {
		game: subject,
		excitementResult: powerScore,
		favoriteTeamIds: new Set<string>(),
		onToggleFavoriteTeam: () => {},
		onOpenGameDetail: () => {},
		bettingPrefs: { bettingEnabled: false },
	};
	return (
		<div className='popup-container d-flex flex-column'>
			<div className='mt-3'>
				<div>
					<GameCardReveal game={subject} mode={mode} index={0} skipping={false}>
						<LiveGameCard {...shared} />
					</GameCardReveal>
				</div>
			</div>
		</div>
	);
};

const scrubTo = (ms: number) => {
	cy.get('.game-card-reveal').should('exist');
	return cy.document().then(doc => {
		doc.getAnimations().forEach(animation => {
			animation.pause();
			animation.currentTime = ms;
		});
	});
};

const sceneMs = (ms: number) => ms * revealFullRate;
const crestScene = revealOpenBeatMs;
const nameScene = revealOpenBeatMs + revealNameBeatMs - 300;
const posterScene = revealOpenBeatMs + revealNameBeatMs;

const rectOf = (selector: string) => cy.get(selector).then($el => $el[0].getBoundingClientRect());

// Widths only: a range over text measures the content area, which is 1.30em of DM Sans against
// 0.96em of actual ink, so it says nothing useful about where the letters start and stop down the page.
const inkOf = (el: Element) => {
	const range = el.ownerDocument.createRange();
	range.selectNodeContents(el);
	return range.getBoundingClientRect();
};

const inkRowsOf = (line: HTMLElement) => {
	const style = getComputedStyle(line);
	const ctx = line.ownerDocument.createElement('canvas').getContext('2d')!;
	ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
	const drawn = ctx.measureText(line.textContent ?? '');
	const box = line.getBoundingClientRect();
	const content = drawn.fontBoundingBoxAscent + drawn.fontBoundingBoxDescent;
	const baseline = box.top + (box.height - content) / 2 + drawn.fontBoundingBoxAscent;
	return { top: baseline - drawn.actualBoundingBoxAscent, bottom: baseline + drawn.actualBoundingBoxDescent };
};

const linesOf = (side: 'away' | 'home') => cy
	.get(`.game-card-reveal-opening-name.is-${side} .game-card-reveal-opening-name-line`);

const awaitCrests = () => cy.get('.game-card-reveal-opening-logo[data-crest-state="loaded"]')
	.should('have.length', 2);

describe('the clubs named over the opening beat', () => {
	beforeEach(() => cy.viewport(320, 560));

	it('names both clubs in full, broken at the nickname', () => {
		cy.mount(<Harness />);
		linesOf('home').then($lines => expect([...$lines].map(line => line.textContent))
			.to.deep.equal(['Washington', 'Commanders']));
		cy.mount(<Harness away={club('Penn State Nittany Lions', 'Nittany Lions')} />);
		linesOf('away').then($lines => expect([...$lines].map(line => line.textContent))
			.to.deep.equal(['Penn State', 'Nittany Lions']));
	});

	it('keeps a short club on one line, where that draws it bigger', () => {
		cy.mount(<Harness />);
		linesOf('away').then($lines => expect([...$lines].map(line => line.textContent))
			.to.deep.equal(['Miami Marlins']));
		linesOf('home').should('have.length', 2);
	});

	it('names nobody on the versions that have no opening beat', () => {
		cy.mount(<Harness mode='full' />);
		cy.get('.game-card-reveal-opening-name').should('have.length', 2);
		cy.get('.game-card-reveal-opening-band').should('have.length', 2);

		cy.mount(<Harness mode='quick' />);
		cy.get('.game-card-reveal').should('exist');
		cy.get('.game-card-reveal-opening-name').should('not.exist');
		cy.get('.game-card-reveal-opening-band').should('not.exist');

		cy.mount(<Harness mode='none' />);
		cy.get('.game-card').should('exist');
		cy.get('.game-card-reveal-opening-name').should('not.exist');
	});

	it('splits the card horizontally, a band of colour per club', () => {
		cy.mount(<Harness />);
		scrubTo(sceneMs(nameScene));
		rectOf('.game-card').then(card => {
			([['away', card.top, awayColor], ['home', card.top + card.height / 2, homeColor]] as const)
				.forEach(([side, top, colour]) => {
					cy.get(`.game-card-reveal-opening-band.is-${side}`).should($band => {
						const box = $band[0].getBoundingClientRect();
						expect(box.left, `${side} band from the card's edge`).to.be.closeTo(card.left, 0.5);
						expect(box.width, `${side} band across the card`).to.be.closeTo(card.width, 0.5);
						expect(box.top, `${side} band on its own half`).to.be.closeTo(top, 1.5);
						expect(box.height, `${side} band half the card`).to.be.closeTo(card.height / 2, 1.5);
						expect(getComputedStyle($band[0]).backgroundColor).to.equal(colour);
					});
				});
		});
	});

	it('fills the names solid, and leaves the tricodes outlined', () => {
		cy.mount(<Harness />);
		linesOf('away').first()
			.should('have.css', 'color', 'rgb(255, 255, 255)');
		linesOf('home').first()
			.should('have.css', 'color', 'rgb(17, 24, 39)')
			.and('have.css', '-webkit-text-stroke-width', '0px')
			.and('have.css', 'text-transform', 'none');
		linesOf('home').first().should($line => expect($line[0].children).to.have.length(0));

		cy.get('.game-card-reveal-mask.is-away .game-card-reveal-abbr-edge')
			.should('have.css', '-webkit-text-stroke-color', 'rgb(255, 255, 255)')
			.and($edge => expect(parseFloat(getComputedStyle($edge[0]).webkitTextStrokeWidth)).to.be.greaterThan(1));
	});

	it('names a club on a white band in a dark ink', () => {
		cy.mount(<Harness
			away={club('Penn State Nittany Lions', 'Nittany Lions')}
			colors={{ away: { color: '#FFFFFF' }, home: { color: '#0C2340' } }}
		/>);
		scrubTo(sceneMs(nameScene));
		linesOf('away').first().should('have.css', 'color', 'rgb(17, 24, 39)');
		linesOf('home').first().should('have.css', 'color', 'rgb(255, 255, 255)');
		cy.get('.game-card-reveal-mask.is-away .game-card-reveal-abbr-edge')
			.should('have.css', 'color', 'rgb(17, 24, 39)')
			.and('have.css', '-webkit-text-stroke-color', 'rgb(17, 24, 39)');
	});

	([
		[club('Miami Marlins'), club('Washington Commanders')],
		[club('Portland Trail Blazers', 'Trail Blazers'), club('Massachusetts Minutemen')],
		[club('Barcelona'), club('Juventus')],
		[club('Marshall Thundering Herd', 'Thundering Herd'), club('Los Angeles Lakers')],
	] as const).forEach(([away, home]) => {
		it(`fits both names to their bands: ${away.name} v ${home.name}`, () => {
			cy.mount(<Harness away={away} home={home} />);
			awaitCrests();
			scrubTo(sceneMs(nameScene));
			(['away', 'home'] as const).forEach(side => {
				cy.get(`.game-card-reveal-opening-name.is-${side}`).should($box => {
					const band = $box[0].getBoundingClientRect();
					const drawn = [...$box[0].querySelectorAll<HTMLElement>('.game-card-reveal-opening-name-line')];
					const rows = drawn.map(inkRowsOf);
					const lines = drawn.map(inkOf);

					expect(rows[0]!.top, `${side} ink inside its band`).to.be.greaterThan(band.top + 2);
					expect(rows[rows.length - 1]!.bottom, `${side} ink inside its band`)
						.to.be.lessThan(band.bottom - 2);

					rows.forEach((row, index) => {
						if (index === 0) return;
						expect(row.top, `${side} line ${index} clear of the line above`)
							.to.be.greaterThan(rows[index - 1]!.bottom);
					});

					lines.forEach((ink, index) => {
						expect(ink.left, `${side} line ${index} inside the card`).to.be.greaterThan(band.left);
						expect(ink.right, `${side} line ${index} inside the card`).to.be.lessThan(band.right);
					});

					const widest = Math.max(...lines.map(ink => ink.width));
					lines.forEach((ink, index) => {
						expect(ink.width, `${side} line ${index} justified`)
							.to.be.greaterThan(widest / revealNameSpread - 1.5);
						expect(ink.width, `${side} line ${index} justified`).to.be.lessThan(widest + 1.5);
					});

					expect(widest, `${side} named across the card`).to.be.greaterThan(band.width * 0.4);
				});
			});
		});
	});

	([
		[club('Washington Commanders'), club('Massachusetts Minutemen'), 0.65],
		[club('Miami Marlins'), club('Boston Celtics'), 0.4],
	] as const).forEach(([away, home, share]) => {
		it(`names a club across the live card: ${away.name} v ${home.name}`, () => {
			cy.mount(<Harness away={away} home={home} powerScore={scored} />);
			awaitCrests();
			scrubTo(sceneMs(nameScene));
			rectOf('.game-card').should(card => expect(card.height).to.be.greaterThan(160));
			(['away', 'home'] as const).forEach(side => {
				cy.get(`.game-card-reveal-opening-name.is-${side}`).should($box => {
					const band = $box[0].getBoundingClientRect();
					const widest = Math.max(
						...[...$box[0].querySelectorAll('.game-card-reveal-opening-name-line')]
							.map(line => inkOf(line).width),
					);
					expect(widest, `${side} named across the card`).to.be.greaterThan(band.width * share);
					expect(widest, `${side} inside the card`).to.be.lessThan(band.width);
					const drawn = $box[0].querySelector<HTMLElement>('.game-card-reveal-opening-name-line')!;
					expect(parseFloat(getComputedStyle(drawn).fontSize), `${side} type size`)
						.to.be.greaterThan(28);
				});
			});
		});
	});

	it('gives the naming a scene of its own, after the crests have left the field', () => {
		cy.mount(<Harness />);
		awaitCrests();

		scrubTo(sceneMs(crestScene));
		cy.get('.game-card-reveal-opening-logo').first().should('have.css', 'opacity', '1');
		cy.get('.game-card-reveal-opening-name').first().should('have.css', 'opacity', '0');

		scrubTo(sceneMs(nameScene));
		cy.get('.game-card-reveal-opening-name').first().should('have.css', 'opacity', '0.9');
		cy.get('.game-card-reveal-opening-logo').first().should('have.css', 'opacity', '0');
	});

	it('has collapsed onto the tricode slots by the time the poster starts', () => {
		cy.mount(<Harness />);
		awaitCrests();
		scrubTo(sceneMs(posterScene));
		cy.get('.game-card-reveal-opening-name').first().should('have.css', 'opacity', '0');

		rectOf('.game-card').then(card => {
			([['away', 0.25], ['home', 0.75]] as const).forEach(([side, slot]) => {
				rectOf(`.game-card-reveal-opening-name.is-${side} .game-card-reveal-opening-name-type`)
					.then(type => {
						expect((type.left + type.right) / 2, `${side} onto its slot`)
							.to.be.closeTo(card.left + card.width * slot, 1.5);
						expect((type.top + type.bottom) / 2, `${side} onto the centre line`)
							.to.be.closeTo(card.top + card.height / 2, 1.5);
					});
			});
		});
	});

	it('paints the bands in the colours the poster resolves to', () => {
		cy.mount(<Harness />);
		scrubTo(sceneMs(nameScene));
		cy.get('.game-card-reveal-opening-band.is-away')
			.should('have.css', 'background-color', awayColor);
		cy.get('.game-card-reveal-half.is-home')
			.should('have.css', 'background-color', homeColor);
	});
});
