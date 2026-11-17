import { i18n } from '#i18n';
import { useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { leagueConfigMap } from '@arenaswap/core/constants';
import type { Game, LeagueId } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { readableTeamInkOnCard, resolveTeamColorPair, teamRowWash } from '@arenaswap/chromatic';
import type { BoxScore, BoxScoreAthlete, LineScoreRow } from '@arenaswap/sideline';
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

const TeamIdentity = ({ abbreviation, ink, color, logo }: {
	abbreviation: string;
	ink: string;
	color: string;
	logo?: string;
}) => (
	<span className='gd-box-line-id'>
		<Crest
			logo={logo}
			abbreviation={abbreviation}
			className='gd-box-line-crest'
			fallback='blank'
			teamColor={color}
			loading='lazy'
		/>
		<span className='gd-box-line-abbr' style={{ color: ink }}>{abbreviation}</span>
	</span>
);

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
			<TeamIdentity abbreviation={row.abbreviation} ink={ink} color={color} logo={logo} />
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
			<span className='gd-box-player' title={athlete.name}>{athlete.name}</span>
			{athlete.position && <span className='gd-box-position'>{athlete.position}</span>}
		</th>
		{athlete.didNotPlay
			? <td className='gd-box-dnp' colSpan={columns.length}>{i18n.t('box.didNotPlay')}</td>
			: columns.map(column => <td key={column.index}>{athlete.stats[column.index] ?? ''}</td>)}
	</tr>
);

const SectionTable = ({ section, isBatting }: { section: BoxScoreSection; isBatting: boolean }) => {
	const [expanded, setExpanded] = useState(false);
	const capped = !expanded && section.athletes.length > section.rowCap;
	const rows = capped ? section.athletes.slice(0, section.rowCap) : section.athletes;

	return (
		<>
			<div className='gd-box-subheading'>{i18n.t(section.headingKey)}</div>
			<table className='table table-sm gd-box-table'>
				<thead>
					<tr>
						{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
						<td className='gd-box-name' />
						{section.columns.map(column => (
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
			{section.athletes.length > section.rowCap && (
				<button
					type='button'
					className='btn btn-link btn-sm gd-box-more'
					aria-expanded={expanded}
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
	const [selected, setSelected] = useState<side>('away');
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
	const [awayColor, homeColor] = resolveTeamColorPair(game.awayTeam, game.homeTeam, '#2274A5', '#F75C03');
	const awayInk = readableTeamInkOnCard(awayColor);
	const homeInk = readableTeamInkOnCard(homeColor);
	const comparison = buildComparison(game.sportType, box.teamComparison);
	const teams = { away: box.away, home: box.home };
	const activeSide: side = teams[selected] ? selected : box.away ? 'away' : 'home';
	const active = teams[activeSide];
	const activeTeam = activeSide === 'away' ? game.awayTeam : game.homeTeam;
	const activeInk = activeSide === 'away' ? awayInk : homeInk;
	const activeColor = activeSide === 'away' ? awayColor : homeColor;
	const sections = active ? buildSections(game.sportType, active) : [];
	const hasBothSides = box.away !== null && box.home !== null;

	if (!hasBoxScoreContent(game.sportType, box)) return null;

	const line = box.lineScore;
	const showHitsErrors = line !== null && line.away.hits !== null && line.home.hits !== null;

	return (
		<div className='gd-setup gd-box'>
			<div className='gd-setup-heading'>{i18n.t('box.heading')}</div>

			{line && (
				<div className='gd-box-line'>
					<div className='gd-box-subheading'>
						{i18n.t(lineScoreHeadingKey(config?.periodFormat))}
					</div>
					<div className='table-responsive'>
						<table
							className='table table-sm gd-box-table gd-box-line-table'
							style={{ '--gd-box-line-columns': line.periodCount + (showHitsErrors ? 3 : 1) } as CSSProperties}
						>
							<thead>
								<tr>
									{/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
									<td className='gd-box-line-team' />
									{periodLabels({
										periodCount: line.periodCount,
										regularPeriods: config?.regularPeriods ?? line.periodCount,
										periodFormat: config?.periodFormat,
										sportType: game.sportType,
										finalPeriodSuffix: game.finalPeriodSuffix,
										league: game.league,
										isPostseason: game.isPostseason,
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
					{hasBothSides ? (
						<ul className='nav nav-tabs gd-box-tabs' role='tablist'>
							{sides.map(which => {
								const team = which === 'away' ? game.awayTeam : game.homeTeam;
								const color = which === 'away' ? awayColor : homeColor;
								return (
									<li className='nav-item' role='presentation' key={which}>
										<button
											type='button'
											role='tab'
											id={tabId(which)}
											aria-selected={activeSide === which}
											aria-controls={panelId}
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
												teamColor={color}
												loading='lazy'
											/>
											{team.abbreviation}
										</button>
									</li>
								);
							})}
						</ul>
					) : (
						<div className='gd-box-subheading'>
							<TeamIdentity
								abbreviation={activeTeam.abbreviation}
								ink={activeInk}
								color={activeColor}
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
