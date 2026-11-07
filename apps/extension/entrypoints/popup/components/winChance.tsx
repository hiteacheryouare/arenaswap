import { i18n } from '#i18n';
import { isHomeFirst } from '@arenaswap/core/constants';
import type { Game } from '@arenaswap/core/types';
import { readableTeamInkOnCard } from '@arenaswap/chromatic';
import { useDisplayLocale } from '@arenaswap/ui/src/components/i18nContext';
import type { Paired } from '@arenaswap/sideline';

interface winChanceProps {
	game: Game;
	chance: Paired<number> | null;
	awayColor: string;
	homeColor: string;
}

const winChance = ({ game, chance, awayColor, homeColor }: winChanceProps) => {
	const locale = useDisplayLocale();
	if (!chance) return null;
	const away = { team: game.awayTeam, value: chance.away, color: awayColor };
	const home = { team: game.homeTeam, value: chance.home, color: homeColor };
	const [left, right] = isHomeFirst(game) ? [home, away] : [away, home];
	const percent = (value: number) => (value / 100).toLocaleString(locale, { style: 'percent' });

	return (
		<>
			<div className='gd-setup-heading'>{i18n.t('detail.chartWinProbTitle')}</div>
			<div className='gd-win-chance'>
				<div className='gd-win-chance-bar' aria-hidden='true'>
					<span style={{ flexGrow: left.value, background: left.color }} />
					<span style={{ flexGrow: right.value, background: right.color }} />
				</div>
				<div className='gd-win-chance-labels'>
					{[left, right].map(side => (
						<span key={side.team.id} className='gd-win-chance-side'>
							<span className='gd-win-chance-team' style={{ color: readableTeamInkOnCard(side.color) }}>{side.team.abbreviation}</span>
							<span className='gd-win-chance-value'>{percent(side.value)}</span>
						</span>
					))}
				</div>
			</div>
		</>
	);
};

export default winChance;
