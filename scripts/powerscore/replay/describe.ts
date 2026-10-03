import type { Game } from '../../../packages/core/src/types';

const clockText = (game: Game): string => {
	if (game.sportType === 'baseball' || game.sportType === 'softball') {
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
		return `${runners} ${game.bso?.outs ?? '?'}out`;
	}
	if (game.sportType === 'football' && game.down) {
		const side = game.possessionTeamId === game.homeTeam.id ? game.homeTeam.abbreviation : game.possessionTeamId === game.awayTeam.id ? game.awayTeam.abbreviation : '?';
		return `${side} ${game.down}&${game.distance ?? '?'} @${game.yardLine ?? '?'}${game.isRedZone ? ' RZ' : ''}`;
	}
	return '';
};

const rank = (team: Game['homeTeam']) => (team.rank ? `#${team.rank} ` : '');

export const describeGame = (game: Game | undefined): string => {
	if (!game) return '(not live)';
	return `${game.league} ${rank(game.awayTeam)}${game.awayTeam.abbreviation} ${game.awayTeam.score} @ ${rank(game.homeTeam)}${game.homeTeam.abbreviation} ${game.homeTeam.score} ${clockText(game)} ${situationText(game)}`.trim();
};
