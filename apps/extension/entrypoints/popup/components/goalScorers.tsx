import { i18n } from '#i18n';
import { isHomeFirst } from '@arenaswap/core/constants';
import type { Game, Team } from '@arenaswap/core/types';
import { describeScorers } from './gameSituation';

const linesPerSide = 4;

const ScorerList = ({ game, team, side }: { game: Game; team: Team; side: 'left' | 'right' }) => {
	const lines = describeScorers((game.goalEvents ?? []).filter(goal => goal.teamId === team.id), i18n.t);
	const shown = lines.length > linesPerSide ? lines.slice(0, linesPerSide - 1) : lines;
	const hidden = lines.length - shown.length;
	return (
		<ul className={`list-unstyled m-0 gd-scorers-side is-${side}`} aria-label={i18n.t('detail.scorersLabel', { team: team.name || team.abbreviation })}>
			{shown.map(line => <li key={line}>{line}</li>)}
			{hidden > 0 && <li className='gd-scorers-more'>{i18n.t('detail.scorersMore', hidden)}</li>}
		</ul>
	);
};

const goalScorers = ({ game }: { game: Game }) => {
	if (!game.goalEvents?.length) return null;
	const [left, right] = isHomeFirst(game) ? [game.homeTeam, game.awayTeam] : [game.awayTeam, game.homeTeam];
	return (
		<div className='gd-scorers'>
			<ScorerList game={game} team={left} side='left' />
			<ScorerList game={game} team={right} side='right' />
		</div>
	);
};

export default goalScorers;
