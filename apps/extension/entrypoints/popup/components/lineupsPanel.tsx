import type { CSSProperties } from 'react';
import { i18n } from '#i18n';
import { isHomeFirst } from '@arenaswap/core/constants';
import type { Game, Team } from '@arenaswap/core/types';
import { blackInkContrast, contrastBetween, hexLuminance, isHex, whiteInkContrast } from '@arenaswap/chromatic';
import Crest from '@arenaswap/ui/src/components/crest';
import type { Lineups, TeamLineup } from '@arenaswap/sideline';

// Percent of the pitch's height from a team's own goal line to its goalkeeper and to its front row.
const keeperDepth = 6;
const frontDepth = 42;
const nearBlack = '#111827';

const numberInk = (shirt: string, preferred?: string): string => {
	const shirtLuminance = hexLuminance(shirt);
	if (preferred && isHex(preferred) && contrastBetween(shirtLuminance, hexLuminance(preferred)) >= 3) return preferred;
	return whiteInkContrast(shirtLuminance) >= blackInkContrast(shirtLuminance) ? '#FFFFFF' : nearBlack;
};

const rowDepth = (index: number, rows: number): number => (
	rows <= 1 ? keeperDepth : keeperDepth + ((frontDepth - keeperDepth) * index) / (rows - 1)
);

const TeamHeader = ({ team, lineup }: { team: Team; lineup: TeamLineup }) => (
	<div className='gd-lineup-team'>
		<span className='d-inline-flex align-items-center gap-1 text-truncate'>
			<Crest logo={team.logo} abbreviation={team.abbreviation} className='gd-lineup-crest' fallback='blank' loading='lazy' />
			<span className='text-truncate'>{team.name || team.abbreviation}</span>
		</span>
		{lineup.formation && <span className='gd-lineup-formation'>{lineup.formation}</span>}
	</div>
);

// The top team attacks down the screen, so its own left is the screen's right.
const Players = ({ lineup, color, atTop }: { lineup: TeamLineup; color: string; atTop: boolean }) => {
	const shirt = lineup.shirtColor ?? color;
	const ink = numberInk(shirt, lineup.numberColor);
	return lineup.rows.flatMap((row, rowIndex) => {
		const depth = rowDepth(rowIndex, lineup.rows.length);
		const top = atTop ? depth : 100 - depth - 5;
		const ordered = atTop ? row.toReversed() : row;
		return ordered.map((player, slot) => {
			const style: CSSProperties = {
				left: `${((slot + 1) / (ordered.length + 1)) * 100}%`,
				top: `${top}%`,
			};
			return (
				<li key={player.id} className='gd-lineup-player' style={style}>
					<span className='gd-lineup-shirt' style={{ background: shirt, color: ink }}>{player.jersey ?? ''}</span>
					<span className='gd-lineup-name'>{player.name}</span>
				</li>
			);
		});
	});
};

const PitchMarkings = () => (
	<svg className='gd-lineup-markings' viewBox='0 0 68 105' aria-hidden='true'>
		<rect x='0.5' y='0.5' width='67' height='104' />
		<line x1='0.5' y1='52.5' x2='67.5' y2='52.5' />
		<circle cx='34' cy='52.5' r='9.15' />
		<rect x='13.84' y='0.5' width='40.32' height='16.5' />
		<rect x='24.84' y='0.5' width='18.32' height='5.5' />
		<rect x='13.84' y='88' width='40.32' height='16.5' />
		<rect x='24.84' y='99' width='18.32' height='5.5' />
	</svg>
);

const lineupsPanel = ({ game, lineups, awayColor, homeColor }: { game: Game; lineups: Lineups; awayColor: string; homeColor: string }) => {
	const homeFirst = isHomeFirst(game);
	const top = homeFirst
		? { team: game.homeTeam, lineup: lineups.home, color: homeColor }
		: { team: game.awayTeam, lineup: lineups.away, color: awayColor };
	const bottom = homeFirst
		? { team: game.awayTeam, lineup: lineups.away, color: awayColor }
		: { team: game.homeTeam, lineup: lineups.home, color: homeColor };

	return (
		<div className='gd-setup gd-lineups'>
			{top.lineup && <TeamHeader team={top.team} lineup={top.lineup} />}
			<div className='gd-lineup-pitch'>
				<PitchMarkings />
				{top.lineup && (
					<ul className='list-unstyled m-0' aria-label={i18n.t('detail.lineupLabel', { team: top.team.name || top.team.abbreviation })}>
						<Players lineup={top.lineup} color={top.color} atTop />
					</ul>
				)}
				{bottom.lineup && (
					<ul className='list-unstyled m-0' aria-label={i18n.t('detail.lineupLabel', { team: bottom.team.name || bottom.team.abbreviation })}>
						<Players lineup={bottom.lineup} color={bottom.color} atTop={false} />
					</ul>
				)}
			</div>
			{bottom.lineup && <TeamHeader team={bottom.team} lineup={bottom.lineup} />}
		</div>
	);
};

export default lineupsPanel;
