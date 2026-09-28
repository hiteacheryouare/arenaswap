import type { CSSProperties } from 'react';
import type { Team, TeamMonoMarks } from '@arenaswap/core/types';
import TeamCrest from './teamCrest';
import { monogramInk, monogramScale } from './gameSurface';

interface boardCrestProps {
	team: Team;
	size: number;
	// The surface the crest is drawn on, as a hex, which is what decides whether its artwork reads.
	surface: string;
	// The team's resolved colour, for the monogram a missing crest falls back to.
	color: string;
	monoMarks?: TeamMonoMarks | null;
	className?: string;
	// For long lists, such as the first-run team picker.
	loading?: 'eager' | 'lazy';
}

const BoardCrest = ({ team, size, surface, color, monoMarks, className, loading }: boardCrestProps) => (
	<span
		className={`as-crest-box${className ? ` ${className}` : ''}`}
		style={{
			'--crest': `${size}px`,
			'--mono-bg': color,
			'--mono-ink': monogramInk(team, color),
			'--mono-scale': monogramScale(team.abbreviation || '?'),
		} as CSSProperties}
		data-reveal-crest=''
	>
		<TeamCrest
			logo={team.logo}
			monoMarks={monoMarks ?? undefined}
			abbreviation={team.abbreviation || '?'}
			background={surface}
			discClassName='as-crest'
			crestClassName='as-crest-art'
			loading={loading}
		/>
	</span>
);

export default BoardCrest;
