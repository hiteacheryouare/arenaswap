import { scoreMaxTotal } from './constants';
import { clamp } from './math';
import type { RivalBand, RivalryResult, ScoreSnapshot, Side, SignalInput } from './types';

const blownLeadStrength = 20;
// What's left of a game a rival is running away with.
const buriedShare = 0.05;

const otherSide = (side: Side): Side => (side === 'home' ? 'away' : 'home');

const leaderOf = ({ game }: SignalInput): Side | undefined => {
	if (game.homeTeam.score > game.awayTeam.score) return 'home';
	if (game.awayTeam.score > game.homeTeam.score) return 'away';
	return undefined;
};

const ledEarlier = (history: readonly ScoreSnapshot[], side: Side): boolean => history.some(snapshot => (
	side === 'home' ? snapshot.homeScore > snapshot.awayScore : snapshot.awayScore > snapshot.homeScore
));

/*
	Ordinary games keep their order, squeezed into 0–ordinaryCeiling. A rival losing by more than two
	scores takes the range above it, placed by how bad the beating is. A rival in front keeps a share
	of its ordinary score that shrinks as the lead grows, down to almost nothing at a rout.
*/
export const rankAgainstRivals = (input: SignalInput, total: number, rivalSides: readonly Side[], band: RivalBand): { total: number; rivalry: RivalryResult } => {
	const ceiling = clamp(Math.round(band.ordinaryCeiling), 0, scoreMaxTotal - 1);
	const [, twoScores, rout] = input.sport.closenessMargins;
	const leader = leaderOf(input);
	const trailer = leader && otherSide(leader);

	if (trailer && rivalSides.includes(trailer) && input.margin > twoScores) {
		const blownLead = ledEarlier(input.context.history ?? [], trailer);
		const strength = clamp(total + (blownLead ? blownLeadStrength : 0), 0, scoreMaxTotal);
		const floor = ceiling + 1;
		const after = floor + Math.round((scoreMaxTotal - floor) * strength / scoreMaxTotal);
		return { total: after, rivalry: { kind: 'beatdown', side: trailer, before: total, after, ...(blownLead ? { blownLead } : {}) } };
	}

	const ordinary = Math.round(total * ceiling / scoreMaxTotal);
	if (leader && rivalSides.includes(leader)) {
		const after = Math.round(ordinary * Math.max(buriedShare, 1 - input.margin / rout));
		return { total: after, rivalry: { kind: 'winning', side: leader, before: total, after } };
	}
	return { total: ordinary, rivalry: { kind: 'ordinary', before: total, after: ordinary } };
};
