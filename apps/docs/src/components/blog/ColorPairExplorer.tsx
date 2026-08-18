import { useState } from 'react';
import { resolveTeamColorPair } from '@arenaswap/ui/src/components/colorUtils';

interface teamInput {
	color: string;
	alternateColor: string;
}

interface presetState {
	away: teamInput;
	home: teamInput;
}

// The three cases the July 9 normalization pass was written for: two teams whose primaries
// nearly match, a team the API gave no color at all, and an ordinary pair that needs no help —
// so the "before" swatches and the resolveTeamColorPair() output can sit side by side.
const PRESETS: Record<string, presetState> = {
	'Two near-identical navies': {
		away: { color: '#0C2340', alternateColor: '#C4CED4' },
		home: { color: '#002D62', alternateColor: '#A2AAAD' },
	},
	'No color for one team': {
		away: { color: '', alternateColor: '' },
		home: { color: '#E31837', alternateColor: '#FFB81C' },
	},
	'Already high-contrast': {
		away: { color: '#007A33', alternateColor: '#BA9653' },
		home: { color: '#552583', alternateColor: '#FDB927' },
	},
};

const DEFAULT_PRESET = 'Two near-identical navies';

const Swatch = ({ label, color }: { label: string; color: string | undefined }) => (
	<div className='color-pair-swatch'>
		<span className='color-pair-swatch-chip' style={{ background: color || 'transparent', borderStyle: color ? 'solid' : 'dashed' }} />
		<span className='color-pair-swatch-label'>{label}</span>
		<span className='color-pair-swatch-hex'>{color || 'none'}</span>
	</div>
);

const ColorPairExplorer = () => {
	const [state, setState] = useState<presetState>(PRESETS[DEFAULT_PRESET]!);

	// The real, pure function `buildGameCardStyle` calls on every card border and gradient — not a
	// re-implementation of its clash check.
	const [resolvedAway, resolvedHome] = resolveTeamColorPair(
		{ color: state.away.color || undefined, alternateColor: state.away.alternateColor || undefined },
		{ color: state.home.color || undefined, alternateColor: state.home.alternateColor || undefined },
	);

	return (
		<div className='signal-breakdown'>
			<div className='signal-breakdown-presets'>
				{Object.keys(PRESETS).map(name => (
					<button
						key={name}
						type='button'
						className={`signal-breakdown-preset-btn${state === PRESETS[name] ? ' active' : ''}`}
						onClick={() => setState(PRESETS[name]!)}
					>
						{name}
					</button>
				))}
			</div>

			<div className='signal-breakdown-controls'>
				<label className='signal-breakdown-control'>
					Away primary
					<input type='text' value={state.away.color} onChange={e => setState(s => ({ ...s, away: { ...s.away, color: e.target.value } }))} />
				</label>
				<label className='signal-breakdown-control'>
					Away alternate
					<input type='text' value={state.away.alternateColor} onChange={e => setState(s => ({ ...s, away: { ...s.away, alternateColor: e.target.value } }))} />
				</label>
				<label className='signal-breakdown-control'>
					Home primary
					<input type='text' value={state.home.color} onChange={e => setState(s => ({ ...s, home: { ...s.home, color: e.target.value } }))} />
				</label>
				<label className='signal-breakdown-control'>
					Home alternate
					<input type='text' value={state.home.alternateColor} onChange={e => setState(s => ({ ...s, home: { ...s.home, alternateColor: e.target.value } }))} />
				</label>
			</div>

			<div className='color-pair-rows'>
				<div className='color-pair-row'>
					<Swatch label='Away primary in' color={state.away.color} />
					<Swatch label='Home primary in' color={state.home.color} />
				</div>
				<div className='color-pair-arrow' aria-hidden='true'>resolveTeamColorPair()</div>
				<div className='color-pair-row'>
					<Swatch label='Away resolved' color={resolvedAway} />
					<Swatch label='Home resolved' color={resolvedHome} />
				</div>
			</div>
			<p className='signal-breakdown-cap-note'>
				When a primary pair clashes, the function swaps in whichever alternate maximizes the RGB
				distance between the two, and falls back to a fixed blue/red pair when a team has no
				color at all. Clear a color field above to see that fallback fire.
			</p>
		</div>
	);
};

export default ColorPairExplorer;
