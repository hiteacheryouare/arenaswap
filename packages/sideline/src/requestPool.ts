/* ESPN sheds load on this host by recent request volume from an IP and answers 403 to whatever it
   drops. Measured from one machine against the NBA scoreboard: 16 requests at once all came back
   200, 24 at once lost four of them, and the same size passed cleanly a minute later — so the window
   is recent volume rather than instantaneous concurrency, and a burst that got through once is no
   guarantee. */
export const espnRequestPoolSize = 6;

export const settledInPool = async <T, R>(
	items: T[],
	run: (item: T) => Promise<R>,
	size = espnRequestPoolSize,
	onProgress?: (settled: number, total: number) => void,
): Promise<PromiseSettledResult<R>[]> => {
	const results: PromiseSettledResult<R>[] = [];
	let next = 0;
	let settled = 0;
	const worker = async (): Promise<void> => {
		while (next < items.length) {
			const index = next;
			next += 1;
			const item = items[index] as T;
			try {
				results[index] = { status: 'fulfilled', value: await run(item) };
			} catch (reason) {
				results[index] = { status: 'rejected', reason };
			}
			settled += 1;
			onProgress?.(settled, items.length);
		}
	};
	await Promise.all(Array.from({ length: Math.min(size, items.length) }, () => worker()));
	return results;
};

export const espnBurstCapacity = 16;
export const espnSustainedPerSecond = 10;

let requestTokens = espnBurstCapacity;
let tokensRefilledAt = Date.now();

export const resetRequestSlots = (): void => {
	requestTokens = espnBurstCapacity;
	tokensRefilledAt = Date.now();
};

export const takeRequestSlot = async (): Promise<void> => {
	for (;;) {
		const now = Date.now();
		const refill = ((now - tokensRefilledAt) / 1000) * espnSustainedPerSecond;
		requestTokens = Math.min(espnBurstCapacity, requestTokens + Math.max(0, refill));
		tokensRefilledAt = now;
		if (requestTokens >= 1) {
			requestTokens -= 1;
			return;
		}
		const waitMs = Math.ceil(((1 - requestTokens) / espnSustainedPerSecond) * 1000);
		await new Promise(resolve => setTimeout(resolve, waitMs));
	}
};
