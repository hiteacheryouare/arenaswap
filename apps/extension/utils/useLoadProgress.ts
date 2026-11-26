import { useEffect, useState } from 'react';
import type { LoadProgressMessage } from '@arenaswap/core/types';

const leaguesShare = 90;

const isProgressFor = (message: unknown, load: LoadProgressMessage['load']): message is LoadProgressMessage => {
	const candidate = message as Partial<LoadProgressMessage> | undefined;
	return candidate?.type === 'LOAD_PROGRESS' && candidate.load === load;
};

export default (load: LoadProgressMessage['load'], active: boolean): number => {
	const [percent, setPercent] = useState(0);
	const [wasActive, setWasActive] = useState(active);
	if (wasActive !== active) {
		setWasActive(active);
		if (active) setPercent(0);
	}

	useEffect(() => {
		if (!active) return;
		const onMessage = (message: unknown) => {
			if (!isProgressFor(message, load) || message.total === 0) return;
			const reached = (message.settled / message.total) * leaguesShare;
			setPercent(current => Math.max(current, reached));
		};
		browser.runtime.onMessage.addListener(onMessage);
		return () => browser.runtime.onMessage.removeListener(onMessage);
	}, [load, active]);

	return percent;
};
