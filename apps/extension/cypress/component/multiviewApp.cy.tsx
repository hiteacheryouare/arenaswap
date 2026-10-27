import type { Game, MultiviewLineup } from '@arenaswap/core/types';
import App from '../../entrypoints/multiview/app';
import { makeGame } from '../support/fixtures';
import '../../assets/multiview.scss';

const multiviewTabId = 50;

const team = (id: string, abbreviation: string, color: string) => ({ id, name: abbreviation, abbreviation, score: 0, color });

const games: Game[] = [
	makeGame('g1', { league: 'nfl', sportType: 'football', awayTeam: team('mia', 'MIA', '#008E97'), homeTeam: team('bal', 'BAL', '#241773') }),
	makeGame('g2', { league: 'nfl', sportType: 'football', awayTeam: team('nyj', 'NYJ', '#125740'), homeTeam: team('cle', 'CLE', '#FF3C00') }),
	makeGame('g3', { league: 'nhl', sportType: 'hockey', awayTeam: team('bos', 'BOS', '#FFB81C'), homeTeam: team('tor', 'TOR', '#00205B') }),
	makeGame('g4', { league: 'nba', sportType: 'basketball', awayTeam: team('lal', 'LAL', '#552583'), homeTeam: team('gsw', 'GSW', '#1D428A') }),
];

// A page per box, each its own colour, so a failure screenshot shows which box went where.
const streamPage = (label: string, color: string) => `data:text/html,${encodeURIComponent(
	`<body style="margin:0;display:grid;place-items:center;height:100vh;background:${color};color:#fff;font:600 32px system-ui">${label}</body>`,
)}`;

const lineupOf = (count: number, featuredGameId = 'g1'): MultiviewLineup => ({
	boxes: games.slice(0, count).map((game, index) => ({ gameId: game.id, url: streamPage(game.awayTeam.abbreviation, ['#1b2a41', '#3a1f2b', '#1f3a2b', '#2b2b3a'][index]) })),
	featuredGameId,
	games: games.slice(0, count),
});

interface multiviewHandle {
	// One report from the frame named for `gameId`, as the frame script sends it. Resolves to the reply.
	report: (gameId: string, frameId: number, time: number, playing?: boolean) => Promise<unknown>;
	update: (lineup: MultiviewLineup) => void;
	sent: { type: string;[key: string]: unknown }[];
	mutes: { frameId: number; muted: boolean }[];
}

const mountMultiview = (lineup: MultiviewLineup | null) => {
	cy.viewport(1280, 720);
	const listeners: ((message: unknown, sender: unknown) => unknown)[] = [];
	const sent: multiviewHandle['sent'] = [];
	const mutes: multiviewHandle['mutes'] = [];

	(window as unknown as Record<string, unknown>).browser = {
		runtime: {
			sendMessage: (message: { type: string }) => {
				sent.push(message);
				return Promise.resolve(message.type === 'GET_MULTIVIEW' ? lineup : undefined);
			},
			onMessage: {
				addListener: (listener: (message: unknown, sender: unknown) => unknown) => { listeners.push(listener); },
				removeListener: (listener: (message: unknown, sender: unknown) => unknown) => {
					listeners.splice(listeners.indexOf(listener), 1);
				},
			},
		},
		tabs: {
			getCurrent: () => Promise.resolve({ id: multiviewTabId }),
			sendMessage: (_tabId: number, message: { muted: boolean }, { frameId }: { frameId: number }) => {
				mutes.push({ frameId, muted: message.muted });
				return Promise.resolve();
			},
		},
		webNavigation: { getFrame: () => Promise.resolve(null) },
		i18n: { getUILanguage: () => 'en-US' },
	};

	// The page's own index.html zeroes these. The component runner's does not.
	document.documentElement.style.margin = '0';
	document.body.style.margin = '0';
	cy.mount(<App />);
	// The frame listener goes up once the page knows its tab, which is when the boxes first render.
	if (lineup) cy.get('.multiview-box').should('have.length', lineup.boxes.length);

	return cy.wrap<multiviewHandle>({
		report: (gameId, frameId, time, playing = true) => Promise.all(listeners.map(listener => listener(
			{ type: 'MULTIVIEW_FRAME_STATUS', name: gameId, firstLevel: true, playing, time },
			{ tab: { id: multiviewTabId }, frameId },
		))).then(replies => replies.find(reply => reply !== undefined)),
		update: next => listeners.forEach(listener => listener({ type: 'MULTIVIEW_UPDATED', tabId: multiviewTabId, ...next }, {})),
		sent,
		mutes,
	}, { log: false }).as('multiview');
};

