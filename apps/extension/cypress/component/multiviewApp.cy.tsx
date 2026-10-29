import type { Game, MultiviewFrameStatusMessage, MultiviewLineup } from '@arenaswap/core/types';
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

// Boxes on real-looking sites, so the page can tell which share one. Each site answers with a blank page.
const lineupOnSites = (urls: string[]): MultiviewLineup => {
	for (const hostname of new Set(urls.map(url => new URL(url).hostname))) {
		cy.intercept({ hostname }, { headers: { 'content-type': 'text/html' }, body: '<body style="margin:0;background:#1b2a41"></body>' });
	}
	return {
		boxes: urls.map((url, index) => ({ gameId: games[index].id, url })),
		featuredGameId: 'g1',
		games: games.slice(0, urls.length),
	};
};

interface multiviewHandle {
	// One report from the frame named for `gameId`, as the frame script sends it. Resolves to the reply.
	report: (gameId: string, frameId: number, time: number, playing?: boolean, paused?: boolean) => Promise<unknown>;
	// A report from a box's frame that has ended up at `href`, with nothing playing yet.
	land: (gameId: string, frameId: number, href: string) => Promise<unknown>;
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

	const report = (status: Omit<MultiviewFrameStatusMessage, 'type' | 'firstLevel'>, frameId: number) => Promise.all(listeners.map(listener => listener(
		{ type: 'MULTIVIEW_FRAME_STATUS', firstLevel: true, ...status },
		{ tab: { id: multiviewTabId }, frameId },
	))).then(replies => replies.find(reply => reply !== undefined));

