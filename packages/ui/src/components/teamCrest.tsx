import { useCallback, useEffect, useRef, useState } from 'react';
import Crest from './crest';
import { crestBacking } from './colorUtils';
import type { TeamMonoMarks } from '@arenaswap/core/types';
import { cachedCrestReadsOn, cachedLogoTint, crestReadsOn, logoTint, pickMonoMark } from './logoTint';

interface teamCrestProps {
	logo?: string;
	// ESPN's two monochrome marks for this team, where it has drawn them. Which one is used depends
	// on the surface: white on a dark backdrop, black on a light one.
	monoMarks?: TeamMonoMarks;
	abbreviation: string;
	// The surface the crest is drawn on, as a hex. What counts as readable is a fact about the two
	// together, so it cannot be decided anywhere but the call site.
	background: string;
	discClassName: string;
	crestClassName: string;
	fallback?: 'abbreviation' | 'blank';
	loading?: 'eager' | 'lazy';
}

// A team's crest in its own colours, which is what it should be: half the league's artwork is built
// to sit on a dark broadcast background and looks better there than any monochrome treatment. The
// colours are only given up when keeping them would stop the crest being legible at all — the
// Yankees' navy monogram on the popup, where none of its ink clears the surface behind it.
//
// Three treatments, in order of preference:
//   1. the colour artwork, bare, when it reads where it is drawn;
//   2. ESPN's own white mark, bare, when it does not — and when white itself reads there, which on
//      a team's own light alternate it does not;
//   3. the colour artwork on a white disc tinted from the crest, when neither of those holds. That
//      is every non-North-American club, and it is what shipped before any of this.
const TeamCrest = ({ logo, monoMarks, abbreviation, background, discClassName, crestClassName, fallback, loading }: teamCrestProps) => {
	// Both answers are looked up in the module caches on every render rather than copied into state
	// at mount. A verdict is a fact about a crest and a surface, and both of those move underneath a
	// mounted instance: the guide's drawer reconciles one game's detail view into the next, and the
	// hero passes a different backdrop hex per game. Held in state, the previous team's verdict drew
	// the next team's crest — Denver as a white silhouette until their PNG landed, on a machine that
	// already knew the right answer — which is the swap the persisted cache exists to prevent.
	const [, setMeasurements] = useState(0);
	const readable = logo ? cachedCrestReadsOn(logo, background) : undefined;
	const monoMark = pickMonoMark(monoMarks, background);

	// Undefined means unmeasured, which renders the colour artwork — the thing the product wants and
	// the thing that is right for most of the league.
	const useMono = readable === false && monoMark !== undefined;
	const useDisc = readable === false && !useMono;
	const tint = useDisc && logo ? cachedLogoTint(logo) : null;

	const imageRef = useRef<HTMLImageElement | null>(null);

	const measure = useCallback((image: HTMLImageElement) => {
		imageRef.current = image;
		if (!logo) return;
		// Only ever measured on the colour artwork. The white mark is white by construction, and
		// sampling it would answer a question nobody asked.
		if (monoMark && (image.currentSrc || image.src) === monoMark) return;
		// The tint paints the disc and nothing else, and the disc is only drawn for a crest that
		// neither reads nor has a mark to fall back to. Sampling it for the rest was a second canvas
		// read of the same image that no branch could ever use.
		if (!crestReadsOn(image, logo, background) && !monoMark) logoTint(image, logo);
		setMeasurements(count => count + 1);
	}, [logo, background, monoMark]);

	// The surface can move without the image moving with it — the same crest going from a dark bar
	// to a light card — and `onLoaded` only fires on a load. `readable` is undefined here precisely
	// when the pair has never been measured, so this cannot run against a mark or re-run against an
	// answer already in hand.
	useEffect(() => {
		const image = imageRef.current;
		if (readable !== undefined || !image?.complete) return;
		measure(image);
	}, [readable, measure]);

	return (
		<span className={`${discClassName}${useDisc ? '' : ' is-bare'}`} style={useDisc ? { background: crestBacking(tint) } : undefined}>
			<Crest
				logo={useMono ? monoMark : logo}
				abbreviation={abbreviation}
				className={`${crestClassName}${useMono ? ' is-mono' : ''}`}
				fallback={fallback}
				loading={loading}
				crossOrigin='anonymous'
				onLoaded={measure}
			/>
		</span>
	);
};

export default TeamCrest;
