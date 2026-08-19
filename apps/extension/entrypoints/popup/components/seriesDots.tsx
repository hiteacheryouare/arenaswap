import type { Game } from '@arenaswap/core/types';
import type { SeriesInfo } from './useSummaryData';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';

const seriesSports = new Set(['baseball', 'basketball', 'hockey', 'softball']);

interface seriesDotsProps {
	info: SeriesInfo;
	game: Pick<Game, 'sportType' | 'homeTeam' | 'awayTeam'>;
}

const seriesDots = ({ info, game }: seriesDotsProps) => {
	if (!seriesSports.has(game.sportType)) return null;
	const total = info.totalCompetitions ?? 0;
	if (total < 2) return null;

	// Mid-grey fallbacks, not near-white: these dots sit on the light matchup card.
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#6b7280', '#9ca3af');
	// ESPN returns future games first and completed games last.
	const events = [...(info.events ?? [])].toSorted((a, b) => {
		const aComp = a.statusType?.completed ? 1 : 0;
		const bComp = b.statusType?.completed ? 1 : 0;
		return bComp - aComp;
	});
	const dots = Array.from({ length: total }, (_, i) => {
		const ev = events[i];
		if (!ev?.statusType?.completed) {
			return <i key={i} className='bi bi-circle series-dot series-dot-empty' />;
		}
		const winner = ev.competitors?.find(c => c.winner);
		let color = '#8b949e';
		// seriesInfo is the one summary field that never passes a schema, so team may be absent.
		const winnerTeamId = winner?.team?.id;
		if (winnerTeamId !== undefined) {
			if (winnerTeamId === game.homeTeam.id) color = homeColor;
			else if (winnerTeamId === game.awayTeam.id) color = awayColor;
		}
		return <i key={i} className='bi bi-circle-fill series-dot' style={{ color }} />;
	});

	return (
		<div className='d-flex align-items-center justify-content-center gap-2 series-dots-wrap'>
			{info.summary && <div className='series-dots-summary'>{info.summary}</div>}
			<div className='d-flex gap-1'>{dots}</div>
		</div>
	);
};

export default seriesDots;
