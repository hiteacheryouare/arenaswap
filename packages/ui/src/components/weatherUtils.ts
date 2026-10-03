import type { UserPreferences } from '@arenaswap/core/types';

export type temperatureDisplayUnit = UserPreferences['temperatureUnit'];

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
	'a shower': 'bi-cloud-drizzle',
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
	'intermittent clouds': 'bi-cloud-sun',
	'dreary': 'bi-clouds',
	'dreary (overcast)': 'bi-clouds',
	'hazy moonlight': 'bi-cloud-haze',
	'freezing rain': 'bi-cloud-sleet',
	'rain and snow': 'bi-cloud-sleet',
};

// AccuWeather's icon numbers: https://apidev.accuweather.com/developers/weather-icons
// Bootstrap Icons has no moon-with-rain glyph, so night precipitation shares the day icon.
const conditionCodeIconMap: Record<number, string> = {
	1: 'bi-sun',
	2: 'bi-sun',
	3: 'bi-cloud-sun',
	4: 'bi-cloud-sun',
	5: 'bi-cloud-haze2',
	6: 'bi-clouds',
	7: 'bi-clouds',
	8: 'bi-clouds',
	11: 'bi-cloud-fog2',
	12: 'bi-cloud-drizzle',
	13: 'bi-cloud-drizzle',
	14: 'bi-cloud-drizzle',
	15: 'bi-cloud-lightning-rain',
	16: 'bi-cloud-lightning-rain',
	17: 'bi-cloud-lightning-rain',
	18: 'bi-cloud-rain',
	19: 'bi-cloud-snow',
	20: 'bi-cloud-snow',
	21: 'bi-cloud-snow',
	22: 'bi-cloud-snow',
	23: 'bi-cloud-snow',
	24: 'bi-cloud-sleet',
	25: 'bi-cloud-sleet',
	26: 'bi-cloud-sleet',
	29: 'bi-cloud-sleet',
	30: 'bi-thermometer-high',
	31: 'bi-thermometer-low',
	32: 'bi-wind',
	33: 'bi-moon-stars',
	34: 'bi-moon-stars',
	35: 'bi-cloud-moon',
	36: 'bi-cloud-moon',
	37: 'bi-cloud-haze',
	38: 'bi-clouds',
	39: 'bi-cloud-drizzle',
	40: 'bi-cloud-drizzle',
	41: 'bi-cloud-lightning-rain',
	42: 'bi-cloud-lightning-rain',
	43: 'bi-cloud-snow',
	44: 'bi-cloud-snow',
};

// "Mostly cloudy w/ showers" reduces to the showers, "Partly Cloudy/Windy" to the partly cloudy.
export const primaryCondition = (label: string): string => {
	const normalized = label.trim().toLowerCase();
	const precipitation = normalized.split(' w/ ')[1] ?? normalized;
	return (precipitation.split('/')[0] ?? precipitation).trim();
};

export const conditionIcon = (label: string, code?: number): string =>
	(code !== undefined && conditionCodeIconMap[code]) || conditionIconMap[primaryCondition(label)] || 'bi-cloud';

export const formatTemperature = (tempF: number, unit: temperatureDisplayUnit): string => {
	if (unit === 'C') return `${Math.round((tempF - 32) * 5 / 9)}°C`;
	// A Rømer degree is nearly twice the size of a Fahrenheit one, so whole numbers would round
	// away the half degrees the scale is built on — blood heat is 22.5 on it, freezing 7.5.
	if (unit === 'Ro') return `${Number(((tempF - 32) * 7 / 24 + 7.5).toFixed(1))}°Rø`;
	return `${tempF}°F`;
};
