import type { Tabs } from 'webextension-polyfill';
import type { Game, TabRegistration } from '@arenaswap/core/types';

interface Props {
	tab: Tabs.Tab;
	games: Game[];
	registry: TabRegistration[];
	onChange: (updated: TabRegistration[]) => void;
}

const TabSetupRow = ({ tab, games, registry, onChange }: Props) => {
	const current = registry.find(r => r.tabId === tab.id);
	const tabTitle = tab.title?.slice(0, 40) ?? `Tab #${tab.id}`;

	const onSelect = (gameId: string) => {
		if (!tab.id) return;
		const filtered = registry.filter(r => r.tabId !== tab.id);
		if (gameId === '') {
			onChange(filtered);
		} else {
			onChange([...filtered, { tabId: tab.id, gameId }]);
		}
	};

	return (
		<div className='mb-2'>
			<div className='sensitivity-label mb-1 text-truncate'>{tabTitle}</div>
			<select
				className='form-select form-select-sm'
				value={current?.gameId ?? ''}
				onChange={e => onSelect(e.target.value)}
			>
				<option value=''>— not assigned —</option>
				{games.map(game => (
					<option key={game.id} value={game.id}>
						{game.awayTeam.abbreviation} vs {game.homeTeam.abbreviation}
					</option>
				))}
			</select>
		</div>
	);
};

export default TabSetupRow;
