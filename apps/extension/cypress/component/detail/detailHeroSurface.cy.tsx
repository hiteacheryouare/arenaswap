import DetailHero from '@arenaswap/ui/src/components/detailHero';
import DetailPosterHero from '../../../entrypoints/popup/components/detailPosterHero';
import DetailStickyBar from '../../../entrypoints/popup/components/detailStickyBar';
import type { Game } from '@arenaswap/core/types';
import { bodyTextContrast, captionContrast } from '../../support/contrast';
import type { MonoLogos } from '@arenaswap/ui/src/components/detailSummary';
import type { GameStatus } from '@arenaswap/ui/src/components/gameSituation';

const awayColor = '#29126F';
const homeColor = '#003B75';

const liveGame: Game = {
	id: 'g1',
	league: 'nfl',
	sportType: 'football',
	status: 'in',
	period: 2,
	clockSeconds: 300,
	awayTeam: { id: 'a', name: 'Baltimore Ravens', abbreviation: 'BAL', score: 14, color: awayColor, alternateColor: '#000000' },
	homeTeam: { id: 'h', name: 'Indianapolis Colts', abbreviation: 'IND', score: 10, color: homeColor, alternateColor: '#FFFFFF' },
};

const heroStyle = {
	backgroundImage:
		'linear-gradient(180deg, rgba(3, 7, 12, 0.18) 0%, rgba(3, 7, 12, 0.52) 100%), '
		+ `linear-gradient(to right, ${awayColor} 0%, ${awayColor} 30%, ${homeColor} 70%, ${homeColor} 100%)`,
};

const markUrl = (side: string) => `https://a.espncdn.com/combiner/i?img=/guid/${side}/logos/primary_logo_white.png&w=120&h=120`;
const mono: MonoLogos = { away: { white: markUrl('a') }, home: { white: markUrl('h') } };

const loadFaceOf = (selector: string) => cy.get(selector).first().then(([el]: JQuery<HTMLElement>) => el!.ownerDocument.fonts.load(getComputedStyle(el!).font, el!.textContent || 'Abc'));

const mountLive = (game: Game, monoLogos = mono, isDelayed = false, status: { text: string; clock?: string } = { text: 'Q2', clock: '5:00' }) => {
	cy.mount(
		<div style={{ width: '320px', background: '#0d1117', padding: '0.75rem' }}>
			<DetailHero
				game={game}
				seriesInfo={null}
				records={{ home: '3-1', away: '2-2' }}
				monoLogos={monoLogos}
				isDelayed={isDelayed}
				isInningSport={game.sportType === 'baseball'}
				status={status}
				heroStyle={heroStyle}
				awayColor={awayColor}
				homeColor={homeColor}
			/>
		</div>,
	);
};

const channels = (value: string): [number, number, number] => {
	const matched = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value)!;
	return [Number(matched[1]), Number(matched[2]), Number(matched[3])];
};

const luminance = (value: string): number => {
	const linear = channels(value).map(channel => {
		const scaled = channel / 255;
		return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
	});
	return (0.2126 * linear[0]!) + (0.7152 * linear[1]!) + (0.0722 * linear[2]!);
};

const darkestHeroPairLuminance = 0.0121;
const contrastOnHero = (ink: string): number => (
	(luminance(ink) + 0.05) / (darkestHeroPairLuminance + 0.05)
);

