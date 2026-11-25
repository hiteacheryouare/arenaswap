import type { DebugState } from '@arenaswap/core/types';
import PopupFooter from '../../../entrypoints/popup/components/popupFooter';

const minute = 60_000;

const debugState = (now: number): DebugState => ({
	pollModes: { nba: 'eager', nhl: 'dormant' },
	leagueIntervals: { nba: 12_000, nhl: 300_000 },
	demoMode: false,
	lastSwitchTime: now - 3 * minute,
	pendingSwitch: null,
	heldSwitch: null,
	liveGameCount: 2,
	upcomingGameCount: 4,
	totalGameCount: 6,
	tabRegistry: [],
	onStandbyStream: false,
	standbyStreamTabId: null,
	commercialBreaks: {},
	scores: [],
	gameLabels: {},
	enabledLeagues: ['nba', 'nhl'],
	sensitivity: 5,
	cooldownSeconds: 30,
	switchDelaySeconds: 0,
	contentAwareSwitching: true,
	workerStartedAt: now - 90 * minute,
	leagueLastGoodAt: { nba: now - 4_000 },
	leagueFailures: { nhl: 2 },
});

const emptyArea = { get: () => Promise.resolve({}) };

const installBrowser = () => {
	(window as unknown as Record<string, unknown>).browser = {
		runtime: {
			id: 'arenaswap-test',
			getManifest: () => ({ version: '3.0.0', manifest_version: 3, permissions: ['tabs', 'declarativeNetRequestWithHostAccess'] }),
			sendMessage: () => Promise.resolve(debugState(Date.now())),
			getPlatformInfo: () => Promise.resolve({ os: 'mac', arch: 'arm' }),
		},
		storage: { sync: emptyArea, local: emptyArea, session: emptyArea },
		permissions: { contains: () => Promise.resolve(true) },
		notifications: { getPermissionLevel: () => Promise.resolve('granted') },
		i18n: { getUILanguage: () => 'en-US' },
	};
};

const openPanel = () => {
	for (let tap = 0; tap < 10; tap++) cy.get('.popup-signature-heart').click();
	cy.get('.popup-debug-panel').should('be.visible');
};

const row = (label: string) => cy.contains('.debug-label', new RegExp(`^${label}$`)).siblings('.debug-value');

describe('the debug panel', () => {
	beforeEach(() => {
		installBrowser();
		cy.mount(<div className='popup-container d-flex flex-column'><PopupFooter /></div>);
	});

	it('says when, where and by what the build was made', () => {
		openPanel();
		row('Built').should('contain.text', String(new Date(__ARENASWAP_BUILD__.builtAt).getFullYear()));
		row('Built on').should('have.text', `${__ARENASWAP_BUILD__.environment} · ${__ARENASWAP_BUILD__.timeZone}`);
		row('Platform').should('have.text', 'mac arm');
		row('Language').should('have.text', 'en-US');
		row('Multiview access').should('have.text', 'Granted');
		row('Notifications').should('have.text', 'Granted');
	});

	it('shows how long the worker has been up and which leagues are failing', () => {
		openPanel();
		row('Worker up').should('have.text', '1h 30m');
		row('NBA').should('contain.text', 'ok 4s ago').and('not.contain.text', 'failed');
		row('NHL').should('contain.text', 'no good poll yet').find('.debug-break').should('have.text', ' · 2 failed');
	});

	it('copies every section as text for a bug report', () => {
		cy.window().then(win => cy.stub(win.navigator.clipboard, 'writeText').as('writeText').resolves());
		openPanel();
		cy.contains('button', 'Copy all').click();
		cy.contains('button', 'Copied').should('exist');
		cy.get('@writeText').should('have.been.calledOnce').then(stub => {
			const text = (stub as unknown as sinon.SinonStub).firstCall.args[0] as string;
			expect(text).to.match(/^ArenaSwap debug · \d{4}-/);
			expect(text).to.contain('## Runtime\nVersion: 3.0.0');
			expect(text).to.contain(`Built on: ${__ARENASWAP_BUILD__.environment} · ${__ARENASWAP_BUILD__.timeZone}`);
			expect(text).to.contain('## Permissions\nMultiview access: Granted');
			expect(text).to.contain('NHL: dormant · 300.0s · no good poll yet · 2 failed');
			expect(text).to.contain('## Storage\nSync: 0 keys');
		});
	});
});
