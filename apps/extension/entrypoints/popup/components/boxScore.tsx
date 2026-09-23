import { i18n } from '#i18n';
import { useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { readableTeamInkOnCard, resolveTeamColorPair, teamRowWash } from '@arenaswap/ui/src/components/colorUtils';
import type { BoxScore, BoxScoreAthlete, LineScoreRow } from './boxScoreParse';
import {
	buildComparison,
	buildSections,
	hasBoxScoreContent,
	lineScoreHeadingKey,
	periodLabels,
} from './boxScoreColumns';
import type { BoxScoreColumn, BoxScoreSection, PeriodLabel } from './boxScoreColumns';

interface boxScoreProps {
	game: Game;
	boxScore: BoxScore;
}

type side = 'away' | 'home';

const sides: side[] = ['away', 'home'];

const periodHeading = (label: PeriodLabel): string => {
	if (label.kind === 'number') return String(label.value);
	if (label.kind === 'named') return i18n.t(label.labelKey);
	return label.index === 1
		? i18n.t('box.overtime')
		: i18n.t('box.overtimeNumbered', { count: String(label.index) });
};

// A crest beside the abbreviation in the team's own ink, which is how the pre-game leader rows and
// the line score both say which team a row belongs to.
const TeamIdentity = ({ abbreviation, ink, logo }: {
	abbreviation: string;
	ink: string;
	logo?: string;
}) => (
	<span className='gd-box-line-id'>
		<Crest
			logo={logo}
			abbreviation={abbreviation}
			className='gd-box-line-crest'
			fallback='blank'
			loading='lazy'
		/>
		<span className='gd-box-line-abbr' style={{ color: ink }}>{abbreviation}</span>
	</span>
);

// The pre-game leader rows carry their team by a crest, an abbreviation in the team's own colour
// and a wash fading out to the right; a line score row is the same shape and takes the same
// treatment. Here the wash is doing real work rather than decorating: the two rows *are* the two
// teams, so it says which is which without the reader parsing the abbreviations.
//
// No tinted disc under the crest. That exists because a navy crest vanishes on the dark popup —
// these sit on the light `.gd-setup` card, where a bare crest reads fine and a white disc would
// be the thing that disappears. And no `label` on the crest: the abbreviation is right beside it,
// so a second copy of the name is noise to a screen reader.
const LineRow = ({ row, periodCount, showHitsErrors, color, ink, logo }: {
	row: LineScoreRow;
	periodCount: number;
	showHitsErrors: boolean;
	color: string;
	ink: string;
	logo?: string;
}) => (
	<tr style={{ backgroundImage: teamRowWash(color) }}>
		<th scope='row' className='gd-box-line-team'>
			<TeamIdentity abbreviation={row.abbreviation} ink={ink} logo={logo} />
		</th>
		{Array.from({ length: periodCount }, (_, index) => (
			<td key={index}>{row.periods[index]}</td>
		))}
		<td className='gd-box-line-total'>{row.total}</td>
		{showHitsErrors && (
			<>
				<td className='gd-box-line-total'>{row.hits}</td>
				<td className='gd-box-line-total'>{row.errors}</td>
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
		<th scope='row' className={`gd-box-name${indent ? ' gd-box-name-sub' : ''}`}>
			<span className='gd-box-player'>{athlete.name}</span>
			{athlete.position && <span className='gd-box-position'>{athlete.position}</span>}
		</th>
		{/* ESPN's reason is an English string — "COACH'S DECISION" — so the row says DNP and stops
		    rather than shipping one untranslated cell into eleven other languages. The flag rather
		    than the reason: the reason is regularly absent on a row that really did not play. */}
		{athlete.didNotPlay
			? <td className='gd-box-dnp' colSpan={columns.length}>{i18n.t('box.didNotPlay')}</td>
			: columns.map(column => <td key={column.index}>{athlete.stats[column.index] ?? ''}</td>)}
	</tr>
);

const SectionTable = ({ section, isBatting }: { section: BoxScoreSection; isBatting: boolean }) => {
	const [expanded, setExpanded] = useState(false);
	const capped = section.rowCap > 0 && !expanded && section.athletes.length > section.rowCap;
	const rows = capped ? section.athletes.slice(0, section.rowCap) : section.athletes;

	return (
		<>
			<div className='gd-box-subheading'>{i18n.t(section.headingKey)}</div>
			<table className='table table-sm gd-box-table'>
				<thead>
					<tr>
						{/* The name column heads itself; the cells below it are the row headers. */}
						{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
						<td className='gd-box-name' />
						{section.columns.map(column => (
							// ESPN's own description, untranslated like every other string we pass
							// through from it. It is the only thing that says SACKS under passing
							// is sacks suffered and SACKS under defensive is sacks recorded.
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
							// Real box scores indent a substitute under the spot in the order they
							// took over, which is the only thing telling the two apart once they
							// share a batOrder.
							indent={isBatting && !athlete.starter}
						/>
					))}
				</tbody>
				{section.totals && (
					<tfoot>
						<tr>
							<th scope='row' className='gd-box-name'>{i18n.t('box.totals')}</th>
							{section.totals.map((total, index) => <td key={index}>{total}</td>)}
						</tr>
					</tfoot>
				)}
			</table>
			{section.rowCap > 0 && section.athletes.length > section.rowCap && (
				<button
					type='button'
					className='btn btn-link btn-sm gd-box-more'
					onClick={() => setExpanded(!expanded)}
				>
					{expanded
						? i18n.t('box.showFewer')
						: i18n.t('box.showAll', { count: String(section.athletes.length) })}
				</button>
			)}
		</>
	);
};

const boxScore = ({ game, boxScore: box }: boxScoreProps) => {
	// Away first, which is the order every convention in every sport lists the two teams in.
	const [selected, setSelected] = useState<side>('away');
	// A `role='tab'` announces "tab, 1 of 2", which promises the reader a panel to move to and
	// arrow keys to move with. These ids are the panel half of that; `onTabKeyDown` is the rest.
	// Built off the game id rather than `useId`, whose output carries characters no `#id` selector
	// can hold — and only one game detail screen is ever mounted at a time.
	const tabId = (which: side) => `gd-box-tab-${game.id}-${which}`;
	const panelId = `gd-box-panel-${game.id}`;
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
	// The same pair, and the same fallbacks, the pre-game block resolves — so a team reads as one
	// colour across both halves of the detail screen.
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#2274A5', '#F75C03');
	// The wash keeps the raw colour, being a 16% background rather than text. Only the labels are
	// clamped for contrast.
	const awayInk = readableTeamInkOnCard(awayColor);
	const homeInk = readableTeamInkOnCard(homeColor);
	const comparison = buildComparison(game.sportType, box.teamComparison);
	const teams = { away: box.away, home: box.home };
	// A side whose every category arrived with empty athletes parses to null, which is the opening
	// minutes of a football game. The block still renders, and it renders whichever side exists
	// rather than the selected one — so the identity below has to name the side actually shown.
	const activeSide: side = teams[selected] ? selected : box.away ? 'away' : 'home';
	const active = teams[activeSide];
	const activeTeam = activeSide === 'away' ? game.awayTeam : game.homeTeam;
	const activeInk = activeSide === 'away' ? awayInk : homeInk;
	const sections = active ? buildSections(game.sportType, active) : [];
	const hasBothSides = box.away !== null && box.home !== null;

	if (!hasBoxScoreContent(game.sportType, box)) return null;

	const line = box.lineScore;
	// Baseball is the only sport that sends per-inning hits and errors, which is what turns the
	// line score into the R-H-E every box score opens with. `line` is checked first rather than
	// optionally chained: `undefined !== null` is true, so a missing line score would otherwise
	// report that it has them.
	const showHitsErrors = line !== null && line.away.hits !== null && line.home.hits !== null;

	return (
		<div className='gd-setup gd-box'>
			<div className='gd-setup-heading'>{i18n.t('box.heading')}</div>

			{line && (
				<div className='gd-box-line'>
					<div className='gd-box-subheading'>
						{i18n.t(lineScoreHeadingKey(config?.periodFormat))}
					</div>
					{/* Nine innings plus R-H-E is thirteen columns in 263px. It fits, and extra
					    innings scroll rather than squeezing the ones that already fit. */}
					<div className='table-responsive'>
						<table
							className='table table-sm gd-box-table gd-box-line-table'
							style={{ '--gd-box-line-columns': line.periodCount + (showHitsErrors ? 3 : 1) } as CSSProperties}
						>
							<thead>
								<tr>
									{/* The corner above the team column. It labels nothing, and the name
									    cells below carry scope='row', which is what actually associates
									    a screen reader's announcement with its player. */}
									{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
									<td className='gd-box-line-team' />
									{periodLabels({
										periodCount: line.periodCount,
										regularPeriods: config?.regularPeriods ?? line.periodCount,
										periodFormat: config?.periodFormat,
										sportType: game.sportType,
										finalPeriodSuffix: game.finalPeriodSuffix,
									}).map((label, index) => <th scope='col' key={index}>{periodHeading(label)}</th>)}
									<th scope='col' className='gd-box-line-total'>
										{showHitsErrors ? i18n.t('box.runs') : i18n.t('box.lineTotal')}
									</th>
									{showHitsErrors && (
										<>
											<th scope='col' className='gd-box-line-total'>{i18n.t('box.hits')}</th>
											<th scope='col' className='gd-box-line-total'>{i18n.t('box.errors')}</th>
										</>
									)}
								</tr>
							</thead>
							<tbody>
								<LineRow
									row={line.away}
									periodCount={line.periodCount}
									showHitsErrors={showHitsErrors}
									color={awayColor}
									ink={awayInk}
									logo={game.awayTeam.logo}
								/>
								<LineRow
									row={line.home}
									periodCount={line.periodCount}
									showHitsErrors={showHitsErrors}
									color={homeColor}
									ink={homeInk}
									logo={game.homeTeam.logo}
								/>
							</tbody>
						</table>
					</div>
				</div>
			)}

			{comparison.length > 0 && (
				<div className='gd-box-compare'>
					<div className='gd-box-subheading'>{i18n.t('box.teamStats')}</div>
					<table className='table table-sm gd-box-table gd-box-compare-table'>
						<thead>
							<tr>
								<th scope='col' className='gd-box-compare-team' style={{ color: awayInk }}>
									{game.awayTeam.abbreviation}
								</th>
								{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
								<td className='gd-box-compare-label' />
								<th scope='col' className='gd-box-compare-team' style={{ color: homeInk }}>
									{game.homeTeam.abbreviation}
								</th>
							</tr>
						</thead>
						<tbody>
							{comparison.map(row => (
								<tr key={row.labelKey}>
									<td>{row.away}</td>
									<th scope='row' className='gd-box-compare-label'>{i18n.t(row.labelKey)}</th>
									<td>{row.home}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{sections.length > 0 && (
				<div className='gd-box-players'>
					{/* One team at a time. Both sides' tables stacked would run to 34 rows for a
					    basketball game before the reader reaches the second one. */}
					{hasBothSides ? (
						<ul className='nav nav-tabs gd-box-tabs' role='tablist'>
							{sides.map(which => {
								const team = which === 'away' ? game.awayTeam : game.homeTeam;
								return (
									<li className='nav-item' role='presentation' key={which}>
										<button
											type='button'
											role='tab'
											id={tabId(which)}
											aria-selected={activeSide === which}
											aria-controls={panelId}
											// Roving: the strip is one tab stop and the arrow keys
											// move inside it.
											tabIndex={activeSide === which ? 0 : -1}
											ref={element => { tabRefs.current[which] = element; }}
											className={`nav-link${activeSide === which ? ' active' : ''}`}
											onClick={() => setSelected(which)}
											onKeyDown={event => onTabKeyDown(event, which)}
										>
											<Crest
												logo={team.logo}
												abbreviation={team.abbreviation}
												className='gd-box-tab-crest'
												fallback='blank'
												loading='lazy'
											/>
											{team.abbreviation}
										</button>
									</li>
								);
							})}
						</ul>
					) : (
						// One side, no strip, and so nothing else on the screen saying whose
						// numbers these are.
						<div className='gd-box-subheading'>
							<TeamIdentity
								abbreviation={activeTeam.abbreviation}
								ink={activeInk}
								logo={activeTeam.logo}
							/>
						</div>
					)}
					<div
						{...(hasBothSides
							? { id: panelId, role: 'tabpanel', 'aria-labelledby': tabId(activeSide) }
							: {})}
					>
						{sections.map(section => (
							// Keyed on the side as well as the category, so an expanded football
							// defense collapses again when the reader switches teams: the request
							// was for these players, not for however many the other side has.
							<SectionTable
								key={`${activeSide}-${section.name}`}
								section={section}
								isBatting={section.name === 'batting'}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default boxScore;
