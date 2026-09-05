import { useState } from 'react';
import type { LeagueId } from '@arenaswap/core/types';
import { createFavoriteTeamKey } from '@arenaswap/core/constants';
import FavoriteTeamsPage from '../../entrypoints/popup/components/favoriteTeamsPage';
import de from '../../locales/de.json';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fil from '../../locales/fil.json';
import fr from '../../locales/fr.json';
// Not `it` — that would shadow Mocha's global it() and break every test in this file.
import itLocale from '../../locales/it.json';
import ja from '../../locales/ja.json';
import ko from '../../locales/ko.json';
import ptBR from '../../locales/pt_BR.json';
import ptPT from '../../locales/pt_PT.json';
import zhCN from '../../locales/zh_CN.json';
import zhTW from '../../locales/zh_TW.json';

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
	onToggle?: (leagueId: LeagueId, teamId: string) => void;
}

// Favorites live in app.tsx, so this stands in for that owner.
const Harness = ({ enabledLeagues = ['nba'], initialFavorites = [], onToggle }: harnessProps) => {
	const [favorites, setFavorites] = useState(() => new Set(initialFavorites));

	return (
		<div className='popup-container'>
			<FavoriteTeamsPage
				enabledLeagues={enabledLeagues}
				favoriteTeamIds={favorites}
				favoriteTeamBonusPoints={8}
				onFavoriteTeamBonusChange={() => {}}
				onToggleFavoriteTeam={(leagueId, teamId) => {
					onToggle?.(leagueId, teamId);
					setFavorites(previous => {
						const next = new Set(previous);
						const key = createFavoriteTeamKey(leagueId, teamId);
						if (next.has(key)) next.delete(key);
						else next.add(key);
						return next;
					});
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
	it('carries the favorite team bonus, which moved here out of Scoring', () => {
		mountPage();

		cy.get('#favoriteTeamBonusInput').should('have.value', '8');
	});

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

		cy.get('.popup-section-label').first().should('have.text', 'Your favorites');
		cy.contains('.popup-section-label', 'Your favorites')
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

		cy.contains('.popup-section-label', 'Your favorites').should('exist');
		cy.get('[aria-label="Remove Philadelphia 76ers from favorites"]').first().click();

		cy.contains('.popup-section-label', 'Your favorites').should('not.exist');
		cy.contains('Philadelphia 76ers').should('exist');
	});

	it('takes the pinned list away while a search is running', () => {
		mountPage({ initialFavorites: ['nba:20'] });

		cy.contains('.popup-section-label', 'Your favorites').should('exist');
		cy.get('input[type=search]').type('bulls');

		cy.contains('Chicago Bulls').should('exist');
		cy.contains('.popup-section-label', 'Your favorites').should('not.exist');
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
		cy.contains('.popup-section-label', 'Your favorites').should('not.exist');

		cy.get('input[type=search]').clear();
		cy.contains('.popup-section-label', 'Your favorites').should('exist');
	});

	it('says when nothing matches at all', () => {
		mountPage();

		cy.get('input[type=search]').type('nothing here');

		cy.contains('No teams match "nothing here"').should('exist');
	});

	it('still lets the bonus be edited when the roster fetch fails', () => {
		stubTeamsFetch(true);
		cy.mount(<Harness />);

		cy.contains("Couldn't load teams.").should('exist');
		cy.get('#favoriteTeamBonusInput').should('have.value', '8');
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

	it('offers a retry but no way to skip, since settings has nowhere to skip to', () => {
		stubTeamsFetch(true);
		cy.mount(<Harness />);

		cy.contains("Couldn't load teams.").should('exist');
		cy.contains('button', 'Retry').should('exist');
		cy.contains('Skip for now').should('not.exist');
	});
});
