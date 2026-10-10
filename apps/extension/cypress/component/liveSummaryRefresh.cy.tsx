import * as echarts from 'echarts/core';
import GameDetailChartCanvas from '../../entrypoints/popup/components/gameDetailChartCanvas';
import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import useSummaryData from '../../entrypoints/popup/components/useSummaryData';
import { clearSharedRequests } from '../../entrypoints/popup/components/summaryFetch';
import { MockGameSimulator, pollWinProbabilityMs } from '@arenaswap/core';
import type { Game } from '@arenaswap/core/types';
import { mockBoxScorePayloads } from '../../entrypoints/popup/components/mockBoxScores';
import en from '../../locales/en.json';

const seededGames = new MockGameSimulator().seed();
const demoGame = (id: string): Game => ({ ...seededGames.find(candidate => candidate.id === id)!, id: '401000005' });

const live = demoGame('mock-5');
const summaryUrl = /\/summary\?event=401000005/;

const line = (...values: number[]) => ({ winprobability: values.map(homeWinPercentage => ({ homeWinPercentage })) });

const LineProbe = ({ game }: { game: Game }) => {
	const { winProbability } = useSummaryData(game);
	return <output data-testid='line'>{winProbability.join(',')}</output>;
};

const probe = (game: Game) => <LineProbe game={game} />;

const detail = (game: Game) => (
	<GameDetailView
		game={game}
		excitementResult={undefined}
		scoreHistory={[]}
		powerScoreHistory={[]}
		proTipsEnabled={false}
		gameBoosts={{}}
		bettingPrefs={{ bettingEnabled: false }}
		weatherPrefs={{ temperatureUnit: 'F' }}
		decorationPrefs={{ holidayDecorationsEnabled: false, holidaySnowEnabled: false, holidayLightsEnabled: false, holidayLeavesEnabled: false }}
		favoriteTeamIds={new Set<string>()}
		openTabs={[] as never}
		registry={[]}
		onToggleFavoriteTeam={() => {}}
		onRegistryChange={() => {}}
		formatTabLabel={() => ''}
		onSetGameBoost={() => {}}
		onBack={() => {}}
	/>
);

const withBox = (body: object) => ({ ...(mockBoxScorePayloads['mock-5'] as object), ...body });
const passingYards = (from: string, to: string) => (
	JSON.parse(JSON.stringify(mockBoxScorePayloads['mock-5']).replace(`"${from}"`, `"${to}"`)) as object
);

const seriesLength = ($canvas: JQuery<HTMLElement>) => {
	const chart = echarts.getInstanceByDom($canvas[0]!.closest('.game-detail-chart-canvas') as HTMLElement)!;
	return (chart.getOption().series as { data: unknown[] }[])[0]!.data.length;
};

const tickOnePoll = () => cy.tick(pollWinProbabilityMs);

