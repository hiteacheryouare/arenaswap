import type { Tabs } from 'webextension-polyfill';
import type { Game, TabRegistration } from '@madness/core/types';

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
			<div className='text-gray-300 small mb-1 text-truncate'>{tabTitle}</div>
			<select
				className='form-select form-select-sm bg-gray-800 text-gray-200 border-gray-600'
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
