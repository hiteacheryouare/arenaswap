import { i18n } from '#i18n';
import type { Game } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import type { StandingsGroup, StandingsRow } from './standingsParse';

interface standingsTableProps {
	game: Game;
	standings: StandingsGroup[];
}

interface block {
	title: string;
	groups: StandingsGroup[];
	// A conference card names each division inside it; a lone group is its own title.
	nested: boolean;
}

// One card per conference, its divisions inside it. The groups arrive in tree order, so a change of
// conference is the boundary, and a league with no conferences gets a card per group.
const toBlocks = (standings: StandingsGroup[]): block[] => {
	const blocks: block[] = [];
	for (const group of standings) {
		const last = blocks.at(-1);
		if (group.conference !== null && last?.nested && last.title === group.conference) {
			last.groups.push(group);
			continue;
		}
		blocks.push(group.conference !== null
			? { title: group.conference, groups: [group], nested: true }
			: { title: group.header, groups: [group], nested: false });
	}
	return blocks;
};

const TeamRow = ({ row, showRank, playing }: { row: StandingsRow; showRank: boolean; playing: boolean }) => (
	// The two teams the reader came for, within the set of teams in the table.
	<tr className={playing ? 'is-playing' : undefined} aria-current={playing ? 'true' : undefined}>
		{showRank && <td className='dt-standings-rank'>{row.rank ?? ''}</td>}
		<th scope='row' className='dt-name'>
			<span className='dt-standings-id'>
				<Crest
					logo={row.logo}
					abbreviation={row.name}
					className='dt-standings-crest'
					fallback='blank'
					loading='lazy'
				/>
				<span className='dt-standings-name'>{row.name}</span>
			</span>
		</th>
		{row.values.map((value, index) => <td key={index}>{value}</td>)}
	</tr>
);

const GroupTable = ({ group, isPlaying }: { group: StandingsGroup; isPlaying: (teamId: string) => boolean }) => {
	// Soccer publishes a league position and a five-team division does not, so the column appears
	// with the number rather than as a row count nobody quoted.
	const showRank = group.rows.some(row => row.rank !== null);

	return (
		// The college conferences' two record columns are "12-3" rather than a digit, hence the wrapper.
		<div className='table-responsive'>
			<table className='table dt-table dt-standings-table num'>
				<thead>
					<tr>
						{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
						{showRank && <td className='dt-standings-rank' />}
						{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
						<td className='dt-name' />
						{group.columns.map(column => (
							// Our sources' own wording, untranslated. It is the only thing that says GB
							// means games behind rather than goals.
							<th scope='col' key={column.labelKey} title={column.description || undefined}>
								{i18n.t(column.labelKey)}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{group.rows.map(row => (
						<TeamRow key={row.teamId || row.name} row={row} showRank={showRank} playing={isPlaying(row.teamId)} />
					))}
				</tbody>
			</table>
		</div>
	);
};

const standingsTable = ({ game, standings }: standingsTableProps) => {
	if (standings.length === 0) return null;
	const isPlaying = (teamId: string) => teamId === game.awayTeam.id || teamId === game.homeTeam.id;

	return (
		<div className='dt-standings'>
			{toBlocks(standings).map(item => (
				<section className='card dt-card dt-standings-block' key={`${item.title}-${item.groups[0]?.header ?? ''}`}>
					<h3 className={`dt-card-title dt-standings-title${item.nested ? ' dt-standings-conference' : ''}`}>{item.title}</h3>
					{item.groups.map(group => (
						<div className='dt-standings-group' key={group.header}>
							{item.nested && <h4 className='dt-subheading'>{group.header}</h4>}
							<GroupTable group={group} isPlaying={isPlaying} />
						</div>
					))}
				</section>
			))}
		</div>
	);
};

export default standingsTable;
