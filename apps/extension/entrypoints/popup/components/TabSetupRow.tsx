import type { Tabs } from 'webextension-polyfill';
import type { Game, TabRegistration } from '@arenaswap/core/types';

interface Props {
	tab: Tabs.Tab;
	games: Game[];
	registry: TabRegistration[];
	onChange: (updated: TabRegistration[]) => void;
}

const SPORT_LABELS: Record<string, string> = { nba: 'NBA', ncaab: 'NCAA Basketball', nfl: 'NFL', ncaaf: 'NCAA Football', nhl: 'NHL', mlb: 'MLB' };
const SPORT_ORDER: Record<string, number> = { nba: 0, ncaab: 1, nfl: 2, ncaaf: 3, nhl: 4, mlb: 5 };

const groupBySport = (games: Game[]) =>
	[...games]
		.sort((a, b) => (SPORT_ORDER[a.sport] ?? 99) - (SPORT_ORDER[b.sport] ?? 99))
		.reduce<{ sport: string; games: Game[] }[]>((groups, game) => {
			const last = groups[groups.length - 1];
			if (last?.sport === game.sport) { last.games.push(game); return groups; }
			return [...groups, { sport: game.sport, games: [game] }];
		}, []);

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
				{groupBySport(games).map(({ sport, games: sportGames }) => (
					<optgroup key={sport} label={SPORT_LABELS[sport] ?? sport.toUpperCase()}>
						{sportGames.map(game => (
							<option key={game.id} value={game.id}>
								{game.awayTeam.abbreviation} vs {game.homeTeam.abbreviation}
							</option>
						))}
					</optgroup>
				))}
			</select>
		</div>
	);
};

export default TabSetupRow;
