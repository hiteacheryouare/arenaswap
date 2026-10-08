import { musicBpm } from '../stage/timing';

// The recording the films are scored to. It is kept out of the repo: drop it in scripts/film/music/.
// The numbers are measured off the file: its tempo, where its beat grid starts, and its last hit.
export const soundtrack = {
	file: 'putItOnTheFloor.mp3',
	bpm: 95,
	firstBeat: 0.003,
	finalHit: 115.325,
};

// The film plays the recording a hair faster, at our music tempo; this turns its seconds into ours.
export const stretch = soundtrack.bpm / musicBpm;

// The last hit is on the "and" of a beat but played a little behind it. The dot lands on the hit
// itself, this much after the grid's half beat.
export const finalHitLag = (() => {
	const beat = 60 / soundtrack.bpm;
	const halfBeats = (soundtrack.finalHit - soundtrack.firstBeat) / (beat / 2);
	return (halfBeats - Math.round(halfBeats)) * (beat / 2) * stretch;
})();
