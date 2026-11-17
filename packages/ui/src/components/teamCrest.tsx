import { useCallback, useEffect, useRef, useState } from 'react';
import Crest from './crest';
import type { TeamMonoMarks } from '@arenaswap/core/types';
import { cachedCrestReadsOn, cachedLogoTint, crestBacking, crestReadsOn, logoTint, pickMonoMark } from '@arenaswap/chromatic';

interface teamCrestProps {
	logo?: string;
	monoMarks?: TeamMonoMarks;
	abbreviation: string;
	background: string;
	discClassName: string;
	crestClassName: string;
	fallback?: 'abbreviation' | 'blank';
	loading?: 'eager' | 'lazy';
	teamColor?: string;
}

const TeamCrest = ({ logo, monoMarks, abbreviation, background, discClassName, crestClassName, fallback, loading, teamColor }: teamCrestProps) => {
	const [measuredPair, setMeasuredPair] = useState<string>();
	const readable = logo ? cachedCrestReadsOn(logo, background) : undefined;
	const monoMark = pickMonoMark(monoMarks, background);

	const useMono = readable === false && monoMark !== undefined;
	const useDisc = readable === false && !useMono;
	const tint = useDisc && logo ? cachedLogoTint(logo) : null;

	const imageRef = useRef<HTMLImageElement | null>(null);

	// A measurement that was attempted and produced nothing counts as an answer. `crestReadsOn`
	// deliberately declines to write down a verdict it could not reach — a tainted canvas, or
	// Chrome handing back no context past its memory ceiling, which a guide with a hundred bars can
	// reach — and waiting for one would leave those crests behind their placeholder for good.
	const judged = readable !== undefined || measuredPair === `${logo}|${background}`;
	const verdict = monoMark === undefined ? undefined : judged ? 'settled' : 'pending';

	const measure = useCallback((image: HTMLImageElement) => {
		imageRef.current = image;
		if (!logo) return;
		if (monoMark && (image.currentSrc || image.src) === monoMark) return;
		if (!crestReadsOn(image, logo, background) && !monoMark) logoTint(image, logo);
		setMeasuredPair(`${logo}|${background}`);
	}, [logo, background, monoMark]);

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
				teamColor={teamColor}
				loading={loading}
				crossOrigin='anonymous'
				verdict={verdict}
				onLoaded={measure}
			/>
		</span>
	);
};

export default TeamCrest;
