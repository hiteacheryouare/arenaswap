import { useCallback, useState } from 'react';
import Crest from './crest';
import { crestBacking, isHex, logoTint } from '@arenaswap/chromatic';

interface crestDiscProps {
	logo?: string;
	abbreviation: string;
	discClassName: string;
	crestClassName: string;
	fallback?: 'abbreviation' | 'blank';
	loading?: 'eager' | 'lazy';
	teamColor?: string;
}

const CrestDisc = ({ logo, abbreviation, discClassName, crestClassName, fallback, loading, teamColor }: crestDiscProps) => {
	const [tint, setTint] = useState<string | null>(null);
	const [loadedLogo, setLoadedLogo] = useState<string>();
	const handleLoaded = useCallback((image: HTMLImageElement) => {
		setTint(logoTint(image, image.currentSrc || image.src));
		setLoadedLogo(image.getAttribute('src') ?? undefined);
	}, []);
	const fill = isHex(teamColor) && (!logo || loadedLogo !== logo) ? teamColor : crestBacking(tint);

	return (
		<span className={discClassName} style={{ background: fill }}>
			<Crest
				logo={logo}
				abbreviation={abbreviation}
				className={crestClassName}
				fallback={fallback}
				teamColor={teamColor}
				loading={loading}
				crossOrigin='anonymous'
				onLoaded={handleLoaded}
			/>
		</span>
	);
};

export default CrestDisc;
