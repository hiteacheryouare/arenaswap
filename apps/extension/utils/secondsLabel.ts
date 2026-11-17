type translate = (key: string) => string;

export const formatSecondsLabel = (secs: number, t: translate): string => {
	const minutes = Math.floor(secs / 60);
	const seconds = secs % 60;
	const secondsText = `${seconds}${t('detail.unitSeconds')}`;
	if (minutes === 0) return secondsText;
	const minutesText = `${minutes}${t('detail.unitMinutes')}`;
	return seconds > 0 ? `${minutesText} ${secondsText}` : minutesText;
};

export { secondsSliderSteps } from '@arenaswap/core/constants';
