import type { CSSProperties } from 'react';
import { resolveLeagueLogoUrl } from '../../../../packages/core/src/constants';
import type { Game } from '../../../../packages/core/src/types';
import type { Slate } from '../data/slate';
import { browserTabs, filmTabs, isGameTab, tabById, type BrowserTab } from '../data/tabs';
import StreamView, { ChannelView } from './streamView';

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
}

const registeredIds = new Set(filmTabs.map(tab => tab.id));

// The night's other live scores, as of the moment on screen, for the studio channel's lower third.
const channelGames = (slate: Slate, slateTime: number) => Object.keys(slate.raw.games)
	.filter(gameId => !filmTabs.some(tab => tab.gameId === gameId))
	.map(gameId => slate.gameAt(gameId, slateTime))
	.filter((game): game is Game => game?.status === 'in')
	.slice(0, 4);

const TabPicture = ({ tab, slate, slateTime, t, style }: { tab: BrowserTab; slate: Slate; slateTime: number; t: number; style?: CSSProperties }) => {
	if (!isGameTab(tab)) return <ChannelView games={channelGames(slate, slateTime)} style={style} />;
	const game = slate.gameAt(tab.gameId, slateTime);
	return game ? <StreamView game={game} t={t} style={style} /> : null;
};

const Favicon = ({ tab, slate }: { tab: BrowserTab; slate: Slate }) => (isGameTab(tab)
	? <img src={resolveLeagueLogoUrl(tab.league, slate.raw.leagueLogos[tab.league])} alt='' className='browser-tab-favicon' />
	: <i className='bi bi-broadcast browser-tab-favicon film-tab-channel' />);

// The docs hero's Chrome window (apps/docs/src/styles/_browser-hero.scss) with the night's streams
// in it, so the film and the homepage show the same browser.
const BrowserWindow = ({ view, slate, slateTime, t, width, height, style, zoom }: BrowserWindowProps) => {
	const active = tabById(view.activeTabId);
	const previous = view.previousTabId !== undefined && view.wipe !== undefined && view.wipe < 1 ? tabById(view.previousTabId) : undefined;
	const wipe = view.wipe ?? 1;
	const reveal = view.wipeFrom === 'right' ? `inset(0 0 0 ${(1 - wipe) * 100}%)` : `inset(0 ${(1 - wipe) * 100}% 0 0)`;

	return (
		<div className='film-browser' style={{ width: width / zoom, height: height / zoom, zoom, ...style }}>
			<div className='browser' role='presentation'>
				<div className='browser-titlebar'>
					<span className='browser-lights'><i /><i /><i /></span>
					<div className='browser-tabs'>
						{browserTabs.map(tab => {
							const isActive = tab.id === view.activeTabId;
							const audible = view.managed && (isActive || registeredIds.has(tab.id));
							return (
								<span key={tab.id} className={`browser-tab${isActive ? ' is-active' : ''}`} data-film-tab={tab.id}>
									<Favicon tab={tab} slate={slate} />
									<span className='browser-tab-title'>{tab.title}</span>
									{audible && <i className={`bi ${isActive ? 'bi-volume-up-fill' : 'bi-volume-mute-fill'} film-tab-audio`} />}
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
					{previous && <TabPicture tab={previous} slate={slate} slateTime={slateTime} t={t} />}
					<TabPicture tab={active} slate={slate} slateTime={slateTime} t={t} style={previous ? { clipPath: reveal } : undefined} />
				</div>
			</div>
		</div>
	);
};

export default BrowserWindow;
