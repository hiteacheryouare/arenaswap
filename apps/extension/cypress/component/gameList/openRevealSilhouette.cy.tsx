import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import GameCardReveal from '../../../entrypoints/popup/components/gameCardReveal';
import { revealBaseDurationMs, revealFullRate, revealNameBeatMs, revealOpenBeatMs } from '../../../entrypoints/popup/cardReveal';
import type { Game } from '@arenaswap/core/types';

const svg = (body: string) => `data:image/svg+xml;base64,${btoa(
	`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>${body}</svg>`,
)}`;

// Texas: a burnt-orange mark on burnt orange, with nothing left showing. Penn State: a navy shield on
// Penn State navy carrying a white lion, which is mostly gone and still reads, so it keeps its colours.
const burntOrange = '#BF5700';
const lostMark = svg(`<path d='M4 20 L22 26 L32 50 L42 26 L60 20 L44 18 L32 30 L20 18 Z' fill='${burntOrange}'/>`);
const pennStateNavy = '#061440';
const shieldMark = svg(`<path d='M8 6 H56 V34 Q56 52 32 60 Q8 52 8 34 Z' fill='${pennStateNavy}'/><circle cx='32' cy='30' r='11' fill='#FFFFFF'/>`);

const game = {
	id: 'g1',
	status: 'in',
	league: 'ncaaf',
	sportType: 'football',
	period: 2,
	awayTeam: { id: 'a', name: 'Texas Longhorns', nickname: 'Longhorns', color: burntOrange, abbreviation: 'TEX', score: 14, logo: lostMark },
	homeTeam: { id: 'h', name: 'Penn State Nittany Lions', nickname: 'Nittany Lions', color: pennStateNavy, abbreviation: 'PSU', score: 10, logo: shieldMark },
} as unknown as Game;

const Harness = () => (
	<div className='popup-container d-flex flex-column'>
		<div className='mt-3'>
			<GameCardReveal game={game} mode='full' index={0} skipping={false}>
				<LiveGameCard
					game={game}
					excitementResult={undefined}
					favoriteTeamIds={new Set<string>()}
					onToggleFavoriteTeam={() => {}}
					onOpenGameDetail={() => {}}
					bettingPrefs={{ bettingEnabled: false }}
				/>
			</GameCardReveal>
		</div>
	</div>
);

const scrubTo = (ms: number) => cy.document().then(doc => {
	doc.getAnimations().forEach(animation => {
		animation.pause();
		animation.currentTime = ms * revealFullRate;
	});
});

const posterStart = revealOpenBeatMs + revealNameBeatMs;
const posterAt = (share: number) => posterStart + revealBaseDurationMs * share;

const filterOf = (selector: string) => cy.get(selector).then($img => getComputedStyle($img[0]!).filter);

describe('the open reveal keeps a crest visible on its own team colour', () => {
	beforeEach(() => {
		cy.mount(<Harness />);
		cy.get('.game-card-reveal-opening-logo').should('have.length', 2)
			.each($crest => cy.wrap($crest).should('have.attr', 'data-crest-state', 'loaded'));
	});

	it('draws a crest lost in its own colour as a white silhouette in the opening scene', () => {
		scrubTo(revealOpenBeatMs / 2);
		cy.get('.game-card-reveal-opening-field.is-away .game-card-reveal-opening-logo').should('have.class', 'is-silhouette-white');
		filterOf('.game-card-reveal-opening-field.is-away .avatar-img').should('equal', 'contrast(0) brightness(2)');
	});

	it('leaves a crest whose detail still reads in its colours', () => {
		scrubTo(revealOpenBeatMs / 2);
		cy.get('.game-card-reveal-opening-field.is-home .game-card-reveal-opening-logo').should($crest => expect($crest[0]!.className).not.to.match(/is-silhouette-/));
		filterOf('.game-card-reveal-opening-field.is-home .avatar-img').should('equal', 'none');
	});

	// The poster crest lands on the card's own, which keeps its colours, so the silhouette has to be
	// gone by the time it gets there or the crest would change at the handoff.
	it('holds the silhouette on the poster and hands the card its colour crest', () => {
		const posterCrest = '.game-card-reveal-wipe.is-away .avatar-img';
		cy.get('.game-card-reveal-wipe.is-away .game-card-reveal-crest-logo').should('have.class', 'is-silhouette-white');
		scrubTo(posterAt(0.5));
		filterOf(posterCrest).should('equal', 'contrast(0) brightness(2)');
		scrubTo(posterAt(0.95));
		filterOf(posterCrest).should('equal', 'none');
		cy.get('.game-card .team-crest').first().should($crest => expect($crest[0]!.className).not.to.match(/is-silhouette-/));
	});
});
