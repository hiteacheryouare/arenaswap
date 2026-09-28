import { i18n } from '#i18n';
import { useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId, ResolvedTheme, Team, TeamMonoMarks } from '@arenaswap/core/types';
import BoardCrest from '@arenaswap/ui/src/components/boardCrest';
import { resolveGameColors } from '@arenaswap/ui/src/components/gameSurface';
import type { BoxScore, BoxScoreAthlete, LineScoreRow } from './boxScoreParse';
import {
	buildComparison,
	buildSections,
	hasBoxScoreContent,
	lineScoreHeadingKey,
	periodLabels,
} from './boxScoreColumns';
import type { BoxScoreColumn, BoxScoreSection, PeriodLabel } from './boxScoreColumns';
import type { MonoLogos } from './useSummaryData';

interface boxScoreProps {
	game: Game;
	boxScore: BoxScore;
	monoLogos?: MonoLogos;
	theme?: ResolvedTheme;
}

type side = 'away' | 'home';

const sides: side[] = ['away', 'home'];

// The card a crest is drawn on, as a hex, which is what decides whether its artwork reads there.
export const cardSurface: Record<ResolvedTheme, string> = { dark: '#1a1d22', light: '#ffffff' };

const periodHeading = (label: PeriodLabel): string => {
	if (label.kind === 'number') return String(label.value);
	if (label.kind === 'named') return i18n.t(label.labelKey);
	return label.index === 1
		? i18n.t('box.overtime')
		: i18n.t('box.overtimeNumbered', { count: String(label.index) });
};

export const TeamIdentity = ({ team, color, surface, monoMarks, size = 20 }: {
	team: Team;
	color: string;
	surface: string;
	monoMarks?: TeamMonoMarks | null;
	size?: number;
}) => (
	<span className='dt-team'>
		<BoardCrest team={team} size={size} surface={surface} color={color} monoMarks={monoMarks} />
		<span className='dt-team-abbr'>{team.abbreviation}</span>
	</span>
);

const LineRow = ({ row, periodCount, showHitsErrors, team, color, surface, monoMarks }: {
	row: LineScoreRow;
	periodCount: number;
	showHitsErrors: boolean;
	team: Team;
	color: string;
	surface: string;
	monoMarks?: TeamMonoMarks | null;
}) => (
	<tr>
		<th scope='row' className='dt-linescore-team'>
			<TeamIdentity team={{ ...team, abbreviation: row.abbreviation }} color={color} surface={surface} monoMarks={monoMarks} size={14} />
		</th>
		{Array.from({ length: periodCount }, (_, index) => (
			<td key={index}>{row.periods[index]}</td>
		))}
		<td className='is-total'>{row.total}</td>
		{showHitsErrors && (
			<>
				<td className='is-total'>{row.hits}</td>
				<td className='is-total'>{row.errors}</td>
			</>
		)}
	</tr>
);

const PlayerRow = ({ athlete, columns, indent }: {
	athlete: BoxScoreAthlete;
	columns: BoxScoreColumn[];
	indent: boolean;
}) => (
	<tr>
		<th scope='row' className={`dt-name${indent ? ' dt-name-sub' : ''}`}>
			<span className='dt-player'>{athlete.name}</span>
			{athlete.position && <span className='dt-position'>{athlete.position}</span>}
		</th>
		{/* Our sources' reason is an English string, so the row says DNP and stops rather than ship
		    one untranslated cell into eleven other languages. */}
		{athlete.didNotPlay
			? <td className='dt-dnp' colSpan={columns.length}>{i18n.t('box.didNotPlay')}</td>
			: columns.map(column => <td key={column.index}>{athlete.stats[column.index] ?? ''}</td>)}
	</tr>
);

