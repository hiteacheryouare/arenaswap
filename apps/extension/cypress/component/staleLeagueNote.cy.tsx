import { useState } from 'react';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import { translateFrom, TranslationContext } from '@arenaswap/ui/src/components/i18nContext';
import { StaleLeaguesProvider } from '@arenaswap/ui/src/components/staleLeagueNote';
import type { Game, LeagueId, LeagueLastGoodAt, PowerScoreResult } from '@arenaswap/core/types';
import de from '../../locales/de.json';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fil from '../../locales/fil.json';
import fr from '../../locales/fr.json';
import itLocale from '../../locales/it.json';
import ja from '../../locales/ja.json';
import ko from '../../locales/ko.json';
import ptBR from '../../locales/pt_BR.json';
import ptPT from '../../locales/pt_PT.json';
import zhCN from '../../locales/zh_CN.json';
import zhTW from '../../locales/zh_TW.json';

const locales = { de, en, es, fil, fr, it: itLocale, ja, ko, pt_BR: ptBR, pt_PT: ptPT, zh_CN: zhCN, zh_TW: zhTW };

const popupWidth = 320;
const minute = 60_000;
// Ages are written a few seconds past the minute, since the card reads its clock in whole seconds.
const past = 5_000;

const game: Game = {
	id: 'g1',
	status: 'in',
	league: 'nba',
	sportType: 'basketball',
	period: 3,
	clockSeconds: 421,
	homeTeam: { id: 'h', name: 'Los Angeles Lakers', abbreviation: 'LAL', score: 88 },
	awayTeam: { id: 'a', name: 'Boston Celtics', abbreviation: 'BOS', score: 91 },
	venueName: 'Crypto.com Arena',
};

const result: PowerScoreResult = {
	gameId: 'g1', total: 64, closeness: 10, lateGame: 8, momentum: 6,
	leadChanges: 4, comeback: 0, favoriteBonus: 0, favoriteTeamCount: 0,
	stalled: false, reason: 'Close game',
};

const cardProps = {
	game,
	excitementResult: result,
	favoriteTeamIds: new Set<string>(),
	onToggleFavoriteTeam: () => {},
	onOpenGameDetail: () => {},
	bettingPrefs: { bettingEnabled: false },
};

// What the extension's own translator does with a locale file: a plural object picks a form by
// count and fills $1. The shared card only knows the one-pipe-other string shape.
const translatorFor = (bundle: Record<string, unknown>) => translateFrom(key => {
	const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], bundle);
	if (typeof value === 'string') return value;
	const forms = value as { 1?: string; n?: string } | undefined;
	return forms?.n === undefined ? undefined : `${forms['1']} | ${forms.n}`;
});

interface MountOptions {
	shed?: LeagueId[];
	lastGoodAt?: LeagueLastGoodAt;
	bundle?: Record<string, unknown>;
}

const mountCard = ({ shed = ['nba'], lastGoodAt = { nba: Date.now() - (7 * minute) - past }, bundle = en }: MountOptions = {}) => {
	cy.viewport(popupWidth, 520);
	cy.mount(
		<TranslationContext.Provider value={translatorFor(bundle)}>
			<StaleLeaguesProvider shedLeagues={shed} lastGoodAt={lastGoodAt}>
				<div style={{ width: `${popupWidth}px` }}>
					<LiveGameCard {...cardProps} />
				</div>
			</StaleLeaguesProvider>
		</TranslationContext.Provider>,
	);
};

const staleLine = () => cy.get('.bi-clock-history').parent();

describe('a live card whose league stopped answering', () => {
	it('says how long ago the score was last good', () => {
		mountCard();
		staleLine().should('have.text', 'Last updated 7 minutes ago');
	});

	it('uses the singular for one minute and its own line for less than one', () => {
		mountCard({ lastGoodAt: { nba: Date.now() - (minute + 5_000) } });
		staleLine().should('have.text', 'Last updated 1 minute ago');
		mountCard({ lastGoodAt: { nba: Date.now() - 20_000 } });
		staleLine().should('have.text', 'Last updated less than a minute ago');
	});

	it('is absent while the league is answering', () => {
		mountCard({ shed: [] });
		cy.get('.bi-clock-history').should('not.exist');
		cy.contains('LIVE').should('exist');
	});

	it('is absent when only some other league is refused', () => {
		mountCard({ shed: ['nhl'], lastGoodAt: { nba: Date.now() - (7 * minute) - past, nhl: Date.now() - (9 * minute) } });
		cy.get('.bi-clock-history').should('not.exist');
	});

	it('is absent for a refused league with no good poll to count from', () => {
		mountCard({ lastGoodAt: {} });
		cy.get('.bi-clock-history').should('not.exist');
	});

	it('is absent where nothing provides stale leagues, as on the website', () => {
		cy.mount(<LiveGameCard {...cardProps} />);
		cy.get('.bi-clock-history').should('not.exist');
	});

	it('goes away on the next good poll', () => {
		const Poll = () => {
			const [shed, setShed] = useState<LeagueId[]>(['nba']);
			const [lastGoodAt] = useState<LeagueLastGoodAt>(() => ({ nba: Date.now() - (7 * minute) - past }));
			return (
				<StaleLeaguesProvider shedLeagues={shed} lastGoodAt={lastGoodAt}>
					<LiveGameCard {...cardProps} />
					<button onClick={() => setShed([])}>good poll</button>
				</StaleLeaguesProvider>
			);
		};
		cy.mount(<Poll />);
		staleLine().should('contain.text', '7 minutes');
		cy.contains('button', 'good poll').click();
		cy.get('.bi-clock-history').should('not.exist');
	});

	it('keeps counting while the popup stays open', () => {
		cy.clock(Date.now());
		mountCard({ lastGoodAt: { nba: Date.now() - (59 * 1_000) } });
		staleLine().should('have.text', 'Last updated less than a minute ago');
		cy.tick(minute);
		staleLine().should('have.text', 'Last updated 1 minute ago');
		cy.tick(4 * minute);
		staleLine().should('have.text', 'Last updated 5 minutes ago');
	});

	it('keeps the rest of the card as it was', () => {
		mountCard();
		cy.contains('LIVE').should('exist');
		cy.get('.game-card').should('have.css', 'opacity', '1');
		cy.get('.game-card [role="progressbar"]').should('exist');
	});

	describe('in every locale', () => {
		it('fits on one line inside the popup', () => {
			for (const [code, bundle] of Object.entries(locales)) {
				for (const age of [0, 1, 12, 135]) {
					mountCard({ bundle, lastGoodAt: { nba: Date.now() - (age * minute) - 1_000 } });
					staleLine().then(([line]) => {
						const box = line.getBoundingClientRect();
						const lineHeight = parseFloat(getComputedStyle(line).lineHeight) || box.height;
						expect(box.height, `${code} at ${age} minutes`).to.be.at.most(lineHeight * 1.5);
						expect(box.right, `${code} at ${age} minutes`).to.be.at.most(popupWidth);
					});
				}
			}
		});

		it('reads German with its own plural', () => {
			mountCard({ bundle: de, lastGoodAt: { nba: Date.now() - (12 * minute) - past } });
			staleLine().should('have.text', 'Zuletzt aktualisiert vor 12 Minuten');
		});
	});
});
