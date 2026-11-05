import type { Game, Team } from '@arenaswap/core/types';
import { isHomeFirst } from '@arenaswap/core/constants';
import OnColorCrest from '@arenaswap/ui/src/components/onColorCrest';
import { stockingFills, type stockingFill } from '../../../utils/holidayDecorations';
import HolidayGarland from './holidayGarland';

interface holidayStockingsProps {
	game: Game;
	awayColor: string;
	homeColor: string;
}

interface stockingProps {
	team: Team;
	color: string;
	fill: stockingFill;
	mirrored: boolean;
}

const bodyPath = 'M3 14 H15 V23 Q15 25 17 26 L19.5 27.4 Q22.6 29.4 21 32.2 Q19.6 34.4 15.6 33.6 L8.4 33 Q3 32.6 3 27.6 Z';

const CandyCane = () => (
	<g className='holiday-treat'>
		<path d='M6 11 V5.4 Q6 2.6 8.6 2.6 Q11.2 2.6 11.2 5.2' className='holiday-candy-cane' />
		<path d='M6 11 V5.4 Q6 2.6 8.6 2.6 Q11.2 2.6 11.2 5.2' className='holiday-candy-cane-stripe' />
	</g>
);

const Gift = () => (
	<g className='holiday-treat'>
		<rect x={9.6} y={5.4} width={5.4} height={5.4} rx={0.6} className='holiday-gift' />
		<path d='M12.3 5.4 V10.8 M9.6 8.1 H15' className='holiday-gift-ribbon' />
	</g>
);

const Ornament = () => (
	<g className='holiday-treat'>
		<circle cx={5.2} cy={8.4} r={2.6} className='holiday-treat-ornament' />
		<circle cx={4.4} cy={7.6} r={0.7} className='holiday-ornament-shine' />
	</g>
);

const treatsInOrder = [Gift, CandyCane, Ornament];

// The crest sits on the leg like a stitched patch. It stays outside the mirrored group, so a
// right-hand stocking's crest still reads the right way round.
const Stocking = ({ team, color, fill, mirrored }: stockingProps) => (
	<div className={`holiday-stocking${mirrored ? ' is-mirrored' : ''}`} style={{ color }}>
		<svg viewBox='0 0 24 35' aria-hidden='true'>
			<g transform={mirrored ? 'translate(24 0) scale(-1 1)' : undefined}>
				<path d='M9 -9 V9' className='holiday-stocking-loop' />
				{treatsInOrder.slice(0, fill.treats).map((Treat, index) => <Treat key={index} />)}
				{fill.coal && (
					<g className='holiday-coal'>
						<path d='M3.6 11 Q2.6 6.4 6 5.4 Q7.6 2 11 3.6 Q14.8 3.4 14.6 7.6 L14.4 11 Z' />
						<path d='M5.4 6.6 L7.2 5.6 M10 4.6 L12 5.2 M12.4 7.4 L13.2 8.6' className='holiday-coal-glint' />
					</g>
				)}
				<path d={bodyPath} className='holiday-stocking-body' />
				<rect x={2} y={9.4} width={14} height={5} rx={1.6} className='holiday-stocking-cuff' />
			</g>
		</svg>
		<OnColorCrest team={team} surface={color} className='holiday-stocking-crest' fallback='blank' />
	</div>
);

// One under each crest, in the hero's own crest columns, toes turned in towards the score, all
// hung from the garland along the hero's bottom edge.
const holidayStockings = ({ game, awayColor, homeColor }: holidayStockingsProps) => {
	const fills = stockingFills(game);
	const away = { team: game.awayTeam, color: awayColor, fill: fills.away };
	const home = { team: game.homeTeam, color: homeColor, fill: fills.home };
	const [left, right] = isHomeFirst(game) ? [home, away] : [away, home];

	return (
		<div className='holiday-mantel' aria-hidden='true'>
			<HolidayGarland leftColor={left.color} rightColor={right.color} />
			<div className='holiday-stockings'>
				<Stocking {...left} mirrored={false} />
				<Stocking {...right} mirrored />
			</div>
		</div>
	);
};

export default holidayStockings;
