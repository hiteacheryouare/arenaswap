const storageKey = 'arenaswap.logoSwitchColors';
const crest = 'https://a.espncdn.com/i/teamlogos/ncaa/500/120.png';
const marylandRed = '#CE1126';
const gold = '#F8DB3F';

// Node's test environment has no localStorage, and the module reads it at import time — so the stub
// goes on first and the module is imported after it, per test.
const withStoredValue = async (raw: string | null) => {
	const store = new Map<string, string>();
	if (raw !== null) store.set(storageKey, raw);
	Object.defineProperty(globalThis, 'localStorage', {
		configurable: true,
		value: {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => { store.set(key, value); },
		},
	});
	jest.resetModules();
	return import('../src/logoSwitchColor');
};

// The same store, and the same hazard, as the crest legibility verdicts: a colour picked under
// thresholds that have since moved is never measured again, so it has to be thrown away with them.
describe('a stored switch colour carries the calibration that picked it', () => {
	test('serves a colour stored under the calibration in force, matching the primary in any case', async () => {
		const { switchColorCalibration } = await withStoredValue(null);
		const { cachedLogoSwitchColor } = await withStoredValue(
			JSON.stringify({ calibration: switchColorCalibration, colors: { [`${crest}|${marylandRed.toLowerCase()}`]: gold } }),
		);

		expect(cachedLogoSwitchColor(crest, marylandRed)).toBe(gold);
	});

	test('remembers that a crest had no colour to give, rather than measuring it again', async () => {
		const { switchColorCalibration } = await withStoredValue(null);
		const { cachedLogoSwitchColor } = await withStoredValue(
			JSON.stringify({ calibration: switchColorCalibration, colors: { [`${crest}|#c6011f`]: null } }),
		);

		expect(cachedLogoSwitchColor(crest, '#C6011F')).toBeNull();
	});

	test('discards one stored under any other', async () => {
		const { cachedLogoSwitchColor } = await withStoredValue(
			JSON.stringify({ calibration: '96/200/3/12/0.06/90/15/4', colors: { [`${crest}|${marylandRed.toLowerCase()}`]: gold } }),
		);

		expect(cachedLogoSwitchColor(crest, marylandRed)).toBeUndefined();
	});

	test('survives an empty store and a store full of nonsense', async () => {
		expect((await withStoredValue(null)).cachedLogoSwitchColor(crest, marylandRed)).toBeUndefined();
		expect((await withStoredValue('not json')).cachedLogoSwitchColor(crest, marylandRed)).toBeUndefined();
		expect((await withStoredValue(JSON.stringify({ calibration: 'x', colors: 'gold' }))).cachedLogoSwitchColor(crest, marylandRed)).toBeUndefined();
	});

	// Pinned, as the legibility calibration is, so that moving a threshold fails a test that says what
	// else has to happen. The blend steps decide which pinks count as the primary fading into white,
	// so they decide the colour too, and today the calibration leaves them out.
	test('is every threshold the colour depends on, the blend steps included', async () => {
		const { switchColorCalibration } = await withStoredValue(null);

		expect(switchColorCalibration).toBe('96/200/3/12/0.06/90/15/0.2,0.35,0.5,0.65,0.8/8');
	});
});