	return cy.wrap<multiviewHandle>({
		report: (gameId, frameId, time, playing = true, paused = !playing) => report({ name: gameId, href: '', playing, paused, time }, frameId),
		land: (gameId, frameId, href) => report({ name: gameId, href, playing: false, paused: true, time: 0 }, frameId),
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

const shownBoxes = () => cy.get('.multiview-box');

const offAir = (gameId: string) => cy.get(`[data-game-id="${gameId}"]`).should('have.attr', 'data-on-air', 'false')
	.find('.multiview-off-air').should('not.have.class', 'multiview-off-air-gone');
const onAir = (gameId: string) => cy.get(`[data-game-id="${gameId}"]`).should('have.attr', 'data-on-air', 'true')
	.find('.multiview-off-air').should('have.class', 'multiview-off-air-gone');

// The frame script reports once a second. This plays that out on the stopped clock.
const reportEverySecond = (gameId: string, frameId: number, seconds: number, report: { from: number; advancing: boolean; playing?: boolean; paused?: boolean }) => {
	for (let second = 1; second <= seconds; second++) {
		cy.tick(1000);
		cy.get<multiviewHandle>('@multiview').then(handle => handle.report(gameId, frameId, report.advancing ? report.from + second : report.from, report.playing ?? true, report.paused ?? false));
	}
};

// Exactly one box carries the outline and the speaker, and it is this game's.
const heard = (gameId: string) => {
	cy.get('.multiview-box-audible iframe').should('have.length', 1).and('have.attr', 'name', gameId);
	cy.get('[aria-label="Sound on"]').should('have.length', 1);
	cy.get('.multiview-box-audible [aria-label="Sound on"]').should('have.length', 1);
};

describe('Multiview page', () => {
	it('puts every box in its place at once, each behind its off-air card until its stream plays', () => {
		mountMultiview(lineupOf(3));
		['g1', 'g2', 'g3'].forEach(offAir);
		cy.get('[data-game-id="g1"]').should('have.css', 'grid-column-start', '1');
		cy.get('[data-game-id="g1"] .multiview-off-air-crest').should('have.length', 2);
		cy.get<multiviewHandle>('@multiview').then(handle => handle.report('g1', 11, 5, true).then(() => handle.report('g1', 11, 5, true)));
		// Playing with a clock that never moves is a spinner, not a stream.
		offAir('g1');
		play('g2', 12);
		onAir('g2');
		offAir('g3');
		cy.get('[data-game-id="g2"] .multiview-off-air').should('have.css', 'opacity', '0');
	});

	it('brings the card back while a stream stalls, and takes it away again when it picks up', () => {
		cy.clock(0, ['Date', 'setInterval', 'clearInterval']);
		mountMultiview(lineupOf(2));
		play('g1', 11);
		onAir('g1');
		reportEverySecond('g1', 11, 2, { from: 2, advancing: false });
		onAir('g1');
		reportEverySecond('g1', 11, 2, { from: 2, advancing: false });
		offAir('g1');
		reportEverySecond('g1', 11, 1, { from: 2, advancing: true });
		onAir('g1');
	});

	it('leaves a paused player on show, so whatever it paused for is not hidden', () => {
		cy.clock(0, ['Date', 'setInterval', 'clearInterval']);
		mountMultiview(lineupOf(2));
		play('g1', 11);
		reportEverySecond('g1', 11, 6, { from: 2, advancing: false, playing: false, paused: true });
		onAir('g1');
		// A frame that stops reporting has gone, paused or not.
		cy.tick(4000);
		offAir('g1');
	});

	it('shows a player that never starts after half a minute, in case it is waiting on a click or a sign-in', () => {
		cy.clock(0, ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout']);
		mountMultiview(lineupOf(2));
		cy.get<multiviewHandle>('@multiview').then(handle => handle.report('g2', 12, 0, false));
		cy.tick(29_000);
		offAir('g2');
		cy.tick(2000);
		onAir('g2');
		onAir('g1');
	});

	it('starts boxes on one streaming site one at a time, and a box on another site straight away', () => {
		mountMultiview(lineupOnSites(['https://stream.test/live/mia', 'https://stream.test/live/nyj', 'https://other.test/watch/bos']));
		cy.get('iframe[name="g1"]').should('have.attr', 'src', 'https://stream.test/live/mia');
		cy.get('iframe[name="g3"]').should('have.attr', 'src', 'https://other.test/watch/bos');
		cy.get('[data-game-id="g2"] iframe').should('not.exist');
		offAir('g2');
		play('g1', 11);
		cy.get('iframe[name="g2"]').should('have.attr', 'src', 'https://stream.test/live/nyj');
	});

	it('starts the next box on a site anyway once the one ahead of it has had 15 seconds', () => {
		cy.clock(0, ['Date', 'setInterval', 'clearInterval']);
		mountMultiview(lineupOnSites(['https://stream.test/live/mia', 'https://stream.test/live/nyj']));
		cy.tick(14_000);
		cy.get('[data-game-id="g2"] iframe').should('not.exist');
		cy.tick(1000);
		cy.get('iframe[name="g2"]').should('have.attr', 'src', 'https://stream.test/live/nyj');
	});

	it('reloads a box once when its site moves it onto another box\'s game', () => {
		mountMultiview(lineupOnSites(['https://stream.test/live/mia', 'https://other.test/watch/nyj']));
		cy.get('iframe[name="g2"]').then($first => {
			cy.get<multiviewHandle>('@multiview').then(handle => handle.land('g2', 12, 'https://stream.test/live/mia'));
			cy.get('iframe[name="g2"]').should($second => expect($second[0]).not.to.equal($first[0]))
				.and('have.attr', 'src', 'https://other.test/watch/nyj');
		});
		cy.get('iframe[name="g2"]').then($second => {
			cy.get<multiviewHandle>('@multiview').then(handle => handle.land('g2', 13, 'https://stream.test/live/mia'));
			cy.wait(500);
			cy.get('iframe[name="g2"]').should($third => expect($third[0]).to.equal($second[0]));
		});
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

	it('slides a box from its old place into its new one', () => {
		mountMultiview(lineupOf(3));
		['g1', 'g2', 'g3'].forEach((gameId, index) => play(gameId, 11 + index));
		shownBoxes().should('have.length', 3);

		cy.get<multiviewHandle>('@multiview').then(handle => handle.update(lineupOf(3, 'g3')));
		cy.get('[data-game-id="g3"]').should($moving => {
			expect(getComputedStyle($moving[0]).transform).not.to.equal('none');
		});
		cy.get('.multiview-grid').then($grid => {
			cy.get('[data-game-id="g3"]').should($settled => {
				expect(getComputedStyle($settled[0]).transform).to.equal('none');
				expect($settled[0].getBoundingClientRect().left).to.be.closeTo($grid[0].getBoundingClientRect().left, 1);
			});
		});
	});

	it('marks the box you can hear, and moves the mark with the sound', () => {
		mountMultiview(lineupOf(3));
		['g1', 'g2', 'g3'].forEach((gameId, index) => play(gameId, 11 + index));
		heard('g1');
		cy.get('.multiview-box-audible').should($box => {
			expect(getComputedStyle($box[0], '::after').borderTopWidth).to.equal('3px');
			expect(getComputedStyle($box[0], '::after').opacity).to.equal('1');
		});

		cy.get<multiviewHandle>('@multiview').then(handle => handle.update(lineupOf(3, 'g3')));
		heard('g3');
	});

	it('says it is closed when the background did not open it', () => {
		mountMultiview(null);
		cy.get('.multiview-empty').should('contain.text', 'This Multiview is closed');
		cy.get('.multiview-backdrop').should('exist');
	});

	it('leaves the middle of the loop to the boxes once there are any', () => {
		mountMultiview(lineupOf(2));
		cy.get('.multiview-glow').should('have.length', 1);
		cy.get('.multiview-mark').should('have.class', 'multiview-mark-gone');
	});
});