const SectionTable = ({ section, isBatting }: { section: BoxScoreSection; isBatting: boolean }) => {
	const [expanded, setExpanded] = useState(false);
	const capped = section.rowCap > 0 && !expanded && section.athletes.length > section.rowCap;
	const rows = capped ? section.athletes.slice(0, section.rowCap) : section.athletes;

	return (
		<div className='dt-box-section'>
			<h4 className='dt-subheading'>{i18n.t(section.headingKey)}</h4>
			<table className='table dt-table dt-players-table num'>
				<thead>
					<tr>
						{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
						<td className='dt-name' />
						{section.columns.map(column => (
							// Our sources' own description, untranslated. It is the only thing that says
							// SACKS under passing is sacks suffered and under defense sacks recorded.
							<th scope='col' key={column.index} title={column.description || undefined}>
								{i18n.t(column.labelKey)}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map(athlete => (
						<PlayerRow
							key={athlete.id || athlete.name}
							athlete={athlete}
							columns={section.columns}
							// A substitute sits indented under the spot in the order he took over.
							indent={isBatting && !athlete.starter}
						/>
					))}
				</tbody>
				{section.totals && (
					<tfoot>
						<tr>
							<th scope='row' className='dt-name'>{i18n.t('box.totals')}</th>
							{section.totals.map((total, index) => <td key={index}>{total}</td>)}
						</tr>
					</tfoot>
				)}
			</table>
			{section.rowCap > 0 && section.athletes.length > section.rowCap && (
				<button type='button' className='btn dt-more' onClick={() => setExpanded(!expanded)}>
					{expanded
						? i18n.t('box.showFewer')
						: i18n.t('box.showAll', { count: String(section.athletes.length) })}
				</button>
			)}
		</div>
	);
};

const boxScore = ({ game, boxScore: box, monoLogos, theme = 'dark' }: boxScoreProps) => {
	// Away first, which is the order every sport lists the two teams in.
	const [selected, setSelected] = useState<side>('away');
	// Built off the game id rather than `useId`, whose output no `#id` selector can hold.
	const tabId = (which: side) => `dt-box-tab-${game.id}-${which}`;
	const panelId = `dt-box-panel-${game.id}`;
	const tabRefs = useRef<Partial<Record<side, HTMLButtonElement | null>>>({});

	const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, which: side) => {
		const index = sides.indexOf(which);
		const next = event.key === 'ArrowRight' ? sides[(index + 1) % sides.length]
			: event.key === 'ArrowLeft' ? sides[(index + sides.length - 1) % sides.length]
				: event.key === 'Home' ? sides[0]
					: event.key === 'End' ? sides[sides.length - 1]
						: undefined;
		if (!next) return;
		event.preventDefault();
		setSelected(next);
		tabRefs.current[next]?.focus();
	};

	const config = leagueConfigMap[game.league as LeagueId];
	const surface = cardSurface[theme];
	const [awayColor, homeColor] = resolveGameColors(game);
	const comparison = buildComparison(game.sportType, box.teamComparison);
	const teams = { away: box.away, home: box.home };
	// A side whose every category arrived empty parses to null, which is the opening minutes of a
	// football game. Whichever side exists renders, so the identity has to name that one.
	const activeSide: side = teams[selected] ? selected : box.away ? 'away' : 'home';
	const active = teams[activeSide];
	const sections = active ? buildSections(game.sportType, active) : [];
	const hasBothSides = box.away !== null && box.home !== null;
	const teamOf = (which: side) => (which === 'away' ? game.awayTeam : game.homeTeam);
	const colorOf = (which: side) => (which === 'away' ? awayColor : homeColor);
	const marksOf = (which: side) => (which === 'away' ? monoLogos?.away : monoLogos?.home);

	if (!hasBoxScoreContent(game.sportType, box)) return null;

	const line = box.lineScore;
	// Baseball is the only sport that sends hits and errors, which turns the line into R-H-E.
	// `line` is checked first: `undefined !== null` would otherwise report that it has them.
	const showHitsErrors = line !== null && line.away.hits !== null && line.home.hits !== null;

	return (
		<div className='dt-box'>
			{line && (
				<section className='card dt-card dt-box-line'>
					<h3 className='dt-card-title'>{i18n.t(lineScoreHeadingKey(config?.periodFormat))}</h3>
					{/* Nine innings plus R-H-E fits; extra innings scroll rather than squeeze. */}
					<div className='table-responsive'>
						<table
							className='table dt-table dt-linescore num'
							style={{ '--dt-line-columns': line.periodCount + (showHitsErrors ? 3 : 1) } as CSSProperties}
						>
							<thead>
								<tr>
									{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
									<td className='dt-linescore-team' />
									{periodLabels({
										periodCount: line.periodCount,
										regularPeriods: config?.regularPeriods ?? line.periodCount,
										periodFormat: config?.periodFormat,
										sportType: game.sportType,
										finalPeriodSuffix: game.finalPeriodSuffix,
									}).map((label, index) => <th scope='col' key={index}>{periodHeading(label)}</th>)}
									<th scope='col' className='is-total'>
										{showHitsErrors ? i18n.t('box.runs') : i18n.t('box.lineTotal')}
									</th>
									{showHitsErrors && (
										<>
											<th scope='col' className='is-total'>{i18n.t('box.hits')}</th>
											<th scope='col' className='is-total'>{i18n.t('box.errors')}</th>
										</>
									)}
								</tr>
							</thead>
							<tbody>
								{sides.map(which => (
									<LineRow
										key={which}
										row={line[which]}
										periodCount={line.periodCount}
										showHitsErrors={showHitsErrors}
										team={teamOf(which)}
										color={colorOf(which)}
										surface={surface}
										monoMarks={marksOf(which)}
									/>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}

			{comparison.length > 0 && (
				<section className='card dt-card dt-box-compare'>
					<h3 className='dt-card-title'>{i18n.t('box.teamStats')}</h3>
					<table className='table dt-table dt-compare num'>
						<thead>
							<tr>
								<th scope='col' className='dt-compare-team is-away'>{game.awayTeam.abbreviation}</th>
								{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
								<td className='dt-compare-label' />
								<th scope='col' className='dt-compare-team is-home'>{game.homeTeam.abbreviation}</th>
							</tr>
						</thead>
						<tbody>
							{comparison.map(row => (
								<tr key={row.labelKey}>
									<td className='is-away'>{row.away}</td>
									<th scope='row' className='dt-compare-label'>{i18n.t(row.labelKey)}</th>
									<td className='is-home'>{row.home}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>
			)}

			{sections.length > 0 && (
				<section className='card dt-card dt-box-players'>
					{/* One team at a time: both sides stacked run to 34 rows for a basketball game. */}
					{hasBothSides ? (
						<div className='btn-group dt-switch' role='tablist'>
							{sides.map(which => (
								<button
									key={which}
									type='button'
									role='tab'
									id={tabId(which)}
									aria-selected={activeSide === which}
									aria-controls={panelId}
									tabIndex={activeSide === which ? 0 : -1}
									ref={element => { tabRefs.current[which] = element; }}
									className={`btn dt-switch-option${activeSide === which ? ' active' : ''}`}
									onClick={() => setSelected(which)}
									onKeyDown={event => onTabKeyDown(event, which)}
								>
									<TeamIdentity team={teamOf(which)} color={colorOf(which)} surface={surface} monoMarks={marksOf(which)} size={16} />
								</button>
							))}
						</div>
					) : (
						// One side and no switcher, so this is the only thing saying whose numbers these are.
						<h3 className='dt-card-title'>
							<TeamIdentity team={teamOf(activeSide)} color={colorOf(activeSide)} surface={surface} monoMarks={marksOf(activeSide)} />
						</h3>
					)}
					<div
						className='dt-box-sections'
						{...(hasBothSides
							? { id: panelId, role: 'tabpanel', 'aria-labelledby': tabId(activeSide) }
							: {})}
					>
						{sections.map(section => (
							// Keyed on the side too, so an expanded category collapses again on a switch.
							<SectionTable
								key={`${activeSide}-${section.name}`}
								section={section}
								isBatting={section.name === 'batting'}
							/>
						))}
					</div>
				</section>
			)}
		</div>
	);
};

export default boxScore;
