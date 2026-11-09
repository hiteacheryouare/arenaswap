import { useState } from 'react';
import { teamLogoOnColor } from '@arenaswap/core/constants';
import type { Team } from '@arenaswap/core/types';
import Crest from './crest';
import { blackInkContrast, cachedCrestReadsOn, crestReadsOn, hexLuminance, hexToLab, isHex, whiteInkContrast } from '@arenaswap/chromatic';

// Tottenham publish white as their colour, and the dark-ground cockerel is white too.
const lightGroundLightness = 90;

// Remembered for the life of the page, so a crest the CDN has no dark variant of is asked for once
// rather than by every card, hero and reveal that draws it.
const missingDarkVariants = new Set<string>();

interface onColorCrestProps {
	team: Team;
	// The colour the crest is drawn on, where it is drawn on one.
	surface?: string;
	className: string;
	fallback?: 'abbreviation' | 'blank';
	loading?: 'eager' | 'lazy';
	// The published crest itself failing, once the dark-ground variant has already been given up on.
	onFailed?: () => void;
	// For a crest drawn big on the bare team colour with no shade over it, where a crest in that same
	// colour is simply gone: Texas's burnt-orange longhorn on Texas's burnt orange. Such a crest is
	// drawn as a white or black silhouette, whichever stands further off the surface.
	silhouetteWhenLost?: boolean;
}

export type crestSilhouette = 'white' | 'black';

export const silhouetteFor = (surface: string): crestSilhouette => {
	const backdrop = hexLuminance(surface);
	return whiteInkContrast(backdrop) >= blackInkContrast(backdrop) ? 'white' : 'black';
};

// The crest drawn for a dark ground on a side painted in the team's colour, which is what Apple
// Sports puts there for every club: the Red Sox's red B and the Yankees' white NY. The published
// crest stays on a plain plate and on a side painted near-white, and is the fallback for a crest
// the CDN has no dark variant of.
const OnColorCrest = ({ team, surface, className, fallback, loading, onFailed, silhouetteWhenLost }: onColorCrestProps) => {
	const onDarkGround = surface !== undefined && (hexToLab(surface)?.lightness ?? 0) <= lightGroundLightness;
	// A logo off any other host comes back from `teamLogoOnColor` unchanged, and is not a variant.
	const darkVariant = onDarkGround ? teamLogoOnColor(team.logo) : undefined;
	const onColorLogo = darkVariant !== team.logo ? darkVariant : undefined;
	const [, setFailedLogo] = useState<string>();
	const logo = onColorLogo && !missingDarkVariants.has(onColorLogo) ? onColorLogo : team.logo;

	// Judged the way `TeamCrest` judges, and held behind the placeholder until judged, so a crest
	// headed for a silhouette never paints its colours first. The verdict persists, so that hold
	// only ever happens the first time a crest meets a colour.
	const [measuredPair, setMeasuredPair] = useState<string>();
	const judgedSurface = silhouetteWhenLost && logo && isHex(surface) ? surface : undefined;
	const pair = `${logo}|${judgedSurface}`;
	const reads = judgedSurface && logo ? cachedCrestReadsOn(logo, judgedSurface) : undefined;
	const silhouette = reads === false && judgedSurface ? silhouetteFor(judgedSurface) : undefined;
	const verdict = !judgedSurface ? undefined : reads !== undefined || measuredPair === pair ? 'settled' : 'pending';

	return (
		<Crest
			logo={logo}
			abbreviation={(team.abbreviation || '?').slice(0, 3)}
			className={silhouette ? `${className} is-silhouette-${silhouette}` : className}
			fallback={fallback}
			teamColor={team.color}
			loading={loading}
			crossOrigin={judgedSurface ? 'anonymous' : undefined}
			verdict={verdict}
			onLoaded={judgedSurface ? image => {
				if (logo) crestReadsOn(image, logo, judgedSurface);
				setMeasuredPair(pair);
			} : undefined}
			onFailed={onColorLogo && logo === onColorLogo ? () => {
				missingDarkVariants.add(onColorLogo);
				setFailedLogo(onColorLogo);
			} : onFailed}
		/>
	);
};

export default OnColorCrest;
