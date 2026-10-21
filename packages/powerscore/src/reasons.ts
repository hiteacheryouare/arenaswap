import type { ReasonFragment } from './types';

export const ordinal = (n: number): string => {
	const teen = n % 100 >= 11 && n % 100 <= 13;
	const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
	return `${n}${suffix}`;
};

type Params = ReasonFragment['params'];

const text = (params: Params, name: string): string => String(params?.[name] ?? '');
const nth = (params: Params, name: string): string => ordinal(Number(params?.[name] ?? 0));
// "an 11–2 run", "an 8–0 run", "a 10–0 run".
const article = (n: string): string => (/^(8|11|18)(\D|$)/.test(n) || /^8\d/.test(n) ? 'an' : 'a');
const lastMinutes = (params: Params): string => (Number(params?.minutes) === 1 ? 'in the last minute' : `in the last ${text(params, 'minutes')} minutes`);

const whenEnglish = (params: Params): string | undefined => {
	switch (params?.when) {
		case 'clock': return `with ${text(params, 'clock')} left`;
		case 'quarter': return `in the ${nth(params, 'period')} quarter`;
		case 'half': return `in the ${nth(params, 'period')} half`;
		case 'period': return `in the ${nth(params, 'period')} period`;
		case 'overtime': return 'in overtime';
		case 'overtimeClock': return `with ${text(params, 'clock')} left in overtime`;
		case 'overtimeNumbered': return `in the ${nth(params, 'period')} overtime`;
		case 'minute': return `in the ${nth(params, 'period')} minute`;
		case 'extraTime': return 'in extra time';
		case 'top': return `in the top of the ${nth(params, 'period')}`;
		case 'bottom': return `in the bottom of the ${nth(params, 'period')}`;
		case 'inning': return `in the ${nth(params, 'period')}`;
		default: return undefined;
	}
};

const withWhen = (sentence: string, params: Params): string => {
	const when = whenEnglish(params);
	return when ? `${sentence} ${when}` : sentence;
};

const stateEnglish = (params: Params): string => {
	const score = params?.score === 'tied'
		? 'Tied'
		: params?.score === 'up' ? `Up ${text(params, 'margin')}` : `${text(params, 'team')} up ${text(params, 'margin')}`;
	const when = whenEnglish(params);
	return when ? `${score} ${when}` : score;
};

// Every key the built-in modes emit. A custom mode's own keys render as themselves.
export const renderReasonEnglish = ({ key, params }: ReasonFragment): string => {
	const team = text(params, 'team');
	const name = text(params, 'name');
	switch (key) {
		case 'state': return stateEnglish(params);
		case 'shootout': return 'Shootout';
		case 'penaltyShootout': return 'Penalty shootout';

		case 'redZone': return `${team} in the red zone`;
		case 'redZoneThirdAndShort': return `${team} facing third and short in the red zone`;
		case 'redZoneFourthDown': return `${team} facing fourth down in the red zone`;
		case 'driveTrailing': return `${team} down ${text(params, 'trailBy')}, driving from ${text(params, 'yards')} yards out with ${text(params, 'clock')} left`;
		case 'driveTied': return `Tied, ${team} driving from ${text(params, 'yards')} yards out with ${text(params, 'clock')} left`;
		case 'emptyNet': return `${team} pulled the goalie, down ${text(params, 'margin')} with ${text(params, 'clock')} left`;
		case 'powerPlay': return 'Power play';
		case 'powerPlayTeam': return `${team} on the power play`;
		case 'goAheadRun': return `${team} have the go-ahead run on base`;
		case 'tyingRun': return `${team} have the tying run on base`;
		case 'winningRun': return `${team} have the winning run on base`;
		case 'runnerSecond': return 'Runner on second';
		case 'runnerThird': return 'Runner on third';
		case 'runnersFirstSecond': return 'Runners on first and second';
		case 'runnersFirstThird': return 'Runners on the corners';
		case 'runnersSecondThird': return 'Runners on second and third';
		case 'basesLoaded': return 'Bases loaded';
		case 'noHitter': return `${team} have no hits through ${text(params, 'innings')} innings`;
		case 'doubleNoHitter': return `Neither team has a hit through ${text(params, 'innings')} innings`;
		case 'redCard': return `${team} down to ${text(params, 'players')} since the ${nth(params, 'minute')} minute`;
		case 'fantasyHasBall': return `${name} has the ball`;
		case 'fantasyRedZone': return `${name} in the red zone`;
		case 'fantasyFieldGoalRange': return `${name} in field goal range`;
		case 'fantasyDefense': return `${name} on the field`;
		case 'fantasyAtBat': return `${name} at bat`;
		case 'fantasyOnDeck': return `${name} on deck`;
		case 'fantasyPitching': return `${name} pitching`;
		case 'fantasyInGame': return `${name} in the game`;

		case 'run': return `${team} on ${article(text(params, 'scoredFor'))} ${text(params, 'scoredFor')}–${text(params, 'scoredAgainst')} run`;
		case 'runToLead': return `${team} on ${article(text(params, 'scoredFor'))} ${text(params, 'scoredFor')}–${text(params, 'scoredAgainst')} run to take the lead`;
		case 'scoredStraight': return `${team} have scored ${text(params, 'count')} straight`;
		case 'scoredStraightToLead': return `${team} have scored ${text(params, 'count')} straight to take the lead`;
		case 'outscoring': return `${team} outscoring ${text(params, 'other')} ${text(params, 'scoredFor')}–${text(params, 'scoredAgainst')} ${lastMinutes(params)}`;
		case 'leadChanges': return `${text(params, 'count')} lead changes ${lastMinutes(params)}`;
		case 'tookLead': return `${team} just took the lead`;
		case 'tiedIt': return withWhen(`${team} just tied it`, params);
		case 'cameBack': return withWhen(`${team} came back from ${text(params, 'from')} down`, params);
		case 'cameBackToLead': return `${team} came back from ${text(params, 'from')} down to lead`;
		case 'cutDeficit': return `${team} cut the deficit from ${text(params, 'from')} to ${text(params, 'to')}`;
		case 'fantasyPoints': return `${name} has scored ${text(params, 'points')} fantasy points ${lastMinutes(params)}`;

		case 'seriesClinch': return `${team} clinch the series with a win`;
		case 'seriesDecider': return `Game ${text(params, 'game')}, winner takes the series`;
		case 'raceClinch': return `${team} clinch with a win`;
		case 'raceElimination': return `${team} are out with a loss`;
		case 'upset': return `${team} were ${text(params, 'chance')}% to win before the game`;
		case 'fantasyRostered': return Number(params?.count) === 1 ? '1 of your players is in this game' : `${text(params, 'count')} of your players are in this game`;
		default: return key;
	}
};

export const renderReasonsEnglish = (fragments: readonly ReasonFragment[]): string => fragments.map(renderReasonEnglish).join('. ');

export const formatClock = (seconds: number): string => {
	const whole = Math.floor(seconds);
	return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};
