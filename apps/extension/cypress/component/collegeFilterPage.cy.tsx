import { useState } from 'react';
import { defaultCollegeFilter, leagueConfigMap } from '@arenaswap/core/constants';
import type { CollegeFilter, CollegeLeagueId, ConferenceDirectory, UserPreferences } from '@arenaswap/core/types';
import { createDefaultUserPreferences } from '@arenaswap/core/constants';
import CollegeFilterPage from '../../entrypoints/popup/components/collegeFilterPage';
import SetupView from '../../entrypoints/popup/components/setupView';
import { conferenceDirectoryKey } from '../../utils/collegeConferences';

const directory = (leagueId: CollegeLeagueId, conferences: ConferenceDirectory['conferences']): ConferenceDirectory => ({
	leagueId,
	seasonYear: 2026,
	conferences,
	teamConference: {},
	teamDivision: {},
	fetchedAt: Date.now(),
});

const football = directory('ncaaf', [
	{ id: '5', name: 'Big Ten Conference', shortName: 'Big Ten', divisionKey: '80', crestSlug: 'big_ten' },
	{ id: '8', name: 'Southeastern Conference', shortName: 'SEC', divisionKey: '80', crestSlug: 'sec' },
	{ id: '20', name: 'Big Sky Conference', shortName: 'Big Sky', divisionKey: '81', crestSlug: 'big_sky' },
	{ id: '177', name: 'United Athletic Conference', shortName: 'UAC', divisionKey: '81' },
]);

const basketball = directory('ncaab', [
	{ id: '23', name: 'Southeastern Conference', shortName: 'SEC', divisionKey: '50', crestSlug: 'sec' },
	{ id: '8', name: 'Big 12 Conference', shortName: 'Big 12', divisionKey: '50', crestSlug: 'big_12' },
]);

const baseball = directory('cbase', [
	{ id: '58', name: 'American Athletic Conference', shortName: 'American', divisionKey: 'd1', crestSlug: 'american' },
]);

// Component specs have no extension runtime, so `browser.storage.local` is a Map, and the network
// fails loudly: every test here is meant to run off what is already stored.
const installStorage = (stored: ConferenceDirectory[]) => {
	cy.window().then(win => {
		const local = new Map<string, unknown>(stored.map(entry => [conferenceDirectoryKey(entry.leagueId), entry]));
		(win as unknown as { browser: unknown }).browser = {
			storage: {
				local: {
					get: async (key: string) => (local.has(key) ? { [key]: local.get(key) } : {}),
					set: async (items: Record<string, unknown>) => { for (const [key, value] of Object.entries(items)) local.set(key, value); },
				},
			},
		};
		cy.stub(win, 'fetch').as('fetch').rejects(new Error('offline'));
	});
};

const Harness = ({ leagueId, initial, onChange }: { leagueId: CollegeLeagueId; initial?: CollegeFilter; onChange?: (filter: CollegeFilter) => void }) => {
	const [filter, setFilter] = useState(initial ?? defaultCollegeFilter(leagueId));
	return (
		<div className='popup-container'>
			<CollegeFilterPage
				league={{ ...leagueConfigMap[leagueId], id: leagueId }}
				leagueLogos={{}}
				filter={filter}
				disabled={false}
				onChange={next => { setFilter(next); onChange?.(next); }}
			/>
		</div>
	);
};