describe('the detail hero surface', () => {
	it('carries the scrimmed team gradient when the game is live', () => {
		mountLive(liveGame);
		cy.get('.gd-hero-live').should('exist').then($hero => {
			const image = getComputedStyle($hero[0]!).backgroundImage;
			expect(image, 'the two team colours').to.include('rgb(41, 18, 111)').and.to.include('rgb(0, 59, 117)');
			expect(image, 'the scrim over them').to.include('rgba(3, 7, 12, 0.18)');
			expect(getComputedStyle($hero[0]!).backgroundColor).to.not.equal('rgb(255, 255, 255)');
		});
	});

	it('re-tones every line of the hero for the scrim', () => {
		mountLive(liveGame);
		const readable = (selector: string, label: string) => {
			cy.get(selector).first().then($el => {
				expect(contrastOnHero(getComputedStyle($el[0]!).color), label).to.be.greaterThan(4.5);
			});
		};
		readable('.game-detail-score-value', 'the score');
		readable('.game-detail-team-name', 'the team name');
		readable('.game-detail-team-record', 'the record');
		readable('.game-detail-period', 'the clock');
	});

	it('re-tones the balls/strikes/outs count for the scrim', () => {
		mountLive({ ...liveGame, league: 'mlb', sportType: 'baseball', period: 7, bso: { balls: 1, strikes: 1, outs: 1 } });
		cy.get('.gd-hero-live .bso-dot.is-empty').should('have.length', 4).each($dot => {
			expect(contrastOnHero(getComputedStyle($dot[0]!).color), 'an unfilled dot').to.be.greaterThan(4.5);
		});
		cy.get('.gd-hero-live .bso-label').first().then($label => {
			expect(contrastOnHero(getComputedStyle($label[0]!).color), 'the B/S/O label').to.be.greaterThan(4.5);
		});
	});

	it('draws the crests bare rather than plating them by default', () => {
		mountLive(liveGame);
		cy.get('.game-detail-team-logo-shell').should('have.length', 2).each($shell => {
			expect($shell[0]!.className).to.include('is-bare');
			expect(getComputedStyle($shell[0]!).backgroundImage).to.equal('none');
			expect(getComputedStyle($shell[0]!).boxShadow).to.equal('none');
		});
	});

	it('marks a delay without draining the hero', () => {
		mountLive(liveGame, mono, true);
		cy.get('.gd-hero-live.is-delayed').should('exist').then($hero => {
			expect(getComputedStyle($hero[0]!).boxShadow).to.include('rgba(241, 196, 15');
		});
		cy.get('.game-detail-score-value').first().then($score => {
			expect(Number(getComputedStyle($score[0]!).opacity)).to.equal(1);
		});
	});

	it('wraps a long delay notice inside the status column, clear of both team names', () => {
		mountLive(liveGame, mono, true, { text: 'Delayed - Lightning In The Area' });
		loadFaceOf('.game-detail-period');
		cy.get('.game-detail-period').should(([status]: JQuery<HTMLElement>) => {
			const box = status.getBoundingClientRect();
			const labels = Array.from(status.closest('.game-detail-teams-row')!.querySelectorAll('.game-detail-team-name')) as HTMLElement[];
			expect(labels).to.have.length(2);
			labels.forEach(label => {
				const other = label.getBoundingClientRect();
				expect(box.right <= other.left || box.left >= other.right || box.bottom <= other.top || box.top >= other.bottom).to.equal(true);
			});
			expect(status.scrollWidth).to.be.at.most(status.clientWidth);
		});
	});

	it('wraps a long single-word club name inside its crest column', () => {
		mountLive({ ...liveGame, homeTeam: { ...liveGame.homeTeam, name: 'Mönchengladbach' } });
		loadFaceOf('.game-detail-team-name');
		cy.contains('.game-detail-team-name', 'Mönchengladbach').should(([name]: JQuery<HTMLElement>) => {
			expect(name.scrollWidth).to.be.at.most(name.clientWidth);
		});
	});

	it('gives the pre-game poster the same surface it always had', () => {
		cy.mount(
			<div style={{ width: '320px', background: '#0d1117', padding: '0.75rem' }}>
				<DetailPosterHero
					game={{ ...liveGame, status: 'pre', startTime: new Date(Date.now() + 3_600_000).toISOString() }}
					seriesInfo={null}
					records={{ home: '3-1', away: '2-2' }}
					statusText=''
					heroStyle={heroStyle}
					awayColor={awayColor}
					homeColor={homeColor}
					favoriteTeamIds={new Set<string>()}
					onToggleFavoriteTeam={() => {}}
				/>
			</div>,
		);
		cy.get('.gd-poster').should('exist');
		cy.get('.gd-poster-crest.is-bare').should('have.length', 2).each($crest => {
			expect(getComputedStyle($crest[0]!).boxShadow).to.equal('none');
		});
	});
});

