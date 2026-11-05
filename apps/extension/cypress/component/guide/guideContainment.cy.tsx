import { createDefaultUserPreferences, createFavoriteTeamKey } from '@arenaswap/core/constants';
import type { Game, GuideSlate } from '@arenaswap/core/types';
import { computeGameProgress } from '@arenaswap/core';
import App from '../../../entrypoints/guide/app';
import { resolveRunMinutes } from '../../../entrypoints/guide/guideHeat';
import { inEveryLocale, shippedLocales, withLocale, type shippedLocale } from '../../support/safetyNet/locales';
import { slateOf, worstCaseGames, worstTeams } from '../../support/safetyNet/worstCase';
import '../../../assets/guide.scss';

const now = Date.parse('2026-10-11T20:45:40Z');
const hour = 60 * 60_000;
const guidePage = '.guide-page';
const containment = { scrollers: ['.guide-scroller'] };

const at = (ms: number) => new Date(ms).toISOString();

// Each worst-case game three ways, so a bar is checked live, upcoming and final.
const fullSlate = (): { games: Game[]; endTimes: Record<string, number> } => {
	const games: Game[] = [];
	const endTimes: Record<string, number> = {};
	for (const { game } of worstCaseGames) {
		const elapsedMs = computeGameProgress(game) * resolveRunMinutes(game).bar * 60_000;
		games.push({ ...game, id: `${game.id}-live`, startTime: at(now - elapsedMs) });
		games.push({ ...game, id: `${game.id}-pre`, status: 'pre', period: 0, clockSeconds: 0, startTime: at(now + 2 * hour), broadcasts: ['ESPN+', 'Scripps Sports', 'Prime Video (Local)'] });
		games.push({ ...game, id: `${game.id}-post`, status: 'post', period: 4, clockSeconds: 0, startTime: at(now - 5 * hour) });
		endTimes[`${game.id}-post`] = now - 2 * hour;
	}
	return { games, endTimes };
};

const storageArea = (values: Record<string, unknown>) => ({
	get: () => Promise.resolve({ ...values }),
	set: () => Promise.resolve(),
	onChanged: { addListener: () => {}, removeListener: () => {} },
});

const mountGuide = (locale: shippedLocale, games: Game[], endTimes: Record<string, number> = {}, width = 1280) => {
	cy.clock(now, ['Date', 'setInterval', 'clearInterval']);
	cy.viewport(width, 800);

	const favorites = [createFavoriteTeamKey('ncaamh', worstTeams.longIsland.id), createFavoriteTeamKey('nba', worstTeams.celtics.id)];
	const prefs = { ...createDefaultUserPreferences(), favoriteTeamIds: favorites };
	const slate: GuideSlate = { games, leagueLogos: {}, monoLogos: {}, gameBoosts: {}, endTimes };
	(window as unknown as Record<string, unknown>).browser = {
		runtime: {
			sendMessage: (message: { type: string }) => Promise.resolve(message.type === 'GET_GUIDE_SLATE' ? slate : undefined),
			onMessage: { addListener: () => {}, removeListener: () => {} },
		},
		i18n: { getUILanguage: () => locale.tag },
		storage: { sync: storageArea({ prefs, prefsUpdatedAt: 0 }), local: storageArea({ prefs: null, prefsUpdatedAt: 0 }) },
	};
	cy.mount(withLocale(locale, <App />));
};

describe('the guide stays inside its page', () => {
	const { games, endTimes } = fullSlate();

	for (const locale of shippedLocales) {
		it(`holds the header, the grid and every bar (${locale.folder})`, () => {
			mountGuide(locale, games, endTimes);
			cy.get('.guide-bar').should('have.length', games.length);
			cy.get(guidePage).assertContained(containment);
		});
	}

	inEveryLocale('holds the detail drawer for the longest names', locale => {
		mountGuide(locale, games, endTimes);
		cy.get(`[data-game-id="worst-longest-names-live"] .guide-bar-content`).click();
		cy.get('.guide-drawer').should('exist');
		cy.get(guidePage).assertContained(containment);
	});

	it('holds the page in a narrow browser window', () => {
		mountGuide(shippedLocales.find(locale => locale.folder === 'de')!, games, endTimes, 720);
		cy.get('.guide-bar').should('have.length', games.length);
		cy.get(guidePage).assertContained(containment);
	});

	it('holds the page with 65 games on one day', () => {
		const busiest = slateOf(65).map(game => ({ ...game, startTime: at(now - computeGameProgress(game) * resolveRunMinutes(game).bar * 60_000) }));
		mountGuide(shippedLocales[1]!, busiest);
		cy.get('.guide-bar').should('have.length', 65);
		cy.get(guidePage).assertContained(containment);
	});
});
