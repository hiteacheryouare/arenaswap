import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import GameCardReveal from '../../entrypoints/popup/components/gameCardReveal';
import {
	revealFullRate,
	revealNameBeatMs,
	revealNameSpread,
	revealOpenBeatMs,
	type revealMode,
} from '../../entrypoints/popup/cardReveal';
import type { Game, PowerScoreResult } from '@arenaswap/core/types';

// A light mark on navy and a dark mark on gold, so both fields take their team's colour rather than
// the crest component's plate — and gold is the case that decides whether the naming is legible by
// luck or by construction.
const svg = (body: string) => `data:image/svg+xml;base64,${btoa(
	`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>${body}</svg>`,
)}`;
const lightMark = svg(`<circle cx='32' cy='32' r='25' fill='#F2F4F7'/><path d='M32 12 L32 52' stroke='#41B6E6' stroke-width='6'/>`);
const darkMark = svg(`<circle cx='32' cy='32' r='26' fill='#111111'/><circle cx='32' cy='32' r='13' fill='none' stroke='#FFB81C' stroke-width='3'/>`);

const awayColor = 'rgb(12, 35, 64)';
const homeColor = 'rgb(255, 184, 28)';

// The nickname is the club's own, as ESPN sends it, because it is what the line break is taken from.
const club = (name: string, nickname?: string) => ({ name, nickname: nickname ?? name.split(' ').slice(-1)[0] });

// Overridable, because which ink a name is drawn in is a fact about the club's own palette: the
// navy-and-gold pair below is the ordinary case, and a club that publishes a white is not.
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

// The card the popup really draws a live game on. Without a PowerScore it is 148px tall and with one
// it is 167, which is the difference between a band of 74px and a band of 84 — and the band's height
// is what bounds the type on a name of two short lines, so both cards have to be measured.
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
	stalled: false,
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
			<div className='mt-2'>
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

// Absolute, in the choreography's own units: the crests hold the field to `revealOpenBeatMs`, the
// naming has it from there, and the poster starts when the two of them are done. The hold is read
// 300ms short of the poster, which is inside it by a comfortable margin at either end — the naming
// lands 1050ms before the poster starts and begins to collapse 210ms before it.
const sceneMs = (ms: number) => ms * revealFullRate;
const crestScene = revealOpenBeatMs;
const nameScene = revealOpenBeatMs + revealNameBeatMs - 300;
const posterScene = revealOpenBeatMs + revealNameBeatMs;

const rectOf = (selector: string) => cy.get(selector).then($el => $el[0].getBoundingClientRect());

// The run of glyphs rather than the box they are centred in, since the box is the full width of the
// card and says nothing about how big the type came out. Widths only: a range over text measures the
// content area, which is 1.30em of DM Sans against 0.96em of actual ink, so it says nothing useful
// about where the letters start and stop down the page.
const inkOf = (el: Element) => {
	const range = el.ownerDocument.createRange();
	range.selectNodeContents(el);
	return range.getBoundingClientRect();
};