const fontFace = ($el: JQuery<HTMLElement>) => getComputedStyle($el[0]!).fontFamily.split(',')[0]!.replace(/["']/g, '');

describe('the sticky bar status', () => {
	const mountBar = (game: Game, status: GameStatus) => cy.mount(
		<div style={{ width: '320px', background: '#0d1117' }}>
			<DetailStickyBar game={game} status={status} compact monoLogos={mono} onBack={() => {}} />
		</div>,
	);

	it('sets only the running clock in Lekton', () => {
		mountBar(liveGame, { text: 'Q2', clock: '5:00' });
		cy.get('.gd-bar-status').should('have.text', 'Q2 • 5:00').and($el => expect(fontFace($el), 'the period').to.not.equal('Lekton'));
		cy.get('.gd-bar-status .game-status-clock').should($el => expect(fontFace($el), 'the clock').to.equal('Lekton'));
	});

	it('keeps a pregame countdown in Lekton, since every digit of it ticks', () => {
		mountBar({ ...liveGame, status: 'pre', startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }, { text: '' });
		cy.get('.gd-bar-status').should('not.be.empty').and($el => expect(fontFace($el)).to.equal('Lekton'));
	});
});

describe('the sticky bar crests', () => {
	it('draws them through the same rule as the hero', () => {
		cy.mount(
			<div style={{ width: '320px', background: '#0d1117' }}>
				<DetailStickyBar
					game={liveGame}
					status={{ text: 'Q2', clock: '5:00' }}
					compact
					monoLogos={mono}
					onBack={() => {}}
				/>
			</div>,
		);
		cy.get('.gd-bar-logo-shell').should('have.length', 2);
		cy.get('.gd-bar-logo-shell.is-bare').should('have.length', 2);
		cy.get('.gd-bar-logo').should('have.length', 2);
	});
});

describe('the sticky bar crests follow the theme', () => {
	const navy = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFUlEQVR4nGPkUXb4z4AHMOGTHD4KAH25AX7gsIqPAAAAAElFTkSuQmCC';
	const whiteMark = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGP8////fwY8gAmf5PBRAAAbbgQMid1tCwAAAABJRU5ErkJggg==';
	const blackMark = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAD0lEQVR42mOQwgEYhpYEAJ8xE4HmivYxAAAAAElFTkSuQmCC';
	const navyGame: Game = {
		...liveGame,
		awayTeam: { ...liveGame.awayTeam, logo: navy },
		homeTeam: { ...liveGame.homeTeam, logo: navy },
	};
	const marks: MonoLogos = { away: { white: whiteMark, black: blackMark }, home: { white: whiteMark, black: blackMark } };

	const mountBar = (theme: 'dark' | 'light') => {
		cy.mount(
			<div style={{ width: '320px', background: theme === 'light' ? '#ffffff' : '#0d1117' }}>
				<DetailStickyBar game={navyGame} status={{ text: 'Q2', clock: '5:00' }} compact monoLogos={marks} onBack={() => {}} theme={theme} />
			</div>,
		);
		cy.get('.gd-bar-logo').should('have.attr', 'data-crest-state', 'loaded');
	};

	it('swaps a navy crest for its white mark on dark', () => {
		mountBar('dark');
		cy.get('.gd-bar-logo').first().should('have.class', 'is-mono').find('img').should('have.attr', 'src', whiteMark);
	});

	it('keeps the same crest in its own colours on light', () => {
		mountBar('light');
		cy.get('.gd-bar-logo').first().should('not.have.class', 'is-mono').find('img').should('have.attr', 'src', navy);
	});
});

describe('detail hero at-bat panel on the scrim', () => {
	const withAtBat = {
		...liveGame,
		league: 'mlb' as const,
		sportType: 'baseball' as const,
		period: 7,
		atBat: {
			pitcher: { name: 'Will Dion', jersey: '76', position: 'RP', summary: '1.1 IP, 0 ER, H, BB' },
			batter: { name: 'Nathan Church', jersey: '27', position: 'CF', summary: '0-2, K' },
		},
	};

	const readableOnPanel = (selector: string, label: string, floor: number) => {
		cy.get(selector).first().then($el => {
			expect(contrastOnHero(getComputedStyle($el[0]!).color), label).to.be.greaterThan(floor);
		});
	};

	it('keeps the name and the line readable against the scrim beneath its plate', () => {
		mountLive(withAtBat);
		readableOnPanel('.gd-atbat-name', 'the player name', bodyTextContrast);
		readableOnPanel('.gd-atbat-line', "ESPN's line", bodyTextContrast);
		readableOnPanel('.gd-atbat-role', 'the role label', captionContrast);
	});

	it('is absent on a sport that never has one', () => {
		mountLive(liveGame);
		cy.get('.gd-atbat-panel').should('not.exist');
	});
});
