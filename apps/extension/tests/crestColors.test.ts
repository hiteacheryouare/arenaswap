import { crestColorCalibration } from '@arenaswap/ui/src/components/crestColor';
import type { Game, Team } from '@arenaswap/core/types';
import { createCrestColors, readStoredCrestColors } from '../utils/crestColors';

const huskies = 'https://a.espncdn.com/i/teamlogos/ncaa/500/111.png';
const falcons = 'https://a.espncdn.com/i/teamlogos/ncaa/500/2060.png';

const team = (id: string, overrides: Partial<Team> = {}): Team => ({
	id,
	name: `Team ${id}`,
	abbreviation: id,
	score: 0,
	...overrides,
});

const game = (awayTeam: Team, homeTeam: Team): Game => ({
	id: `${awayTeam.id}-${homeTeam.id}`,
	league: 'ncaamh',
	status: 'in',
	awayTeam,
	homeTeam,
} as Game);

const collegeHockey = () => game(team('NU', { logo: huskies }), team('BENT', { logo: falcons }));

const setup = (stored: unknown = undefined, colors: Record<string, string | null | undefined> = {}) => {
	const clock = { now: 0 };
	const save = jest.fn().mockResolvedValue(undefined);
	const sample = jest.fn((src: string) => Promise.resolve(colors[src]));
	const crestColors = createCrestColors({ load: () => Promise.resolve(stored), save, sample, now: () => clock.now });
	return { crestColors, save, sample, clock };
};

describe('createCrestColors', () => {
	test('paints a team our sources sent no colour for in the colour off its crest', async () => {
		const { crestColors } = setup(undefined, { [huskies]: '#DC0000', [falcons]: '#75B5DE' });
		const [painted] = await crestColors.paint([collegeHockey()]);
		expect(painted!.awayTeam.color).toBe('#DC0000');
		expect(painted!.homeTeam.color).toBe('#75B5DE');
	});

	test('leaves a published colour alone and never reads that crest', async () => {
		const { crestColors, sample } = setup(undefined, { [falcons]: '#75B5DE' });
		const published = game(team('BU', { logo: huskies, color: '#CC0000' }), team('BENT', { logo: falcons }));
		const [painted] = await crestColors.paint([published]);
		expect(painted!.awayTeam.color).toBe('#CC0000');
		expect(sample).toHaveBeenCalledTimes(1);
		expect(sample).toHaveBeenCalledWith(falcons);
	});

	test('reads each crest once, across games and across polls', async () => {
		const { crestColors, sample } = setup(undefined, { [huskies]: '#DC0000', [falcons]: '#75B5DE' });
		const rematch = game(team('BENT', { logo: falcons }), team('NU', { logo: huskies }));
		await crestColors.paint([collegeHockey(), rematch]);
		await crestColors.paint([collegeHockey()]);
		expect(sample).toHaveBeenCalledTimes(2);
	});

	test('serves stored colours without reading anything', async () => {
		const stored = { calibration: crestColorCalibration, colors: { [huskies]: '#DC0000', [falcons]: null } };
		const { crestColors, sample, save } = setup(stored);
		const [painted] = await crestColors.paint([collegeHockey()]);
		expect(painted!.awayTeam.color).toBe('#DC0000');
		expect(painted!.homeTeam.color).toBeUndefined();
		expect(sample).not.toHaveBeenCalled();
		expect(save).not.toHaveBeenCalled();
	});

	test('stores what it read, including a crest with no colour to give', async () => {
		const { crestColors, save } = setup(undefined, { [huskies]: '#DC0000', [falcons]: null });
		await crestColors.paint([collegeHockey()]);
		expect(save).toHaveBeenCalledWith({ calibration: crestColorCalibration, colors: { [huskies]: '#DC0000', [falcons]: null } });
	});

	// A crest that would not load is not a crest without colour, so it is never stored.
	test('does not store a crest that could not be read, and retries it only after a while', async () => {
		const { crestColors, save, sample, clock } = setup(undefined, {});
		const first = await crestColors.paint([collegeHockey()]);
		await crestColors.paint([collegeHockey()]);
		expect(first[0]!.awayTeam.color).toBeUndefined();
		expect(save).not.toHaveBeenCalled();
		expect(sample).toHaveBeenCalledTimes(2);

		clock.now = 5 * 60_000;
		await crestColors.paint([collegeHockey()]);
		expect(sample).toHaveBeenCalledTimes(4);
	});

	test('shares one read between polls that land at the same time', async () => {
		const { crestColors, sample } = setup(undefined, { [huskies]: '#DC0000', [falcons]: '#75B5DE' });
		const [first, second] = await Promise.all([crestColors.paint([collegeHockey()]), crestColors.paint([collegeHockey()])]);
		expect(sample).toHaveBeenCalledTimes(2);
		expect(first![0]!.awayTeam.color).toBe('#DC0000');
		expect(second![0]!.awayTeam.color).toBe('#DC0000');
	});

	test('reads a big slate a few crests at a time', async () => {
		let inFlight = 0;
		let mostInFlight = 0;
		const sample = jest.fn(async () => {
			inFlight += 1;
			mostInFlight = Math.max(mostInFlight, inFlight);
			await new Promise(resolve => setTimeout(resolve, 0));
			inFlight -= 1;
			return '#DC0000';
		});
		const crestColors = createCrestColors({ load: () => Promise.resolve(undefined), save: jest.fn().mockResolvedValue(undefined), sample });
		const slate = Array.from({ length: 30 }, (_, index) => game(
			team(`A${index}`, { logo: `https://a.espncdn.com/away/${index}.png` }),
			team(`H${index}`, { logo: `https://a.espncdn.com/home/${index}.png` }),
		));
		const painted = await crestColors.paint(slate);
		expect(sample).toHaveBeenCalledTimes(60);
		expect(mostInFlight).toBe(8);
		expect(painted.every(entry => entry.homeTeam.color === '#DC0000')).toBe(true);
	});

	test('does not save over the stored colours when they failed to load, and loads them on the next poll', async () => {
		const stored = { calibration: crestColorCalibration, colors: { [falcons]: '#75B5DE' } };
		const load = jest.fn()
			.mockRejectedValueOnce(new Error('storage unavailable'))
			.mockResolvedValue(stored);
		const save = jest.fn().mockResolvedValue(undefined);
		const crestColors = createCrestColors({ load, save, sample: () => Promise.resolve('#DC0000') });
		await crestColors.paint([game(team('NU', { logo: huskies }), team('BU', { color: '#CC0000' }))]);
		expect(save).not.toHaveBeenCalled();

		const [painted] = await crestColors.paint([collegeHockey()]);
		expect(load).toHaveBeenCalledTimes(2);
		expect(painted!.awayTeam.color).toBe('#DC0000');
		expect(painted!.homeTeam.color).toBe('#75B5DE');
	});

	test('returns the same game object when there is nothing to paint', async () => {
		const { crestColors } = setup();
		const published = game(team('BOS', { color: '#FFB81C' }), team('NYR', { color: '#0038A8' }));
		const [painted] = await crestColors.paint([published]);
		expect(painted).toBe(published);
	});
});

describe('readStoredCrestColors', () => {
	test('throws away colours measured under another calibration', () => {
		expect(readStoredCrestColors({ calibration: 'old', colors: { [huskies]: '#DC0000' } }).size).toBe(0);
	});

	test('drops entries that are not a colour or null', () => {
		const colors = readStoredCrestColors({ calibration: crestColorCalibration, colors: { [huskies]: 'red', [falcons]: null } });
		expect([...colors]).toEqual([[falcons, null]]);
	});
});
