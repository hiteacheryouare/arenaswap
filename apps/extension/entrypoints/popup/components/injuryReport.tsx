import { i18n } from '#i18n';
import { useState } from 'react';
import type { Game, Team } from '@arenaswap/core/types';
import { readableTeamInkOnCard, teamRowWash } from '@arenaswap/ui/src/components/colorUtils';
import PlayerShot from './playerShot';
import { injuryStatusLabelKeys } from './matchupLabels';
import type { InjuryEntry, Paired } from './matchupParse';

interface injuryReportProps {
	game: Game;
	injuries: Paired<InjuryEntry[]>;
	awayColor: string;
	homeColor: string;
}

// Out first, so the cap only ever hides the players most likely to play anyway.
const rowCap = 4;

const InjuryRow = ({ injury, color }: { injury: InjuryEntry; color: string }) => {
	// Position and body part arrive verbatim, the same way a leader's stat line does. There are
	// dozens of body parts and no list of them to translate against.
	const detail = [injury.position, injury.detail].filter(Boolean).join(' · ');
	return (
		<li className='gd-injury-row' style={{ backgroundImage: teamRowWash(color) }}>
			<PlayerShot url={injury.headshot} name={injury.name} color={color} className='gd-pregame-leader-shot' />
			<span className='gd-injury-player'>
				<span className='gd-injury-name'>{injury.name}</span>
				{detail && <span className='gd-injury-detail'>{detail}</span>}
			</span>
			<span className='gd-injury-status' data-status={injury.status}>{i18n.t(injuryStatusLabelKeys[injury.status])}</span>
		</li>
	);
};

const TeamInjuries = ({ team, injuries, color }: { team: Team; injuries: InjuryEntry[]; color: string }) => {
	const [expanded, setExpanded] = useState(false);
	const shown = expanded ? injuries : injuries.slice(0, rowCap);

	return (
		<div className='gd-injury-team'>
			<div className='gd-pregame-category' style={{ color: readableTeamInkOnCard(color) }}>{team.abbreviation}</div>
			{injuries.length === 0 ? (
				<div className='gd-injury-none'>{i18n.t('detail.injuriesNone')}</div>
			) : (
				<ul className='list-unstyled m-0'>
					{shown.map(injury => <InjuryRow key={injury.id} injury={injury} color={color} />)}
				</ul>
			)}
			{injuries.length > rowCap && (
				<button type='button' className='btn btn-link btn-sm gd-box-more' onClick={() => setExpanded(!expanded)}>
					{expanded ? i18n.t('box.showFewer') : i18n.t('box.showAll', { count: String(injuries.length) })}
				</button>
			)}
		</div>
	);
};

const injuryReport = ({ game, injuries, awayColor, homeColor }: injuryReportProps) => {
	if (injuries.away.length === 0 && injuries.home.length === 0) return null;

	return (
		<>
			<div className='gd-setup-heading'>{i18n.t('detail.injuries')}</div>
			<div className='gd-injuries'>
				<TeamInjuries team={game.awayTeam} injuries={injuries.away} color={awayColor} />
				<TeamInjuries team={game.homeTeam} injuries={injuries.home} color={homeColor} />
			</div>
		</>
	);
};

export default injuryReport;
