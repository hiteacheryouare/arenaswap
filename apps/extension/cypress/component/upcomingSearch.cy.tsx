import { useRef, useState } from 'react';
import MainView from '../../entrypoints/popup/components/mainView';
import type { Game, UserPreferences } from '@arenaswap/core/types';
import { createDefaultUserPreferences } from '@arenaswap/core/constants';
import { PopupSectionTitle } from '@arenaswap/ui/src/components/popupChrome';
import UpcomingSearchTitle from '../../entrypoints/popup/components/upcomingSearchTitle';
import UpcomingDayPager from '../../entrypoints/popup/components/upcomingDayPager';

const prefs: UserPreferences = { ...createDefaultUserPreferences(), enabledLeagues: ['nba', 'nhl'], proTipsEnabled: false };

const dayAt = (offsetDays: number) => {
	const date = new Date();
	date.setDate(date.getDate() + offsetDays);
	date.setHours(23, 0, 0, 0);
	return date.toISOString();
};

const team = (id: string, name: string, abbreviation: string) => ({ id, name, abbreviation, score: 0 });

const pre = (id: string, away: ReturnType<typeof team>, home: ReturnType<typeof team>, offsetDays: number, extra: Partial<Game> = {}): Game => ({
	id,
	status: 'pre',
	league: 'nba',
	sportType: 'basketball',
	startTime: dayAt(offsetDays),
	period: 0,
	clockSeconds: 0,
	awayTeam: away,
	homeTeam: home,
	...extra,
});

const celtics = team('2', 'Boston Celtics', 'BOS');
const knicks = team('18', 'New York Knicks', 'NY');
const sixers = team('20', 'Philadelphia 76ers', 'PHI');
const lakers = team('13', 'Los Angeles Lakers', 'LAL');
const flyers = team('15', 'Philadelphia Flyers', 'PHI');
const bruins = team('1', 'Boston Bruins', 'BOS');

const slate: Game[] = [
	pre('bos-ny', celtics, knicks, 0, { broadcasts: ['TNT'] }),
	pre('phi-lal', sixers, lakers, 0, { venueName: 'Crypto.com Arena' }),
	pre('phi-bos-nhl', flyers, bruins, 0, { league: 'nhl', sportType: 'hockey' }),
	pre('lal-bos', lakers, celtics, 1),
	pre('ny-phi', knicks, sixers, 1),
];

const cards = () => cy.get('[data-testid^="game-card-"]');

// Stands in for app.tsx, which holds the day page and the query so both outlive a trip into a
// game's details.
const Harness = ({ games = slate }: { games?: Game[] }) => {
	const scrollOffsetRef = useRef(0);
	const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
	const [upcomingQuery, setUpcomingQuery] = useState<string | null>(null);
	const [view, setView] = useState<'main' | 'detail'>('main');
	if (view === 'detail') return <button type='button' data-testid='fake-back' onClick={() => setView('main')}>Back</button>;
	return (
		<>
			<button type='button' data-testid='fake-open-detail' onClick={() => setView('detail')}>Open</button>
			<MainView
				prefs={prefs}
				prefsLoaded
				isLoading={false}
				hasError={false}
				games={games}
				scores={[]}
				leagueLogos={{}}
				registry={[]}
				favoriteTeamIds={new Set()}
				gameBoosts={{}}
				openTabs={[]}
				onStandbyStream={false}
				onOpenGameDetail={() => {}}
				onOpenSetup={() => {}}
				suggestionCount={0}
				onReviewSuggestions={() => {}}
				onDismissSuggestions={() => {}}
				onStartWalkthrough={() => {}}
				onOpenGuide={() => {}}
				onRefresh={() => {}}
				showReviewPrompt={false}
				onToggleEnabled={() => {}}
				onDismissReviewPrompt={() => {}}
				onLeaveReview={() => {}}
				onToggleFavoriteTeam={() => {}}
				onRegistryChange={() => {}}
				formatTabLabel={() => 'Tab'}
				scrollOffsetRef={scrollOffsetRef}
				selectedDayKey={selectedDayKey}
				onSelectDay={setSelectedDayKey}
				upcomingQuery={upcomingQuery}
				onUpcomingQueryChange={setUpcomingQuery}
			/>
		</>
	);
};

const mount = (games?: Game[]) => {
	cy.viewport(320, 600);
	cy.mount(<Harness games={games} />);
};

const openSearch = () => cy.get('[data-testid="upcoming-search-open"]').click();

