import { redCardTunables } from '../constants';
import { getElapsedMinutes } from '../progress';
import { isLive, leadOf, none } from './shared';
import type { BoostDefinition, Game, RedCard, Side } from '../types';

// The team a man down, if the cards aren't even.
export const shorthandedSide = (game: Game<string>): Side | undefined => {
	const cards = game.redCards ?? [];
	const home = cards.filter(card => card.side === 'home').length;
	const away = cards.length - home;
	if (home === away) return undefined;
	return home > away ? 'home' : 'away';
};

const cardMagnitude = (game: Game<string>, card: RedCard): number => {
	const lead = leadOf(game, card.side);
	const margin = Math.abs(lead);
	if (margin === 0) return 10;
	if (margin === 1) return lead > 0 ? 10 : 7;
	if (margin === 2 && lead > 0) return 5;
	return 0;
};

// The match clock in a red card stops at the end of regulation for the half (45, 90, and 105 or 120
// in extra time), so a card shown in stoppage time reads as shown at the whistle. While that same
// stoppage is still being played it counts as just shown; the game clock can't say how long ago.
const stoppageEnds = [45, 90, 105, 120];

const minutesSince = (card: RedCard, minute: number, period: number | undefined): number => {
	const stoppageEnd = stoppageEnds.findIndex(end => Math.abs(card.minute - end) < 0.02);
	if (stoppageEnd >= 0 && period === stoppageEnd + 1 && minute >= card.minute) return 0;
	return minute - card.minute;
};

// A red card in a tied or one-goal game, fading over the next ten game minutes. Re-gated on the
// score every poll, so a goal that opens the game up ends it early.
export const redCardBoost: BoostDefinition = {
	id: 'redCard',
	bucket: 'moment',
	compute: ({ game, sport, league }) => {
		if (game.sportType !== 'soccer' || !isLive(game) || !game.redCards?.length) return none;
		const minute = getElapsedMinutes(game, sport, league);
		if (minute === null) return none;
		const { fullMinutes, fadeMinutes, secondCardFactor } = redCardTunables;
		let best = 0;
		game.redCards.forEach((card, index) => {
			const since = minutesSince(card, minute, game.period);
			if (since < 0 || since >= fadeMinutes) return;
			const fade = since <= fullMinutes ? 1 : 1 - (since - fullMinutes) / (fadeMinutes - fullMinutes);
			const earlierForSameTeam = game.redCards!.slice(0, index).some(other => other.side === card.side);
			best = Math.max(best, cardMagnitude(game, card) * fade * (earlierForSameTeam ? secondCardFactor : 1));
		});
		return best > 0 ? { points: Math.round(best) } : none;
	},
};
