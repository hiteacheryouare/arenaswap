import { i18n } from '#i18n';
import type { Game, Team } from '@arenaswap/core/types';
import Crest from '@arenaswap/ui/src/components/crest';
import { readableTeamInkOnCard } from '@arenaswap/ui/src/components/colorUtils';
import { showsRestDays } from './matchupLabels';
import type { FormResult, Paired } from './matchupParse';

interface recentFormProps {
	game: Game;
	form: Paired<FormResult[]>;
	awayColor: string;
	homeColor: string;
}

const resultLetterKeys = {
	W: 'detail.formWin',
	L: 'detail.formLoss',
	D: 'detail.formDraw',
	T: 'standings.ties',
} as const;

const hourMs = 3600_000;

// Elapsed hours rather than calendar days, because a calendar day is the viewer's and not the
// venue's: in Europe a 7:30pm Eastern tip lands after midnight and splits a back-to-back across
// two dates. Anything under 36 hours is consecutive days at the venue, matinee or not. Past a week
// it is a break, and rest stops being the story.
//
// Only for a game starting soon. The last five are games already played, so a game further out
// may have another one before it that the list cannot know about yet.
export const restPhrase = (lastPlayed: string | undefined, startTime: string | undefined, now = Date.now()): string | null => {
	if (!lastPlayed || !startTime) return null;
	const start = Date.parse(startTime);
	if (start - now > 12 * hourMs) return null;
	const hours = (start - Date.parse(lastPlayed)) / hourMs;
	if (hours <= 0) return null;
	if (hours < 36) return i18n.t('detail.backToBack');
	const restDays = Math.round(hours / 24) - 1;
	return restDays <= 6 ? i18n.t('detail.daysRest', restDays) : null;
};

const ResultCell = ({ result }: { result: FormResult }) => {
	const letter = i18n.t(resultLetterKeys[result.result]);
	const score = `${result.teamScore}–${result.opponentScore}`;
	const date = new Date(result.date).toLocaleDateString([], { month: 'short', day: 'numeric' });
	const opponent = i18n.t(result.isAway ? 'detail.formAt' : 'detail.formVs', { team: result.opponentAbbreviation });
	const description = `${opponent} · ${letter} ${score} · ${date}`;

	return (
		<li className='gd-form-cell' data-result={result.result} title={description} aria-label={description}>
			<Crest
				logo={result.opponentLogo}
				abbreviation={result.opponentAbbreviation}
				className='gd-form-crest'
				fallback='blank'
				loading='lazy'
			/>
			<span className='gd-form-letter' aria-hidden='true'>{letter}</span>
			<span className='gd-form-score' aria-hidden='true'>{score}</span>
		</li>
	);
};

const FormRow = ({ team, results, color, rest }: { team: Team; results: FormResult[]; color: string; rest: string | null }) => (
	<div className='gd-form-row'>
		<div className='gd-form-team'>
			<span className='gd-form-abbreviation' style={{ color: readableTeamInkOnCard(color) }}>{team.abbreviation}</span>
			{rest && <span className='gd-form-rest'>{rest}</span>}
		</div>
		<ol className='gd-form-results list-unstyled m-0'>
			{results.map(result => <ResultCell key={result.id} result={result} />)}
		</ol>
	</div>
);

const recentForm = ({ game, form, awayColor, homeColor }: recentFormProps) => {
	if (form.away.length === 0 && form.home.length === 0) return null;
	const withRest = showsRestDays(game.sportType);
	const restFor = (results: FormResult[]) => (withRest ? restPhrase(results.at(-1)?.date, game.startTime) : null);

	return (
		<>
			<div className='gd-setup-heading'>{i18n.t('detail.recentForm')}</div>
			<div className='gd-form'>
				{form.away.length > 0 && <FormRow team={game.awayTeam} results={form.away} color={awayColor} rest={restFor(form.away)} />}
				{form.home.length > 0 && <FormRow team={game.homeTeam} results={form.home} color={homeColor} rest={restFor(form.home)} />}
			</div>
		</>
	);
};

export default recentForm;
