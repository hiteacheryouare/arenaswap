import type { Team } from '@arenaswap/core/types';
import OnColorCrest from '@arenaswap/ui/src/components/onColorCrest';

interface revealCutCrestProps {
	team: Team;
	surface: string;
	side: 'away' | 'home';
}

const RevealCutCrest = ({ team, surface, side }: revealCutCrestProps) => (
	<span className={`game-card-reveal-cut-crest is-${side}`}>
		<span className='game-card-reveal-crest-plate is-bare'>
			<OnColorCrest team={team} surface={surface} className='game-card-reveal-crest-logo' loading='eager' />
		</span>
	</span>
);

export default RevealCutCrest;
