const conditionIconMap: Record<string, string> = {
	'sunny': 'bi-sun',
	'fair': 'bi-sun',
	'clear': 'bi-sun',
	'mostly sunny': 'bi-sun',
	'mostly clear': 'bi-sun',
	'partly sunny': 'bi-cloud-sun',
	'partly cloudy': 'bi-cloud-sun',
	'mostly cloudy': 'bi-clouds',
	'cloudy': 'bi-clouds',
	'overcast': 'bi-clouds',
	'fog': 'bi-cloud-fog2',
	'foggy': 'bi-cloud-fog2',
	'haze': 'bi-cloud-haze',
	'hazy': 'bi-cloud-haze',
	'hazy sunshine': 'bi-cloud-haze2',
	'smoke': 'bi-cloud-fog',
	'smoky': 'bi-cloud-fog',
	'light rain': 'bi-cloud-drizzle',
	'drizzle': 'bi-cloud-drizzle',
	'showers': 'bi-cloud-drizzle',
	'scattered showers': 'bi-cloud-drizzle',
	'chance rain': 'bi-cloud-drizzle',
	'chance of rain': 'bi-cloud-drizzle',
	'rain': 'bi-cloud-rain',
	'heavy rain': 'bi-cloud-rain-heavy',
	'thunderstorms': 'bi-cloud-lightning-rain',
	'thunderstorm': 'bi-cloud-lightning-rain',
	't-storms': 'bi-cloud-lightning-rain',
	'scattered thunderstorms': 'bi-cloud-lightning-rain',
	'isolated thunderstorms': 'bi-cloud-lightning-rain',
	'chance thunderstorms': 'bi-cloud-lightning-rain',
	'flurries': 'bi-cloud-snow',
	'snow': 'bi-cloud-snow',
	'sleet': 'bi-cloud-sleet',
	'ice': 'bi-cloud-sleet',
	'wind': 'bi-wind',
	'windy': 'bi-wind',
	'breezy': 'bi-wind',
	'hot': 'bi-thermometer-high',
	'cold': 'bi-thermometer-low',
};

export const conditionIcon = (label: string): string => {
	// Compound labels like "Partly Cloudy/Windy" — use the primary condition
	const primary = (label.split('/')[0] ?? label).trim().toLowerCase();
	return conditionIconMap[primary] ?? 'bi-cloud';
};

export const formatTemperature = (tempF: number, unit: 'F' | 'C'): string => {
	if (unit === 'C') return `${Math.round((tempF - 32) * 5 / 9)}°C`;
	return `${tempF}°F`;
};
