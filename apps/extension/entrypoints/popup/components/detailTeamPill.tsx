import { i18n } from '#i18n';
import type { Team } from '@arenaswap/core/types';
import OnColorCrest from '@arenaswap/ui/src/components/onColorCrest';
import TimeoutDots from '@arenaswap/ui/src/components/timeoutDots';
import BonusMark from './bonusMark';

interface detailTeamPillProps {
	team: Team;
	position: 'left' | 'right';
	record?: string | null;
	color: string;
	timeoutMax?: number;
	bonus?: 'bonus' | 'double';
	bonusSlot?: boolean;
	seeded?: boolean;
}

const detailTeamPill = ({ team, position, record, color, timeoutMax, bonus, bonusSlot = false, seeded = false }: detailTeamPillProps) => (
	<div className={`game-detail-team-wrap is-${position}`}>
		<span className={`game-detail-team-logo-shell is-bare gd-area-${position}-crest`}>
			<OnColorCrest team={team} surface={color} className='game-detail-team-logo' fallback='blank' />
		</span>
		<div className={`game-detail-team-name gd-area-${position}-label`}>
			{team.rank !== undefined && (
				<span className='game-detail-team-rank' title={seeded ? i18n.t('gameCard.teamSeed', { seed: team.rank }) : i18n.t('gameCard.teamRank', { rank: team.rank })}>
					{seeded ? team.rank : `#${team.rank}`}
				</span>
			)}
			{team.name || team.abbreviation}
		</div>
		{record && (
			<div
				className={`game-detail-team-record gd-area-${position}-record`}
				title={i18n.t('detail.teamRecord', { record })}
			>
				{record}
			</div>
		)}
		{(team.timeouts !== undefined || bonusSlot) && (
			<div className={`gd-area-${position}-timeouts${bonusSlot ? ' text-center' : ''}`}>
				{team.timeouts !== undefined && (
					<TimeoutDots remaining={team.timeouts} max={timeoutMax} teamAbbreviation={team.abbreviation} />
				)}
				{bonusSlot && <BonusMark bonus={bonus} teamAbbreviation={team.abbreviation} />}
			</div>
		)}
	</div>
);

export default detailTeamPill;
