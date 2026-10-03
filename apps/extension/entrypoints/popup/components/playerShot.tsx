import Crest from '@arenaswap/ui/src/components/crest';
import { readableInkOn } from '@arenaswap/ui/src/components/colorUtils';
import { playerInitials } from './pregameLabels';

interface playerShotProps {
	url?: string;
	name: string;
	color: string;
	className: string;
}

const isHex = (color: string): boolean => /^#[\da-fA-F]{6}$/.test(color);

// The team colour lives on the disc, not on the placeholder. ESPN headshots are cut-outs with
// transparent backgrounds, so the disc is what the player is standing on — and it has to survive
// the placeholder being hidden the moment the image lands.
//
// Soccer sends a headshot for barely one leader in ten, so the initials are the common case there
// rather than a rare failure. Crest already does the URL-keyed retry and the text fallback.
const playerShot = ({ url, name, color, className }: playerShotProps) => (
	<span className={`gd-pregame-disc ${className}`} style={isHex(color) ? { background: color } : undefined}>
		<Crest
			logo={url}
			abbreviation={playerInitials(name)}
			className='gd-pregame-disc-crest'
			// Transparent so the disc shows through, and the initials take whichever ink stays
			// readable on it.
			fallbackStyle={{ background: 'transparent', color: readableInkOn(color) }}
			loading='lazy'
		/>
	</span>
);

export default playerShot;
