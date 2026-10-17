import FinalGameCard from '@arenaswap/ui/src/components/finalGameCard';
import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import GameCardReveal from '../../entrypoints/popup/components/gameCardReveal';
import {
	revealBaseDurationMs,
	revealFullRate,
	revealOpenMs,
	revealQuickRate,
	type revealMode,
} from '../../entrypoints/popup/cardReveal';
import type { Game, Team } from '@arenaswap/core/types';

// The London Lions, as our sources sent them for their preseason game in Portland: a name, a
// nickname and an abbreviation, and no logo or colour at all.
const lions = { id: 'a', name: 'London Lions', nickname: 'Lions', abbreviation: 'LON', score: 38 };
const blazersMark = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8v03oPwMewIRPcvgoAADe+QLWq7gZUwAAAABJRU5ErkJggg==';
const blazers = { id: 'h', name: 'Portland Trail Blazers', nickname: 'Trail Blazers', abbreviation: 'POR', score: 51, color: '#E03A3E', logo: blazersMark };
const brokenMark = 'data:image/png;base64,AAAA';
const slowMissingMark = 'https://crests.test/london-lions.png';

const game = (away: Partial<Team>, home: Partial<Team>, status: 'in' | 'post' = 'in') => ({
	id: 'g1',
	status,
	league: 'nba',
	sportType: 'basketball',
	period: 2,
	clock: '5:12',
	awayTeam: away,
	homeTeam: home,
}) as unknown as Game;

const Harness = ({ subject, mode = 'full' }: { subject: Game; mode?: revealMode }) => {
	const shared = {
		game: subject,
		excitementResult: undefined,
		favoriteTeamIds: new Set<string>(),
		onToggleFavoriteTeam: () => {},
		onOpenGameDetail: () => {},
		bettingPrefs: { bettingEnabled: false },
	};
	return (
		<div className='popup-container d-flex flex-column'>
			<div className='mt-3'>
				<div>
					<GameCardReveal game={subject} mode={mode} index={0} skipping={false}>
						{subject.status === 'post' ? <FinalGameCard {...shared} /> : <LiveGameCard {...shared} />}
					</GameCardReveal>
				</div>
			</div>
		</div>
	);
};

const scrubTo = (ms: number) => {
	cy.get('.game-card-reveal').should('exist');
	return cy.document().then(doc => {
		doc.getAnimations().forEach(animation => {
			animation.pause();
			animation.currentTime = ms;
		});
	});
};

const spineMs = (ms: number, mode: revealMode = 'full') => (
	revealOpenMs(mode) + ms * (mode === 'full' ? revealFullRate : revealQuickRate)
);
const openMs = (ms: number) => ms * revealFullRate;

const inkOf = (element: Element) => {
	const range = element.ownerDocument.createRange();
	range.selectNodeContents(element);
	return range.getBoundingClientRect();
};

// Where an animation's first frame falls on the document timeline.
const begins = (animation: Animation) => (animation.startTime as number) + Number(animation.effect!.getTiming().delay);

const awayName = '.game-card-reveal-opening-field.is-away .game-card-reveal-opening-field-name';
const awayCrest = '.game-card-reveal-wipe.is-away .game-card-reveal-crest';
const awayDisc = `${awayCrest}.is-named .crest-fallback`;

