import { musicBpm } from '../stage/timing';

export const soundtrack = {
	file: 'putItOnTheFloor.mp3',
	measuredBpm: 95,
	firstBeatSeconds: 0.003,
	finalHitSeconds: 115.325,
};

export const sourceToFilmSeconds = soundtrack.measuredBpm / musicBpm;

export const finalHitLag = (() => {
	const beat = 60 / soundtrack.measuredBpm;
	const halfBeats = (soundtrack.finalHitSeconds - soundtrack.firstBeatSeconds) / (beat / 2);
	return (halfBeats - Math.round(halfBeats)) * (beat / 2) * sourceToFilmSeconds;
})();
