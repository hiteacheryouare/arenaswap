import type { CSSProperties, ReactNode } from 'react';
import Crest from '@arenaswap/ui/src/components/crest';
import { heroGames } from '../hero/heroGames';

// A small Chrome window drawn with the hero's own classes, so the steps and the hero are the same
// browser. Its tabs are the hero's three games, each a placeholder panel in its teams' colours.

export type TabSound = 'audible' | 'muted';

export interface StepTab {
	game: number;
	loading?: boolean;
	sound?: TabSound;
}

interface StepBrowserProps {
	tabs: StepTab[];
	active: number;
	popupOpen?: boolean;
	children?: ReactNode;
}

const base = import.meta.env.BASE_URL;

const soundIcon = { audible: 'bi-volume-up-fill', muted: 'bi-volume-mute-fill' } as const;

const StepBrowser = ({ tabs, active, popupOpen = false, children }: StepBrowserProps) => {
	const onScreen = heroGames[tabs[active].game];

	return (
		<div className='browser'>
			<div className='browser-titlebar'>
				<span className='browser-lights'><i /><i /><i /></span>
				<div className='browser-tabs'>
					{tabs.map((tab, index) => {
						const script = heroGames[tab.game];
						return (
							<span key={script.base.id} className={`browser-tab${index === active ? ' is-active' : ''}`}>
								{tab.loading
									? <span className='spinner-border step-demo-throbber' />
									: <Crest logo={`${base}images/leagues/${script.base.league}.png`} abbreviation='' icon='bi-globe2' className='browser-tab-favicon' />}
								<span className='browser-tab-title'>{tab.loading ? script.tabHost : script.tabTitle}</span>
								{tab.sound && <i className={`bi ${soundIcon[tab.sound]} step-demo-sound${tab.sound === 'audible' ? ' is-audible' : ''}`} />}
								<span className='browser-tab-close'><i className='bi bi-x-lg' /></span>
								<span className='browser-tab-flare' />
							</span>
						);
					})}
					<span className='browser-newtab' data-step-spot='newTab'><i className='bi bi-plus-lg' /></span>
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
						{onScreen.tabHost}<span className='browser-omnibox-path'>/watch/live</span>
					</span>
				</span>
				<span className='browser-toolbar-end'>
					<span className={`browser-extension${popupOpen ? ' is-open' : ''}`}>
						<img src={`${base}images/icon_white_on_transparent.svg`} alt='' />
					</span>
				</span>
			</div>

			<div className='browser-viewport'>
				{tabs.map((tab, index) => {
					const { base: game } = heroGames[tab.game];
					const tint = { '--away-tint': game.awayTeam.color, '--home-tint': game.homeTeam.color } as CSSProperties;
					return (
						<span key={game.id} className={`step-demo-placeholder${index === active && !tab.loading ? ' is-active' : ''}`} style={tint}>
							<Crest logo={`${base}images/leagues/${game.league}.png`} abbreviation='' icon='bi-globe2' />
						</span>
					);
				})}
				{children}
			</div>
		</div>
	);
};

export default StepBrowser;