describe('Up Next search', () => {
	it('opens from the title row with the field focused, in place of the title', () => {
		mount();
		cy.contains('.popup-section-title', 'Up Next').should('exist');
		openSearch();
		cy.get('[data-testid="upcoming-search-input"]').should('be.focused');
		cy.contains('.popup-section-title', 'Up Next').should('not.be.visible');
		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Today');
	});

	it('narrows the shown day to the games that match', () => {
		mount();
		cards().should('have.length', 3);
		openSearch();
		cy.get('[data-testid="upcoming-search-input"]').type('celtics');
		cards().should('have.length', 1);
		cy.get('[data-testid="game-card-bos-ny"]').should('exist');
	});

	it('matches league, network and venue, and needs every word to land', () => {
		mount();
		openSearch();
		cy.get('[data-testid="upcoming-search-input"]').type('nhl');
		cards().should('have.length', 1);
		cy.get('[data-testid="game-card-phi-bos-nhl"]').should('exist');

		cy.get('[data-testid="upcoming-search-input"]').clear().type('tnt');
		cy.get('[data-testid="game-card-bos-ny"]').should('exist');
		cards().should('have.length', 1);

		cy.get('[data-testid="upcoming-search-input"]').clear().type('crypto');
		cy.get('[data-testid="game-card-phi-lal"]').should('exist');
		cards().should('have.length', 1);

		cy.get('[data-testid="upcoming-search-input"]').clear().type('philadelphia nba');
		cy.get('[data-testid="game-card-phi-lal"]').should('exist');
		cards().should('have.length', 1);
	});

	it('keeps the query when paging to another day', () => {
		mount();
		openSearch();
		cy.get('[data-testid="upcoming-search-input"]').type('lakers');
		cy.get('[data-testid="game-card-phi-lal"]').should('exist');
		cy.get('[data-testid="upcoming-day-next"]').click();
		cy.get('[data-testid="upcoming-day-label"]').should('have.text', 'Tomorrow');
		cy.get('[data-testid="upcoming-search-input"]').should('have.value', 'lakers');
		cards().should('have.length', 1);
		cy.get('[data-testid="game-card-lal-bos"]').should('exist');
	});

	it('says so when nothing on the day matches, and keeps the pager', () => {
		mount();
		openSearch();
		cy.get('[data-testid="upcoming-search-input"]').type('zamboni');
		cards().should('have.length', 0);
		cy.get('[data-testid="upcoming-search-empty"]').should('contain.text', 'zamboni');
		cy.get('[data-testid="upcoming-day-pager"]').should('exist');
	});

	it('wraps a long unbroken query inside the no-match line', () => {
		mount();
		openSearch();
		cy.get('[data-testid="upcoming-search-input"]').type('q'.repeat(60));
		cy.get('[data-testid="upcoming-search-empty"]').should(([message]: JQuery<HTMLElement>) => {
			expect(message.scrollWidth).to.be.at.most(message.clientWidth);
		});
		cy.get('.popup-container').should(([container]: JQuery<HTMLElement>) => {
			expect(container.scrollWidth).to.be.at.most(container.clientWidth);
		});
	});

	it('closes with the button, restoring the whole day and handing focus back', () => {
		mount();
		openSearch();
		cy.get('[data-testid="upcoming-search-input"]').type('celtics');
		cy.get('[data-testid="upcoming-search-close"]').click();
		cy.get('[data-testid="upcoming-search"]').should('not.exist');
		cards().should('have.length', 3);
		cy.get('[data-testid="upcoming-search-open"]').should('be.focused');
	});

	it('closes on Escape without letting the key through to the popup', () => {
		mount();
		openSearch();
		cy.get('[data-testid="upcoming-search-input"]').type('celtics');
		cy.document().then(doc => {
			doc.addEventListener('keydown', event => {
				if (event.key === 'Escape') expect(event.defaultPrevented, 'Escape default prevented').to.equal(true);
			}, { once: true });
		});
		cy.get('[data-testid="upcoming-search-input"]').type('{esc}');
		cy.get('[data-testid="upcoming-search"]').should('not.exist');
		cards().should('have.length', 3);
	});

	it('holds the search across a trip into a game, without stealing focus on the way back', () => {
		mount();
		openSearch();
		cy.get('[data-testid="upcoming-search-input"]').type('knicks');
		cy.get('[data-testid="fake-open-detail"]').click();
		cy.get('[data-testid="fake-back"]').click();
		cy.get('[data-testid="upcoming-search-input"]').should('have.value', 'knicks').and('not.be.focused');
		cards().should('have.length', 1);
	});

	// The field takes the title's place, so a few pixels of difference between the two would
	// shove the pager and every card under it the moment the search opens.
	it('opens without moving the pager', () => {
		mount();
		cy.get('[data-testid="upcoming-day-pager"]').then(([pager]) => {
			const before = pager!.getBoundingClientRect().top;
			openSearch();
			cy.get('[data-testid="upcoming-day-pager"]').should(([after]) => {
				expect(after!.getBoundingClientRect().top).to.be.closeTo(before, 0.5);
			});
		});
	});

	it('fits the longest placeholder we ship inside the field', () => {
		mount();
		openSearch();
		cy.get('[data-testid="upcoming-search"]').should(([field]) => {
			expect(field!.scrollWidth).to.be.at.most(field!.clientWidth);
		});
	});
});

