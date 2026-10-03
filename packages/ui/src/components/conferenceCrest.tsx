import { useState } from 'react';
import { resolveConferenceCrest } from '@arenaswap/core/constants';
import Crest from './crest';
import { crestBacking } from './colorUtils';
import { cachedCrestReadsOn, cachedLogoTint, crestReadsOn, logoTint } from './logoTint';
import useDocumentTheme from './useDocumentTheme';

interface conferenceCrestProps {
	slug?: string;
	abbreviation: string;
	// The surface the crest sits on, per theme, as hex: legibility is a fact about the pair.
	surfaces: { dark: string; light: string };
	discClassName: string;
	crestClassName: string;
}

// A conference's own artwork, on the white disc team crests use when it would vanish into the
// surface. Conferences have no monochrome marks, so there is no middle step.
const ConferenceCrest = ({ slug, abbreviation, surfaces, discClassName, crestClassName }: conferenceCrestProps) => {
	const theme = useDocumentTheme();
	const background = surfaces[theme];
	const crest = resolveConferenceCrest(slug, theme);
	const [failedSrc, setFailedSrc] = useState<string>();
	const usingFallback = crest.src !== undefined && failedSrc === crest.src;
	const src = usingFallback ? crest.fallbackSrc : crest.src;
	const needsCheck = Boolean(src) && !(crest.drawnForDark && !usingFallback);

	const [, setMeasuredPair] = useState<string>();
	const readable = src && needsCheck ? cachedCrestReadsOn(src, background) : true;
	const useDisc = readable === false;
	const tint = useDisc && src ? cachedLogoTint(src) : null;

	const measure = (image: HTMLImageElement) => {
		if (!src || !needsCheck) return;
		if (!crestReadsOn(image, src, background)) logoTint(image, src);
		setMeasuredPair(`${src}|${background}`);
	};

	// Crest holds this in a ref, so a new function each render costs nothing.
	const handleFailed = () => {
		if (crest.src && crest.fallbackSrc) setFailedSrc(crest.src);
	};

	return (
		<span className={`${discClassName}${useDisc ? '' : ' is-bare'}`} style={useDisc ? { background: crestBacking(tint) } : undefined}>
			{/* Keyed on the surface too: a theme switch can move the surface without changing the image,
			    and remounting is what gets that pair measured. */}
			<Crest
				key={`${src}|${background}`}
				logo={src}
				abbreviation={abbreviation}
				className={crestClassName}
				loading='lazy'
				crossOrigin='anonymous'
				onLoaded={measure}
				onFailed={handleFailed}
			/>
		</span>
	);
};

export default ConferenceCrest;
