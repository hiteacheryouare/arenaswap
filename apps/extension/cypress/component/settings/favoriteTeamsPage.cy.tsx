import { useState } from 'react';
import type { LeagueId } from '@arenaswap/core/types';
import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import FavoriteTeamsPage from '../../../entrypoints/popup/components/favoriteTeamsPage';
import de from '../../../locales/de.json';
import en from '../../../locales/en.json';
import es from '../../../locales/es.json';
import fil from '../../../locales/fil.json';
import fr from '../../../locales/fr.json';
// Not `it` — that would shadow Mocha's global it() and break every test in this file.
import itLocale from '../../../locales/it.json';
import ja from '../../../locales/ja.json';
import ko from '../../../locales/ko.json';
import ptBR from '../../../locales/pt_BR.json';
import ptPT from '../../../locales/pt_PT.json';
import zhCN from '../../../locales/zh_CN.json';
import zhTW from '../../../locales/zh_TW.json';

const locales = { de, en, es, fil, fr, it: itLocale, ja, ko, pt_BR: ptBR, pt_PT: ptPT, zh_CN: zhCN, zh_TW: zhTW };

// The longest league label we ship, so the sublabel is measured at its worst case.
const longestLeague = "Olympic Women's Ice Hockey";

const teamsByLeague: Record<string, [string, string][]> = {
	nba: [['20', 'Philadelphia 76ers'], ['4', 'Chicago Bulls']],
	nhl: [['15', 'Philadelphia Flyers']],
};

// ESPN's /teams envelope, trimmed to the fields fetchTeamsForLeagues reads.
const teamsPayload = (entries: [string, string][]) => ({
	sports: [{
		leagues: [{
			teams: entries.map(([id, displayName]) => ({
				team: { id, displayName, abbreviation: displayName.slice(0, 3).toUpperCase() },
			})),
		}],
	}],
});

// The page calls the real fetchTeamsForLeagues on mount, and a package entry point has no seam for
// the component-stub plugin, so the stub goes on the window — the same approach onboardingView
// takes. Must be installed before mounting, since the fetch fires in the mount effect.
const stubTeamsFetch = (fails = false) => {
	cy.window().then(win => {
		cy.stub(win, 'fetch').callsFake((input: unknown) => {
			if (fails) return Promise.reject(new Error('offline'));

			const url = String(input);
			const leagueId = Object.keys(teamsByLeague).find(id => url.includes(`/${id}/`)) ?? 'nba';
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve(teamsPayload(teamsByLeague[leagueId]!)),
			} as unknown as Response);
		}).as('teamsFetch');
	});
};

interface harnessProps {
	enabledLeagues?: LeagueId[];
	initialFavorites?: string[];
	initialRivals?: string[];
	onToggle?: (leagueId: LeagueId, teamId: string) => void;
	onToggleRival?: (leagueId: LeagueId, teamId: string) => void;
}

const flipped = (set: ReadonlySet<string>, key: string): Set<string> => {
	const next = new Set(set);
	if (next.has(key)) next.delete(key);
	else next.add(key);
	return next;
};

const without = (set: ReadonlySet<string>, key: string): Set<string> => new Set([...set].filter(each => each !== key));

// Both lists live in app.tsx, so this stands in for that owner, including keeping a team on one list.
const Harness = ({ enabledLeagues = ['nba'], initialFavorites = [], initialRivals = [], onToggle, onToggleRival }: harnessProps) => {
	const [favorites, setFavorites] = useState(() => new Set(initialFavorites));
	const [rivals, setRivals] = useState(() => new Set(initialRivals));

	return (
		<div className='popup-container'>
			<FavoriteTeamsPage
				enabledLeagues={enabledLeagues}
				favoriteTeamIds={favorites}
				rivalTeamIds={rivals}
				onToggleFavoriteTeam={(leagueId, teamId) => {
					onToggle?.(leagueId, teamId);
					const key = createFavoriteTeamKey(leagueId, teamId);
					setFavorites(previous => flipped(previous, key));
					setRivals(previous => without(previous, key));
				}}
				onToggleRivalTeam={(leagueId, teamId) => {
					onToggleRival?.(leagueId, teamId);
					const key = createFavoriteTeamKey(leagueId, teamId);
					setRivals(previous => flipped(previous, key));
					setFavorites(previous => without(previous, key));
				}}
			/>
		</div>
	);
};

