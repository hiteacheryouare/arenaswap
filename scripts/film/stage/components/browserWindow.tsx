import type { CSSProperties } from 'react';
import { resolveLeagueLogoUrl } from '../../../../packages/core/src/constants';
import type { Slate } from '../data/slate';
import { filmTabs, tabById } from '../data/tabs';
import StreamView from './streamView';

export interface TabView {
	activeTabId: number;
	// The tab being wiped away during a switch, and how far the incoming one has covered it.
	previousTabId?: number;
	wipe?: number;
	wipeFrom?: 'left' | 'right';
	// ArenaSwap mutes every registered tab but the one in front.
	managed: boolean;
}

interface BrowserWindowProps {
	view: TabView;
	slate: Slate;
	slateTime: number;
	t: number;
	width: number;
	height: number;
	style?: CSSProperties;
	// The chrome is drawn at the docs hero's rem sizes and zoomed up to the frame.
	zoom: number;
	// Light thrown across the stream when something big happens in it.
	flash?: number;
}

// The docs hero's Chrome window (apps/docs/src/styles/_browser-hero.scss) with the five streams of
// the night in it, so the film and the homepage show the same browser.
const BrowserWindow = ({ view, slate, slateTime, t, width, height, style, zoom, flash }: BrowserWindowProps) => {
	const active = tabById(view.activeTabId);
	const game = slate.gameAt(active.gameId, slateTime);
	const previous = view.previousTabId !== undefined && view.wipe !== undefined && view.wipe < 1 ? tabById(view.previousTabId) : undefined;
	const previousGame = previous ? slate.gameAt(previous.gameId, slateTime) : undefined;
	const wipe = view.wipe ?? 1;
	const reveal = view.wipeFrom === 'right' ? `inset(0 0 0 ${(1 - wipe) * 100}%)` : `inset(0 ${(1 - wipe) * 100}% 0 0)`;

	return (
		<div className='film-browser' style={{ width: width / zoom, height: height / zoom, zoom, ...style }}>
			<div className='browser' role='presentation'>
				<div className='browser-titlebar'>
					<span className='browser-lights'><i /><i /><i /></span>
					<div className='browser-tabs'>
						{filmTabs.map(tab => {
							const isActive = tab.id === view.activeTabId;
							return (
								<span key={tab.id} className={`browser-tab${isActive ? ' is-active' : ''}`} data-film-tab={tab.id}>
									<img src={resolveLeagueLogoUrl(tab.league, slate.raw.leagueLogos[tab.league])} alt='' className='browser-tab-favicon' />
									<span className='browser-tab-title'>{tab.title}</span>
									{view.managed && <i className={`bi ${isActive ? 'bi-volume-up-fill' : 'bi-volume-mute-fill'} film-tab-audio`} />}
									<span className='browser-tab-close'><i className='bi bi-x-lg' /></span>
									<span className='browser-tab-flare' />
								</span>
							);
						})}
						<span className='browser-newtab'><i className='bi bi-plus-lg' /></span>
					</div>
				</div>
				<div className='browser-toolbar'>
					<span className='browser-nav'>
						<i className='bi bi-arrow-left' />
						<i className='bi bi-arrow-right' />
						<i className='bi bi-arrow-clockwise' />
					</span>
					<span className='browser-omnibox'>
						<i className='bi bi-sliders2 browser-omnibox-info' />
						<span className='browser-omnibox-url'>
							{active.host}<span className='browser-omnibox-path'>{active.url.slice(active.url.indexOf(active.host) + active.host.length)}</span>
						</span>
						<i className='bi bi-star browser-omnibox-star' />
					</span>
					<span className='browser-toolbar-end'>
						<i className='bi bi-puzzle' />
						<span className='browser-extension' data-film-extension>
							<img src='/images/icon_white_on_transparent.svg' alt='' />
						</span>
						<span className='browser-avatar' />
						<i className='bi bi-three-dots-vertical' />
					</span>
				</div>
				<div className='browser-viewport film-viewport'>
					{previousGame && <StreamView game={previousGame} t={t} />}
					{game && <StreamView game={game} t={t} flash={flash} style={previousGame ? { clipPath: reveal } : undefined} />}
				</div>
			</div>
		</div>
	);
};

export default BrowserWindow;
