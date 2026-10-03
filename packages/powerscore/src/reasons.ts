import { scorerTunables } from './constants';
import type { ReasonFragment } from './types';

const ordinal = (n: number): string => {
	if (n === 1) return '1st';
	if (n === 2) return '2nd';
	if (n === 3) return '3rd';
	return `${n}th`;
};

const text = (params: ReasonFragment['params'], name: string): string => String(params?.[name] ?? '');

// Every key the built-in modes emit. A custom mode's own keys render as their params-free key.
export const renderReasonEnglish = ({ key, params }: ReasonFragment): string => {
	const { reasons } = scorerTunables;
	switch (key) {
		case 'tied': return reasons.tied;
		case 'margin': return `${text(params, 'margin')}-${text(params, 'unit')} ${reasons.closenessGameSuffix}`;
		case 'overtime': return reasons.overtime;
		case 'extraTime': return reasons.extraTime;
		case 'shootout': return reasons.shootout;
		case 'extraInnings': return reasons.extraInnings;
		case 'inning': return `${ordinal(Number(params?.inning))} ${reasons.inningSuffix}`;
		case 'clockLeft': return `${text(params, 'clock')} ${reasons.clockLeftSuffix}`;
		case 'minutesIn': return `${text(params, 'minutes')} ${reasons.minutesElapsedSuffix}`;
		case 'underMinutes': return `${reasons.underPrefix} ${text(params, 'minutes')} ${reasons.minutesLeftSuffix}`;
		case 'overtimeLooming': return reasons.overtimeAnticipation;
		case 'levelLate': return reasons.drawAnticipation;
		case 'outscoring':
			return `${text(params, 'team')} ${reasons.momentumOutscoring} ${text(params, 'other')} ${text(params, 'scoredFor')}-${text(params, 'scoredAgainst')}`;
		case 'onARoll': return `${text(params, 'team')} ${reasons.momentumRolling}`;
		case 'tradingLeads': return reasons.leadChangeMultiple;
		case 'justTookLead': return reasons.leadChangeSingle;
		case 'cuttingIn': return `${text(params, 'team')} ${reasons.comebackBig ?? 'cutting into it'}`;
		case 'closingGap': return `${text(params, 'team')} ${reasons.comebackModerate ?? 'closing the gap'}`;
		case 'fallback': return reasons.fallback;
		case 'blowoutMargin': return `${text(params, 'margin')}-${text(params, 'unit')} ${reasons.blowoutMarginSuffix ?? 'lead'}`;
		case 'leadHeld': return `${text(params, 'team')} ${reasons.leadHeld ?? 'in control'}`;
		case 'earlyRout': return reasons.earlyRout ?? 'plenty of rout left';
		case 'pilingOn': return `${text(params, 'team')} ${reasons.pilingOn ?? 'piling on'}`;
		case 'fantasyHasBall': return `${text(params, 'name')} has the ball`;
		case 'fantasyRedZone': return `${text(params, 'name')} in the red zone`;
		case 'fantasyFieldGoalRange': return `${text(params, 'name')} in field goal range`;
		case 'fantasyDefense': return `${text(params, 'name')} on the field`;
		case 'fantasyAtBat': return `${text(params, 'name')} at bat`;
		case 'fantasyOnDeck': return `${text(params, 'name')} on deck`;
		case 'fantasyPitching': return `${text(params, 'name')} pitching`;
		case 'fantasyInGame': return `${text(params, 'name')} in the game`;
		case 'fantasyPoints': return `${text(params, 'name')} +${text(params, 'points')} fantasy points`;
		case 'fantasyRostered': return `${text(params, 'count')} of your players`;
		default: {
			const label = reasons.boosts?.[key];
			if (label !== undefined && params?.points !== undefined) return `${label} (+${params.points})`;
			return label ?? key;
		}
	}
};

export const renderReasonsEnglish = (fragments: readonly ReasonFragment[]): string => fragments.map(renderReasonEnglish).join(', ');

export const formatClock = (seconds: number): string => {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
};
