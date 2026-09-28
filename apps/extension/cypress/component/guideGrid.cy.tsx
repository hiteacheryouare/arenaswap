import type { Game, LeagueId } from '@arenaswap/core/types';
import GuideGrid from '../../entrypoints/guide/guideGrid';
import { buildBar, buildHeatCurve, type guideBar } from '../../entrypoints/guide/guideHeat';
import { blockHeights, gutterPx, laneHeight } from '../../entrypoints/guide/guideLayout';
import { makeGame } from '../support/fixtures';

const now = new Date('2026-09-13T20:00:00Z').getTime();

const bar = (id: string, league: LeagueId, startTime: string, overrides: Partial<Game> = {}, isFavorite = false): guideBar => {
	const game = makeGame(id, {
		league,
		sportType: league === 'nfl' ? 'football' : 'basketball',
		status: 'pre',
		startTime,
		// Two navies, deliberately: they are what the lightening climb exists for, and a pair of
		// already-bright colours would pass a contrast assertion without exercising it.
		homeTeam: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: 0, color: '#002244' },
		awayTeam: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: 0, color: '#0B162A' },
		...overrides,
	});
	const built = buildBar(game, isFavorite, now);
	if (!built) throw new Error('expected a bar');
	return built;
};

const live = (id: string, startTime: string, overrides: Partial<Game> = {}) => bar(id, 'nba', startTime, { status: 'in', period: 3, clockSeconds: 300, ...overrides });

const nflSunday = (): guideBar[] => [
	...Array.from({ length: 6 }, (_, i) => bar(`early-${i}`, 'nfl', '2026-09-13T17:00:00Z')),
	...Array.from({ length: 3 }, (_, i) => bar(`late-${i}`, 'nfl', '2026-09-13T20:25:00Z')),
	bar('nba-1', 'nba', '2026-09-14T00:00:00Z'),
];

interface mountOptions {
	showBand?: boolean;
	width?: number;
	now?: number | null;
	powers?: Record<string, number>;
	watching?: Record<string, string>;
	theme?: 'dark' | 'light';
}

const mountGrid = (bars: guideBar[], { showBand = true, width = 1280, now: nowValue = now, powers = {}, watching = {}, theme = 'dark' }: mountOptions = {}) => {
	cy.viewport(width, 800);
	document.documentElement.dataset.bsTheme = theme;
	const { band } = buildHeatCurve(bars, { weightFavorites: true, favoriteBonusPoints: 10 });
	cy.mount(
		<div className='guide-page'>
			<div className='guide-scroller'>
				<GuideGrid
					bars={bars}
					band={showBand ? band : null}
					leagueLogos={{}}
					now={nowValue}
					powers={new Map(Object.entries(powers))}
					watching={new Map(Object.entries(watching))}
					onOpen={cy.stub().as('onOpen')}
					theme={theme}
				/>
			</div>
		</div>,
	);
};

