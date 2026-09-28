import type { Game } from '@arenaswap/core/types';
import { resolveGameColors } from '@arenaswap/ui/src/components/gameSurface';
import type { SeriesInfo } from './useSummaryData';

export const seriesSports = new Set(['baseball', 'basketball', 'hockey', 'softball']);

interface seriesDotsProps {
	info: SeriesInfo;
	game: Pick<Game, 'sportType' | 'homeTeam' | 'awayTeam'>;
}

// One mark per game of the series, filled in the winner's colour. The summary line already says
// who leads, so the marks are decoration for a screen reader.
const seriesDots = ({ info, game }: seriesDotsProps) => {
	if (!seriesSports.has(game.sportType)) return null;
	const total = info.totalCompetitions ?? 0;
	if (total < 2) return null;

	const [awayColor, homeColor] = resolveGameColors(game);
	// Our sources list future games first and completed games last.
	const events = [...(info.events ?? [])].toSorted((a, b) => {
		const aComp = a.statusType?.completed ? 1 : 0;
		const bComp = b.statusType?.completed ? 1 : 0;
		return bComp - aComp;
	});
	const dots = Array.from({ length: total }, (_, i) => {
		const ev = events[i];
		if (!ev?.statusType?.completed) return <span key={i} className='dt-series-dot' />;
		// seriesInfo is the one summary field that never passes a schema, so team may be absent.
		const winnerTeamId = ev.competitors?.find(c => c.winner)?.team?.id;
		const color = winnerTeamId === game.homeTeam.id ? homeColor
			: winnerTeamId === game.awayTeam.id ? awayColor
				: undefined;
		return <span key={i} className='dt-series-dot is-played' style={color ? { background: color } : undefined} />;
	});

	return (
		<span className='dt-series'>
			{info.summary && <span className='dt-series-summary'>{info.summary}</span>}
			<span className='dt-series-dots' aria-hidden='true'>{dots}</span>
		</span>
	);
};

export default seriesDots;
