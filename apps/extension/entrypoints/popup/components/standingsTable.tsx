import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { readableTeamInkOnCard, resolveTeamColorPair, teamRowWash } from '@arenaswap/chromatic';
import type { StandingsGroup, StandingsRow } from '@arenaswap/sideline';

interface standingsTableProps {
	game: Game;
	standings: StandingsGroup[];
}

interface rowProps {
	row: StandingsRow;
	showRank: boolean;
	color: string | undefined;
}

const TeamRow = ({ row, showRank, color }: rowProps) => {
	const ink = color ? readableTeamInkOnCard(color) : undefined;

	return (
		<tr
			style={color ? { backgroundImage: teamRowWash(color) } : undefined}
			aria-current={color ? 'true' : undefined}
		>
			{showRank && <td className='gd-standings-rank'>{row.rank ?? ''}</td>}
			<th scope='row' className={`gd-box-name${color ? ' gd-standings-matchup' : ''}`}>
				<span className='gd-standings-id'>
					<Crest
						logo={row.logo}
						abbreviation={row.name}
						className='gd-standings-crest'
						fallback='blank'
						teamColor={color}
						loading='lazy'
					/>
					<span className='gd-standings-name' title={row.name} style={ink ? { color: ink } : undefined}>{row.name}</span>
				</span>
			</th>
			{row.values.map((value, index) => <td key={index}>{value}</td>)}
		</tr>
	);
};

const GroupTable = ({ group, colorOf }: {
	group: StandingsGroup;
	colorOf: (teamId: string) => string | undefined;
}) => {
	const showRank = group.rows.some(row => row.rank !== null);

	return (
		<div className='gd-standings-group'>
			<div className='gd-box-subheading'>{group.header}</div>
			<div className='table-responsive'>
				<table className='table table-sm gd-box-table gd-standings-table'>
					<thead>
						<tr>
							{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
							{showRank && <td className='gd-standings-rank' />}
							{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
							<td className='gd-box-name' />
							{group.columns.map(column => (
								<th scope='col' key={column.labelKey} title={column.description || undefined}>
									{i18n.t(column.labelKey)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{group.rows.map(row => (
							<TeamRow
								key={row.teamId || row.name}
								row={row}
								showRank={showRank}
								color={colorOf(row.teamId)}
							/>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

const standingsTable = ({ game, standings }: standingsTableProps) => {
	if (standings.length === 0) return null;

	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#2274A5', '#F75C03');
	const colorOf = (teamId: string): string | undefined => (
		teamId === game.awayTeam.id ? awayColor
			: teamId === game.homeTeam.id ? homeColor
				: undefined
	);

	return (
		<div className='gd-setup gd-standings'>
			{standings.map((group, index) => {
				const startsConference = group.conference !== null
					&& group.conference !== standings[index - 1]?.conference;

				return (
					<div className='gd-standings-block' key={`${group.conference ?? ''}-${group.header}`}>
						{startsConference && <div className='gd-standings-conference'>{group.conference}</div>}
						<GroupTable group={group} colorOf={colorOf} />
					</div>
				);
			})}
		</div>
	);
};

export default standingsTable;
