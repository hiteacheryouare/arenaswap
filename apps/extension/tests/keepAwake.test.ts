import createKeepAwake, { heartbeatMs, keepAwakeHorizonMs, wakeAlarmName } from '../utils/keepAwake';

const now = 1_800_000_000_000;

const setup = () => {
	jest.useFakeTimers();
	jest.setSystemTime(now);
	const beat = jest.fn().mockResolvedValue(undefined);
	const alarms = { create: jest.fn(), clear: jest.fn() };
	return { beat, alarms, keepAwake: createKeepAwake({ beat, alarms }) };
};

describe('createKeepAwake', () => {
	test('keeps calling while a poll is due inside the horizon', () => {
		const { beat, keepAwake } = setup();
		keepAwake(now + keepAwakeHorizonMs, false);
		jest.advanceTimersByTime(heartbeatMs * 3);
		expect(beat).toHaveBeenCalledTimes(3);
	});

	test('lets the worker stop when the next poll is further off, with an alarm to start it again', () => {
		const { beat, alarms, keepAwake } = setup();
		keepAwake(now + keepAwakeHorizonMs + 1, false);
		jest.advanceTimersByTime(heartbeatMs * 3);
		expect(beat).not.toHaveBeenCalled();
		expect(alarms.create).toHaveBeenCalledWith(wakeAlarmName, { when: now + keepAwakeHorizonMs + 1 });
	});

	test('stops calling once the next poll moves out of the horizon', () => {
		const { beat, keepAwake } = setup();
		keepAwake(now + 60_000, false);
		jest.advanceTimersByTime(heartbeatMs);
		keepAwake(now + 30 * 60_000, false);
		jest.advanceTimersByTime(heartbeatMs * 3);
		expect(beat).toHaveBeenCalledTimes(1);
	});

	test('stays awake for busy work with nothing scheduled, and clears the alarm', () => {
		const { beat, alarms, keepAwake } = setup();
		keepAwake(null, true);
		jest.advanceTimersByTime(heartbeatMs);
		expect(beat).toHaveBeenCalledTimes(1);
		expect(alarms.clear).toHaveBeenCalledWith(wakeAlarmName);
	});

	test('runs one heartbeat however often it is told to stay awake', () => {
		const { beat, keepAwake } = setup();
		keepAwake(now + 10_000, false);
		keepAwake(now + 20_000, false);
		keepAwake(now + 30_000, false);
		jest.advanceTimersByTime(heartbeatMs);
		expect(beat).toHaveBeenCalledTimes(1);
	});
});