const mountPage = (props: harnessProps = {}) => {
	stubTeamsFetch();
	cy.mount(<Harness {...props} />);
	cy.get('@teamsFetch').should('have.been.called');
};

describe('favoriteTeamsPage', () => {
	it('lists the enabled leagues teams grouped by league', () => {
		mountPage();

		cy.contains('Philadelphia 76ers').should('exist');
		cy.contains('Chicago Bulls').should('exist');
		cy.get('.popup-section-label').should('have.length', 1).and('have.text', 'NBA');
	});

	it('reports the league and team of a newly starred team', () => {
		mountPage({ onToggle: cy.spy().as('onToggle') });

		cy.get('[aria-label="Add Philadelphia 76ers to favorites"]').click();

		cy.get('@onToggle').should('have.been.calledOnceWith', 'nba', '20');
	});

	it('pins what is already starred above the league groups', () => {
		mountPage({ initialFavorites: ['nba:20'] });

		cy.get('.popup-section-label').first().should('have.text', 'Your Favorites');
		cy.contains('.popup-section-label', 'Your Favorites')
			.next()
			.should('contain', 'Philadelphia 76ers')
			.and('contain', 'NBA');
	});

	it('keeps a favorite whose league is switched off reachable, and says it is not tracked', () => {
		mountPage({ enabledLeagues: ['nba'], initialFavorites: ['nhl:15'] });

		cy.contains('Philadelphia Flyers').should('exist');
		cy.contains('NHL · not tracked').should('exist');
		// The league itself is fetched only to name the favorite, never offered as a group.
		cy.get('.popup-section-label').should('not.contain', 'NHL');
	});

	it('drops a team out of the pinned list when it is unstarred there', () => {
		mountPage({ initialFavorites: ['nba:20'] });

		cy.contains('.popup-section-label', 'Your Favorites').should('exist');
		cy.get('[aria-label="Remove Philadelphia 76ers from favorites"]').first().click();

		cy.contains('.popup-section-label', 'Your Favorites').should('not.exist');
		cy.contains('Philadelphia 76ers').should('exist');
	});

	it('takes the pinned list away while a search is running', () => {
		mountPage({ initialFavorites: ['nba:20'] });

		cy.contains('.popup-section-label', 'Your Favorites').should('exist');
		cy.get('input[type=search]').type('bulls');

		cy.contains('Chicago Bulls').should('exist');
		cy.contains('.popup-section-label', 'Your Favorites').should('not.exist');
	});

	it('shows a starred team once, in its league, while searching', () => {
		mountPage({ initialFavorites: ['nba:20'] });

		cy.get('input[type=search]').type('philadelphia');

		cy.contains('Philadelphia 76ers').should('have.length', 1);
		cy.get('[aria-label="Remove Philadelphia 76ers from favorites"]').should('have.length', 1);
	});

	it('brings the pinned list back when the search is cleared', () => {
		mountPage({ initialFavorites: ['nba:20'] });

		cy.get('input[type=search]').type('bulls');
		cy.contains('.popup-section-label', 'Your Favorites').should('not.exist');

		cy.get('input[type=search]').clear();
		cy.contains('.popup-section-label', 'Your Favorites').should('exist');
	});

	it('says when nothing matches at all', () => {
		mountPage();

		cy.get('input[type=search]').type('nothing here');

		cy.contains('No teams match "nothing here"').should('exist');
	});

	it('fits every locale\'s pinned-section strings in a 320px popup', () => {
		cy.viewport(320, 560);
		mountPage({ enabledLeagues: ['nba'], initialFavorites: ['nhl:15'] });

		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('.popup-section-label').first().should(([el]: JQuery<HTMLElement>) => {
				el.textContent = locale.teamPicker.yourFavorites;
				expect(el.getBoundingClientRect().height, `heading stays one line in ${name}`).to.be.at.most(30);
			});
			cy.get('.setting-explainer').first().then(([el]: JQuery<HTMLElement>) => {
				el.textContent = locale.teamPicker.leagueNotTracked.replace('{league}', longestLeague);
			});
			// The sublabel is free to wrap; what it must not do is widen the row past the popup and
			// push the star off the right edge.
			cy.get('.overflow-auto').should(([el]: JQuery<HTMLElement>) => {
				expect(el.scrollWidth, `list does not scroll sideways in ${name}`).to.be.at.most(el.clientWidth + 1);
			});
		});
	});

	it('opens on Favorites, with Rivals one tab over', () => {
		mountPage();

		cy.get('[role=tab][aria-selected=true]').should('have.text', 'Favorites');
		cy.contains('[role=tab]', 'Rivals').should('have.attr', 'aria-selected', 'false');
		cy.contains('In Blowouts').should('not.exist');
	});

	it('picks a rival with the angry face, and pins it under Your Rivals', () => {
		mountPage({ onToggleRival: cy.spy().as('onToggleRival') });

		cy.contains('[role=tab]', 'Rivals').click();
		cy.contains('In Blowouts, ArenaSwap goes straight to a rival getting blown out.').should('exist');
		cy.get('[aria-label="Add Chicago Bulls to rivals"] .team-pick-rival').should('have.class', 'bi-emoji-angry');
		cy.get('[aria-label="Add Chicago Bulls to rivals"]').click();

		cy.get('@onToggleRival').should('have.been.calledOnceWith', 'nba', '4');
		cy.contains('.popup-section-label', 'Your Rivals').next().should('contain', 'Chicago Bulls');
		cy.get('[aria-label="Remove Chicago Bulls from rivals"] .team-pick-rival').first()
			.should('have.class', 'bi-emoji-angry-fill')
			.and('have.attr', 'data-selected', 'true');
	});

	it('shows a favorite faded on the Rivals tab, and moves it over when picked there', () => {
		mountPage({ initialFavorites: ['nba:20'] });

		cy.contains('[role=tab]', 'Rivals').click();
		cy.get('[aria-label="Add Philadelphia 76ers to rivals"] .bi')
			.should('have.class', 'bi-star-fill')
			.and('have.attr', 'data-other-list', 'true');
		cy.get('[aria-label="Add Philadelphia 76ers to rivals"]').click();
		cy.contains('.popup-section-label', 'Your Rivals').next().should('contain', 'Philadelphia 76ers');

		cy.contains('[role=tab]', 'Favorites').click();
		cy.contains('.popup-section-label', 'Your Favorites').should('not.exist');
		cy.get('[aria-label="Add Philadelphia 76ers to favorites"] .bi').should('have.class', 'bi-emoji-angry-fill');
	});

	it('moves between the tabs with the arrow keys', () => {
		mountPage();

		cy.contains('[role=tab]', 'Favorites').focus().type('{rightArrow}');
		cy.focused().should('have.text', 'Rivals').and('have.attr', 'aria-selected', 'true');
		cy.focused().type('{leftArrow}');
		cy.focused().should('have.text', 'Favorites');
	});

	it('fits every locale\'s tab labels and Rivals explainer in a 320px popup', () => {
		cy.viewport(320, 560);
		mountPage();
		cy.contains('[role=tab]', 'Rivals').click();

		Object.entries(locales).forEach(([name, locale]) => {
			cy.get('[role=tab]').then(tabs => {
				tabs[0]!.textContent = locale.teamPicker.favoritesTab;
				tabs[1]!.textContent = locale.teamPicker.rivalsTab;
			});
			cy.get('[role=tab]').each(([tab]: JQuery<HTMLElement>) => {
				expect(tab.getBoundingClientRect().height, `tab stays one line in ${name}`).to.be.at.most(30);
			});
			cy.get('[role=tabpanel] > .setting-explainer').then(([el]: JQuery<HTMLElement>) => {
				el.textContent = locale.teamPicker.rivalsExplainer;
			});
			cy.get('[role=tabpanel]').should(([el]: JQuery<HTMLElement>) => {
				expect(el.scrollWidth, `explainer does not push the page sideways in ${name}`).to.be.at.most(el.clientWidth + 1);
			});
		});
	});

	it('offers a retry but no way to skip, since settings has nowhere to skip to', () => {
		stubTeamsFetch(true);
		cy.mount(<Harness />);

		cy.contains("Our scouts couldn't get the rosters.").should('exist');
		cy.contains('button', 'Retry').should('exist');
		cy.contains('Skip for now').should('not.exist');
	});
});