const fieldAnimation = (field: HTMLElement) => field.getAnimations()[0] as CSSAnimation | undefined;

describe('Up Next search motion', () => {
	it('grows out of the magnifier', () => {
		mount();
		cy.get('[data-testid="upcoming-search-open"]').then(([magnifier]) => {
			const magnifierRight = magnifier!.getBoundingClientRect().right;
			openSearch();
			cy.get('[data-testid="upcoming-search"]').should(([field]) => {
				const animation = fieldAnimation(field!);
				expect(animation?.animationName).to.equal('upcoming-search-expand');
				animation!.pause();
				animation!.currentTime = 0;
				const box = field!.getBoundingClientRect();
				expect(box.width, 'starts magnifier-sized').to.be.closeTo(28.8, 0.5);
				expect(box.right, 'right edge on the title row end').to.be.at.least(magnifierRight - 0.5);
			});
			cy.get('[data-testid="upcoming-search"]').then(([field]) => fieldAnimation(field!)!.finish());
			cy.get('[data-testid="upcoming-search"]').should(([field]) => {
				expect(field!.getBoundingClientRect().width).to.be.greaterThan(250);
			});
		});
	});

	// The field wipes over the title as it widens, which only reads if nothing shows through it.
	it('paints an opaque surface over the title it covers', () => {
		mount();
		openSearch();
		cy.get('[data-testid="upcoming-search"]').should(([field]) => {
			const alpha = getComputedStyle(field!).backgroundColor.match(/[\d.]+/g)?.[3];
			expect(alpha === undefined || Number(alpha) === 1, `opaque background, got ${getComputedStyle(field!).backgroundColor}`).to.equal(true);
		});
	});

	it('does not replay the entrance when it comes back already open', () => {
		mount();
		openSearch();
		cy.get('[data-testid="upcoming-search-input"]').type('knicks');
		cy.get('[data-testid="fake-open-detail"]').click();
		cy.get('[data-testid="fake-back"]').click();
		cy.get('[data-testid="upcoming-search"]').should(([field]) => {
			expect(field!.getAnimations()).to.have.length(0);
		});
	});

	it('folds back into the magnifier before the day comes back', () => {
		mount();
		openSearch();
		cy.get('[data-testid="upcoming-search-input"]').type('celtics');
		cy.get('[data-testid="upcoming-search"]').should(([field]) => expect(field!.getAnimations()).to.have.length(0));
		cy.get('[data-testid="upcoming-search-close"]').click();
		cy.get('[data-testid="upcoming-search"]').should(([field]) => {
			const animation = fieldAnimation(field!);
			expect(animation?.animationName).to.equal('upcoming-search-collapse');
			animation!.pause();
		});
		cy.contains('.popup-section-title', 'Up Next').should('be.visible');
		cards().should('have.length', 1);
		cy.get('[data-testid="upcoming-search"]').then(([field]) => fieldAnimation(field!)!.finish());
		cy.get('[data-testid="upcoming-search"]').should('not.exist');
		cards().should('have.length', 3);
	});

	// The row sits the title in a grid so the field can share its cell. A grid item's margins no
	// longer collapse into the section's, so the row carries them instead, and the closed state has
	// to land exactly where the bare title did.
	it('lays out the closed row exactly where the bare title sat', () => {
		cy.viewport(320, 600);
		const pager = <UpcomingDayPager dayLabel='Today' index={0} total={2} onSelect={() => {}} />;
		cy.mount(
			<div className='popup-container d-flex flex-row gap-0'>
				<div className='w-50' data-testid='bare'><div className='mt-3'><PopupSectionTitle first>Up Next</PopupSectionTitle>{pager}</div></div>
				<div className='w-50' data-testid='row'><div className='mt-3'><UpcomingSearchTitle query={null} onQueryChange={() => {}} first />{pager}</div></div>
			</div>,
		);
		cy.get('[data-testid="bare"] [data-testid="upcoming-day-pager"]').then(([bare]) => {
			cy.get('[data-testid="row"] [data-testid="upcoming-day-pager"]').should(([row]) => {
				expect(row!.getBoundingClientRect().top).to.be.closeTo(bare!.getBoundingClientRect().top, 0.1);
			});
		});
	});
});
