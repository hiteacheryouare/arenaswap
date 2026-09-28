import type { temperatureDisplayUnit } from './weatherUtils';

export interface BettingDisplayPrefs {
	bettingEnabled: boolean;
}

export interface WeatherDisplayPrefs {
	temperatureUnit: temperatureDisplayUnit;
}
