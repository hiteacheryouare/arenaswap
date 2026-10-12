import { TestEnvironment } from 'jest-environment-node';

// Jest hands each test file a copy of `process`, so assigning `process.env.TZ` from inside a test
// lands in that copy and never reaches the setter Node uses to invalidate V8's cached zone: the
// variable changes and the clock does not. A test environment is loaded in the worker's own
// context, where `process` is the real one, so it can hand the sandbox a setter that works.
//
// A class rather than an arrow function because Jest requires environments to be constructible.
export default class TimeZoneEnvironment extends TestEnvironment {
	private readonly originalTimeZone = process.env.TZ;

	async setup(): Promise<void> {
		await super.setup();
		(this.global as unknown as { setTimeZone: (zone: string) => void }).setTimeZone = zone => {
			process.env.TZ = zone;
		};
	}

	async teardown(): Promise<void> {
		if (this.originalTimeZone === undefined) delete process.env.TZ;
		else process.env.TZ = this.originalTimeZone;
		await super.teardown();
	}
}
