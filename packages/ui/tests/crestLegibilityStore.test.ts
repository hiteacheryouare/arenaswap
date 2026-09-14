const storageKey = 'arenaswap.crestLegibility';
const crest = 'https://a.espncdn.com/i/teamlogos/mlb/500/col.png';
const purple = '#260253';

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
	return import('../src/components/logoTint');
};

// The verdict is persisted so a crest seen once is drawn right from the first frame. What has to
// travel with it is the calibration it was reached under: a stored answer from a build whose
// thresholds have since moved is worse than no answer at all, because nothing will ever re-measure
// it, and the machine it is wrong on is the one that has been using the feature longest.
//
// This was a real defect rather than a precaution. The calibration was a number somebody had to
// remember to raise; it was raised once, the thresholds moved twice more underneath it, and the
// stale answers went on being served. It is built out of the thresholds themselves now.
describe('a stored verdict carries the calibration that produced it', () => {
	test('serves a verdict stored under the calibration in force', async () => {
		const { legibilityCalibration } = await withStoredValue(null);
		const { cachedCrestReadsOn } = await withStoredValue(
			JSON.stringify({ calibration: legibilityCalibration, verdicts: { [`${crest}|${purple}`]: false } }),
		);
		expect(cachedCrestReadsOn(crest, purple)).toBe(false);
	});

	test('discards one stored under any other', async () => {
		const { cachedCrestReadsOn } = await withStoredValue(
			JSON.stringify({ calibration: '0.1/4.5/0.6/1.5/0.6/48', verdicts: { [`${crest}|${purple}`]: true } }),
		);
		expect(cachedCrestReadsOn(crest, purple)).toBeUndefined();
	});

	// The shape shipped before the calibration existed: a bare map of verdicts.
	test('discards a store written before the calibration existed', async () => {
		const { cachedCrestReadsOn } = await withStoredValue(JSON.stringify({ [`${crest}|${purple}`]: true }));
		expect(cachedCrestReadsOn(crest, purple)).toBeUndefined();
	});

	test('survives an empty store and a store full of nonsense', async () => {
		expect((await withStoredValue(null)).cachedCrestReadsOn(crest, purple)).toBeUndefined();
		expect((await withStoredValue('not json')).cachedCrestReadsOn(crest, purple)).toBeUndefined();
	});

	// Pinned rather than merely derived, so that moving a threshold fails a test that says out loud
	// what else has to happen: every verdict already on a reader's machine is about to be wrong, and
	// the only thing that throws them away is this string changing with it.
	test('is every threshold the verdict depends on', async () => {
		const { legibilityCalibration } = await withStoredValue(null);
		expect(legibilityCalibration).toBe('0.04/4.5/0.35/1.3/0.57/48');
	});
});
