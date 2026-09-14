import { useCallback, useState } from 'react';
import Crest from './crest';
import { crestBacking } from './colorUtils';
import type { TeamMonoMarks } from '@arenaswap/core/types';
import { cachedCrestReadsOn, crestReadsOn, logoTint, pickMonoMark } from './logoTint';

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
//
// The decision needs the image's pixels, so it can only be made once the image has loaded. It is
// cached per crest and surface, so only the first row of a given team ever renders twice.
const TeamCrest = ({ logo, monoMarks, abbreviation, background, discClassName, crestClassName, fallback, loading }: teamCrestProps) => {
	const [readable, setReadable] = useState<boolean | undefined>(
		() => (logo ? cachedCrestReadsOn(logo, background) : undefined),
	);
	const [tint, setTint] = useState<string | null>(null);
	const monoMark = pickMonoMark(monoMarks, background);

	const handleLoaded = useCallback((image: HTMLImageElement) => {
		const src = image.currentSrc || image.src;
		// Only ever measured on the colour artwork. The white mark is white by construction, and
		// sampling it would answer a question nobody asked.
		if (monoMark && src === monoMark) return;
		setReadable(crestReadsOn(image, src, background));
		setTint(logoTint(image, src));
	}, [background, monoMark]);

	// Undefined means unmeasured, which renders the colour artwork — the thing the product wants and
	// the thing that is right for most of the league.
	const useMono = readable === false && monoMark !== undefined;
	const useDisc = readable === false && !useMono;

	return (
		<span className={`${discClassName}${useDisc ? '' : ' is-bare'}`} style={useDisc ? { background: crestBacking(tint) } : undefined}>
			<Crest
				logo={useMono ? monoMark : logo}
				abbreviation={abbreviation}
				className={`${crestClassName}${useMono ? ' is-mono' : ''}`}
				fallback={fallback}
				loading={loading}
				crossOrigin='anonymous'
				onLoaded={handleLoaded}
			/>
		</span>
	);
};

export default TeamCrest;
