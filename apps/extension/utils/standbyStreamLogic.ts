export type StandbyStreamDecision =
	| 'switchToStandby'
	| 'stayOnStandby'
	| 'resume'
	| 'none';

interface StandbyStreamDecisionParams {
	standbyStreamEnabled: boolean;
	standbyStreamTabId: number | null;
	standbyStreamThreshold: number;
	registeredScores: { total: number }[];
	onStandbyStream: boolean;
	activeTabIsStandby: boolean;
}

export const usableStandbyTabId = (
	standbyStreamTabId: number | null,
	openTabIds: ReadonlySet<number>,
	registry: readonly { tabId: number }[],
): number | null => (
	standbyStreamTabId !== null
	&& openTabIds.has(standbyStreamTabId)
	&& !registry.some(reg => reg.tabId === standbyStreamTabId)
		? standbyStreamTabId
		: null
);

export const computeStandbyStreamDecision = ({
	standbyStreamEnabled,
	standbyStreamTabId,
	standbyStreamThreshold,
	registeredScores,
	onStandbyStream,
	activeTabIsStandby,
}: StandbyStreamDecisionParams): StandbyStreamDecision => {
	if (!standbyStreamEnabled || standbyStreamTabId === null || registeredScores.length === 0) {
		return 'none';
	}

	if (onStandbyStream && !activeTabIsStandby) return 'resume';

	const allBelowThreshold = registeredScores.every(s => s.total < standbyStreamThreshold);

	if (allBelowThreshold && !onStandbyStream) return 'switchToStandby';
	if (allBelowThreshold && onStandbyStream) return 'stayOnStandby';
	if (!allBelowThreshold && onStandbyStream) return 'resume';

	return 'none';
};
