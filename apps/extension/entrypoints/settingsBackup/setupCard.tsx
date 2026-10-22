import type { ReactNode } from 'react';
import { i18n } from '#i18n';
import { leagueConfigs, parseFavoriteTeamKey } from '@arenaswap/core/constants';
import type { FantasyRosterEntry } from '@arenaswap/core';
import type { LeagueId, LeagueLogoMap } from '@arenaswap/core/types';
import type { EspnTeamEntry } from '@arenaswap/sideline';
import CrestDisc from '@arenaswap/ui/src/components/crestDisc';
import { modeNameKeys } from '@arenaswap/ui/src/components/scoringModeMeta';
import { rosterHeadshot } from '../../utils/fantasyRoster';
import type { settingsProfile } from '../../utils/settingsBackup';
import LeagueLogo from '../popup/components/leagueLogo';
import PlayerShot from '../popup/components/playerShot';
import { diffList, type setupDiff } from './setupDiff';

interface setupCardProps {
	heading: string;
	meta?: string;
	profile: settingsProfile;
	// This browser's setup, when the card is showing a file that would replace it.
	compareTo?: settingsProfile;
	leagueLogos: LeagueLogoMap;
	teams: ReadonlyMap<string, EspnTeamEntry>;
}

const leagueById = new Map(leagueConfigs.map(league => [league.id, league]));
const shotColor = '#e5e7eb';

const themeNames = {
	dark: 'setup.themeDark',
	light: 'setup.themeLight',
	system: 'setup.themeSystem',
} as const;

const changeLabel = (diff: setupDiff<unknown>, compared: boolean): string => {
	if (!compared) return String(diff.items.length);
	if (diff.added === 0 && diff.removed === 0) return i18n.t('backup.noChange');
	return [diff.added > 0 && `+${diff.added}`, diff.removed > 0 && `−${diff.removed}`].filter(Boolean).join(' ');
};

const row = (label: string, content: ReactNode, trailing?: string) => (
	<div className='backup-setup-row'>
		<span className='backup-setup-label'>{label}</span>
		<span className='backup-setup-value'>{content}</span>
		{trailing !== undefined && <span className='backup-setup-change'>{trailing}</span>}
	</div>
);

const itemRow = <T,>(id: string, label: string, diff: setupDiff<T>, compared: boolean, draw: (item: T) => ReactNode, nameOf: (item: T) => string) => (
	<div key={id} id={`setupRow-${id}`}>
		{row(
			label,
			diff.items.length === 0
				? <span className='backup-setup-text'>{i18n.t('backup.none')}</span>
				: diff.items.map(({ item, removed }) => (
					<span key={nameOf(item)} className='backup-setup-item' data-removed={removed} title={nameOf(item)}>{draw(item)}</span>
				)),
			changeLabel(diff, compared),
		)}
	</div>
);

const textRow = (id: string, label: string, next: string, now: string | undefined) => (
	<div key={id} id={`setupRow-${id}`}>
		{row(
			label,
			now === undefined || now === next
				? <span className='backup-setup-text'>{next}</span>
				: <span className='backup-setup-text'>{now} <i className='bi bi-arrow-right mx-1' aria-hidden='true' /><span className='fg-body fw-semibold'>{next}</span></span>,
		)}
	</div>
);

const setupCard = ({ heading, meta, profile, compareTo, leagueLogos, teams }: setupCardProps) => {
	const compared = compareTo !== undefined;
	const leagues = diffList(profile.prefs.enabledLeagues, compareTo?.prefs.enabledLeagues, (id: LeagueId) => id);
	const favorites = diffList(profile.prefs.favoriteTeamIds, compareTo?.prefs.favoriteTeamIds, (key: string) => key);
	const roster = diffList(profile.fantasyRoster, compareTo?.fantasyRoster, (entry: FantasyRosterEntry) => `${entry.league}:${entry.athleteId}`);

	return (
		<section className='backup-card backup-setup' aria-labelledby='setupCardHeading'>
			<h2 id='setupCardHeading' className='backup-heading'>{heading}</h2>
			{meta && <p id='setupCardMeta' className='backup-hint mb-0'>{meta}</p>}

			<div className='backup-setup-rows'>
				{itemRow('leagues', i18n.t('backup.rowLeagues'), leagues, compared, id => {
					const league = leagueById.get(id);
					return league ? <LeagueLogo league={league} logos={leagueLogos} /> : null;
				}, id => leagueById.get(id)?.label ?? id)}
				{itemRow('favorites', i18n.t('backup.rowFavorites'), favorites, compared, key => {
					const team = teams.get(key);
					return (
						<CrestDisc
							logo={team?.logo}
							abbreviation={(team?.abbreviation ?? parseFavoriteTeamKey(key)?.teamId ?? '?').slice(0, 3)}
							discClassName='team-pick-crest flex-shrink-0'
							crestClassName='team-pick-crest-logo'
							loading='lazy'
						/>
					);
				}, key => teams.get(key)?.name ?? key)}
				{itemRow('roster', i18n.t('backup.rowRoster'), roster, compared, entry => (
					<PlayerShot url={rosterHeadshot(entry)} name={entry.name} color={shotColor} className='fantasy-player-shot' />
				), entry => entry.name)}
				{textRow('scoring', i18n.t('backup.rowScoring'), i18n.t(modeNameKeys[profile.prefs.scoringMode]), compareTo && i18n.t(modeNameKeys[compareTo.prefs.scoringMode]))}
				{textRow('theme', i18n.t('setup.theme'), i18n.t(themeNames[profile.prefs.theme]), compareTo && i18n.t(themeNames[compareTo.prefs.theme]))}
			</div>
		</section>
	);
};

export default setupCard;
