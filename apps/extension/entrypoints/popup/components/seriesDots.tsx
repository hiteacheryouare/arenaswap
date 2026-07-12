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

	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#e6edf3', '#e6edf3');
	// ESPN returns future games first and completed games last; sort completed to the front
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
		if (winner) {
			if (winner.team.id === game.homeTeam.id) color = homeColor;
			else if (winner.team.id === game.awayTeam.id) color = awayColor;
		}
		return <i key={i} className='bi bi-circle-fill series-dot' style={{ color }} />;
	});

	return (
		<div className='d-flex flex-column align-items-center gap-1 series-dots-wrap'>
			{info.summary && <div className='series-dots-summary'>{info.summary}</div>}
			<div className='d-flex gap-2'>{dots}</div>
		</div>
	);
};

export default seriesDots;
