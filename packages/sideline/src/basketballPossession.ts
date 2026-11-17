import type { EspnLastPlay } from './espnSchemas';

export type CourtSide = 'home' | 'away';

const silentPlay = /\b(technical|double foul|jump ball|timeout|substitution|challenge|review|replay|end period|end of|end game|ejection|delay)/i;
const freeThrow = /free throw\D*?(\d+) of (\d+)/i;
const freeThrowsPlusBall = /flagrant|clear path/i;

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
