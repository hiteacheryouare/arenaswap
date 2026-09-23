import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { leagueConfigs, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap } from '@arenaswap/core/types';
import Crest from './crest';
import { useT } from './i18nContext';
import Wordmark from './wordmark';
import driveWordmarkCollapse from './wordmarkCollapse';

// The chrome the popup's main view is built out of. The website used to redraw these three
// pieces in its own markup and its own CSS, which drifted: the section title lost its orange
// rule, the league row lost its logo, and the header switch was a div. Sharing them means the
// site cannot describe a popup that does not exist.
//
// The wordmark used to be an `<img>` with a `logoSrc` prop, because the extension serves the file
// from `/images` and the site from a `base`-prefixed path. It is inline SVG now, which settles that
// question by not asking it, and is what lets the header collapse the mark into the favicon.

// Whether the bar has a surface is a different question from how far it has condensed, and tying
// the two together is wrong in both directions. A card is behind the header from the very first
// pixel of scroll, 40 short of where the collapse starts and 450ms short of where it finishes, so
// a background fading in on the collapse curve leaves the bar see-through over moving content —
// worst on a fast flick, which is exactly when there is most to see through it. And on the way back
// up the tint would linger after the list had already returned to the top.
//
// So the surface is its own signal, and it snaps: at one pixel of scroll there is one pixel of card
// behind the bar, and nothing about that is worth easing.
const liftedFrom = 0;

// Poses the header against a scroller. Everything `driveWordmarkCollapse` touches is DOM — a React
// state per frame would re-render the game list under it 27 times per transition.
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

export const leagueLabels = Object.fromEntries(
	leagueConfigs.map(config => [config.id, config.label]),
) as Record<LeagueId, string>;

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
}: {
	// The element the header should collapse against. Absent on the website, which shows this header
	// as a picture of the popup rather than a scrolling one, so the mark simply stays whole there.
	scroller?: RefObject<HTMLElement | null>;
	enabled: boolean;
	prefsLoaded?: boolean;
	// The id has to be unique per document, and the website renders this header twice on one page.
	toggleId?: string;
	// False where the header is being shown rather than used, which is every instance on the
	// website. Controls that cannot do anything should not take focus or invite a click.
	interactive?: boolean;
	onToggleEnabled: () => void;
	onOpenSettings: () => void;
	onStartTour: () => void;
	// Optional, and the button is absent without it. The website renders this header twice and has no
	// guide page to open, so there is nothing there for a third control to do.
	onOpenGuide?: () => void;
}) => {
	const t = useT();
	const { headerRef, wordmarkRef } = usePopupHeaderCollapse(scroller);
	return (
		<div ref={headerRef} className='popup-header d-flex justify-content-between align-items-center'>
			<Wordmark ref={wordmarkRef} className='arenaswap-logo' />
			<div className='d-flex align-items-center gap-2' aria-hidden={interactive ? undefined : true}>
				{/* Before the help mark rather than after the cog: settingsCog.cy.tsx identifies the cog
				    as `.popup-settings-button` .last(), and a third button appended after it would
				    silently repoint those assertions at this one. */}
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
				<div className='form-check form-switch mb-0'>
					<input className='form-check-input' type='checkbox' id={toggleId} checked={enabled} onChange={onToggleEnabled} disabled={!prefsLoaded || !interactive} tabIndex={interactive ? undefined : -1} aria-label={t('main.enableToggleLabel')} />
				</div>
			</div>
		</div>
	);
};

export const PopupSectionTitle = ({ children, first }: { children: string; first?: boolean }) => (
	<div className='popup-section-title' style={first ? { marginTop: '0.25rem' } : undefined}>{children}</div>
);

// No placeholder at all: the label is the next element along, so there is nothing a 20px disc could
// say that the row does not already. The crest still holds its box while the mark loads, which is
// all this row needed. Dropped entirely when the league has no mark to load.
export const LeagueSectionHeader = ({ league, logos }: { league: LeagueId; logos: LeagueLogoMap }) => {
	const logoUrl = resolveLeagueLogoUrl(league, logos[league]);
	return (
		<div className='fw-bold text-uppercase popup-section-label'>
			{logoUrl && (
				<Crest logo={logoUrl} abbreviation='' className='popup-league-logo' fallback='none' loading='lazy' />
			)}
			{leagueLabels[league] ?? league.toUpperCase()}
		</div>
	);
};
