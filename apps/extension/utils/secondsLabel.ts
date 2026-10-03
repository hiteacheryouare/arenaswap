type translate = (key: string) => string;

// Built from the same unit strings the start countdown uses, so a cooldown reads "1m 30s" beside a
// countdown reading "4m 05s", and 1分 30秒 beside 4分 05秒 in Japanese.
export const formatSecondsLabel = (secs: number, t: translate): string => {
	const minutes = Math.floor(secs / 60);
	const seconds = secs % 60;
	const secondsText = `${seconds}${t('detail.unitSeconds')}`;
	if (minutes === 0) return secondsText;
	const minutesText = `${minutes}${t('detail.unitMinutes')}`;
	return seconds > 0 ? `${minutesText} ${secondsText}` : minutesText;
};

export const secondsSliderSteps = [0, 15, 30, 45, 60, 90, 120, 180];
