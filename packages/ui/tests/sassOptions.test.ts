// Bootstrap 5.3.x compiles through Dart Sass's legacy APIs and floods every build with deprecation
// warnings, so `sassOptions` silences warnings that come from a dependency. The whole risk is in the
// off switch: get it wrong and our own stylesheets go quiet too, for as long as nobody notices that
// a build which used to complain has stopped. That is the definition of a silent failure, and the
// point of building the threshold out of an announced version is that it lifts on its own.

const optionsFor = async (version: string): Promise<Record<string, unknown>> => {
	jest.resetModules();
	jest.doMock('bootstrap/package.json', () => ({ version }));
	const loaded = await import('../src/sassOptions');
	return loaded.default as Record<string, unknown>;
};

afterEach(() => {
	jest.dontMock('bootstrap/package.json');
	jest.resetModules();
});

describe('silencing dependency warnings', () => {
	test('quietens a Bootstrap that still compiles through the legacy APIs', async () => {
		expect(await optionsFor('5.3.8')).toEqual({ quietDeps: true });
		expect(await optionsFor('5.4.9')).toEqual({ quietDeps: true });
	});

	// The release that carries the announced fix. Nobody has to remember to lift this.
	test('lifts the moment the announced fix ships', async () => {
		expect(await optionsFor('5.5.0')).toEqual({});
	});

	test('stays lifted for everything after it', async () => {
		expect(await optionsFor('5.5.1')).toEqual({});
		expect(await optionsFor('5.6.0')).toEqual({});
		expect(await optionsFor('6.0.0')).toEqual({});
	});

	// Trialling a prerelease of the fix is exactly when the warnings are worth reading.
	test('shows the warnings on a prerelease of the fix', async () => {
		expect(await optionsFor('5.5.0-beta1')).toEqual({});
		expect(await optionsFor('5.5.0-alpha.2')).toEqual({});
	});

	test('still quietens a prerelease of a version that has not fixed it', async () => {
		expect(await optionsFor('5.4.0-beta1')).toEqual({ quietDeps: true });
	});

	// A version string nobody can parse has to fail toward noise rather than toward silence: a
	// build that complains too much gets looked at, and one that has gone quiet does not.
	test('leaves the warnings on for a version it cannot read', async () => {
		expect(await optionsFor('not-a-version')).toEqual({});
		expect(await optionsFor('five.five.zero')).toEqual({});
	});

	// Ordered on the numbers rather than on the strings, or 5.10.0 would sort below 5.9.0 and a
	// fixed Bootstrap would be silenced for another ten minors.
	test('orders a two-digit minor above a one-digit one', async () => {
		expect(await optionsFor('5.10.0')).toEqual({});
		expect(await optionsFor('5.4.10')).toEqual({ quietDeps: true });
	});
});