describe('the detail screen following a live game', () => {
	beforeEach(() => {
		clearSharedRequests();
		cy.viewport(320, 560);
		// Only the interval and the clock are faked: the summary itself still travels through the real
		// network stack, so a slow answer can be raced against a fast one.
		cy.clock(Date.now(), ['Date', 'setInterval', 'clearInterval']);
		cy.intercept({ url: /\/standings\?level=3/ }, { body: {} });
	});

	it('asks again every poll and redraws the line from the newer answer', () => {
		let answered = 0;
		cy.intercept({ url: summaryUrl }, req => {
			answered += 1;
			req.reply({ body: answered === 1 ? line(0.5, 0.55) : line(0.5, 0.55, 0.7) });
		}).as('summary');
		cy.mount(probe(live));
		cy.get('[data-testid=line]').should('have.text', '0.5,0.55');
		tickOnePoll();
		cy.get('[data-testid=line]').should('have.text', '0.5,0.55,0.7');
		cy.get('@summary.all').should('have.length', 2);
	});

	it('does not ask before the poll has passed', () => {
		cy.intercept({ url: summaryUrl }, { body: line(0.5) }).as('summary');
		cy.mount(probe(live));
		cy.get('[data-testid=line]').should('have.text', '0.5');
		cy.tick(pollWinProbabilityMs - 1);
		cy.get('@summary.all').should('have.length', 1);
	});

	it('never asks again for a game that is over', () => {
		cy.intercept({ url: summaryUrl }, { body: line(0.5, 1) }).as('summary');
		cy.mount(probe({ ...live, status: 'post' }));
		cy.get('[data-testid=line]').should('have.text', '0.5,1');
		cy.tick(pollWinProbabilityMs * 3);
		cy.get('@summary.all').should('have.length', 1);
	});

	it('stops asking once the game ends', () => {
		cy.intercept({ url: summaryUrl }, { body: line(0.5, 1) }).as('summary');
		cy.mount(probe(live)).then(({ rerender }) => {
			cy.get('[data-testid=line]').should('have.text', '0.5,1');
			cy.then(() => rerender(probe({ ...live, status: 'post' })));
		});
		// The status change is its own request, because the final answer is not the live one.
		cy.get('@summary.all').should('have.length', 2);
		cy.tick(pollWinProbabilityMs * 3);
		cy.get('@summary.all').should('have.length', 2);
	});

	it('skips a poll while the page is hidden and carries on when it is back', () => {
		cy.intercept({ url: summaryUrl }, { body: line(0.5) }).as('summary');
		cy.mount(probe(live));
		cy.get('[data-testid=line]').should('have.text', '0.5');
		cy.document().then(doc => {
			Object.defineProperty(doc, 'hidden', { configurable: true, get: () => true });
		});
		tickOnePoll();
		cy.get('@summary.all').should('have.length', 1);
		cy.document().then(doc => {
			Object.defineProperty(doc, 'hidden', { configurable: true, get: () => false });
		});
		tickOnePoll();
		cy.get('@summary.all').should('have.length', 2);
	});

	it('stops asking when the screen is left', () => {
		cy.intercept({ url: summaryUrl }, { body: line(0.5) }).as('summary');
		cy.mount(probe(live));
		cy.get('[data-testid=line]').should('have.text', '0.5');
		cy.mount(<div />);
		cy.tick(pollWinProbabilityMs * 3);
		cy.get('@summary.all').should('have.length', 1);
	});

	it('keeps the line it has when a refresh fails', () => {
		let answered = 0;
		cy.intercept({ url: summaryUrl }, req => {
			answered += 1;
			req.reply(answered === 1 ? { body: line(0.5, 0.6) } : { statusCode: 503, body: {} });
		}).as('summary');
		cy.mount(probe(live));
		cy.get('[data-testid=line]').should('have.text', '0.5,0.6');
		tickOnePoll();
		cy.get('@summary.all').should('have.length', 2);
		cy.wait(200);
		cy.get('[data-testid=line]').should('have.text', '0.5,0.6');
	});

	it('picks the next answer back up after a failed one', () => {
		let answered = 0;
		cy.intercept({ url: summaryUrl }, req => {
			answered += 1;
			if (answered === 2) req.reply({ statusCode: 503, body: {} });
			else req.reply({ body: answered === 1 ? line(0.5) : line(0.5, 0.9) });
		}).as('summary');
		cy.mount(probe(live));
		cy.get('[data-testid=line]').should('have.text', '0.5');
		tickOnePoll();
		cy.get('@summary.all').should('have.length', 2);
		tickOnePoll();
		cy.get('[data-testid=line]').should('have.text', '0.5,0.9');
	});

	it('keeps the line through the empty answer sent during a delay', () => {
		let answered = 0;
		cy.intercept({ url: summaryUrl }, req => {
			answered += 1;
			req.reply({ body: answered === 1 ? line(0.5, 0.6) : line() });
		}).as('summary');
		cy.mount(probe(live));
		cy.get('[data-testid=line]').should('have.text', '0.5,0.6');
		tickOnePoll();
		cy.get('@summary.all').should('have.length', 2);
		cy.wait(200);
		cy.get('[data-testid=line]').should('have.text', '0.5,0.6');
	});

	it('drops a slow answer that lands after a newer one', () => {
		let answered = 0;
		cy.intercept({ url: summaryUrl }, req => {
			answered += 1;
			if (answered === 1) req.reply({ body: line(0.5) });
			else if (answered === 2) req.reply({ body: line(0.5, 0.1), delay: 600 });
			else req.reply({ body: line(0.5, 0.1, 0.9) });
		}).as('summary');
		cy.mount(probe(live));
		cy.get('[data-testid=line]').should('have.text', '0.5');
		tickOnePoll();
		cy.get('@summary.all').should('have.length', 2);
		tickOnePoll();
		cy.get('[data-testid=line]').should('have.text', '0.5,0.1,0.9');
		cy.wait(900);
		cy.get('[data-testid=line]').should('have.text', '0.5,0.1,0.9');
	});

	describe('on the screen itself', () => {
		it('leaves the open tab where the reader put it', () => {
			cy.intercept({ url: summaryUrl }, { body: withBox(line(0.5, 0.6)) }).as('summary');
			cy.mount(detail(live));
			cy.get(`#gd-tab-${live.id}-box`).click();
			cy.get('.gd-tabs .nav-link.active').should('have.text', en.box.heading);
			tickOnePoll();
			cy.get('@summary.all').should('have.length', 2);
			cy.get('.gd-tabs .nav-link.active').should('have.text', en.box.heading);
			cy.get('.tab-pane.active').should('have.id', `gd-pane-${live.id}-box`);
		});

		it('shows the new numbers in the box score the reader is on', () => {
			let answered = 0;
			cy.intercept({ url: summaryUrl }, req => {
				answered += 1;
				req.reply({ body: answered === 1 ? withBox({}) : passingYards('213', '287') });
			}).as('summary');
			cy.mount(detail(live));
			cy.get(`#gd-tab-${live.id}-box`).click();
			cy.get('.tab-pane.active').should('contain.text', '213').and('not.contain.text', '287');
			tickOnePoll();
			cy.get('.tab-pane.active').should('contain.text', '287').and('not.contain.text', '213');
			cy.get('.gd-tabs .nav-link.active').should('have.text', en.box.heading);
		});

		it('keeps the Box tab, and its numbers, through an answer that carries no box score', () => {
			let answered = 0;
			cy.intercept({ url: summaryUrl }, req => {
				answered += 1;
				req.reply({ body: answered === 1 ? withBox(line(0.5)) : line(0.5, 0.6) });
			}).as('summary');
			cy.mount(detail(live));
			cy.get(`#gd-tab-${live.id}-box`).click();
			cy.get('.tab-pane.active').should('contain.text', '213');
			tickOnePoll();
			cy.get('@summary.all').should('have.length', 2);
			cy.wait(200);
			cy.get('.gd-tabs .nav-link.active').should('have.text', en.box.heading);
			cy.get('.tab-pane.active').should('contain.text', '213');
		});
	});
});

