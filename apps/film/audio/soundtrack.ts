import { musicBpm } from '../stage/timing';

export const soundtrack = {
	file: 'putItOnTheFloor.mp3',
	bpm: 95,
	firstBeat: 0.003,
	finalHit: 115.325,
};

export const stretch = soundtrack.bpm / musicBpm;

export const finalHitLag = (() => {
	const beat = 60 / soundtrack.bpm;
	const halfBeats = (soundtrack.finalHit - soundtrack.firstBeat) / (beat / 2);
	return (halfBeats - Math.round(halfBeats)) * (beat / 2) * stretch;
})();
