import SelectDropdown from '@arenaswap/ui/src/components/selectDropdown';
import TabFavicon from '@arenaswap/ui/src/components/tabFavicon';
import { useT } from '@arenaswap/ui/src/components/i18nContext';
import { leagueFavicon } from './demoGames';
import type { DemoEntry } from './demoGames';

const noop = () => {};

const DemoTabSlot = ({ entry }: { entry: DemoEntry }) => {
	const t = useT();
	return (
		<div className='game-card-tab-assign' data-card-control='true'>
			<SelectDropdown
				value={entry.game.id}
				options={[
					{ value: '', label: t('tabAssign.placeholder') },
					{ value: entry.game.id, label: entry.tabTitle, image: <TabFavicon url={leagueFavicon(entry.game.league)} /> },
				]}
				onChange={noop}
				ariaLabel={t('tabAssign.placeholder')}
			/>
		</div>
	);
};

export default DemoTabSlot;
