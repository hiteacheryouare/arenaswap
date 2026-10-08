import type { Game } from '@arenaswap/core/types';
import type { SeriesInfo } from './useSummaryData';
import { resolveChartLineColors } from '@arenaswap/ui/src/components/colorUtils';
import { seriesSlots } from './seriesSlots';

export const seriesSports = new Set(['baseball', 'basketball', 'hockey', 'softball']);

interface seriesDotsProps {
	info: SeriesInfo;
	game: Pick<Game, 'sportType' | 'homeTeam' | 'awayTeam'>;
}

const seriesDots = ({ info, game }: seriesDotsProps) => {
	if (!seriesSports.has(game.sportType)) return null;
	const total = info.totalCompetitions ?? 0;
	if (total < 2) return null;

	// Lifted the way the win probability chart's lines are, since the hero is just as dark: a navy or
	// black dot as published disappears into it. It also keeps each team one colour across the page.
	const [awayColor, homeColor] = resolveChartLineColors(game.awayTeam, game.homeTeam, 'dark', '#6b7280', '#9ca3af');
	const dots = seriesSlots(info).map((slot, i) => {
		if (slot.kind === 'upcoming') return <i key={i} className='bi bi-circle series-dot series-dot-empty' />;
		if (slot.kind === 'ifNecessary') return <i key={i} className='bi bi-circle series-dot series-dot-empty is-if-necessary' />;
		if (slot.kind === 'notNeeded') return <i key={i} className='bi bi-dash series-dot series-dot-not-needed' />;
		let color = '#8b949e';
		// seriesInfo is the one summary field that never passes a schema, so team may be absent.
		if (slot.teamId === game.homeTeam.id) color = homeColor;
		else if (slot.teamId === game.awayTeam.id) color = awayColor;
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
