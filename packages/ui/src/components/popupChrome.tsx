import { useEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { leagueLabels, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap } from '@arenaswap/core/types';
import Crest from './crest';
import ToggleSwitch from './toggleSwitch';
import useDocumentTheme from './useDocumentTheme';
import { useT } from './i18nContext';
import Wordmark from './wordmark';
import driveWordmarkCollapse from './wordmarkCollapse';

const liftedFrom = 0;

const usePopupHeaderCollapse = (scroller?: RefObject<HTMLElement | null>) => {
	const headerRef = useRef<HTMLDivElement>(null);
	const wordmarkRef = useRef<SVGSVGElement>(null);

	useEffect(() => {
		const node = scroller?.current;
		const svg = wordmarkRef.current;
		const bar = headerRef.current;
		if (!node || !svg || !bar) return;
		return driveWordmarkCollapse({
			svg,
			bar,
			scroller: node,
			onScroll: top => bar.style.setProperty('--lifted', top > liftedFrom ? '1' : '0'),
		});
	}, [scroller]);

	return { headerRef, wordmarkRef };
};

export { leagueLabels };

export const PopupHeader = ({
	scroller,
	enabled,
	prefsLoaded = true,
	toggleId = 'enableToggle',
	interactive = true,
	onToggleEnabled,
	onOpenSettings,
	onStartTour,
	onOpenGuide,
	onBossButton,
	bossShortcut,
}: {
	scroller?: RefObject<HTMLElement | null>;
	enabled: boolean;
	prefsLoaded?: boolean;
	toggleId?: string;
	interactive?: boolean;
	onToggleEnabled: () => void;
	onOpenSettings: () => void;
	onStartTour: () => void;
	onOpenGuide?: () => void;
	onBossButton?: () => void;
	bossShortcut?: string;
}) => {
	const t = useT();
	const { headerRef, wordmarkRef } = usePopupHeaderCollapse(scroller);
	return (
		<div ref={headerRef} className='popup-header d-flex justify-content-between align-items-center'>
			<Wordmark ref={wordmarkRef} className='arenaswap-logo' />
			<div className='d-flex align-items-center gap-3' aria-hidden={interactive ? undefined : true}>
				{onBossButton && (
					<button className='btn btn-sm p-0 popup-settings-button' onClick={onBossButton} title={bossShortcut ? t('main.bossButtonShortcut', { shortcut: bossShortcut }) : t('main.bossButton')} aria-label={t('main.bossButton')} disabled={!interactive} tabIndex={interactive ? undefined : -1}>
						<i className='bi bi-incognito popup-settings-icon' />
					</button>
				)}
				{onOpenGuide && (
					<button className='btn btn-sm p-0 popup-settings-button' onClick={onOpenGuide} title={t('main.guideButton')} aria-label={t('main.guideButton')} disabled={!interactive} tabIndex={interactive ? undefined : -1}>
						<i className='bi bi-calendar-week popup-settings-icon' />
					</button>
				)}
				<button className='btn btn-sm p-0 popup-settings-button' onClick={onStartTour} title={t('main.tourButton')} aria-label={t('main.tourButton')} disabled={!interactive} tabIndex={interactive ? undefined : -1}>
					<i className='bi bi-question-circle popup-settings-icon' />
				</button>
				<button className='btn btn-sm p-0 popup-settings-button' onClick={onOpenSettings} title={t('main.settingsButton')} aria-label={t('main.settingsButton')} disabled={!interactive} tabIndex={interactive ? undefined : -1}>
					<i className='bi bi-gear-fill popup-settings-icon' />
				</button>
				<ToggleSwitch id={toggleId} checked={enabled} onChange={onToggleEnabled} disabled={!prefsLoaded || !interactive} tabIndex={interactive ? undefined : -1} aria-label={t('main.enableToggleLabel')} />
			</div>
		</div>
	);
};

export const PopupSectionTitle = ({ children, first, action }: { children: string; first?: boolean; action?: ReactNode }) => (
	<div className={`popup-section-title${first ? ' mt-1' : ''}${action ? ' d-flex align-items-center gap-2' : ''}`}>
		{children}
		{action}
	</div>
);

export const LeagueSectionHeader = ({ league, logos }: { league: LeagueId; logos: LeagueLogoMap }) => {
	const theme = useDocumentTheme();
	const logoUrl = resolveLeagueLogoUrl(league, logos[league], theme);
	return (
		<div className='fw-bold text-uppercase popup-section-label'>
			{logoUrl && (
				<Crest logo={logoUrl} abbreviation='' className='popup-league-logo' fallback='none' loading='lazy' />
			)}
			{leagueLabels[league] ?? league.toUpperCase()}
		</div>
	);
};
