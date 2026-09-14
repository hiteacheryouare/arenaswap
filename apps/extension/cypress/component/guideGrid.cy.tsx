import type { Game, LeagueId } from '@arenaswap/core/types';
import GuideGrid from '../../entrypoints/guide/guideGrid';
import { buildBar, buildHeatCurve, type guideBar } from '../../entrypoints/guide/guideHeat';
import { gutterPx } from '../../entrypoints/guide/guideLayout';
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

const lightness = (element: HTMLElement): number => {
	const [r, g, b] = getComputedStyle(element).backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number);
	return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

const nflSunday = (): guideBar[] => [
	...Array.from({ length: 6 }, (_, i) => bar(`early-${i}`, 'nfl', '2026-09-13T17:00:00Z')),
	...Array.from({ length: 3 }, (_, i) => bar(`late-${i}`, 'nfl', '2026-09-13T20:25:00Z')),
	bar('nba-1', 'nba', '2026-09-14T00:00:00Z'),
];

const mountGrid = (bars: guideBar[], showBand = true, width = 1280, nowValue: number | null = now) => {
	cy.viewport(width, 800);
	const { band } = buildHeatCurve(bars, { weightFavorites: true, favoriteBonusPoints: 10 });
	cy.mount(
		<div className='guide-page'>
			<div className='guide-scroller'>
				<GuideGrid bars={bars} band={showBand ? band : null} leagueLogos={{}} now={nowValue} onOpen={cy.stub().as('onOpen')} />
			</div>
		</div>,
	);
};