// And the ink's real extent down the page, measured off the glyphs with canvas `TextMetrics` rather
// than derived from the figures `cardReveal` fits against — those are the thing under test, and a
// check that reads them back would pass whatever they said. The line's own rect is the line box, so
// the baseline sits half the leftover leading plus the font's ascent below its top, and the ink runs
// from there by the ascent and descent of these particular letters.
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

	// ESPN's `displayName`, printed whole, on two lines broken where the club's own nickname starts.
	// Not abbreviated and not wrapped: the poster after this carries the tricodes, and this beat is the
	// one place the graphic says who is playing.
	it('names both clubs in full, broken at the nickname', () => {
		cy.mount(<Harness />);
		linesOf('home').then($lines => expect([...$lines].map(line => line.textContent))
			.to.deep.equal(['Washington', 'Commanders']));
		cy.mount(<Harness away={club('Penn State Nittany Lions', 'Nittany Lions')} />);
		linesOf('away').then($lines => expect([...$lines].map(line => line.textContent))
			.to.deep.equal(['Penn State', 'Nittany Lions']));
	});

	// And it stays on one line where that draws it bigger, which is the whole of what decides it:
	// "Miami Marlins" on two lines is bound by the band's height and covers a third of the card at
	// 35px, and on one line it is 40px across the whole of it. "Washington Commanders" is the other
	// way about — 21px on one line against 38 on two — so the two clubs on one card can be set
	// differently, and are.
	it('keeps a short club on one line, where that draws it bigger', () => {
		cy.mount(<Harness />);
		linesOf('away').then($lines => expect([...$lines].map(line => line.textContent))
			.to.deep.equal(['Miami Marlins']));
		linesOf('home').should('have.length', 2);
	});

	// Only on the first open of the day, like the rest of this beat. Every later open is the poster on
	// its own and has to stay exactly the graphic it has always been, which is the invariant five
	// passes on this animation have now been measured against.
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

	// The split laid flat, which is the whole reason a name gets the width of the card: half of it is
	// what the leaning seam leaves, and at half a card the longest word set the size for everything.
	it('splits the card horizontally, a band of colour per club', () => {
		cy.mount(<Harness />);
		scrubTo(sceneMs(nameScene));
		rectOf('.game-card').then(card => {
			([['away', card.top, awayColor], ['home', card.top + card.height / 2, homeColor]] as const)
				.forEach(([side, top, colour]) => {
					cy.get(`.game-card-reveal-opening-band.is-${side}`).should($band => {
						const box = $band[0].getBoundingClientRect();
						// The full width of the card, and half its height — the stage bleeds a pixel top
						// and bottom, which is the tolerance here rather than slop.
						expect(box.left, `${side} band from the card's edge`).to.be.closeTo(card.left, 0.5);
						expect(box.width, `${side} band across the card`).to.be.closeTo(card.width, 0.5);
						expect(box.top, `${side} band on its own half`).to.be.closeTo(top, 1.5);
						expect(box.height, `${side} band half the card`).to.be.closeTo(card.height / 2, 1.5);
						expect(getComputedStyle($band[0]).backgroundColor).to.equal(colour);
					});
				});
		});
	});

	// Filled solid, and the tricode is the one that stays outlined. Same family, weight and tracking
	// as the tricode, and the same 0.9 it softens its ink to, but a hollow letterform at the size
	// these are set at is a shape before it is a letter — and this is the beat carrying the words
	// somebody has to read. Filled also means one copy of the glyph rather than the tricode's two:
	// there is no stroke to keep outside a silhouette, so there is nothing to lay a second copy over.
	it('fills the names solid, and leaves the tricodes outlined', () => {
		cy.mount(<Harness />);
		linesOf('away').first()
			.should('have.css', 'color', 'rgb(255, 255, 255)');
		// Gold is the half that was legible by luck. White reaches 1.7:1 on it, so the name comes down
		// to the near-black — the club publishes nothing else to be drawn in.
		linesOf('home').first()
			.should('have.css', 'color', 'rgb(17, 24, 39)')
			.and('have.css', '-webkit-text-stroke-width', '0px')
			// And in the case the club writes its own name in, rather than shouted: the tricode is
			// upper case because ESPN's abbreviation is, and nothing here transforms anything.
			.and('have.css', 'text-transform', 'none');
		linesOf('home').first().should($line => expect($line[0].children).to.have.length(0));

		// And the poster's lettering over the navy is untouched by any of that: white, and stroked
		// white over the second copy of itself.
		cy.get('.game-card-reveal-mask.is-away .game-card-reveal-abbr-edge')
			.should('have.css', '-webkit-text-stroke-color', 'rgb(255, 255, 255)')
			.and($edge => expect(parseFloat(getComputedStyle($edge[0]).webkitTextStrokeWidth)).to.be.greaterThan(1));
	});

	// Penn State is the club this was written for. Their navy is too dark for the rest of the product,
	// so `apiClient` promotes the white they publish alongside it — which reaches the graphic as the
	// colour of their half, and used to carry their name in white as well. On a band like that the ink
	// is the club's own other colour, which is the navy that was moved out of the way.
	it('names a club on a white band in the colour that club also owns', () => {
		cy.mount(<Harness
			away={club('Penn State Nittany Lions', 'Nittany Lions')}
			colors={{ away: { color: '#FFFFFF', alternateColor: '#061440' }, home: { color: '#0C2340' } }}
		/>);
		scrubTo(sceneMs(nameScene));
		linesOf('away').first().should('have.css', 'color', 'rgb(6, 20, 64)');
		linesOf('home').first().should('have.css', 'color', 'rgb(255, 255, 255)');
		// And the tricode the poster draws on that same white, which had the identical problem: two
		// copies of a white glyph on a white half is nothing on screen at all.
		cy.get('.game-card-reveal-mask.is-away .game-card-reveal-abbr-edge')
			.should('have.css', 'color', 'rgb(6, 20, 64)')
			.and('have.css', '-webkit-text-stroke-color', 'rgb(6, 20, 64)');
	});

	// The fit, which is the point of the whole pass. Every line of a club is justified to one width and
	// that width is as much of the card as the band will take, so a club is named across the card
	// rather than labelled in the middle of it. Measured off the glyphs, at each line's own height,
	// because an advance is a property of the letters and not of their number.
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

					// Every letter inside its own band, down to the descenders — past the band's edge is
					// the other club's colour on one side and the popup's background on the other, and a
					// budget taken against the line boxes rather than the ink put the bottom of a "g"
					// within a pixel of the card's own edge.
					expect(rows[0]!.top, `${side} ink inside its band`).to.be.greaterThan(band.top + 2);
					expect(rows[rows.length - 1]!.bottom, `${side} ink inside its band`)
						.to.be.lessThan(band.bottom - 2);

					// And the lines clear of one another, which is what the leading is for: at the
					// leading a block of caps wanted, a descender on one line went 3.5px through the
					// ascenders of the next.
					rows.forEach((row, index) => {
						if (index === 0) return;
						expect(row.top, `${side} line ${index} clear of the line above`)
							.to.be.greaterThan(rows[index - 1]!.bottom);
					});

					lines.forEach((ink, index) => {
						// And across the card by the glyphs, which is where a line that was sized off a
						// letter count rather than an advance ran out past the edge.
						expect(ink.left, `${side} line ${index} inside the card`).to.be.greaterThan(band.left);
						expect(ink.right, `${side} line ${index} inside the card`).to.be.lessThan(band.right);
					});

					// Justified: every line of a name spans the same width, which is what makes it a
					// block of type rather than a sentence. Within the spread, rather than exactly:
					// a line the spread bound has caught stops growing and leaves the block ragged,
					// which is the point of that bound and is what "Los Angeles" over "Lakers" does.
					const widest = Math.max(...lines.map(ink => ink.width));
					lines.forEach((ink, index) => {
						expect(ink.width, `${side} line ${index} justified`)
							.to.be.greaterThan(widest / revealNameSpread - 1.5);
						expect(ink.width, `${side} line ${index} justified`).to.be.lessThan(widest + 1.5);
					});

					// And the block is a real share of the card rather than a caption in the middle of
					// it. Loose here, because this is the shorter of the two cards the popup draws and
					// a name of two lines is bound by the band's height on it — the tightest of these
					// pairs is "Los Angeles" over "Lakers" at 44% of the card, where the spread bound
					// stops the nickname growing into the room the place name cannot use. The case
					// that pins how big this actually gets is the live card below.
					expect(widest, `${side} named across the card`).to.be.greaterThan(band.width * 0.4);
				});
			});
		});
	});

	// The live card, which is the one the popup spends its time drawing: a PowerScore bar taller, so a
	// band of 84px, and the height stops binding on anything but the shortest pair of lines. This is
	// where the ask is answered — a club named across the card rather than labelled in the middle of it
	// — and how far it gets: a long club on two lines covers about three quarters of the card at 38px
	// of type, and a short one on a single line covers nine tenths of it at 40, against the 17.6px a
	// line-per-word block could reach on the same card.
	([
		[club('Washington Commanders'), club('Massachusetts Minutemen'), 0.65],
		[club('Miami Marlins'), club('Boston Celtics'), 0.45],
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
					// The size itself, which is the ask: twice the 17.6px a line-per-word block could
					// reach on the same card.
					const drawn = $box[0].querySelector<HTMLElement>('.game-card-reveal-opening-name-line')!;
					expect(parseFloat(getComputedStyle(drawn).fontSize), `${side} type size`)
						.to.be.greaterThan(28);
				});
			});
		});
	});

	// Its own scene rather than a caption on the one before it, which is the whole point of the beat:
	// the crests hold the colour on their own, and then they leave it and the naming takes it. What
	// this pins is that the two are never up together at either end — an overlap in the middle is the
	// handover and is meant to be there, but a name on the crests' own frame would be the old design
	// back, and a crest on the naming's frame would make it a caption again.
	it('gives the naming a scene of its own, after the crests have left the field', () => {
		cy.mount(<Harness />);
		awaitCrests();

		// The crests' own frame: they hold the colour, and nothing is named yet.
		scrubTo(sceneMs(crestScene));
		cy.get('.game-card-reveal-opening-logo').first().should('have.css', 'opacity', '1');
		cy.get('.game-card-reveal-opening-name').first().should('have.css', 'opacity', '0');

		// The naming's own frame: the field is theirs and the crests have gone.
		scrubTo(sceneMs(nameScene));
		cy.get('.game-card-reveal-opening-name').first().should('have.css', 'opacity', '0.9');
		cy.get('.game-card-reveal-opening-logo').first().should('have.css', 'opacity', '0');
	});

	// And it has left by the frame the poster starts on, rather than being held there for the colour to
	// cover. The poster's halves grow in from the outer edges, so a name still standing there is eaten
	// from its ends inward by colour in its own hue: letters going out one at a time with nothing
	// visible doing it, which is how this beat used to end.
	it('has collapsed onto the tricode slots by the time the poster starts', () => {
		cy.mount(<Harness />);
		awaitCrests();
		scrubTo(sceneMs(posterScene));
		cy.get('.game-card-reveal-opening-name').first().should('have.css', 'opacity', '0');

		// Onto the slot rather than merely away: what the name leaves towards is the point the tricode
		// it is standing in for appears on — the crest slots at 25% and 75%, on the centre line.
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

	// The colour a name is drawn on is the colour the poster's own half will be, which is what makes
	// the handover a wipe rather than a cut: the poster grows its leaning halves over these bands in
	// the same two colours, and the only thing that changes is where the split is.
	it('paints the bands in the colours the poster resolves to', () => {
		cy.mount(<Harness />);
		scrubTo(sceneMs(nameScene));
		cy.get('.game-card-reveal-opening-band.is-away')
			.should('have.css', 'background-color', awayColor);
		cy.get('.game-card-reveal-half.is-home')
			.should('have.css', 'background-color', homeColor);
	});
});
