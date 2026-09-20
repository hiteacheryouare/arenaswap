import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { readableTeamInkOnCard, resolveTeamColorPair, teamRowWash } from '@arenaswap/ui/src/components/colorUtils';
import type { StandingsGroup, StandingsRow } from './standingsParse';

interface standingsTableProps {
	game: Game;
	standings: StandingsGroup[];
}

interface rowProps {
	row: StandingsRow;
	showRank: boolean;
	// The team's own colour when this row is one of the two playing, and undefined for everybody
	// else in the league.
	color: string | undefined;
}

// The same treatment the line score gives its two rows: a wash in the team's own colour fading
// out to the right, and the name clamped only as far as it must be to be read at this size. It is
// the one thing a reader is looking for in a thirty-two team league, so it is carried by colour
// rather than by weight alone.
const TeamRow = ({ row, showRank, color }: rowProps) => {
	const ink = color ? readableTeamInkOnCard(color) : undefined;

	return (
		<tr
			style={color ? { backgroundImage: teamRowWash(color) } : undefined}
			// These two are the teams the reader came here for, within the set of teams in the
			// table. Nothing else on the row says so without looking at it.
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
						loading='lazy'
					/>
					<span className='gd-standings-name' style={ink ? { color: ink } : undefined}>{row.name}</span>
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
	// Soccer publishes a league position and a five-team division does not, so the column appears
	// with the number rather than as a row count nobody quoted.
	const showRank = group.rows.some(row => row.rank !== null);

	return (
		<div className='gd-standings-group'>
			<div className='gd-box-subheading'>{group.header}</div>
			{/* A twenty-club league table is six numbers wide at most, which fits. The wrapper is
			    here for the college conferences, whose two record columns are "12-3" rather than
			    a digit. */}
			<div className='table-responsive'>
				<table className='table table-sm gd-box-table gd-standings-table'>
					<thead>
						<tr>
							{/* Corners. The name cells below carry scope='row', which is what actually
							    associates a screen reader's announcement with its row. */}
							{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
							{showRank && <td className='gd-standings-rank' />}
							{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
							<td className='gd-box-name' />
							{group.columns.map(column => (
								// ESPN's own wording, untranslated like every other string we pass
								// through from it. It is the only thing that says GB means games
								// behind rather than goals.
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

	// The same pair, and the same fallbacks, the hero and the box score resolve — so a team reads
	// as one colour everywhere on this screen.
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#2274A5', '#F75C03');
	const colorOf = (teamId: string): string | undefined => (
		teamId === game.awayTeam.id ? awayColor
			: teamId === game.homeTeam.id ? homeColor
				: undefined
	);

	return (
		<div className='gd-setup gd-standings'>
			{standings.map((group, index) => {
				// One heading per conference rather than one per division. The groups arrive in
				// tree order, so a change of conference is the boundary — no grouping pass needed,
				// and a flat league whose groups carry no conference never draws one.
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