const introMs = 1200;

const chartOption = (points: number) => ({
	animationDuration: introMs,
	animationDurationUpdate: introMs,
	grid: { left: 0, right: 0, top: 0, bottom: 0 },
	xAxis: { type: 'category' as const, data: Array.from({ length: points }, (_, index) => index), show: false },
	yAxis: { type: 'value' as const, min: 0, max: 1, show: false },
	series: [{
		type: 'line' as const,
		data: Array.from({ length: points }, (_, index) => 0.3 + 0.4 * Math.abs(Math.sin(index / 3))),
		lineStyle: { width: 6, color: '#f00' },
		showSymbol: false,
	}],
});

const paintedPixels = (canvas: HTMLCanvasElement) => {
	const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
	let painted = 0;
	for (let index = 3; index < data.length; index += 4) if (data[index]! > 0) painted += 1;
	return painted;
};

describe('the chart canvas taking a new point', () => {
	it('keeps the drawn line on screen rather than replaying the intro', () => {
		const view = (points: number) => (
			<div style={{ width: 300, height: 200 }}>
				<GameDetailChartCanvas option={chartOption(points) as never} />
			</div>
		);
		let before = 0;
		cy.mount(view(20)).then(({ rerender }) => {
			cy.get('canvas').should($canvas => {
				expect(paintedPixels($canvas[0] as HTMLCanvasElement)).to.be.greaterThan(1000);
			});
			cy.wait(introMs + 300);
			cy.get('canvas').then($canvas => {
				before = paintedPixels($canvas[0] as HTMLCanvasElement);
				rerender(view(21));
			});
		});
		cy.get('canvas').should($canvas => expect(seriesLength($canvas)).to.equal(21));
		// `then`, not `should`: a retry would wait out the update and pass on the finished line.
		cy.get('canvas').then($canvas => {
			expect(paintedPixels($canvas[0] as HTMLCanvasElement)).to.be.greaterThan(before * 0.8);
		});
	});
});
