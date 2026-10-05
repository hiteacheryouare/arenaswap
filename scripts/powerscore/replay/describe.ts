import type { Game } from '../../../packages/core/src/types';

const clockText = (game: Game): string => {
	if (game.sportType === 'baseball' || game.sportType === 'softball') {
		if (game.inningEnded) return `End ${game.period}`;
		const half = game.topOfInning === undefined ? '' : game.topOfInning ? 'T' : 'B';
		return `${half}${game.period}`;
	}
	const minutes = Math.floor(game.clockSeconds / 60);
	const seconds = String(Math.floor(game.clockSeconds % 60)).padStart(2, '0');
	return `P${game.period} ${minutes}:${seconds}`;
};

const situationText = (game: Game): string => {
	if (game.intermission) return 'break';
	if (game.delayed) return 'delay';
	if (game.sportType === 'baseball' || game.sportType === 'softball') {
		const r = game.baseRunners;
		const runners = r ? `${r.first ? '1' : '-'}${r.second ? '2' : '-'}${r.third ? '3' : '-'}` : '---';
		const hits = game.homeTeam.hits !== undefined ? ` H ${game.awayTeam.hits ?? '?'}-${game.homeTeam.hits}` : '';
		return `${runners} ${game.bso?.outs ?? '?'}out${hits}`;
	}
	if (game.sportType === 'football' && game.down) {
		const side = game.possessionTeamId === game.homeTeam.id ? game.homeTeam.abbreviation : game.possessionTeamId === game.awayTeam.id ? game.awayTeam.abbreviation : '?';
		const toGo = game.yardLine === undefined || side === '?' ? undefined : game.possessionTeamId === game.homeTeam.id ? 100 - game.yardLine : game.yardLine;
		const spot = toGo === undefined ? 'ball on ?' : toGo <= 50 ? `ball on opp ${toGo}` : `ball on own ${100 - toGo}`;
		const timeouts = `TO ${game.awayTeam.timeouts ?? '?'}-${game.homeTeam.timeouts ?? '?'}`;
		return `${side} ${game.down}&${game.distance ?? '?'}, ${spot}${game.isRedZone ? ' RZ' : ''} ${timeouts}`;
	}
	if (game.redCardEvents?.length) {
		const cards = game.redCardEvents.map(card => `${card.teamId === game.homeTeam.id ? game.homeTeam.abbreviation : game.awayTeam.abbreviation} red ${Math.round(card.minute)}'`);
		return cards.join(' ');
	}
	return '';
};

const rank = (team: Game['homeTeam']) => (team.rank ? `#${team.rank} ` : '');

export const describeGame = (game: Game | undefined): string => {
	if (!game) return '(not live)';
	const series = game.series?.kind === 'playoff' ? ` [series ${game.series.awayWins}-${game.series.homeWins} of ${game.series.bestOf}]` : '';
	return `${game.league}${series} ${rank(game.awayTeam)}${game.awayTeam.abbreviation} ${game.awayTeam.score} @ ${rank(game.homeTeam)}${game.homeTeam.abbreviation} ${game.homeTeam.score} ${clockText(game)} ${situationText(game)}`.trim();
};