describe('the guide grid', () => {
	it('draws one bar per game', () => {
		mountGrid(nflSunday());
		cy.get('.guide-bar').should('have.length', 10);
	});

	it('carries both teams on every bar', () => {
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z')]);
		cy.get('.guide-bar').first().within(() => {
			cy.get('.guide-crest-disc').should('have.length', 2);
			cy.get('.guide-bar-team').should('have.length', 2);
		});
	});

	// One league logo per group header, not one per row: fifteen NFL rows do not need fifteen
	// shields.
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
		cy.get('.guide-bar').click();
		cy.get('@onOpen').should('have.been.calledOnceWith', 'only');
	});

	// The band is the one thing on the page that can be turned off.
	it('hides the band when it is switched off, and shows it when it is not', () => {
		mountGrid(nflSunday(), true);
		cy.get('.guide-band').should('exist');
		mountGrid(nflSunday(), false);
		cy.get('.guide-band').should('not.exist');
	});

	// A game that is on right now is the answer to the question the page asks, so it reads before the
	// rest of the grid. Asserted off the computed style rather than off a class name, since a class
	// that stops being applied would pass a name check — and by luminance rather than by inequality,
	// because a live bar that came out darker would satisfy 'different' while reading as recessive.
	it('lifts a live game off the scheduled ones rather than drawing it the same grey', () => {
		mountGrid([
			bar('scheduled', 'nfl', '2026-09-14T01:00:00Z'),
			bar('live', 'nfl', '2026-09-13T19:00:00Z', { status: 'in' }),
		]);
		// Addressed by status rather than by position: the grid sorts a group by kickoff, so the live
		// game is the first bar in the DOM and an index would be comparing the pair the wrong way round.
		cy.get("[data-status='in']").then(([live]: JQuery<HTMLElement>) => {
			cy.get("[data-status='pre']").then(([scheduled]: JQuery<HTMLElement>) => {
				expect(lightness(live!), 'the live bar').to.be.greaterThan(lightness(scheduled!));
				expect(getComputedStyle(live!).borderColor).to.not.equal(getComputedStyle(scheduled!).borderColor);
			});
		});
		// The dot is the part that does not depend on colour, so it has to actually be there.
		cy.get('.guide-bar-live').should('have.length', 1);
	});


	it('gives a favourite game the same fill as any other', () => {
		mountGrid([
			bar('plain', 'nfl', '2026-09-13T17:00:00Z'),
			bar('mine', 'nfl', '2026-09-13T17:00:00Z', {}, true),
		]);
		cy.get('.guide-bar').then(([first, second]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(second!).backgroundColor).to.equal(getComputedStyle(first!).backgroundColor);
		});
		// The star is the only thing distinguishing it, and it has to actually be there — otherwise
		// the assertion above is measuring two identical bars and proving nothing.
		cy.get('.guide-bar-star').should('have.length', 1);
	});

	// A finished game keeps its place so the day keeps its shape, but it is dimmed.
	it('dims a finished game without recolouring it', () => {
		mountGrid([
			bar('live', 'nfl', '2026-09-13T19:00:00Z', { status: 'in' }),
			bar('done', 'nfl', '2026-09-13T13:00:00Z', { status: 'post' }),
		]);
		cy.get(".guide-bar[data-status='post']").should('have.length', 1).then(([final]: JQuery<HTMLElement>) => {
			expect(parseFloat(getComputedStyle(final!).opacity)).to.be.lessThan(1);
		});
	});

	it('puts the now line where now is, between the bars that have started and those that have not', () => {
		mountGrid([
			bar('started', 'nfl', '2026-09-13T17:00:00Z'),
			bar('later', 'nfl', '2026-09-13T23:00:00Z'),
		]);
		cy.get('.guide-now').then(([line]: JQuery<HTMLElement>) => {
			const x = line!.getBoundingClientRect().left;
			cy.get('.guide-bar').then(([started, later]: JQuery<HTMLElement>) => {
				expect(started!.getBoundingClientRect().left).to.be.lessThan(x);
				expect(later!.getBoundingClientRect().left).to.be.greaterThan(x);
			});
		});
	});

	// The reason the scale is fixed and the grid scrolls: at any smaller scale a short bar cannot
	// hold two crests and a matchup, which is what a row has to be readable as.
	it('keeps every bar wide enough to read a matchup off', () => {
		mountGrid(nflSunday());
		cy.get('.guide-bar').each(($bar: JQuery<HTMLElement>) => {
			expect($bar[0]!.getBoundingClientRect().width).to.be.greaterThan(200);
		});
	});

	// Team colour is two hairlines at the ends rather than a fill: at 22px tall a filled bar is a
	// colour swatch you cannot read a matchup off.
	it('carries each team colour as a rail at its own end of the bar', () => {
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z')]);
		cy.get('.guide-bar').first().then(([element]: JQuery<HTMLElement>) => {
			const away = getComputedStyle(element, '::before').backgroundColor;
			const home = getComputedStyle(element, '::after').backgroundColor;
			expect(away).to.not.equal(home);
			for (const rail of [away, home]) {
				expect(rail).to.match(/^rgba?\(/);
				expect(rail).to.not.equal('rgba(0, 0, 0, 0)');
			}
		});
	});

	// Both fixture colours are navies. Drawn raw they would be indistinguishable from the #0d1117
	// page, which is the whole reason the pair is resolved through the lightening climb.
	it('lifts a navy off the background rather than drawing it raw', () => {
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z')]);
		cy.get('.guide-bar').first().then(([element]: JQuery<HTMLElement>) => {
			for (const pseudo of ['::before', '::after']) {
				const [r, g, b] = getComputedStyle(element, pseudo).backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number);
				const luminance = (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255;
				expect(luminance, `${pseudo} clears the page background`).to.be.greaterThan(0.12);
			}
		});
	});

	// A navy or black crest straight on #0d1117 is an empty box beside an abbreviation doing all the
	// work, which is what the tinted disc exists for.
	it('sits the league mark on a disc, and leaves a readable team crest bare', () => {
		mountGrid(nflSunday());
		// A team crest is drawn in its own colours with nothing behind it, and only takes the plate
		// when its ink is measured as failing to stand off the bar. The league mark is always plated.
		cy.get('.guide-bar').first().find('.guide-crest-disc').should('have.length', 2);
		cy.get('.guide-bar').first().find('.guide-crest-disc.is-bare').should('have.length', 2);
		cy.get('.guide-league-disc').should('have.length', 2);
		cy.get('.guide-league-disc').first().then(([disc]: JQuery<HTMLElement>) => {
			const backing = getComputedStyle(disc).backgroundColor;
			expect(backing).to.not.equal('rgba(0, 0, 0, 0)');
			const [r, g, b] = backing.match(/\d+/g)!.slice(0, 3).map(Number);
			expect((0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255, 'the disc is a light plate').to.be.greaterThan(0.5);
		});
	});

	// Visible rather than merely present: the old hairline resolved to #171C22 against a #0D1117 page,
	// which is a rule a width assertion passes and an eye cannot find.
	it('rules off each row so the eye can carry a time across the grid', () => {
		mountGrid(nflSunday());
		cy.get('.guide-row').first().then(([row]: JQuery<HTMLElement>) => {
			expect(parseFloat(getComputedStyle(row).borderBottomWidth)).to.be.greaterThan(0);
			const [r, g, b] = getComputedStyle(row).borderBottomColor.match(/\d+/g)!.slice(0, 3).map(Number);
			const rule = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
			// The page is #0d1117, whose same measure is 16.1.
			expect(rule, 'the hairline reads against the page').to.be.greaterThan(26);
		});
	});

	// Every day but today is drawn with no present moment, because it does not have one. A line
	// labelled 'now' sitting in the middle of next Tuesday is worse than no line.
	it('draws no now line on a day that is not today', () => {
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z')], true, 1280, null);
		cy.get('.guide-now').should('not.exist');
		// Paired with the positive case, so the absence above is the prop rather than a broken mount.
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z')]);
		cy.get('.guide-now').should('exist');
	});

	it('opens its first hour label fully on screen rather than half cut off', () => {
		mountGrid(nflSunday());
		cy.get('.guide-ruler-mark').first().find('.guide-ruler-label').then(([label]: JQuery<HTMLElement>) => {
			const track = label.closest('.guide-ruler-track')!.getBoundingClientRect();
			expect(label.getBoundingClientRect().left).to.be.at.least(track.left - 1);
		});
	});

	// The tick is the thing the hour is actually read off, and it has to sit on the gridline drawn for
	// the same hour. Centring it on the label — which is what it used to do — put the first one about
	// 20px right of its own line, because the first label is the one that cannot be centred.
	it('lands every hour tick on its own gridline, including the first', () => {
		mountGrid(nflSunday());
		cy.get('.guide-gridline').then(($lines: JQuery<HTMLElement>) => {
			const lines = [...$lines].map(line => line.getBoundingClientRect().left);
			cy.get('.guide-ruler-mark').then(($marks: JQuery<HTMLElement>) => {
				expect($marks.length).to.equal(lines.length);
				[...$marks].forEach((mark, index) => {
					expect(mark.getBoundingClientRect().left, `hour ${index}`).to.be.closeTo(lines[index]!, 1);
				});
			});
		});
	});

	// A league is a column the bars scroll underneath rather than a heading in a gap, so the name has
	// to stay put while the grid moves under it.
	it('keeps the league name on screen at any horizontal scroll position', () => {
		mountGrid(nflSunday(), true, 500);
		cy.get('.guide-scroller').scrollTo(600, 0);
		cy.get('.guide-league').first().then(([gutter]: JQuery<HTMLElement>) => {
			const scroller = gutter.closest('.guide-scroller')!.getBoundingClientRect();
			expect(gutter.getBoundingClientRect().left).to.be.closeTo(scroller.left, 1);
			expect(gutter.getBoundingClientRect().width).to.equal(gutterPx);
		});
	});

	it('renders nothing at all rather than an empty axis when there are no games', () => {
		mountGrid([]);
		cy.get('.guide-canvas').should('not.exist');
	});

	// A guide scrolled to now has most of the afternoon off to the left, so a bar that started
	// earlier is the ordinary case rather than an edge one. Without the pinning those rows show the
	// tail of a bar with the matchup scrolled out of sight — a row reading 'PHI' and nothing else.
	it('keeps the matchup on screen when the bar starts left of the viewport', () => {
		// Narrow enough that a single NFL bar overflows it, which is what makes the scroller scroll.
		mountGrid([bar('early', 'nfl', '2026-09-13T17:00:00Z')], true, 400);
		// Past the gutter as well as past the viewport: at 220 the bar's own start is still on screen.
		cy.get('.guide-scroller').scrollTo(340, 0);
		cy.get('.guide-bar').first().then(([element]: JQuery<HTMLElement>) => {
			const barBox = element.getBoundingClientRect();
			const content = element.querySelector('.guide-bar-content')!.getBoundingClientRect();
			const scroller = element.closest('.guide-scroller')!.getBoundingClientRect();
			// The bar itself has been scrolled off to the left...
			expect(barBox.left).to.be.lessThan(scroller.left);
			// ...and its content has come to rest against the league gutter rather than under it.
			expect(content.left).to.be.at.least(scroller.left + gutterPx - 1);
			expect(content.right).to.be.at.most(barBox.right + 1);
		});
	});

	// The pinning must not push content out of a bar whose right edge has arrived: sticky is bounded
	// by its containing block, and this is the assertion that says so rather than assuming it.
	it('stops pinning at the end of the bar rather than dragging the label past it', () => {
		mountGrid([bar('early', 'nfl', '2026-09-13T17:00:00Z')], true, 400);
		cy.get('.guide-scroller').scrollTo('right');
		cy.get('.guide-bar').first().then(([element]: JQuery<HTMLElement>) => {
			const barBox = element.getBoundingClientRect();
			const content = element.querySelector('.guide-bar-content')!.getBoundingClientRect();
			expect(content.right).to.be.at.most(barBox.right + 1);
			expect(content.left).to.be.at.least(barBox.left - 1);
		});
	});
});
