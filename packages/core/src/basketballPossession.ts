import type { EspnLastPlay } from './espnSchemas';

export type CourtSide = 'home' | 'away';

// Plays that leave the ball where it was, or that say nothing about where it is. A technical and
// its free throw are both here: the ball goes back to whoever had it.
const silentPlay = /\b(technical|double foul|jump ball|timeout|substitution|challenge|review|replay|end period|end of|end game|ejection|delay)/i;
const freeThrow = /free throw\D*?(\d+) of (\d+)/i;
// After these the shooting team keeps the ball even when the last shot drops.
const freeThrowsPlusBall = /flagrant|clear path/i;

// Our sources send no possession for basketball, so it is read off the last play: the team that
// rebounds has it, and a make, a turnover or a foul hands it to the other side. Undefined is
// "this play doesn't say", which the popup reads as "unchanged" rather than "nobody".
export const deriveBasketballPossession = (lastPlay: EspnLastPlay | undefined, homeId: string, awayId: string): CourtSide | undefined => {
	const teamId = lastPlay?.team?.id;
	if (teamId !== homeId && teamId !== awayId) return undefined;
	const team: CourtSide = teamId === homeId ? 'home' : 'away';
	const other: CourtSide = team === 'home' ? 'away' : 'home';
	const description = `${lastPlay?.type?.text ?? ''} ${lastPlay?.text ?? ''}`;
	const made = (lastPlay?.scoreValue ?? 0) > 0;

	if (silentPlay.test(description)) return undefined;
	if (/rebound/i.test(description)) return team;

	const shot = freeThrow.exec(description);
	if (shot) {
		if (freeThrowsPlusBall.test(description) || Number(shot[1]) < Number(shot[2])) return team;
		return made ? other : undefined;
	}

	if (/turnover|traveling|foul|charge/i.test(description)) return other;
	return made ? other : undefined;
};