// Two reports with the clock moving between them, which is what counts as playing.
const play = (gameId: string, frameId: number) => cy.get<multiviewHandle>('@multiview').then(async handle => {
	await handle.report(gameId, frameId, 1);
	await handle.report(gameId, frameId, 2);
});

const shownBoxes = () => cy.get('.multiview-box:not(.multiview-box-staged)');

describe('Multiview page', () => {
	it('keeps every box out of sight until its stream is actually playing', () => {
		mountMultiview(lineupOf(3));
		cy.get('.multiview-box-staged').should('have.length', 3);
		cy.get<multiviewHandle>('@multiview').then(handle => handle.report('g1', 11, 5, true).then(() => handle.report('g1', 11, 5, true)));
		// Playing with a clock that never moves is a spinner, not a stream.
		cy.get('.multiview-box-staged').should('have.length', 3);
		play('g2', 12);
		shownBoxes().should('have.length', 1);
		cy.get('.multiview-box-staged').should('have.length', 2).and('have.attr', 'aria-hidden', 'true');
	});

	it('tells the background which streams play, and gives the sound to the big box only', () => {
		mountMultiview(lineupOf(3));
		play('g1', 11);
		play('g2', 12);
		cy.get<multiviewHandle>('@multiview').should(handle => {
			expect(handle.sent.filter(message => message.type === 'MULTIVIEW_READY').at(-1)).to.deep.equal({ type: 'MULTIVIEW_READY', gameIds: ['g1', 'g2'] });
		});
		cy.get<multiviewHandle>('@multiview').then(async handle => {
			expect(await handle.report('g1', 11, 3)).to.deep.equal({ muted: false });
			expect(await handle.report('g2', 12, 3)).to.deep.equal({ muted: true });
		});
	});

	it('lays four boxes out as one big box with three 16:9 pictures stacked beside it, all inside the window', () => {
		mountMultiview(lineupOf(4));
		['g1', 'g2', 'g3', 'g4'].forEach((gameId, index) => play(gameId, 11 + index));
		shownBoxes().should('have.length', 4);

		cy.get('.multiview-grid').then($grid => {
			const grid = $grid[0].getBoundingClientRect();
			expect(grid.right).to.be.at.most(1280.5);
			expect(grid.bottom).to.be.at.most(720.5);
		});
		cy.get('iframe[name="g1"]').then($big => {
			cy.get('iframe[name="g2"]').then($small => {
				const big = $big[0].getBoundingClientRect();
				const small = $small[0].getBoundingClientRect();
				expect(small.width / small.height).to.be.closeTo(16 / 9, 0.02);
				// Four games: the big box is three columns and two gaps wide, with three stacked beside it.
				expect(big.width).to.be.closeTo(small.width * 3 + 8, 1);
				expect(big.top).to.be.closeTo(small.top, 1);
			});
		});
		cy.document().then(doc => {
			expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
			expect(doc.documentElement.scrollHeight).to.be.at.most(doc.documentElement.clientHeight);
		});
		cy.get('.multiview-bar').first().should('contain.text', 'MIA').and('contain.text', 'BAL');
	});

	it('moves the big box to a new leader without reloading a single stream', () => {
		mountMultiview(lineupOf(3));
		['g1', 'g2', 'g3'].forEach((gameId, index) => play(gameId, 11 + index));
		shownBoxes().should('have.length', 3);

		cy.get('iframe[name="g3"]').then($before => {
			cy.get<multiviewHandle>('@multiview').then(handle => handle.update(lineupOf(3, 'g3')));
			cy.get('iframe[name="g3"]').closest('.multiview-box').should('have.css', 'grid-column-start', '1');
			cy.get('iframe[name="g3"]').should($after => expect($after[0]).to.equal($before[0]));
		});
		cy.get<multiviewHandle>('@multiview').should(handle => {
			expect(handle.mutes.filter(mute => !mute.muted).map(mute => mute.frameId).at(-1)).to.equal(13);
		});
	});

	it('says what it is for when the background did not open it', () => {
		mountMultiview(null);
		cy.get('.multiview-empty').should('contain.text', 'Multiview opens by itself');
	});
});
