import type { SignalName } from '@arenaswap/core/types';

// The five PowerScore signals, one colour each, wherever they are drawn: the breakdown card, the
// component chart and its legend, and the signal switches in Settings. Momentum's #2274a5 is a data
// colour, not $secondary, so changing it here and nowhere else is the point of keeping one copy.
export const signalColors: Record<SignalName, string> = {
	closeness: '#22c55e',
	lateGame: '#f75c03',
	momentum: '#2274a5',
	leadChanges: '#f1c40f',
	comeback: '#d90368',
};

export default signalColors;