describe('the open reveal for a club with no crest', () => {
	beforeEach(() => {
		cy.viewport(320, 560);
		// The graphic removes itself on a timer, and these scrub a long way into it.
		cy.clock();
	});

	it('names the club in the crest scene where its crest would have been', () => {
		cy.mount(<Harness subject={game(lions, blazers)} />);
		cy.get(`${awayName} .game-card-reveal-opening-name-line`).then($lines => {
			expect([...$lines].map(line => line.textContent)).to.deep.equal(['London', 'Lions']);
		});
		cy.get('.game-card-reveal-opening-field.is-away .game-card-reveal-opening-logo').should('not.exist');
		cy.get('.game-card-reveal-opening-field.is-home .game-card-reveal-opening-logo').should('exist');
		cy.get('.game-card-reveal-opening-field.is-home .game-card-reveal-opening-field-name').should('not.exist');
	});

	it('names it on the poster too, and only on its own side', () => {
		cy.mount(<Harness subject={game(lions, blazers)} />);
		cy.get(`${awayCrest}.is-named .game-card-reveal-crest-name`).should('contain.text', 'London');
		cy.get('.game-card-reveal-wipe.is-home .game-card-reveal-crest').should('not.have.class', 'is-named');
	});

	it('treats a crest that fails to load as one it was never sent', () => {
		cy.mount(<Harness subject={game({ ...lions, logo: brokenMark }, blazers)} />);
		cy.get(awayName).should('exist');
		cy.get(awayCrest).should('have.class', 'is-named');
		cy.get(awayDisc).should('have.text', 'LON');
	});

	it('names the club on the poster in the quick version, which has no crest scene', () => {
		cy.mount(<Harness subject={game(lions, blazers)} mode='quick' />);
		cy.get('.game-card-reveal-opening').should('not.exist');
		cy.get(awayCrest).should('have.class', 'is-named');
	});

	// Fitted to the half rather than overhanging it the way a crest does, so every letter is on the
	// club's own colour and none of them is under the other club's.
	it('keeps the name in the crest scene clear of the seam, on either side', () => {
		cy.mount(<Harness subject={game(lions, { ...blazers, logo: undefined })} />);
		scrubTo(openMs(3500 * 0.22));
		cy.get('.game-card').then($card => {
			const card = $card[0].getBoundingClientRect();
			const centre = card.left + card.width / 2;
			cy.get(`${awayName} .game-card-reveal-opening-name-line`).each($line => {
				const ink = inkOf($line[0]);
				expect(ink.left, 'away left').to.be.greaterThan(card.left);
				expect(ink.right, 'away right').to.be.lessThan(centre);
			});
			cy.get('.game-card-reveal-opening-field.is-home .game-card-reveal-opening-field-name .game-card-reveal-opening-name-line').each($line => {
				const ink = inkOf($line[0]);
				expect(ink.left, 'home left').to.be.greaterThan(centre);
				expect(ink.right, 'home right').to.be.lessThan(card.right);
			});
		});
	});

	// The name is what the bar uncovers, and the card's own placeholder is what lands. The trade is
	// done before the descent at 78%, so a word never travels down over the score.
	it('trades the name for the card\'s own disc before it descends', () => {
		cy.mount(<Harness subject={game(lions, blazers)} />);
		scrubTo(spineMs(revealBaseDurationMs * 0.74));
		cy.get(`${awayCrest} .game-card-reveal-crest-name`).should('have.css', 'opacity', '1');
		cy.get(awayDisc).should('have.css', 'opacity', '1');
		scrubTo(spineMs(revealBaseDurationMs * 0.6));
		cy.get(`${awayCrest} .game-card-reveal-crest-name`).should('have.css', 'opacity', '1');
		cy.get(awayDisc).should('have.css', 'opacity', '0');
		scrubTo(spineMs(revealBaseDurationMs * 0.78));
		cy.get(`${awayCrest} .game-card-reveal-crest-name`).should('have.css', 'opacity', '0');
		cy.get(awayDisc).should('have.css', 'opacity', '1');
	});

	// Opaque over the side's colour rather than the card's translucent white, because the card's disc
	// steps in underneath this one at the handoff and two translucent ones stacked would brighten.
	it('lands a disc that matches the one on the card', () => {
		cy.mount(<Harness subject={game(lions, blazers)} />);
		scrubTo(spineMs(revealBaseDurationMs) - 10);
		cy.get('.game-card .team-crest .crest-fallback').first().then($real => {
			const real = getComputedStyle($real[0]);
			cy.get(awayDisc).should($disc => {
				const drawn = getComputedStyle($disc[0]);
				expect($disc.text()).to.equal($real.text());
				expect(drawn.fontSize, 'font size').to.equal(real.fontSize);
				expect(drawn.color, 'ink').to.equal(real.color);
				expect(real.backgroundImage, 'the card\'s tint').to.contain('rgba(255, 255, 255, 0.16)');
				expect(drawn.backgroundImage, 'the same tint').to.contain('rgba(255, 255, 255, 0.16)');
				expect(drawn.backgroundColor, 'over the side\'s colour').to.equal('rgb(48, 54, 61)');
			});
		});
	});

	it('lands the light disc a finished card draws', () => {
		cy.mount(<Harness subject={game(lions, blazers, 'post')} />);
		scrubTo(spineMs(revealBaseDurationMs) - 10);
		cy.get('.game-card .team-crest .crest-fallback').first().then($real => {
			const real = getComputedStyle($real[0]);
			cy.get(awayDisc).should($disc => {
				const drawn = getComputedStyle($disc[0]);
				expect(drawn.backgroundColor, 'background').to.equal(real.backgroundColor);
				expect(drawn.color, 'ink').to.equal(real.color);
			});
		});
	});

	// A logo can fail two round trips in, which is when the stand-ins mount and their animations would
	// otherwise start. They have to run on the crest's clock regardless, or the name is still up when
	// the descent begins.
	it('keeps a stand-in that mounted late on the graphic\'s clock', () => {
		cy.intercept('GET', slowMissingMark, { statusCode: 404, delay: 600 });
		cy.mount(<Harness subject={game({ ...lions, logo: slowMissingMark }, blazers)} />);
		cy.get(`${awayCrest} .game-card-reveal-crest-name`).should($name => {
			const [crest] = $name.closest('.game-card-reveal-crest')[0].getAnimations();
			const [name] = $name[0].getAnimations();
			expect(name.startTime, 'started').to.be.a('number');
			expect(begins(name), 'name').to.be.closeTo(begins(crest!), 20);
		});
		cy.get(awayCrest).should($crest => {
			expect(parseFloat($crest[0].style.getPropertyValue('--reveal-late')), 'late by').to.be.greaterThan(500);
		});
	});
});
