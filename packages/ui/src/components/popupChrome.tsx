import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { leagueConfigs, resolveLeagueLogoUrl } from '@arenaswap/core/constants';
import type { LeagueId, LeagueLogoMap } from '@arenaswap/core/types';
import Crest from './crest';
import { useT } from './i18nContext';
import Wordmark, { applyWordmarkProgress } from './wordmark';

// The chrome the popup's main view is built out of. The website used to redraw these three
// pieces in its own markup and its own CSS, which drifted: the section title lost its orange
// rule, the league row lost its logo, and the header switch was a div. Sharing them means the
// site cannot describe a popup that does not exist.
//
// The wordmark used to be an `<img>` with a `logoSrc` prop, because the extension serves the file
// from `/images` and the site from a `base`-prefixed path. It is inline SVG now, which settles that
// question by not asking it, and is what lets the header collapse the mark into the favicon.

// Scroll offsets that start and undo the collapse. The gap between them is deliberate: one
// threshold means a list resting a pixel either side of it flickers on every wheel nudge.
const collapseAt = 40;
const expandAt = 16;
const collapseMs = 450;

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

// Poses the header against a scroller. Everything it touches is DOM — a React state per frame
// would re-render the game list under it 27 times per transition.
//
// The popup restores its scroll offset on mount, so the opening pose is read rather than assumed;
// coming back to a list that was left halfway down must not replay the collapse.
const usePopupHeaderCollapse = (scroller?: RefObject<HTMLElement | null>) => {
	const headerRef = useRef<HTMLDivElement>(null);
	const wordmarkRef = useRef<SVGSVGElement>(null);

	useEffect(() => {
		const node = scroller?.current;
		const svg = wordmarkRef.current;
		if (!node || !svg) return;

		const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		let collapsed = node.scrollTop > collapseAt;
		let progress = collapsed ? 1 : 0;
		let frame = 0;
		let from = progress;
		let startedAt = 0;

		// One number drives everything. The mark reads it through `applyWordmarkProgress`, and the bar
		// reads the eased result back out as `--collapse` to shrink its own padding and bring its
		// background up — so the chrome and the logo move on one curve instead of a CSS transition
		// racing a rAF tween.
		//
		// And the list must not move while that happens. Condensing takes about 19px out of the bar,
		// and the browser hands those 19px straight back to `scrollTop` so the content under the reader
		// holds still. That is the right instinct for a list whose cards reorder on their own and the
		// wrong one for a bar that resizes *because* of where the list is scrolled to: it drops the
		// offset back under the threshold and the header flutters open and shut, and it loses the
		// position the popup restores when you come back from a game. Reading `scrollTop` flushes the
		// layout the resize caused, so putting it back here is both necessary and sufficient.
		const pose = (value: number) => {
			progress = value;
			const parked = node.scrollTop;
			const closed = applyWordmarkProgress(svg, value);
			headerRef.current?.style.setProperty('--collapse', String(Math.round(closed * 1000) / 1000));
			// `scrollTo` rather than assigning `scrollTop`: same effect, and it does not read as
			// mutating a value the hook was handed.
			if (node.scrollTop !== parked) node.scrollTo({ top: parked });
		};

		const step = (now: number) => {
			if (!startedAt) startedAt = now;
			const target = collapsed ? 1 : 0;
			// Scaled by how far there is left to go, so reversing a collapse that is already most of
			// the way home takes the time that trip deserves rather than the full 450ms.
			const span = Math.max(0.35, Math.abs(target - from)) * collapseMs;
			const done = Math.min(1, (now - startedAt) / span);
			pose(from + (target - from) * done);
			frame = done < 1 ? requestAnimationFrame(step) : 0;
		};

		const lift = () => {
			headerRef.current?.style.setProperty('--lifted', node.scrollTop > liftedFrom ? '1' : '0');
		};

		const onScroll = () => {
			// Before the early return: the surface has to answer every scroll, not just the two that
			// cross a collapse threshold.
			lift();
			const next = node.scrollTop > (collapsed ? expandAt : collapseAt);
			if (next === collapsed) return;
			collapsed = next;
			headerRef.current?.classList.toggle('is-condensed', collapsed);
			if (reduced) {
				pose(collapsed ? 1 : 0);
				return;
			}
			from = progress;
			startedAt = 0;
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(step);
		};

		headerRef.current?.classList.toggle('is-condensed', collapsed);
		lift();
		pose(progress);
		node.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			node.removeEventListener('scroll', onScroll);
			cancelAnimationFrame(frame);
		};
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
