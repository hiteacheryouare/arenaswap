import LiveGameCard from '@arenaswap/ui/src/components/liveGameCard';
import GameCardReveal from '../../../entrypoints/popup/components/gameCardReveal';
import { revealCutMs, type revealCut } from '../../../entrypoints/popup/cardReveal';
import type { Game } from '@arenaswap/core/types';

const navyLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFUlEQVR4nGPkUXb4z4AHMOGTHD4KAH25AX7gsIqPAAAAAElFTkSuQmCC';
const goldLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8v03oPwMewIRPcvgoAADe+QLWq7gZUwAAAABJRU5ErkJggg==';

const makeGame = (awayScore: number, homeScore: number) => ({
	id: 'g1',
	status: 'in',
	league: 'nba',
	sportType: 'basketball',
	period: 4,
	displayClock: '2:10',
	awayTeam: { id: 'a', name: 'Miami', abbreviation: 'MIA', score: awayScore, color: '#0C2340', logo: navyLogo },
	homeTeam: { id: 'h', name: 'Arizona', abbreviation: 'ARI', score: homeScore, color: '#A71930', logo: goldLogo },
}) as unknown as Game;

const game = makeGame(104, 98);

const excitementResult = { total: 91 } as never;

const Harness = ({ cut, skipping = false, subject = game }: { cut: revealCut; skipping?: boolean; subject?: Game }) => (
	<div className='popup-container d-flex flex-column'>
		<div className='mt-3'>
			<div>
				<GameCardReveal game={subject} mode='quick' cut={cut} index={0} skipping={skipping}>
					<LiveGameCard
						game={subject}
						excitementResult={excitementResult}
						favoriteTeamIds={new Set<string>()}
						onToggleFavoriteTeam={() => {}}
						onOpenGameDetail={() => {}}
						bettingPrefs={{ bettingEnabled: false } as never}
					/>
				</GameCardReveal>
			</div>
		</div>
	</div>
);

const scrubTo = (ms: number) => {
	cy.get('.game-card-reveal[data-reveal-cut]').should('exist');
	return cy.document().then(doc => {
		doc.getAnimations().forEach(animation => {
			animation.pause();
			animation.currentTime = ms;
		});
	});
};

const centreOf = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

