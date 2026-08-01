import '../../assets/bootstrap.scss';
import '../../assets/global.scss';
import GameDetailView from '../../entrypoints/popup/components/gameDetailView';
import type { Game } from '@arenaswap/core/types';
import de from '../../locales/de.json';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fr from '../../locales/fr.json';
import ja from '../../locales/ja.json';
import pt from '../../locales/pt.json';
import ptBR from '../../locales/pt_BR.json';
import zhCN from '../../locales/zh_CN.json';

const locales = { de, en, es, fr, ja, pt, pt_BR: ptBR, zh_CN: zhCN };

type CountdownLocale = typeof en;

const worstCaseCountdown = (locale: CountdownLocale): string => {
	const { startsIn, countdownDays, countdownHours, countdownMinutes } = locale.detail;
	const duration = [
		countdownDays.n.replace('$1', '13'),
		countdownHours.n.replace('$1', '23'),
		countdownMinutes.n.replace('$1', '59'),
	].join(' ');
	return startsIn.replace('{duration}', duration);
};

const minuteMs = 60_000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

// Fixed clock so the countdown is deterministic across runs.
const now = new Date('2026-08-01T12:00:00.000Z');

const makePreGame = (msUntilStart: number): Game => ({
	id: 'g1',
	league: 'nba',
	sportType: 'basketball',
	status: 'pre',
	period: 0,
	clockSeconds: 0,
	startTime: new Date(now.getTime() + msUntilStart).toISOString(),
	homeTeam: { id: 'h', name: 'Home', abbreviation: 'HOM', score: 0 },
	awayTeam: { id: 'a', name: 'Away', abbreviation: 'AWY', score: 0 },
});

const mountDetail = (game: Game) => {
	cy.mount(
		<GameDetailView
			game={game}
			excitementResult={undefined}
			scoreHistory={[]}
			powerScoreHistory={[]}
			proTipsEnabled={false}
			gameBoosts={{}}
			bettingPrefs={{ bettingEnabled: false }}
			weatherPrefs={{ temperatureUnit: 'F' }}
			onSetGameBoost={() => {}}
			onBack={() => {}}
		/>,
	);
};

describe('gameDetailView start countdown', () => {
	beforeEach(() => {
		cy.viewport(360, 720);
		cy.clock(now.getTime(), ['Date', 'setTimeout', 'clearTimeout']);
	});

	it('counts down in days, hours and minutes', () => {
		mountDetail(makePreGame(2 * dayMs + 5 * hourMs + 13 * minuteMs));
		cy.get('.game-detail-countdown').should('have.text', 'Starts in 2 days 5 hours 13 minutes');
	});

	it('ticks down as the minute rolls over', () => {
		mountDetail(makePreGame(2 * hourMs + 1 * minuteMs + 30 * 1000));
		cy.get('.game-detail-countdown').should('have.text', 'Starts in 2 hours 1 minute');
		cy.tick(31 * 1000);
		cy.get('.game-detail-countdown').should('have.text', 'Starts in 2 hours 0 minutes');
		cy.tick(60 * 1000);
		cy.get('.game-detail-countdown').should('have.text', 'Starts in 1 hour 59 minutes');
	});

	it('falls back to "Starts soon" inside the final minute', () => {
		mountDetail(makePreGame(45 * 1000));
		cy.get('.game-detail-countdown').should('have.text', 'Starts soon');
	});

	it('falls back to "Starts soon" when no start time is scheduled', () => {
		mountDetail({ ...makePreGame(0), startTime: undefined });
		cy.get('.game-detail-countdown').should('have.text', 'Starts soon');
	});

	it('fits the longest countdown on a single line inside the 320px popup', () => {
		// Widest realistic string: three double-digit segments, all plural.
		mountDetail(makePreGame(13 * dayMs + 23 * hourMs + 59 * minuteMs));
		cy.get('.game-detail-countdown').should(([el]: HTMLElement[]) => {
			const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
			expect(el.scrollWidth, 'no horizontal overflow').to.be.at.most(el.clientWidth);
			expect(el.getBoundingClientRect().height, 'single line').to.be.at.most(lineHeight + 1);
		});
	});

	// The row is only as safe as its longest translation, and German runs ~6 characters
	// past English. Measured in the real element so the check tracks the real styles.
	it('fits the longest countdown in every locale', () => {
		mountDetail(makePreGame(13 * dayMs + 23 * hourMs + 59 * minuteMs));
		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.game-detail-countdown').should(([el]: HTMLElement[]) => {
				el.textContent = worstCaseCountdown(locale);
				const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
				expect(el.getBoundingClientRect().height, `single line in ${name}`).to.be.at.most(lineHeight + 1);
			});
		});
	});
});
