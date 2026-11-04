import { extensionUrl, expectHealthyBackground, openPage, play, startExtension, world } from '../../support/liveExtension';
import type { liveWorld } from '../../support/liveExtension';
import { gameIds, slate, storedPrefs } from '../../support/liveGames';

// Multiview opened by the shipped worker when two or more registered games are exciting at once,
// and the page it opens laying those games out, one box per game tab. The frame script that runs
// inside each box cannot run here, so each box's reports are sent as that script sends them.

const wnbaTab = 2;
const nhlTab = 3;
const eplTab = 4;

// The two basketball and hockey streams are on one streaming site; the soccer is on another.
const streams = {
	wnba: 'https://stream.test/live/wnba',
	nhl: 'https://stream.test/live/nhl',
	epl: 'https://other.test/watch/epl',
};

const tabs = [
	{ id: 1, url: 'https://news.test/', title: 'News' },
	{ id: wnbaTab, url: streams.wnba, title: 'Liberty at Dream' },
	{ id: nhlTab, url: streams.nhl, title: 'Hurricanes at Flyers' },
	{ id: eplTab, url: streams.epl, title: 'Leeds at Arsenal' },
];

const tied = { wnba: { home: 79, away: 79 }, nhl: {}, epl: {} };

const boot = () => {
	for (const hostname of ['stream.test', 'other.test']) {
		cy.intercept({ hostname }, { headers: { 'content-type': 'text/html' }, body: '<body style="margin:0;background:#1b2a41"></body>' });
	}
	startExtension({
		tabs,
		local: { onboardingCompleted: true, multiviewOnboardingDone: true },
		sync: storedPrefs({ enabledLeagues: ['wnba', 'nhl', 'epl'], multiviewEnabled: true }),
		session: { tabRegistry: [{ tabId: wnbaTab, gameId: gameIds.wnba }, { tabId: nhlTab, gameId: gameIds.nhl }, { tabId: eplTab, gameId: gameIds.epl }] },
		permissionsGranted: true,
		events: slate(tied),
	});
};

const multiviewTabId = (live: liveWorld) => live.created.find(tab => tab.url === extensionUrl('/multiview.html'))?.id;

const openMultiview = () => {
	boot();
	play(30_000);
	world().should(live => {
		expect(multiviewTabId(live), 'Multiview tab').to.be.a('number');
		expect(live.activeTabId()).to.equal(multiviewTabId(live));
	});
	world().then(live => openPage('/multiview.html', multiviewTabId(live)));
};

// Two reports with the player's clock moving between them, which is what the page counts as playing.
const plays = (gameId: string, frameId: number, href: string) => world().then(async live => {
	const tabId = multiviewTabId(live)!;
	await live.frameReport(tabId, frameId, { name: gameId, href, playing: true, paused: false, time: 1 });
	return live.frameReport(tabId, frameId, { name: gameId, href, playing: true, paused: false, time: 2 });
});

describe('Multiview', () => {
	afterEach(expectHealthyBackground);

	it('opens on the exciting registered games and says so', () => {
		boot();
		play(30_000);
		world().should(live => {
			expect(live.activeTabId(), 'tab in front').to.equal(multiviewTabId(live));
			expect(live.notifications.at(-1)).to.deep.include({ title: 'Switched → Multiview' });
		});
	});

	it('gives each game its own box showing that game\'s tab, and starts one box per site at a time', () => {
		openMultiview();
		cy.get('.multiview-box').should('have.length', 3);
		cy.get(`iframe[name="${gameIds.epl}"]`).should('have.attr', 'src', streams.epl);
		cy.get('iframe[src^="https://stream.test/"]').should('have.length', 1).then($first => {
			const startedId = $first.attr('name')!;
			const waitingId = startedId === gameIds.wnba ? gameIds.nhl : gameIds.wnba;
			cy.get(`[data-game-id="${waitingId}"] iframe`).should('not.exist');

			plays(startedId, 11, $first.attr('src')!);
			cy.get(`iframe[name="${waitingId}"]`).should('have.attr', 'src', waitingId === gameIds.wnba ? streams.wnba : streams.nhl);
		});
	});

	it('gives the sound to the best game only', () => {
		openMultiview();
		cy.get('.multiview-box').should('have.length', 3);
		world().then(live => {
			const best = live.state!.scores.filter(score => Object.values(gameIds).includes(score.gameId)).toSorted((a, b) => b.total - a.total)[0]!.gameId;
			cy.get('.multiview-box-audible').should('have.length', 1).and('have.attr', 'data-game-id', best);
			plays(gameIds.epl, 13, streams.epl).should('deep.equal', { muted: best !== gameIds.epl });
		});
	});

	it('closes and goes to the game\'s own tab once only one game is still exciting', () => {
		openMultiview();
		cy.get('.multiview-box').should('have.length', 3);

		world().then(live => { live.events = slate({ wnba: { home: 79, away: 79, clock: 150 }, nhl: { home: 6, away: 1 }, epl: { home: 5, away: 1 } }); });
		play(60_000);
		world().should(live => {
			expect(live.tab(multiviewTabId(live)!), 'Multiview tab').to.equal(undefined);
			expect(live.activeTabId(), 'tab in front').to.equal(wnbaTab);
		});
	});
});
