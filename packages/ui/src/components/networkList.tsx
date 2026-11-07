import { Fragment, useState } from 'react';
import type { BroadcastLogo, Game } from '@arenaswap/core/types';

// What the list is drawn on. A team colour is dark under its scrim, but a colourful mark like a
// red wordmark disappears into a red team, so only the white artwork made for a dark ground is used there.
export type NetworkSurface = 'dark' | 'light' | 'team';

const logoFor = (logos: BroadcastLogo | undefined, surface: NetworkSurface): string | undefined => {
	if (!logos) return undefined;
	if (surface === 'light') return logos.logo;
	if (surface === 'team') return logos.darkLogo;
	return logos.darkLogo ?? logos.logo;
};

const NetworkList = ({ game, surface }: { game: Game; surface: NetworkSurface }) => {
	const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
	const names = game.broadcasts ?? [];

	return names.map((name, index) => {
		const src = logoFor(game.broadcastLogos?.[name], surface);
		return (
			<Fragment key={name}>
				{index > 0 && ' • '}
				{src && !failed.has(src)
					? (
						<img
							className='network-logo'
							src={src}
							alt={name}
							title={name}
							onError={() => setFailed(previous => new Set(previous).add(src))}
						/>
					)
					: name}
			</Fragment>
		);
	});
};

export default NetworkList;
