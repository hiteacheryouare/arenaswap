import Crest from '@arenaswap/ui/src/components/crest';
import { isHex } from '@arenaswap/chromatic';
import { playerInitials } from './pregameLabels';

interface playerShotProps {
	url?: string;
	name: string;
	color: string;
	className: string;
}

const playerShot = ({ url, name, color, className }: playerShotProps) => (
	<span className={`gd-pregame-disc ${className}`} style={isHex(color) ? { background: color } : undefined}>
		<Crest
			logo={url}
			abbreviation={playerInitials(name)}
			className='gd-pregame-disc-crest'
			teamColor={color}
			loading='lazy'
		/>
	</span>
);

export default playerShot;