// `calc(50% + -12px) calc(50% + 3px)` → the two expressions, split on the space between them.
const topLevelTerms = (text: string) => {
	const terms: string[] = [];
	let depth = 0;
	let current = '';
	for (const char of text.trim()) {
		if (char === '(') depth += 1;
		if (char === ')') depth -= 1;
		if (char === ' ' && depth === 0) {
			if (current) terms.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	if (current) terms.push(current);
	return terms;
};

const resolveLength = (el: Element, expression: string, axis: 'width' | 'height') => {
	const probe = el.ownerDocument.createElement('div');
	probe.style.cssText = `position:absolute;top:0;left:0;width:1px;height:1px;${axis}:${expression}`;
	el.appendChild(probe);
	const size = probe.getBoundingClientRect()[axis];
	probe.remove();
	return size;
};

describe('the short opening cuts', () => {
	beforeEach(() => cy.viewport(320, 560));

	it('draws the cut it was handed and none of the poster', () => {
		cy.mount(<Harness cut='headToHead' />);
		cy.get('.game-card-reveal').should('have.attr', 'data-reveal-cut', 'headToHead');
		cy.get('.game-card-reveal-duel-slab').should('have.length', 2);
		cy.get('.game-card-reveal-sweeps').should('not.exist');
		cy.get('.game-card-reveal-wipe').should('not.exist');
	});

	it('plays the poster on the first open of the day, whatever cut was drawn', () => {
		cy.mount(
			<GameCardReveal game={game} mode='full' cut='typeSlam' index={0} skipping={false}>
				<LiveGameCard game={game} excitementResult={undefined} favoriteTeamIds={new Set<string>()} onToggleFavoriteTeam={() => {}} onOpenGameDetail={() => {}} bettingPrefs={{ bettingEnabled: false } as never} />
			</GameCardReveal>,
		);
		cy.get('.game-card-reveal').should('have.attr', 'data-reveal-cut', 'poster');
		cy.get('.game-card-reveal-slam').should('not.exist');
	});

	(['headToHead', 'typeSlam'] as const).forEach(cut => {
		it(`lands ${cut}'s crests exactly on the card's own`, () => {
			cy.mount(<Harness cut={cut} />);
			cy.get('.game-card-reveal-cut-crest').should('have.length', 2);
			scrubTo(revealCutMs[cut] - 10);
			cy.get('.game-card .team-crest').then($crests => {
				(['away', 'home'] as const).forEach((side, index) => {
					cy.get(`.game-card-reveal-cut-crest.is-${side}`).should($flying => {
						const flying = $flying[0].getBoundingClientRect();
						const card = $crests[index].getBoundingClientRect();
						expect(centreOf(flying).x, `${side} x`).to.be.closeTo(centreOf(card).x, 0.5);
						expect(centreOf(flying).y, `${side} y`).to.be.closeTo(centreOf(card).y, 0.5);
						expect(flying.width, `${side} size`).to.be.closeTo(card.width, 0.5);
					});
				});
			});
		});
	});

	it('drains each Type Slam half into the centre of its own crest', () => {
		cy.mount(<Harness cut='typeSlam' />);
		cy.get('.game-card-reveal-slam-half').should('have.length', 2);
		scrubTo(1500);
		cy.get('.game-card .team-crest').then($crests => {
			cy.get('.game-card-reveal-slam-half').should($halves => {
				[...$halves].forEach((half, index) => {
					const clip = getComputedStyle(half).clipPath;
					const [x, y] = topLevelTerms(clip.slice(clip.indexOf(' at ') + 4, -1));
					const box = half.getBoundingClientRect();
					const crest = centreOf($crests[index].getBoundingClientRect());
					expect(box.left + resolveLength(half, x!, 'width'), `drain ${index} x`).to.be.closeTo(crest.x, 1);
					expect(box.top + resolveLength(half, y!, 'height'), `drain ${index} y`).to.be.closeTo(crest.y, 1);
				});
			});
		});
	});

	it('rolls every number onto the one the card shows, in the same place', () => {
		cy.mount(<Harness cut='boxScore' />);
		cy.get('.game-card-reveal-roll').should('have.length', 3);
		cy.get('.game-card .game-score-value').first().should('have.css', 'visibility', 'hidden');
		scrubTo(revealCutMs.boxScore - 10);
		cy.get('.game-card :is(.game-score-value, .game-card-ps-score)').then($values => {
			cy.get('.game-card-reveal-roll').should($rolls => {
				[...$rolls].forEach((roll, index) => {
					const shown = roll.getBoundingClientRect();
					const real = $values[index].getBoundingClientRect();
					expect(shown.left, `roll ${index} left`).to.be.closeTo(real.left, 0.5);
					expect(shown.top, `roll ${index} top`).to.be.closeTo(real.top, 0.5);
					expect(shown.width, `roll ${index} width`).to.be.closeTo(real.width, 0.5);
					const landed = [...roll.querySelectorAll('.game-card-reveal-roll-column')].map(column => {
						const slot = column.getBoundingClientRect();
						const digit = [...column.querySelectorAll('.game-card-reveal-roll-strip > span')]
							.find(span => Math.abs(span.getBoundingClientRect().top - slot.top) < 0.5);
						return digit?.textContent;
					}).join('');
					expect(landed, `roll ${index} lands on`).to.equal(/\d+/.exec($values[index].textContent ?? '')?.[0]);
				});
			});
		});
		cy.get('.game-card-reveal', { timeout: revealCutMs.boxScore + 2000 }).should('not.have.attr', 'data-reveal-cut');
		cy.get('.game-card .game-score-value').first().should('have.css', 'visibility', 'visible');
	});

	// A one-digit score sits at the separator end of a box wider than itself, so the rolling digits
	// have to land where the real digit is drawn, not at the box's edge.
	it('rolls a one-digit score where the card draws it', () => {
		cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);
		cy.mount(<Harness cut='boxScore' subject={makeGame(2, 1)} />);
		cy.get('.game-card-reveal-roll').should('have.length', 3);
		scrubTo(revealCutMs.boxScore - 10);
		cy.get('.game-card .game-score-value').then($scores => {
			cy.get('.game-card-reveal-roll').should($rolls => {
				[0, 1].forEach(index => {
					const range = document.createRange();
					range.selectNodeContents($scores[index]);
					const real = range.getBoundingClientRect();
					const shown = $rolls[index].querySelector('.game-card-reveal-roll-column')!.getBoundingClientRect();
					expect(shown.left, `score ${index} left`).to.be.closeTo(real.left, 0.5);
					expect(shown.right, `score ${index} right`).to.be.closeTo(real.right, 0.5);
				});
			});
		});
	});

	it('keeps the rolling numbers on the real ones when the card shifts under them', () => {
		cy.mount(<Harness cut='boxScore' />);
		cy.get('.game-card-reveal-roll').should('have.length', 3);
		cy.get('.game-card .game-score-value').first().then($score => {
			$score[0].style.marginLeft = '24px';
			cy.get('.game-card-reveal-roll').first().should($roll => {
				expect($roll[0].getBoundingClientRect().left).to.be.closeTo($score[0].getBoundingClientRect().left, 0.5);
			});
		});
	});

	it('hands the real numbers straight back when somebody skips', () => {
		cy.mount(<Harness cut='boxScore' skipping />);
		cy.get('.game-card .game-score-value').first().should('have.css', 'visibility', 'visible');
		cy.get('.game-card-reveal-rolls').should('have.css', 'visibility', 'hidden');
	});
});
