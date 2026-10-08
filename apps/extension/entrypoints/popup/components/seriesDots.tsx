import type { Game } from '@arenaswap/core/types';
import type { SeriesInfo } from './useSummaryData';
import { resolveTeamColorPair, seriesDotRing, seriesDotRingFallback } from '@arenaswap/ui/src/components/colorUtils';
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

	// The teams' own colours, as published. Each dot is a team, and a lifted navy reads as some other club.
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#6b7280', '#9ca3af');
	// seriesInfo is the one summary field that never passes a schema, so team may be absent.
	const sideOf = (teamId: string | undefined) => {
		if (teamId === game.homeTeam.id) return { team: game.homeTeam, fill: homeColor };
		if (teamId === game.awayTeam.id) return { team: game.awayTeam, fill: awayColor };
		return null;
	};
	const dots = seriesSlots(info).map((slot, i) => {
		if (slot.kind === 'upcoming') return <i key={i} className='bi bi-circle series-dot series-dot-empty' />;
		if (slot.kind === 'ifNecessary') return <i key={i} className='bi bi-circle series-dot series-dot-empty is-if-necessary' />;
		if (slot.kind === 'notNeeded') return <i key={i} className='bi bi-dash series-dot series-dot-not-needed' />;
		const side = sideOf(slot.teamId);
		const fill = side?.fill ?? '#8b949e';
		const ring = side ? seriesDotRing(side.team, side.fill) : seriesDotRingFallback;
		return (
			<span key={i} className='series-dot position-relative d-inline-flex align-items-center justify-content-center'>
				<i className='bi bi-circle-fill' style={{ color: ring }} />
				<i className='bi bi-circle-fill series-dot-core position-absolute' style={{ color: fill }} />
			</span>
		);
	});

	return (
		<div className='d-flex align-items-center justify-content-center gap-2 series-dots-wrap'>
			{info.summary && <div className='series-dots-summary'>{info.summary}</div>}
			<div className='d-flex gap-1'>{dots}</div>
		</div>
	);
};

export default seriesDots;
