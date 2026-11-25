import createBuildStamp from '../utils/buildStamp';

describe('the build stamp', () => {
	test('a pinned SOURCE_DATE_EPOCH gives every machine the same stamp', () => {
		const pinned = { SOURCE_DATE_EPOCH: '1795000000' };
		expect(createBuildStamp(pinned)).toEqual({ builtAt: 1_795_000_000_000, timeZone: 'UTC', environment: 'Local' });
		expect(createBuildStamp(pinned)).toEqual(createBuildStamp({ ...pinned }));
	});

	test('an unpinned build stamps the clock it was built on', () => {
		const before = Date.now();
		const { builtAt } = createBuildStamp({});
		expect(builtAt).toBeGreaterThanOrEqual(before);
		expect(builtAt).toBeLessThanOrEqual(Date.now());
	});

	test('says whether GitHub Actions, another CI or a laptop built it', () => {
		expect(createBuildStamp({ GITHUB_ACTIONS: 'true', CI: 'true' }).environment).toBe('GitHub Actions');
		expect(createBuildStamp({ CI: '1' }).environment).toBe('CI');
		expect(createBuildStamp({}).environment).toBe('Local');
	});
});
