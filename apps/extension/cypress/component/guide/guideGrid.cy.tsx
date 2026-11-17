import type { Game, LeagueId } from '@arenaswap/core/types';
import GuideGrid from '../../../entrypoints/guide/guideGrid';
import { buildBar, buildHeatCurve, type guideBar } from '../../../entrypoints/guide/guideHeat';
import { gutterPx } from '../../../entrypoints/guide/guideLayout';
import { makeGame } from '../../support/fixtures';

const fontFace = ($el: JQuery<HTMLElement>) => getComputedStyle($el[0]!).fontFamily.split(',')[0]!.replace(/["']/g, '');

const now = new Date('2026-09-13T20:00:00Z').getTime();

const bar = (id: string, league: LeagueId, startTime: string, overrides: Partial<Game> = {}, isFavorite = false): guideBar => {
	const game = makeGame(id, {
		league,
		sportType: league === 'nfl' ? 'football' : 'basketball',
		status: 'pre',
		startTime,
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

	it('names each league once however many games it has', () => {
		mountGrid(nflSunday());
		cy.get('.guide-league').should('have.length', 2);
		cy.get('.guide-league-label').then(($labels: JQuery<HTMLElement>) => {
			expect([...$labels].map(l => l.textContent)).to.deep.equal(['NBA', 'NFL']);
		});
	});

	it('opens the game it was clicked on', () => {
		mountGrid([bar('only', 'nfl', '2026-09-13T17:00:00Z')]);
		cy.get('.guide-bar-shape').click();
		cy.get('@onOpen').should('have.been.calledOnceWith', 'only');
	});

	it('hides the band when it is switched off, and shows it when it is not', () => {
		mountGrid(nflSunday(), true);
		cy.get('.guide-band').should('exist');
		mountGrid(nflSunday(), false);
		cy.get('.guide-band').should('not.exist');
	});

	it('lifts a live game off the scheduled ones rather than drawing it the same grey', () => {
		mountGrid([
			bar('scheduled', 'nfl', '2026-09-14T01:00:00Z'),
			bar('live', 'nfl', '2026-09-13T19:00:00Z', { status: 'in' }),
		]);
		cy.get("[data-status='in'] .guide-bar-shape").then(([live]: JQuery<HTMLElement>) => {
			cy.get("[data-status='pre'] .guide-bar-shape").then(([scheduled]: JQuery<HTMLElement>) => {
				expect(lightness(live!), 'the live bar').to.be.greaterThan(lightness(scheduled!));
				expect(getComputedStyle(live!).borderColor).to.not.equal(getComputedStyle(scheduled!).borderColor);
			});
		});
		cy.get('.guide-bar-live').should('have.length', 1);
	});

	it('gives a favourite game the same fill as any other', () => {
		mountGrid([
			bar('plain', 'nfl', '2026-09-13T17:00:00Z'),
			bar('mine', 'nfl', '2026-09-13T17:00:00Z', {}, true),
		]);
		cy.get('.guide-bar-shape').then(([first, second]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(second!).backgroundColor).to.equal(getComputedStyle(first!).backgroundColor);
		});
		cy.get('.guide-bar-star').should('have.length', 1);
	});

	it('sinks a finished game below the live one without fading its crests', () => {
		mountGrid([
			bar('live', 'nfl', '2026-09-13T19:00:00Z', { status: 'in' }),
			bar('done', 'nfl', '2026-09-13T13:00:00Z', { status: 'post' }),
		]);
		cy.get("[data-status='post'] .guide-bar-shape").then(([final]: JQuery<HTMLElement>) => {
			cy.get("[data-status='in'] .guide-bar-shape").then(([live]: JQuery<HTMLElement>) => {
				expect(lightness(final!)).to.be.lessThan(lightness(live!));
			});
		});
		cy.get("[data-status='post'] .guide-crest-disc").each(($crest: JQuery<HTMLElement>) => {
			let element: HTMLElement | null = $crest[0]!;
			while (element) {
				expect(parseFloat(getComputedStyle(element).opacity)).to.equal(1);
				element = element.parentElement;
			}
		});
	});

	it('reads a live game as a scoreboard: both scores and where the game is', () => {
		mountGrid([bar('live', 'nfl', '2026-09-13T19:00:00Z', {
			status: 'in', period: 2, clockSeconds: 312,
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'KC', score: 14 },
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'LAC', score: 13 },
		})]);
		cy.get('.guide-bar-score').then(($scores: JQuery<HTMLElement>) => {
			expect([...$scores].map(score => score.textContent)).to.deep.equal(['14', '13']);
		});
		cy.get('.guide-bar-status').should('have.text', 'Q2 • 5:12');
		cy.get('.guide-bar-at').should('not.exist');
	});

	it('sets only a live bar\'s running clock in Lekton', () => {
		mountGrid([bar('live', 'nfl', '2026-09-13T19:00:00Z', { status: 'in', period: 2, clockSeconds: 312 })]);
		cy.get('.guide-bar-status').should($el => expect(fontFace($el), 'the period').to.not.equal('Lekton'));
		cy.get('.guide-bar-status .game-status-clock').should('have.text', '5:12').and($el => expect(fontFace($el), 'the clock').to.equal('Lekton'));
	});

	it('prints a final with the loser receded, as the final card does', () => {
		mountGrid([bar('done', 'nfl', '2026-09-13T13:00:00Z', {
			status: 'post', finalPeriodSuffix: 'OT',
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'BUF', score: 31 },
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'MIA', score: 10 },
		})]);
		cy.get('.guide-bar-status').should('have.text', 'Final/OT');
		cy.get('.guide-bar-side.is-loser').should('have.length', 1).and('contain.text', 'MIA');
		cy.contains('.guide-bar-side', 'BUF').find('.guide-bar-score').then(([winner]: JQuery<HTMLElement>) => {
			cy.contains('.guide-bar-side', 'MIA').find('.guide-bar-score').then(([loser]: JQuery<HTMLElement>) => {
				expect(getComputedStyle(loser!).color).to.not.equal(getComputedStyle(winner!).color);
			});
		});
	});

	it('dims neither side of a level final', () => {
		mountGrid([bar('draw', 'nfl', '2026-09-13T13:00:00Z', {
			status: 'post',
			awayTeam: { id: 'a', name: 'Away', abbreviation: 'ARS', score: 2 },
			homeTeam: { id: 'h', name: 'Home', abbreviation: 'LIV', score: 2 },
		})]);
		cy.get('.guide-bar-side.is-loser').should('not.exist');
	});

	it('gives a scheduled game its kickoff and its network instead of a 0–0', () => {
		mountGrid([bar('later', 'nfl', '2026-09-14T00:20:00Z', { broadcasts: ['NBC', 'Peacock'] })]);
		cy.get('.guide-bar-score').should('not.exist');
		cy.get('.guide-bar-time').should('exist');
		cy.get('.guide-bar-at').should('exist');
		cy.get('.guide-bar-network').should('have.text', 'NBC');
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

	it('keeps every bar wide enough to read a matchup off', () => {
		mountGrid(nflSunday());
		cy.get('.guide-bar-shape').each(($bar: JQuery<HTMLElement>) => {
			expect($bar[0]!.getBoundingClientRect().width).to.be.greaterThan(200);
		});
	});

	it('carries each team colour as a rail at its own end of the bar', () => {
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z')]);
		cy.get('.guide-bar-shape').first().then(([element]: JQuery<HTMLElement>) => {
			const away = getComputedStyle(element, '::before').backgroundColor;
			const home = getComputedStyle(element, '::after').backgroundColor;
			expect(away).to.not.equal(home);
			for (const rail of [away, home]) {
				expect(rail).to.match(/^rgba?\(/);
				expect(rail).to.not.equal('rgba(0, 0, 0, 0)');
			}
		});
	});

	it('draws each edge in the team\'s published colour, visitor on the left', () => {
		const orange = { id: 'a-a', name: 'Away', abbreviation: 'AWY', score: 0, color: '#FB4F14' };
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z', { awayTeam: orange })]);
		cy.get('.guide-bar-shape').first().then(([element]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(element, '::before').backgroundColor).to.equal('rgb(251, 79, 20)');
			expect(getComputedStyle(element, '::after').backgroundColor).to.equal('rgb(0, 34, 68)');
		});
	});

	it('puts the host on the left edge for soccer', () => {
		const orange = { id: 'a-a', name: 'Away', abbreviation: 'AWY', score: 0, color: '#FB4F14' };
		mountGrid([bar('a', 'epl', '2026-09-13T17:00:00Z', { sportType: 'soccer', awayTeam: orange })]);
		cy.get('.guide-bar-shape').first().then(([element]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(element, '::before').backgroundColor).to.equal('rgb(0, 34, 68)');
		});
		cy.get('.guide-bar-team').first().should('have.text', 'HOM');
	});

	it('sits the league mark on a disc, and leaves a readable team crest bare', () => {
		mountGrid(nflSunday());
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

	it('rules off each row so the eye can carry a time across the grid', () => {
		mountGrid(nflSunday());
		cy.get('.guide-row').first().then(([row]: JQuery<HTMLElement>) => {
			expect(parseFloat(getComputedStyle(row).borderBottomWidth)).to.be.greaterThan(0);
			const [r, g, b] = getComputedStyle(row).borderBottomColor.match(/\d+/g)!.slice(0, 3).map(Number);
			const rule = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
			expect(rule, 'the hairline reads against the page').to.be.greaterThan(26);
		});
	});

	it('draws no now line on a day that is not today', () => {
		mountGrid([bar('a', 'nfl', '2026-09-13T17:00:00Z')], true, 1280, null);
		cy.get('.guide-now').should('not.exist');
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

	it('keeps the matchup on screen when the bar starts left of the viewport', () => {
		mountGrid([bar('early', 'nfl', '2026-09-13T17:00:00Z')], true, 400);
		cy.get('.guide-scroller').scrollTo(340, 0);
		cy.get('.guide-bar').first().then(([element]: JQuery<HTMLElement>) => {
			const barBox = element.querySelector('.guide-bar-shape')!.getBoundingClientRect();
			const content = element.querySelector('.guide-bar-content')!.getBoundingClientRect();
			const scroller = element.closest('.guide-scroller')!.getBoundingClientRect();
			expect(barBox.left).to.be.lessThan(scroller.left);
			expect(content.left).to.be.at.least(scroller.left + gutterPx - 1);
			expect(content.right).to.be.at.most(barBox.right + 1);
		});
	});

	it('keeps a label beside the league column after its bar has scrolled away', () => {
		mountGrid([bar('early', 'nfl', '2026-09-13T17:00:00Z'), bar('late', 'nfl', '2026-09-14T02:00:00Z')], true, 600);
		cy.get('.guide-scroller').scrollTo('right');
		cy.get("[data-game-id='early']").then(([element]: JQuery<HTMLElement>) => {
			const shape = element.querySelector('.guide-bar-shape')!.getBoundingClientRect();
			const content = element.querySelector('.guide-bar-content')!.getBoundingClientRect();
			const scroller = element.closest('.guide-scroller')!.getBoundingClientRect();
			expect(shape.right, 'the bar itself is gone').to.be.lessThan(scroller.left + gutterPx);
			expect(content.left).to.be.closeTo(scroller.left + gutterPx, 1);
			expect(content.width).to.be.greaterThan(100);
		});
	});

	it('lets a bar go once its pinned label no longer fits in what is left of it', () => {
		mountGrid([bar('early', 'nfl', '2026-09-13T17:00:00Z'), bar('late', 'nfl', '2026-09-14T02:00:00Z')], true, 600);
		cy.get("[data-game-id='early']").should('not.have.attr', 'data-cut');
		cy.get('.guide-scroller').scrollTo('right');
		cy.get("[data-game-id='early']").should('have.attr', 'data-cut');
		cy.get("[data-game-id='early'] .guide-bar-shape").should('have.css', 'opacity', '0');
		cy.get("[data-game-id='early'] .guide-bar-content").should('be.visible');
	});

	it('shows no hour label that is only partly on screen', () => {
		mountGrid(nflSunday(), true, 700);
		cy.get('.guide-scroller').scrollTo(190, 0);
		cy.get('.guide-ruler-label[data-clipped]').should('have.length.at.least', 1);
		cy.get('.guide-scroller').should(([scroller]: JQuery<HTMLElement>) => {
			const view = scroller!.getBoundingClientRect();
			for (const label of scroller!.querySelectorAll<HTMLElement>('.guide-ruler-label:not([data-clipped])')) {
				const box = label.getBoundingClientRect();
				expect(box.left).to.be.at.least(view.left + gutterPx - 0.5);
				expect(box.right).to.be.at.most(view.right + 0.5);
			}
		});
	});

	it('draws the now line under the league column', () => {
		mountGrid([bar('early', 'nfl', '2026-09-13T17:00:00Z'), bar('late', 'nba', '2026-09-14T02:00:00Z')], true, 600);
		cy.get('.guide-now').then(([line]: JQuery<HTMLElement>) => {
			const scroller = line!.closest('.guide-scroller') as HTMLElement;
			const canvas = line!.closest('.guide-canvas')!;
			const canvasX = line!.getBoundingClientRect().left - canvas.getBoundingClientRect().left;
			scroller.scrollLeft = canvasX - gutterPx / 2;
			// elementFromPoint skips anything the pointer passes through, which the overlay is built to be.
			line!.parentElement!.style.pointerEvents = 'auto';
			line!.style.pointerEvents = 'auto';
			const box = line!.getBoundingClientRect();
			const view = scroller.getBoundingClientRect();
			expect(box.left - view.left, 'the line is under the gutter').to.be.closeTo(gutterPx / 2, 2);
			const hit = document.elementFromPoint(box.left + 1, box.top + 40);
			expect(hit, 'something is drawn there').to.not.equal(null);
			expect(hit!.closest('.guide-league'), 'the league column is on top').to.not.equal(null);
			const group = document.querySelectorAll('.guide-group')[1]!;
			const league = group.querySelector('.guide-league')!;
			expect(league.getBoundingClientRect().top, 'the rule is inside the gutter cell').to.be.closeTo(group.getBoundingClientRect().top, 0.01);
			expect(getComputedStyle(league).borderTopWidth).to.equal('1px');
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
	});
});
