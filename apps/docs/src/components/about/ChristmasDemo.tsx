import { leagueConfigMap } from '@arenaswap/core/constants';
import DetailHero from '@arenaswap/ui/src/components/detailHero';
import HolidayStockings from '@arenaswap/ui/src/components/holidayStockings';
import { buildGameCardSurface } from '@arenaswap/ui/src/components/gameCardShared';
import { resolveStatus } from '@arenaswap/ui/src/components/gameSituation';
import { christmasFinal } from '../docs/demoGames';
import { islandTranslator, TranslationContext } from '../../i18n/islandStrings';

interface ChristmasDemoProps {
	strings: Record<string, string>;
}

const noMonoLogos = { home: null, away: null };

const ChristmasDemo = ({ strings }: ChristmasDemoProps) => {
	const t = islandTranslator(strings);
	const game = christmasFinal;
	const { style, awayColor, homeColor } = buildGameCardSurface(game);
	const isInningSport = leagueConfigMap[game.league]?.periodFormat === 'innings';

	return (
		<TranslationContext.Provider value={t}>
			<div className='popup-container game-detail-shell doc-demo-popup-frame'>
				<div className='holiday-hang-from'>
					<DetailHero
						game={game}
						seriesInfo={null}
						monoLogos={noMonoLogos}
						isDelayed={false}
						isInningSport={isInningSport}
						status={resolveStatus(game, isInningSport, t)}
						heroStyle={style}
						awayColor={awayColor}
						homeColor={homeColor}
					/>
				</div>
				<HolidayStockings game={game} awayColor={awayColor} homeColor={homeColor} />
			</div>
		</TranslationContext.Provider>
	);
};

export default ChristmasDemo;