describe('collegeFilterPage', () => {
	it('starts football on FBS, with every FBS conference already let through by it', () => {
		installStorage([football]);
		cy.mount(<Harness leagueId='ncaaf' />);

		cy.get('#college-division-80').should('be.checked');
		cy.get('#college-division-81').should('not.be.checked');
		cy.contains('FBS conferences').should('exist');
		cy.get('#college-conference-8').should('be.checked').and('be.disabled');
		cy.get('#college-conference-8').closest('.league-toggle-row').should('have.class', 'is-covered');
		cy.get('#college-conference-20').should('not.be.checked').and('not.be.disabled');
		cy.get('@fetch').should('not.have.been.called');
	});

	it('turning a division off hands its conferences back their own switches', () => {
		installStorage([football]);
		cy.mount(<Harness leagueId='ncaaf' initial={{ divisions: ['80'], conferences: ['8'], ranked: false }} />);

		cy.get('#college-conference-5').should('be.checked');
		cy.get('#college-division-80').click();
		cy.get('#college-conference-8').should('be.checked').and('not.be.disabled');
		cy.get('#college-conference-5').should('not.be.checked').and('not.be.disabled');
		cy.get('#college-conference-8').closest('.league-toggle-row').should('not.have.class', 'is-covered');
	});

	it('reports each change as a whole filter', () => {
		installStorage([football]);
		const onChange = cy.stub().as('onChange');
		cy.mount(<Harness leagueId='ncaaf' onChange={onChange} />);

		cy.get('#college-division-81').click();
		cy.get('@onChange').should('have.been.calledWith', { divisions: ['80', '81'], conferences: [], ranked: false });
		cy.get('#college-ranked').click();
		cy.get('@onChange').should('have.been.calledWith', { divisions: ['80', '81'], conferences: [], ranked: true });
	});

	it('warns when nothing is picked', () => {
		installStorage([football]);
		cy.mount(<Harness leagueId='ncaaf' />);
		cy.get('.setup-no-leagues-warn').should('not.exist');
		cy.get('#college-division-80').click();
		cy.get('.setup-no-leagues-warn').should('contain.text', 'NCAA Football');
	});

	it('finds crests by name, so basketball\'s SEC never draws as its Big 12', () => {
		installStorage([basketball]);
		cy.mount(<Harness leagueId='ncaab' initial={{ divisions: [], conferences: [], ranked: false }} />);

		cy.get('#college-conference-23').closest('.league-toggle-row').find('img')
			.should('have.attr', 'src', 'https://a.espncdn.com/i/teamlogos/ncaa_conf/500-dark/8.png');
		cy.get('#college-conference-8').closest('.league-toggle-row').find('img')
			.should('have.attr', 'src', 'https://a.espncdn.com/i/teamlogos/ncaa_conf/500-dark/4.png');
	});

	it('gives a conference with no crest its initials', () => {
		installStorage([football]);
		cy.mount(<Harness leagueId='ncaaf' />);
		cy.get('#college-conference-177').closest('.league-toggle-row').find('.crest-fallback').should('have.text', 'UAC');
	});

	it('labels hockey\'s poll by its own size and gives baseball an Other bucket', () => {
		installStorage([baseball]);
		cy.mount(<Harness leagueId='ncaamh' />);
		cy.contains('label', 'Top 20').should('exist');

		cy.mount(<Harness leagueId='cbase' initial={{ divisions: [], conferences: [], ranked: false }} />);
		cy.contains('label', 'Top 25').should('exist');
		cy.contains('label', 'Other conferences').should('exist');
		cy.get('#college-conference-other').should('not.be.disabled');
	});

	it('says so when the conference list cannot load, and keeps divisions working', () => {
		installStorage([]);
		cy.mount(<Harness leagueId='ncaaf' />);
		cy.contains('Our scouts came back empty-handed').should('exist');
		cy.get('#college-division-81').click().should('be.checked');
		cy.contains('button', 'Try again').click();
		cy.get('@fetch').its('callCount').should('be.greaterThan', 1);
	});
});

describe('college leagues on the Leagues page', () => {
	const prefs: UserPreferences = {
		...createDefaultUserPreferences(),
		enabledLeagues: ['ncaaf', 'nfl'],
		collegeFilters: { ncaab: { divisions: [], conferences: ['23'], ranked: false } },
	};

	const handlerNames = ['onClose','onSensitivityChange','onCooldownChange','onSwitchDelayChange','onFavoriteTeamBonusChange','onToggleFavoriteTeam','onToggleLeague','onToggleSport','onReorderLeague','onResetLeagueOrder','onCollegeFilterChange','onToggleGroupByLeague','onToggleShowUpcoming','onToggleKeepFinalGames','onFinishedTabActionChange','onThemeChange','onUpcomingGamesDaysChange','onToggleProTips','onToggleNotifications','onToggleDemo','onDemoSeasonChange','onToggleStandbyStream','onStandbyThresholdChange','onSetStandbyTab','onStandbyOnboardingDone','onToggleBetting','onToggleTemperatureUnit','onUnlockRomer','onToggleOpenReveal','onToggleHolidayDecorations','onToggleHolidaySnow','onToggleHolidayLights','onToggleHolidayLeaves','onPostseasonBoostChange','onToggleSignal'] as const;
	const handlers = (overrides: Record<string, unknown> = {}) => ({
		...Object.fromEntries(handlerNames.map(name => [name, () => {}])),
		...overrides,
	}) as unknown as Parameters<typeof SetupView>[0];

	const mountSetup = (overrides: Record<string, unknown> = {}) => {
		cy.mount(
			<SetupView
				{...handlers(overrides)}
				prefs={prefs}
				prefsLoaded
				demoMode={false}
				demoSeason='real'
				leagueLogos={{}}
				leagueSchedules={{}}
				favoriteTeamIds={new Set()}
				standbyStreamTabId={null}
				standbyOnboardingDone
				openTabs={[]}
				formatTabLabel={() => ''}
			/>,
		);
	};

	it('shows what each college league lets through, and opens its picker', () => {
		installStorage([basketball]);
		mountSetup();
		cy.get('#settingsGroup-leagues').click();

		cy.contains('.college-league-open', 'NCAA Football').should('contain.text', 'FBS');
		cy.contains('.college-league-open', 'NCAA Basketball').should('contain.text', 'SEC');
		cy.contains('.league-toggle-row', 'NFL').find('.college-league-open').should('not.exist');

		cy.contains('.college-league-open', 'NCAA Football').click();
		cy.get('.setup-header').should('contain.text', 'NCAA Football');
		cy.get('#college-division-80').should('exist');
		cy.get('.setup-header').click();
		cy.get('#league-ncaaf').should('exist');
	});

	it('leaves the league switch as the switch', () => {
		installStorage([]);
		const onToggleLeague = cy.stub().as('onToggleLeague');
		mountSetup({ onToggleLeague });
		cy.get('#settingsGroup-leagues').click();
		cy.get('#league-ncaaf').click();
		cy.get('@onToggleLeague').should('have.been.calledWith', 'ncaaf');
		cy.get('.setup-header').should('not.contain.text', 'NCAA Football');
	});
});
