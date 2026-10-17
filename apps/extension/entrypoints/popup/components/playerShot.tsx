import Crest from '@arenaswap/ui/src/components/crest';
import { isHex } from '@arenaswap/chromatic';
import { playerInitials } from './pregameLabels';

interface playerShotProps {
	url?: string;
	name: string;
	color: string;
	className: string;
}

// The team colour lives on the disc, not on the placeholder. ESPN headshots are cut-outs with
// transparent backgrounds, so the disc is what the player is standing on — and it has to survive
// the placeholder being hidden the moment the image lands. The placeholder takes the same colour,
// so the initials sit on the disc in whichever ink reads on it.
//
// Soccer sends a headshot for barely one leader in ten, so the initials are the common case there
// rather than a rare failure. Crest already does the URL-keyed retry and the text fallback.
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
