// The worker is stopped 30 s after its last event or extension API call, and every timer goes with
// it. While a poll is due soon, a cheap API call every 20 s keeps it running; anything further off
// is left to an alarm, which starts a stopped worker again. Chrome 110+ and Firefox 121+ count the
// call; measured on Chrome 155 and Firefox 158.
export const keepAwakeHorizonMs = 5 * 60 * 1000;
export const heartbeatMs = 20_000;
export const wakeAlarmName = 'arenaswap-wake';

interface keepAwakeApis {
	beat: () => Promise<unknown>;
	alarms: { create: (name: string, info: { when: number }) => unknown; clear: (name: string) => unknown };
}

// `nextDueAt` is the soonest poll anything has scheduled. `busy` is work running on a timer of its
// own, which has to stay awake however far off the next poll is.
const createKeepAwake = ({ beat, alarms }: keepAwakeApis) => {
	let heartbeat: ReturnType<typeof setInterval> | null = null;

	return (nextDueAt: number | null, busy: boolean, now = Date.now()) => {
		const awake = busy || (nextDueAt !== null && nextDueAt - now <= keepAwakeHorizonMs);
		if (awake && heartbeat === null) heartbeat = setInterval(() => { beat().catch(() => {}); }, heartbeatMs);
		if (!awake && heartbeat !== null) {
			clearInterval(heartbeat);
			heartbeat = null;
		}
		if (nextDueAt === null) alarms.clear(wakeAlarmName);
		else alarms.create(wakeAlarmName, { when: nextDueAt });
	};
};

export default createKeepAwake;
