const conditionIconMap: Record<string, string> = {
	'Sunny': 'bi-sun',
	'Clear': 'bi-sun',
	'Mostly Sunny': 'bi-sun',
	'Mostly Clear': 'bi-sun',
	'Partly Sunny': 'bi-cloud-sun',
	'Partly Cloudy': 'bi-cloud-sun',
	'Mostly Cloudy': 'bi-clouds',
	'Cloudy': 'bi-clouds',
	'Overcast': 'bi-clouds',
	'Fog': 'bi-cloud-fog2',
	'Haze': 'bi-cloud-fog2',
	'Smoke': 'bi-cloud-fog',
	'Light Rain': 'bi-cloud-drizzle',
	'Showers': 'bi-cloud-drizzle',
	'Rain': 'bi-cloud-rain',
	'Heavy Rain': 'bi-cloud-rain-heavy',
	'Thunderstorms': 'bi-cloud-lightning-rain',
	'T-Storms': 'bi-cloud-lightning-rain',
	'Flurries': 'bi-cloud-snow',
	'Snow': 'bi-cloud-snow',
	'Sleet': 'bi-cloud-sleet',
	'Ice': 'bi-cloud-sleet',
	'Wind': 'bi-wind',
	'Windy': 'bi-wind',
	'Hot': 'bi-thermometer-high',
	'Cold': 'bi-thermometer-low',
};

export const conditionIcon = (label: string): string => (
	conditionIconMap[label] ?? 'bi-cloud'
);

export const formatTemperature = (tempF: number, unit: 'F' | 'C'): string => {
	if (unit === 'C') return `${Math.round((tempF - 32) * 5 / 9)}°C`;
	return `${tempF}°F`;
};