const channels = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
const luminance = (color: string) => {
	const [r, g, b] = channels(color);
	return (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255;
};
const box = (element: Element) => element.getBoundingClientRect();

// Nothing in a line may run past the line itself, which is what a clipped glyph is.
const overflowing = (block: HTMLElement) => [...block.querySelectorAll('.guide-bar-line')].some(line => (
	[...line.children].some(child => box(child).right > box(line).right + 0.5)
));

describe('the guide grid', () => {
	afterEach(() => {
		delete document.documentElement.dataset.bsTheme;
	});

	it('draws one block per game', () => {
		mountGrid(nflSunday());
		cy.get('.guide-bar').should('have.length', 10);
	});

	it('carries both teams on every block, each with its crest', () => {
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z')]);
		cy.get('.guide-bar').first().within(() => {
			cy.get('.guide-bar-side .as-crest-box').should('have.length', 2).and('be.visible');
			cy.get('.guide-bar-team').should('have.length', 2);
		});
	});

	it('names each league once however many games it has', () => {
		mountGrid(nflSunday());
		cy.get('.guide-league').should('have.length', 2);
		// In the popup's own league order, which is why a late NBA game still heads the grid.
		cy.get('.guide-league-label').then(($labels: JQuery<HTMLElement>) => {
			expect([...$labels].map(l => l.textContent)).to.deep.equal(['NBA', 'NFL']);
		});
	});

	it('opens the game it was clicked on', () => {
		mountGrid([bar('only', 'nfl', '2026-09-13T17:00:00Z')]);
		cy.get('.guide-bar-content').click();
		cy.get('@onOpen').should('have.been.calledOnceWith', 'only');
		// And on the block itself, clear of the label.
		cy.get('.guide-bar-shape').click('right');
		cy.get('@onOpen').should('have.been.calledTwice');
	});

	it('hides the band when it is switched off, and shows it when it is not', () => {
		mountGrid(nflSunday());
		cy.get('.guide-band').should('exist');
		cy.get('.guide-ruler-band').should('exist');
		mountGrid(nflSunday(), { showBand: false });
		cy.get('.guide-band').should('not.exist');
		cy.get('.guide-ruler-band').should('not.exist');
	});

	// The band's edge lives on the ruler, in the accent, where there is nothing for it to cut through.
	it('edges the band in the accent on the ruler and only tints it on the grid', () => {
		mountGrid(nflSunday());
		cy.get('.guide-ruler-band').should(([edge]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(edge!);
			expect(style.borderBottomWidth).to.equal('2px');
			expect(style.borderBottomColor).to.equal('rgb(247, 92, 3)');
		});
		cy.get('.guide-band').should(([wash]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(wash!);
			expect(style.borderWidth).to.equal('0px');
			expect(style.backgroundColor).to.not.equal('rgba(0, 0, 0, 0)');
		});
	});

	// Heat is the height and nothing else: the hottest live game is tall, anything at or above the
	// tile floor is medium, and the rest are short. Each is centred in its 56px lane.
	it('sizes each block by heat and centres it in its lane', () => {
		mountGrid([
			live('hot', '2026-09-13T19:00:00Z'),
			live('warm', '2026-09-13T19:05:00Z'),
			live('cool', '2026-09-13T19:10:00Z'),
			bar('later', 'nba', '2026-09-14T01:00:00Z'),
		], { powers: { hot: 91, warm: 70, cool: 69 } });
		cy.get('.guide-group').first().then(([group]: JQuery<HTMLElement>) => {
			const top = box(group!).top;
			const expected: Record<string, number> = { hot: blockHeights.hot, warm: blockHeights.warm, cool: blockHeights.cool, later: blockHeights.cool };
			for (const [id, height] of Object.entries(expected)) {
				const shape = group!.querySelector(`[data-game-id='${id}'] .guide-bar-shape`)!;
				expect(box(shape).height, id).to.equal(height);
				const centreInLane = (box(shape).top + height / 2 - top) % laneHeight;
				expect(centreInLane, `${id} is centred in its lane`).to.equal(laneHeight / 2);
			}
		});
		// Same fill for every heat: height is the only thing heat is allowed to change.
		cy.get('.guide-bar-shape').then(($shapes: JQuery<HTMLElement>) => {
			const fills = new Set([...$shapes].map(shape => getComputedStyle(shape).backgroundColor));
			expect(fills.size).to.equal(1);
		});
	});

	it('puts a live game on the grid with a still dot, and nothing else live-coloured', () => {
		mountGrid([bar('scheduled', 'nfl', '2026-09-14T01:00:00Z'), live('live', '2026-09-13T19:00:00Z')]);
		cy.get('.guide-bar-live').should('have.length', 1).and(([dot]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(dot!).animationName).to.equal('none');
		});
		cy.get("[data-status='in'] .guide-bar-live").should('exist');
	});

	it('gives a live game its PowerScore at the far end of its block, and a final none at all', () => {
		mountGrid([
			live('live', '2026-09-13T19:00:00Z'),
			bar('done', 'nba', '2026-09-13T15:00:00Z', { status: 'post', awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 100 }, homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 90 } }),
			bar('later', 'nba', '2026-09-14T01:00:00Z'),
		], { powers: { live: 88, done: 77, later: 60 } });
		cy.get("[data-game-id='live'] .guide-bar-value").should('contain.text', '88').then(([value]: JQuery<HTMLElement>) => {
			const shape = value!.closest('.guide-bar')!.querySelector('.guide-bar-shape')!;
			expect(box(shape).right - box(value!).right).to.be.closeTo(12, 1);
			// Named for a screen reader, since the number alone says nothing about what it is.
			expect(value!.textContent).to.contain('PowerScore');
		});
		cy.get("[data-game-id='done'] .guide-bar-value").should('not.exist');
		cy.get("[data-game-id='done']").should('not.contain.text', '77');
		cy.get("[data-game-id='later'] .guide-bar-value").should('not.exist');
	});

	it('gives a favourite game the same fill as any other', () => {
		mountGrid([
			bar('plain', 'nfl', '2026-09-13T17:00:00Z'),
			bar('mine', 'nfl', '2026-09-13T17:00:00Z', {}, true),
		]);
		cy.get('.guide-bar-shape').then(([first, second]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(second!).backgroundColor).to.equal(getComputedStyle(first!).backgroundColor);
		});
		// The star is the only thing distinguishing it, and it has to actually be there — otherwise
		// the assertion above is measuring two identical blocks and proving nothing.
		cy.get('.guide-bar-star').should('have.length', 1);
	});

	// A finished game keeps its place so the day keeps its shape, but its ink recedes. Its crests
	// stay whole, which fading the whole block did not.
	it('recedes a finished game to the muted ink without fading its crests', () => {
		mountGrid([
			live('live', '2026-09-13T19:00:00Z'),
			bar('done', 'nba', '2026-09-13T13:00:00Z', { status: 'post' }),
		]);
		cy.get("[data-status='post'] .guide-bar-team").first().then(([final]: JQuery<HTMLElement>) => {
			cy.get("[data-status='in'] .guide-bar-team").first().then(([running]: JQuery<HTMLElement>) => {
				expect(luminance(getComputedStyle(final!).color)).to.be.lessThan(luminance(getComputedStyle(running!).color));
			});
		});
		cy.get("[data-status='post'] .as-crest-box").each(($crest: JQuery<HTMLElement>) => {
			let element: HTMLElement | null = $crest[0]!;
			while (element) {
				expect(parseFloat(getComputedStyle(element).opacity)).to.equal(1);
				element = element.parentElement;
			}
		});
	});

	it('reads a live game as a scoreboard: both scores, the trailing one muted, and where the game is', () => {
		mountGrid([live('live', '2026-09-13T19:00:00Z', {
			league: 'nfl', sportType: 'football', period: 2, clockSeconds: 312,
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'KC', score: 14 },
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'LAC', score: 13 },
		})]);
		cy.get('.guide-bar-score').then(($scores: JQuery<HTMLElement>) => {
			expect([...$scores].map(score => score.textContent)).to.deep.equal(['14', '13']);
			expect(getComputedStyle($scores[1]!).color).to.not.equal(getComputedStyle($scores[0]!).color);
		});
		cy.get('.guide-bar-side.is-behind').should('have.length', 1).and('contain.text', 'LAC');
		cy.get('.guide-bar-status').should('have.text', 'Q2 5:12');
		cy.get('.guide-bar-at').should('not.exist');
	});

	it('prints a final with the loser receded', () => {
		mountGrid([bar('done', 'nfl', '2026-09-13T13:00:00Z', {
			status: 'post', finalPeriodSuffix: 'OT',
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'BUF', score: 31 },
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'MIA', score: 10 },
		})]);
		cy.get('.guide-bar-status').should('have.text', 'Final/OT');
		cy.get('.guide-bar-side.is-behind').should('have.length', 1).and('contain.text', 'MIA');
		cy.contains('.guide-bar-side', 'BUF').find('.guide-bar-score').then(([winner]: JQuery<HTMLElement>) => {
			cy.contains('.guide-bar-side', 'MIA').find('.guide-bar-score').then(([loser]: JQuery<HTMLElement>) => {
				expect(luminance(getComputedStyle(loser!).color)).to.be.lessThan(luminance(getComputedStyle(winner!).color));
			});
		});
	});

	it('dims neither side of a level final', () => {
		mountGrid([bar('draw', 'nfl', '2026-09-13T13:00:00Z', {
			status: 'post',
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'ARS', score: 2 },
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'LIV', score: 2 },
		})]);
		cy.get('.guide-bar-side.is-behind').should('not.exist');
	});

	// Before a game there is no score to print, so the block carries what a guide is for: when, and
	// on what. Dashed, since it has not happened yet.
	it('gives a scheduled game its kickoff and its network instead of a 0–0, in a dashed block', () => {
		mountGrid([bar('later', 'nfl', '2026-09-14T00:20:00Z', { broadcasts: ['NBC', 'Peacock'] })]);
		cy.get('.guide-bar-score').should('not.exist');
		cy.get('.guide-bar-time').should('exist');
		cy.get('.guide-bar-at').should('have.text', 'at');
		cy.get('.guide-bar-network').should('have.text', 'NBC');
		cy.get('.guide-bar-shape').should('have.css', 'border-top-style', 'dashed');
	});

	it('draws a live block with a solid border', () => {
		mountGrid([live('live', '2026-09-13T19:00:00Z')]);
		cy.get('.guide-bar-shape').should('have.css', 'border-top-style', 'solid');
	});

	// The watched game carries the outline and its tab, under the matchup when the block is tall and
	// beside it when it is not.
	it('outlines the watched game and names its tab', () => {
		mountGrid([live('hot', '2026-09-13T19:00:00Z'), live('other', '2026-09-13T19:05:00Z')], {
			powers: { hot: 91, other: 40 },
			watching: { hot: 'Tab 2', other: 'Tab 3' },
		});
		cy.get("[data-game-id='hot'] .guide-bar-sub .guide-bar-watching").should('have.text', 'Watching, Tab 2');
		cy.get("[data-game-id='other'] .guide-bar-line:first-child .guide-bar-watching").should('have.text', 'Watching, Tab 3');
		cy.get("[data-game-id='hot'] .guide-bar-shape").should(([shape]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(shape!);
			expect(style.borderTopColor).to.equal('rgb(243, 245, 247)');
			// The half pixel over the 1px border, as a shadow so a 1x screen does not snap it away.
			expect(style.boxShadow).to.equal('rgb(243, 245, 247) 0px 0px 0px 0.5px inset');
		});
		cy.get("[data-game-id='other'] .guide-bar-shape").should('have.css', 'border-top-color', 'rgb(243, 245, 247)');
	});

	it('outlines nothing that is not being watched', () => {
		mountGrid([live('hot', '2026-09-13T19:00:00Z')], { powers: { hot: 91 } });
		cy.get('.guide-bar-watching').should('not.exist');
		cy.get('.guide-bar-shape').should('have.css', 'box-shadow', 'none').and('not.have.css', 'border-top-color', 'rgb(243, 245, 247)');
	});

	// Games in one league that overlap take a lane each under a single name, and a game that starts
	// after another has ended reuses its lane.
	it('stacks overlapping games of one league in lanes under one name', () => {
		mountGrid([
			live('first', '2026-09-13T18:30:00Z'),
			live('second', '2026-09-13T19:00:00Z'),
			bar('later', 'nba', '2026-09-14T02:00:00Z'),
		]);
		cy.get('.guide-league').should('have.length', 1);
		cy.get('.guide-group').first().should(([group]: JQuery<HTMLElement>) => {
			expect(box(group!).height).to.equal(2 * laneHeight);
			const lane = (id: string) => Math.floor((box(group!.querySelector(`[data-game-id='${id}'] .guide-bar-shape`)!).top - box(group!).top) / laneHeight);
			expect(lane('first')).to.equal(0);
			expect(lane('second')).to.equal(1);
			expect(lane('later')).to.equal(0);
		});
	});

	// Opaque blocks over the line: it shows in the gaps between games and never runs through a score.
	it('runs the now line behind the blocks', () => {
		mountGrid([live('live', '2026-09-13T19:00:00Z')]);
		cy.get('.guide-now').then(([line]: JQuery<HTMLElement>) => {
			// elementFromPoint skips anything the pointer passes through, which the underlay is built to be.
			line!.parentElement!.style.pointerEvents = 'auto';
			line!.style.pointerEvents = 'auto';
			const x = box(line!).left + 1;
			const shape = document.querySelector('.guide-bar-shape')!;
			expect(box(shape).left).to.be.lessThan(x);
			expect(box(shape).right).to.be.greaterThan(x);
			const onBlock = document.elementFromPoint(x, box(shape).top + box(shape).height / 2);
			expect(onBlock?.closest('.guide-bar'), 'the block is on top').to.not.equal(null);
			const group = document.querySelector('.guide-group')!;
			const inGap = document.elementFromPoint(x, box(group).top + 4);
			expect(inGap, 'the line shows above the block').to.equal(line);
		});
	});

	it('caps the now line with a dot on the ruler, where it meets the grid', () => {
		mountGrid([live('live', '2026-09-13T19:00:00Z')]);
		cy.get('.guide-ruler-now').then(([dot]: JQuery<HTMLElement>) => {
			const line = box(document.querySelector('.guide-now')!);
			const ruler = box(document.querySelector('.guide-ruler')!);
			expect(box(dot!).left + box(dot!).width / 2).to.be.closeTo(line.left + line.width / 2, 0.5);
			expect(box(dot!).top + box(dot!).height / 2).to.equal(ruler.bottom);
		});
	});

	it('puts the now line where now is, between the blocks that have started and those that have not', () => {
		mountGrid([
			bar('started', 'nfl', '2026-09-13T17:00:00Z'),
			bar('later', 'nfl', '2026-09-13T23:00:00Z'),
		]);
		cy.get('.guide-now').then(([line]: JQuery<HTMLElement>) => {
			const x = box(line!).left;
			cy.get('.guide-bar').then(([started, later]: JQuery<HTMLElement>) => {
				expect(box(started!).left).to.be.lessThan(x);
				expect(box(later!).left).to.be.greaterThan(x);
			});
		});
	});

	// The reason the scale is fixed and the grid scrolls: at any smaller scale a short block cannot
	// hold two crests and a matchup.
	it('keeps every block wide enough to read a matchup off', () => {
		mountGrid(nflSunday());
		cy.get('.guide-bar-shape').each(($bar: JQuery<HTMLElement>) => {
			expect(box($bar[0]!).width).to.be.greaterThan(200);
		});
	});

	it('draws every block edge on a whole pixel, so an end cap is a crisp line', () => {
		mountGrid([bar('odd', 'nfl', '2026-09-13T17:07:00Z'), live('live', '2026-09-13T19:13:00Z')]);
		cy.get('.guide-bar-shape').each(($shape: JQuery<HTMLElement>) => {
			const { left, right } = box($shape[0]!);
			expect(left % 1, 'left').to.equal(0);
			expect(right % 1, 'right').to.equal(0);
		});
	});

	it('carries each team colour as a 3px cap at its own end of the block', () => {
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z')]);
		cy.get('.guide-bar-shape').first().then(([element]: JQuery<HTMLElement>) => {
			const away = getComputedStyle(element!, '::before');
			const home = getComputedStyle(element!, '::after');
			expect(away.backgroundColor).to.not.equal(home.backgroundColor);
			for (const cap of [away, home]) {
				expect(cap.width).to.equal('3px');
				expect(cap.backgroundColor).to.match(/^rgba?\(/);
				expect(cap.backgroundColor).to.not.equal('rgba(0, 0, 0, 0)');
			}
		});
	});

	// Both fixture colours are navies. Drawn raw they would be indistinguishable from the block, which
	// is the whole reason the pair is resolved for the surface it sits on.
	it('lifts a navy off the block rather than drawing it raw', () => {
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z')]);
		cy.get('.guide-bar-shape').first().then(([element]: JQuery<HTMLElement>) => {
			for (const pseudo of ['::before', '::after']) {
				expect(luminance(getComputedStyle(element!, pseudo).backgroundColor), `${pseudo} clears the block`).to.be.greaterThan(0.12);
			}
		});
	});

	// On white it is the golds that fail, and they are darkened rather than lifted.
	it('darkens a gold off the white block in light mode', () => {
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z', {
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0, color: '#FFB81C' },
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0, color: '#FFC62F' },
		})], { theme: 'light' });
		cy.get('.guide-bar-shape').first().then(([element]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(element!).backgroundColor).to.equal('rgb(255, 255, 255)');
			for (const pseudo of ['::before', '::after']) {
				expect(luminance(getComputedStyle(element!, pseudo).backgroundColor), `${pseudo} stands off white`).to.be.lessThan(0.75);
			}
		});
	});

	it('sits the league mark on a light disc, and leaves a readable team crest bare', () => {
		mountGrid(nflSunday());
		cy.get('.guide-bar').first().find('.as-crest').should('have.length', 2);
		cy.get('.guide-bar').first().find('.as-crest.is-bare').should('have.length', 2);
		cy.get('.guide-league-disc').should('have.length', 2);
		cy.get('.guide-league-disc').first().then(([disc]: JQuery<HTMLElement>) => {
			const backing = getComputedStyle(disc!).backgroundColor;
			expect(backing).to.not.equal('rgba(0, 0, 0, 0)');
			expect(luminance(backing), 'the disc is a light plate').to.be.greaterThan(0.5);
			expect(box(disc!).width).to.equal(24);
		});
	});

	// Visible rather than merely present: a rule an eye cannot find passes a width assertion.
	it('rules off each league, and leaves the lanes inside one unruled', () => {
		mountGrid([
			live('first', '2026-09-13T18:30:00Z'),
			live('second', '2026-09-13T19:00:00Z'),
			bar('nfl', 'nfl', '2026-09-13T19:00:00Z'),
		]);
		cy.get('.guide-group').first().then(([group]: JQuery<HTMLElement>) => {
			const style = getComputedStyle(group!);
			expect(style.borderBottomWidth).to.equal('1px');
			// The rule is translucent ink over the page, so what reads is the blend.
			const [r, g, b, alpha = 1] = style.borderBottomColor.match(/[\d.]+/g)!.map(Number);
			const page = channels(getComputedStyle(document.body).backgroundColor);
			const blended = [r, g, b].map((channel, index) => channel! * alpha + page[index]! * (1 - alpha));
			expect(Math.abs(luminance(`rgb(${blended.join(',')})`) - luminance(`rgb(${page.join(',')})`)), 'the rule reads against the page').to.be.greaterThan(0.02);
			// Two NBA lanes, and nothing between them: the lanes cell draws no rule and holds only blocks.
			const lanes = group!.querySelector('.guide-group-lanes')!;
			expect(getComputedStyle(lanes).borderTopWidth).to.equal('0px');
			expect(getComputedStyle(lanes).borderBottomWidth).to.equal('0px');
			expect(lanes.querySelectorAll(':scope > :not(.guide-bar)')).to.have.length(0);
		});
	});

	it('draws no now line on a day that is not today', () => {
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z')], { now: null });
		cy.get('.guide-now').should('not.exist');
		cy.get('.guide-ruler-now').should('not.exist');
		// Paired with the positive case, so the absence above is the prop rather than a broken mount.
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z')]);
		cy.get('.guide-now').should('exist');
		cy.get('.guide-ruler-now').should('exist');
	});

	it('opens its first hour label fully on screen rather than half cut off', () => {
		mountGrid(nflSunday());
		cy.get('.guide-ruler-mark').first().find('.guide-ruler-label').should(([label]: JQuery<HTMLElement>) => {
			const track = label!.closest('.guide-ruler-track')!.getBoundingClientRect();
			expect(box(label!).left).to.be.at.least(track.left - 1);
			expect(label!.hasAttribute('data-clipped')).to.equal(false);
		});
	});

	// The tick is what the hour is read off, and it has to sit on the gridline drawn for the same hour.
	it('lands every hour tick on its own gridline, including the first', () => {
		mountGrid(nflSunday());
		cy.get('.guide-gridline').then(($lines: JQuery<HTMLElement>) => {
			const lines = [...$lines].map(line => box(line).left);
			cy.get('.guide-ruler-mark').then(($marks: JQuery<HTMLElement>) => {
				expect($marks.length).to.equal(lines.length);
				[...$marks].forEach((mark, index) => {
					expect(box(mark).left, `hour ${index}`).to.be.closeTo(lines[index]!, 0.5);
				});
			});
		});
	});

	// The first hour's line is the league column's own rule, rather than a second line beside it.
	it('draws one line, not two, where the plot meets the league column', () => {
		mountGrid(nflSunday());
		cy.get('.guide-ruler-corner').then(([corner]: JQuery<HTMLElement>) => {
			const tick = document.querySelector('.guide-ruler-mark')!;
			expect(box(tick).left).to.equal(box(corner!).right - 1);
		});
	});

	it('keeps the league name on screen at any horizontal scroll position', () => {
		mountGrid(nflSunday(), { width: 500 });
		cy.get('.guide-scroller').scrollTo(600, 0);
		cy.get('.guide-league').first().then(([gutter]: JQuery<HTMLElement>) => {
			const scroller = gutter!.closest('.guide-scroller')!.getBoundingClientRect();
			expect(box(gutter!).left).to.be.closeTo(scroller.left, 1);
			expect(box(gutter!).width).to.equal(gutterPx);
		});
	});

	it('renders nothing at all rather than an empty axis when there are no games', () => {
		mountGrid([]);
		cy.get('.guide-canvas').should('not.exist');
	});

	// A guide scrolled to now has most of the afternoon off to the left, so a block that started
	// earlier is the ordinary case rather than an edge one.
	it('keeps the matchup on screen when the block starts under the league column', () => {
		mountGrid([bar('early', 'nfl', '2026-09-13T17:00:00Z')], { width: 500 });
		cy.get('.guide-scroller').then(([scroller]: JQuery<HTMLElement>) => {
			// Its first 60px under the league column.
			const shape = box(scroller!.querySelector('.guide-bar-shape')!);
			cy.wrap(scroller!).scrollTo(shape.left - (box(scroller!).left + gutterPx) + 60, 0);
		});
		cy.get('.guide-bar').first().should(([element]: JQuery<HTMLElement>) => {
			const barBox = box(element!.querySelector('.guide-bar-shape')!);
			const content = box(element!.querySelector('.guide-bar-content')!);
			const plotLeft = box(element!.closest('.guide-scroller')!).left + gutterPx;
			expect(barBox.left).to.be.closeTo(plotLeft - 60, 1);
			expect(content.left).to.be.closeTo(plotLeft, 1);
			expect(content.right).to.be.at.most(barBox.right + 1);
			expect(element!.hasAttribute('data-cut')).to.equal(false);
		});
	});

	// Sliding along its block, the label never runs over the PowerScore at the block's far end: the
	// number steps aside once the two would touch, and the block itself only goes once the label no
	// longer fits in what is left of it.
	it('moves the PowerScore aside for a pinned label before letting the block go', () => {
		// A late game in another league runs the axis on, so there is room to scroll the first away.
		mountGrid([live('live', '2026-09-13T18:00:00Z'), bar('late', 'nfl', '2026-09-14T02:00:00Z')], { width: 700, powers: { live: 88 } });
		cy.get("[data-game-id='live']").should('not.have.attr', 'data-crowded');
		cy.get("[data-game-id='live']").then(([element]: JQuery<HTMLElement>) => {
			expect(box(element!.querySelector('.guide-bar-content')!).right).to.be.at.most(box(element!.querySelector('.guide-bar-value')!).left);
		});
		// Scrolled until the pinned label runs 8px into the PowerScore, well short of the block's end.
		const scrollLabelInto = (overlap: 'value' | 'end') => cy.get("[data-game-id='live']").then(([element]: JQuery<HTMLElement>) => {
			const scroller = element!.closest<HTMLElement>('.guide-scroller')!;
			const shape = box(element!.querySelector('.guide-bar-shape')!);
			const value = box(element!.querySelector('.guide-bar-value')!);
			const labelWidth = box(element!.querySelector('.guide-bar-content')!).width;
			const plotLeft = box(scroller).left + gutterPx;
			const wanted = overlap === 'value' ? plotLeft + labelWidth + (shape.right - value.left) - 8 : plotLeft + labelWidth - 8;
			cy.wrap(scroller).scrollTo(scroller.scrollLeft + shape.right - wanted, 0);
		});
		scrollLabelInto('value');
		cy.get("[data-game-id='live']").should('have.attr', 'data-crowded');
		cy.get("[data-game-id='live']").should('not.have.attr', 'data-cut');
		cy.get("[data-game-id='live'] .guide-bar-value").should('have.css', 'opacity', '0');
		cy.get("[data-game-id='live'] .guide-bar-shape").should('have.css', 'opacity', '1');
		// And 8px past the block's own end, which is where the block goes.
		scrollLabelInto('end');
		cy.get("[data-game-id='live']").should('have.attr', 'data-cut');
		cy.get("[data-game-id='live'] .guide-bar-shape").should('have.css', 'opacity', '0');
		cy.get("[data-game-id='live'] .guide-bar-content").should('have.css', 'opacity', '1');
	});

	// With its block gone the label is on the grid itself, so the now line passes behind its letters.
	it('haloes a label whose block has gone, so the now line does not strike through it', () => {
		mountGrid([bar('early', 'nfl', '2026-09-13T17:00:00Z'), bar('late', 'nba', '2026-09-14T02:00:00Z')], { width: 600 });
		cy.get("[data-game-id='early'] .guide-bar-content").should('have.css', 'text-shadow', 'none');
		cy.get('.guide-scroller').scrollTo('right');
		cy.get("[data-game-id='early']").should('have.attr', 'data-cut');
		cy.get("[data-game-id='early'] .guide-bar-content").should(([content]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(content!).textShadow).to.contain(getComputedStyle(document.body).backgroundColor);
		});
	});

	// A game that ended an hour ago still owns its lane. Bounded by the block, the label was dragged
	// under the gutter with it, leaving a scrap like 'F @ MIA' or an empty lane.
	it('keeps a label beside the league column after its block has scrolled away', () => {
		mountGrid([bar('early', 'nfl', '2026-09-13T17:00:00Z'), bar('late', 'nba', '2026-09-14T02:00:00Z')], { width: 600 });
		cy.get('.guide-scroller').scrollTo('right');
		cy.get("[data-game-id='early']").should('have.attr', 'data-cut');
		cy.get("[data-game-id='early']").then(([element]: JQuery<HTMLElement>) => {
			const shape = box(element!.querySelector('.guide-bar-shape')!);
			const content = box(element!.querySelector('.guide-bar-content')!);
			const scroller = box(element!.closest('.guide-scroller')!);
			expect(shape.right, 'the block itself is gone').to.be.lessThan(scroller.left + gutterPx);
			expect(content.left).to.be.closeTo(scroller.left + gutterPx, 1);
			expect(content.width).to.be.greaterThan(100);
		});
		cy.get("[data-game-id='early'] .guide-bar-content").should('have.css', 'opacity', '1');
	});

	it('lets a block go once its pinned label no longer fits in what is left of it', () => {
		mountGrid([bar('early', 'nfl', '2026-09-13T17:00:00Z'), bar('late', 'nba', '2026-09-14T02:00:00Z')], { width: 600 });
		cy.get("[data-game-id='early']").should('not.have.attr', 'data-cut');
		cy.get('.guide-scroller').scrollTo('right');
		cy.get("[data-game-id='early']").should('have.attr', 'data-cut');
		cy.get("[data-game-id='early'] .guide-bar-shape").should('have.css', 'opacity', '0');
		cy.get("[data-game-id='early'] .guide-bar-content").should('be.visible');
	});

	// Sharing a lane, the next game pushes a pinned label under the league column, and the scrap of it
	// that would still show goes with it.
	it('lets the next game in a lane push a pinned label out', () => {
		mountGrid([bar('early', 'nfl', '2026-09-13T17:00:00Z'), bar('late', 'nfl', '2026-09-14T02:00:00Z')], { width: 600 });
		cy.get("[data-game-id='early']").should('not.have.attr', 'data-tucked');
		cy.get('.guide-scroller').scrollTo('right');
		cy.get("[data-game-id='early']").should('have.attr', 'data-tucked');
		cy.get("[data-game-id='early'] .guide-bar-content").should('have.css', 'opacity', '0');
		cy.get("[data-game-id='late'] .guide-bar-content").should('have.css', 'opacity', '1');
		cy.get("[data-game-id='late']").should('not.have.attr', 'data-tucked');
	});

	// Rather than clip a glyph, a label longer than its block sheds its crests, then its clock.
	it('fits a long label inside a short block without clipping a glyph', () => {
		mountGrid([
			bar('short', 'olybkw', '2026-09-13T21:00:00Z', {
				broadcasts: ['NBC Sports'],
				awayTeam: { id: 'a', name: 'Away', abbreviation: 'USA', score: 0 },
				homeTeam: { id: 'h', name: 'Home', abbreviation: 'AUS', score: 0 },
			}),
			bar('roomy', 'nfl', '2026-09-13T17:00:00Z'),
		]);
		cy.get("[data-game-id='short']").should('have.attr', 'data-fit').and('not.equal', 'faded');
		cy.get("[data-game-id='short']").then(([block]: JQuery<HTMLElement>) => {
			expect(overflowing(block!), 'nothing runs past its line').to.equal(false);
			// The matchup and the kickoff are what it keeps whatever it sheds.
			for (const part of block!.querySelectorAll('.guide-bar-team, .guide-bar-time')) expect(box(part).width).to.be.greaterThan(0);
		});
		cy.get("[data-game-id='roomy']").should('not.have.attr', 'data-fit');
		cy.get("[data-game-id='roomy'] .as-crest-box").should('have.length', 2).and('be.visible');
	});

	// A game running well ahead of its slot can leave a block too short even for the bare matchup.
	// That label fades at its end, which reads as more to come rather than as a broken glyph.
	it('fades a label that cannot fit even bare, and still keeps it off the PowerScore', () => {
		mountGrid([live('tight', '2026-09-13T19:05:00Z', {
			league: 'ncaaw', period: 4, clockSeconds: 580,
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'UCLA', score: 108 },
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'CONN', score: 111 },
		})], { powers: { tight: 64 } });
		cy.get('.guide-bar').should('have.attr', 'data-fit', 'faded');
		cy.get('.guide-bar-content').should('not.have.css', 'mask-image', 'none');
		cy.get('.guide-bar').then(([block]: JQuery<HTMLElement>) => {
			expect(box(block!.querySelector('.guide-bar-content')!).right).to.be.at.most(box(block!.querySelector('.guide-bar-value')!).left);
		});
	});

	it('fits a live label beside its PowerScore by shedding its crests', () => {
		mountGrid([live('snug', '2026-09-13T18:20:00Z', {
			league: 'ncaaw', period: 4, clockSeconds: 580,
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'UCLA', score: 108 },
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'CONN', score: 111 },
		})], { powers: { snug: 64 } });
		cy.get('.guide-bar').should('have.attr', 'data-fit', 'no-crests');
		cy.get('.guide-bar').then(([block]: JQuery<HTMLElement>) => {
			expect(overflowing(block!)).to.equal(false);
			expect(box(block!.querySelector('.guide-bar-content')!).right).to.be.at.most(box(block!.querySelector('.guide-bar-value')!).left);
			expect(block!.querySelector('.guide-bar-status')!.getBoundingClientRect().width, 'the clock stays').to.be.greaterThan(0);
		});
	});

	it('shows no hour label that is only partly on screen', () => {
		mountGrid(nflSunday(), { width: 700 });
		cy.get('.guide-scroller').scrollTo(190, 0);
		cy.get('.guide-ruler-label[data-clipped]').should('have.length.at.least', 1);
		cy.get('.guide-scroller').should(([scroller]: JQuery<HTMLElement>) => {
			const view = box(scroller!);
			for (const label of scroller!.querySelectorAll<HTMLElement>('.guide-ruler-label:not([data-clipped])')) {
				const labelBox = box(label);
				expect(labelBox.left).to.be.at.least(view.left + gutterPx - 0.5);
				expect(labelBox.right).to.be.at.most(view.right + 0.5);
			}
		});
	});

	// The now line is behind the blocks and never over the column naming the leagues.
	it('draws the now line under the league column', () => {
		// Two leagues, so there is a rule between them for the line to leak through.
		mountGrid([bar('early', 'nfl', '2026-09-13T17:00:00Z'), bar('late', 'nba', '2026-09-14T02:00:00Z')], { width: 600 });
		cy.get('.guide-now').then(([line]: JQuery<HTMLElement>) => {
			const scroller = line!.closest('.guide-scroller') as HTMLElement;
			const canvas = line!.closest('.guide-canvas')!;
			// Parked halfway across the gutter, which is where the line sits once the grid is scrolled
			// a little past the present.
			const canvasX = box(line!).left - box(canvas).left;
			scroller.scrollLeft = canvasX - gutterPx / 2;
			line!.parentElement!.style.pointerEvents = 'auto';
			line!.style.pointerEvents = 'auto';
			const lineBox = box(line!);
			const view = box(scroller);
			expect(lineBox.left - view.left, 'the line is under the gutter').to.be.closeTo(gutterPx / 2, 2);
			const hit = document.elementFromPoint(lineBox.left + 1, lineBox.top + 40);
			expect(hit, 'something is drawn there').to.not.equal(null);
			expect(hit!.closest('.guide-league'), 'the league column is on top').to.not.equal(null);
			// The rule under a league belongs to the group, so in the plot the line runs over it. Under
			// the gutter, the gutter cell reaches down over the group's rule with an opaque copy of its
			// own. Asserted on the boxes, since hit-testing snaps to whole pixels and cannot see a gap
			// this thin.
			const group = document.querySelector('.guide-group')!;
			const league = group.querySelector('.guide-league')!;
			expect(box(league).bottom, 'the gutter covers the group rule').to.be.closeTo(box(group).bottom, 0.01);
			expect(getComputedStyle(league).borderBottomWidth).to.equal('1px');
			expect(getComputedStyle(league).backgroundColor).to.not.match(/rgba\(.*, 0\)$/);
		});
	});

	it('fills the width it is given on a short day', () => {
		cy.viewport(1600, 800);
		cy.mount(
			<div className='guide-page'>
				<div className='guide-scroller'>
					<GuideGrid bars={[bar('only', 'nfl', '2026-09-14T00:00:00Z')]} band={null} leagueLogos={{}} now={null} minPlotPx={1600 - gutterPx} onOpen={() => {}} />
				</div>
			</div>,
		);
		cy.get('.guide-canvas').invoke('outerWidth').should('be.at.least', 1600);
		// And no further: a label hung off the last hour would widen the scroll past the day's end.
		cy.get('.guide-scroller').should(([scroller]: JQuery<HTMLElement>) => {
			expect(scroller!.scrollWidth).to.equal(scroller!.querySelector<HTMLElement>('.guide-canvas')!.offsetWidth);
		});
	});

	it('marks the game the drawer is showing', () => {
		cy.mount(
			<div className='guide-page'>
				<div className='guide-scroller'>
					<GuideGrid bars={[bar('a', 'nfl', '2026-09-13T17:00:00Z'), bar('b', 'nfl', '2026-09-13T17:00:00Z')]} band={null} leagueLogos={{}} now={null} selectedGameId='b' onOpen={() => {}} />
				</div>
			</div>,
		);
		cy.get("[data-selected='true']").should('have.length', 1).and('have.attr', 'data-game-id', 'b');
		cy.get("[data-selected='true'] .guide-bar-shape").should('have.css', 'border-top-color', 'rgb(247, 92, 3)');
	});

	it('reaches every block from the keyboard, in the order the games start', () => {
		mountGrid([
			bar('late', 'nfl', '2026-09-13T20:25:00Z'),
			bar('early', 'nfl', '2026-09-13T17:00:00Z'),
			bar('overlap', 'nfl', '2026-09-13T18:00:00Z'),
		]);
		cy.get('.guide-bar').then(($blocks: JQuery<HTMLElement>) => {
			expect([...$blocks].map(block => block.dataset.gameId)).to.deep.equal(['early', 'overlap', 'late']);
			for (const block of $blocks) {
				expect(block.tagName).to.equal('BUTTON');
				expect(block.tabIndex).to.equal(0);
			}
		});
		cy.get("[data-game-id='overlap']").focus();
		cy.focused().should('have.attr', 'data-game-id', 'overlap');
	});
});
