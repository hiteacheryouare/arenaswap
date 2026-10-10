import { createBossMode, isDecoyTab, normalizeDecoyUrl } from '../utils/bossMode';

describe('normalizeDecoyUrl', () => {
	test('reads a bare host as https', () => {
		expect(normalizeDecoyUrl('docs.google.com')).toBe('https://docs.google.com/');
	});

	test('keeps the path, query and fragment of a pasted address', () => {
		const sheet = 'https://docs.google.com/spreadsheets/d/abc123/edit?usp=sharing#gid=0';
		expect(normalizeDecoyUrl(`  ${sheet}  `)).toBe(sheet);
	});

	test('accepts plain http and a local address with a port', () => {
		expect(normalizeDecoyUrl('http://intranet.corp/wiki')).toBe('http://intranet.corp/wiki');
		expect(normalizeDecoyUrl('localhost:3000/board')).toBe('https://localhost:3000/board');
	});

	test.each([
		['nothing at all', ''],
		['only spaces', '   '],
		['words with spaces', 'my budget sheet'],
		['a single word with no dot', 'spreadsheet'],
		['a browser page', 'chrome://extensions'],
		['a script', 'javascript:alert(1)'],
		['a file path', 'file:///etc/hosts'],
		['an email address', 'mailto:boss@work.com'],
	])('turns down %s', (_label, raw) => {
		expect(normalizeDecoyUrl(raw)).toBeNull();
	});
});

describe('isDecoyTab', () => {
	const sheet = 'https://docs.google.com/spreadsheets/d/abc123/edit';

	test('still matches after the spreadsheet changes sheet', () => {
		expect(isDecoyTab(`${sheet}#gid=884211`, sheet)).toBe(true);
	});

	test('does not mix up two documents on the same site', () => {
		expect(isDecoyTab('https://docs.google.com/spreadsheets/d/zzz999/edit', sheet)).toBe(false);
	});

	test('treats a trailing slash as the same page', () => {
		expect(isDecoyTab('https://example.com/board/', 'https://example.com/board')).toBe(true);
	});

	test('keeps two query strings apart', () => {
		expect(isDecoyTab('https://example.com/view?id=1', 'https://example.com/view?id=2')).toBe(false);
	});

	test('has no opinion about a tab whose address is hidden', () => {
		expect(isDecoyTab(undefined, sheet)).toBe(false);
	});
});

const sheet = 'https://docs.google.com/spreadsheets/d/abc123/edit';

const setup = (decoyUrl: string, openTabs: { id: number; windowId: number; url: string }[] = []) => {
	const calls: string[] = [];
	const tabs = {
		query: jest.fn().mockResolvedValue(openTabs),
		update: jest.fn().mockImplementation(async (id: number) => { calls.push(`update ${id}`); }),
		create: jest.fn().mockImplementation(async () => { calls.push('create'); }),
	};
	const windows = { update: jest.fn().mockResolvedValue(undefined) };
	let paused = false;
	const saved: boolean[] = [];
	const mute = jest.fn().mockImplementation(async () => {
		calls.push(`mute while paused=${paused}`);
	});
	const boss = createBossMode({
		tabs,
		windows,
		getDecoyUrl: () => decoyUrl,
		pause: async () => { paused = true; },
		muteManagedTabs: mute,
		saveHushed: async hushed => { saved.push(hushed); },
	});
	return { boss, tabs, windows, mute, saved, calls, isPaused: () => paused };
};

describe('pressing the boss button', () => {
	test('focuses a tab that is already on the decoy page, in its own window', async () => {
		const { boss, tabs, windows } = setup(sheet, [
			{ id: 4, windowId: 1, url: 'https://example.com/' },
			{ id: 9, windowId: 7, url: `${sheet}#gid=3` },
		]);

		await boss.press();

		expect(tabs.update).toHaveBeenCalledWith(9, { active: true });
		expect(windows.update).toHaveBeenCalledWith(7, { focused: true });
		expect(tabs.create).not.toHaveBeenCalled();
	});

	test('opens the decoy page when no tab is on it', async () => {
		const { boss, tabs } = setup(sheet, [{ id: 4, windowId: 1, url: 'https://example.com/' }]);

		await boss.press();

		expect(tabs.create).toHaveBeenCalledWith({ url: sheet });
		expect(tabs.update).not.toHaveBeenCalled();
	});

	test('opens a plain new tab when no decoy is set', async () => {
		const { boss, tabs } = setup('');

		await boss.press();

		expect(tabs.create).toHaveBeenCalledWith({});
		expect(tabs.query).not.toHaveBeenCalled();
	});

	test('opens a plain new tab when the saved decoy is not a usable address', async () => {
		const { boss, tabs } = setup('chrome://settings');

		await boss.press();

		expect(tabs.create).toHaveBeenCalledWith({});
	});

	test('pauses auto-switching before the tabs are muted, and stays hushed', async () => {
		const { boss, mute, saved, calls, isPaused } = setup('');

		await boss.press();

		expect(isPaused()).toBe(true);
		expect(calls).toContain('mute while paused=true');
		expect(mute).toHaveBeenCalledTimes(1);
		expect(boss.isHushed()).toBe(true);
		expect(saved).toEqual([true]);
	});

	test('still mutes and pauses when the decoy tab cannot be opened, then reports it', async () => {
		const { boss, tabs, mute, isPaused } = setup(sheet);
		tabs.query.mockRejectedValue(new Error('no tabs for you'));

		await expect(boss.press()).rejects.toThrow('no tabs for you');

		expect(isPaused()).toBe(true);
		expect(mute).toHaveBeenCalled();
	});
});

describe('resuming', () => {
	test('lets go of the hush once, and only if there was one', async () => {
		const { boss, saved } = setup('');

		await boss.release();
		expect(saved).toEqual([]);

		await boss.press();
		await boss.release();
		await boss.release();

		expect(boss.isHushed()).toBe(false);
		expect(saved).toEqual([true, false]);
	});

	test('comes back hushed after a service worker restart, but only for a stored true', () => {
		const { boss } = setup('');

		boss.restore(true);
		expect(boss.isHushed()).toBe(true);

		boss.restore('yes');
		expect(boss.isHushed()).toBe(false);
	});
});
