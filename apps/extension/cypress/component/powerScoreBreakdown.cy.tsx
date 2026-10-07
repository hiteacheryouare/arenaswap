import type { ScoreBreakdown } from '@arenaswap/core/types';
import { scoreMaxCloseness, scoreMaxComeback, scoreMaxLateGame, scoreMaxLeadChanges, scoreMaxMomentum } from '@arenaswap/core/constants';
import PowerScoreBreakdown from '../../entrypoints/popup/components/powerScoreBreakdown';
import de from '../../locales/de.json';
import en from '../../locales/en.json';
import es from '../../locales/es.json';
import fil from '../../locales/fil.json';
import fr from '../../locales/fr.json';
// Not `it` — that would shadow Mocha's global it() and break every test in this file.
import itLocale from '../../locales/it.json';
import ja from '../../locales/ja.json';
import ko from '../../locales/ko.json';
import ptBR from '../../locales/pt_BR.json';
import ptPT from '../../locales/pt_PT.json';
import zhCN from '../../locales/zh_CN.json';
import zhTW from '../../locales/zh_TW.json';

const locales = { de, en, es, fil, fr, it: itLocale, ja, ko, pt_BR: ptBR, pt_PT: ptPT, zh_CN: zhCN, zh_TW: zhTW };

const defaultProps = {
	closeness: 12,
	lateGame: 8,
	momentum: 5,
	leadChanges: 3,
	comeback: 0,
	signalsSubtotal: 28,
	stallPenalty: 0,
	clockBased: true,
	favoriteBonus: 0,
	favoriteTeamCount: 0,
	currentBoost: 0,
	scoringOpportunityBoost: 0,
	postseasonBoost: 0,
	totalLabel: '28 / 100',
};

describe('PowerScoreBreakdown signals', () => {
	it('renders all 5 signal progress bars', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.get('[role="progressbar"]').should('have.length', 5);
	});

	it('sets correct aria-valuenow on each signal bar', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		const expected = [12, 8, 5, 3, 0];
		cy.get('[role="progressbar"]').each(($bar, i) => {
			cy.wrap($bar).should('have.attr', 'aria-valuenow', String(expected[i]));
		});
	});

	it('carries the total label it was handed through to the reader', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} totalLabel='41 / 100' />);
		cy.contains('41 / 100').should('exist');
		cy.contains('28 / 100').should('not.exist');
	});
});

describe('PowerScoreBreakdown stall penalty', () => {
	it('shows zero when no stall penalty', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.contains('Clock stall penalty').parent().contains('0').should('exist');
	});

	// Scoped to its own row: an unscoped match is satisfied by a -5 anywhere on the card, including
	// the volatility row directly above it.
	// A real minus sign, which is the width of the plus it sits under, not a hyphen.
	it('shows the penalty as a negative on the stall row', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} stallPenalty={5} signalsSubtotal={28} />);
		cy.contains('Clock stall penalty').parent().contains('\u22125').should('exist');
	});

	it('shows the clock stall penalty row for clock-based sports', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} clockBased />);
		cy.get('.powerscore-breakdown-row-penalty').should('exist');
	});

	it('hides the clock stall penalty row entirely for sports with no clock', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} clockBased={false} stallPenalty={5} signalsSubtotal={28} />);
		cy.contains('Clock stall penalty').should('not.exist');
		cy.get('.powerscore-breakdown-row-penalty').should('not.exist');
	});
});

describe('PowerScoreBreakdown win probability variance', () => {
	it('does not show a volatility row when winProbabilityVariance is undefined', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.contains(/volatility/i).should('not.exist');
	});

	it('shows "Volatility boost" label and positive value for positive variance', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} winProbabilityVariance={7} />);
		cy.contains('Volatility boost').should('exist');
		cy.contains('+7').should('exist');
	});

	it('shows "Volatility penalty" label and negative value for negative variance', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} winProbabilityVariance={-5} />);
		cy.contains('Volatility penalty').should('exist');
		cy.contains('\u22125').should('exist');
	});

	// 'Volatility' is a prefix of both the boost and the penalty label, so a substring match on it
	// cannot tell a neutral line from one that swung the score either way.
	it('calls a flat line neither a boost nor a penalty, and scores it at zero', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} winProbabilityVariance={0} />);
		cy.contains('Volatility boost').should('not.exist');
		cy.contains('Volatility penalty').should('not.exist');
		cy.contains(/^Volatility$/).parent().contains('0').should('exist');
	});
});

describe('PowerScoreBreakdown factor icons', () => {
	// The rule, not the table: every factor row carries exactly one icon and no two rows share one.
	// Pinning the six class names in source order made choosing a nicer icon a test edit.
	it('gives every factor row an icon of its own', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} winProbabilityVariance={3} />);
		cy.get('.powerscore-factor-icon').then(($icons: JQuery<HTMLElement>) => {
			const rows = [...$icons].map(icon => icon.closest('.powerscore-breakdown-row'));
			expect(new Set(rows).size, 'no row carries two icons').to.equal(rows.length);
			const names = [...$icons].map(icon => [...icon.classList].find(name => name.startsWith('bi-') && name !== 'bi-'));
			expect(new Set(names).size, 'no icon is used twice').to.equal(names.length);
		});
	});

	it('omits the volatility icon when there is no win-probability line', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.get('.powerscore-factor-icon').should('have.length', 5);
		cy.get('.bi-activity').should('not.exist');
	});

	it('hides the icons from assistive tech, leaving the label text to carry the meaning', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.get('.powerscore-factor-icon').each($icon => {
			cy.wrap($icon).should('have.attr', 'aria-hidden', 'true');
		});
	});
});

describe('PowerScoreBreakdown boosts', () => {
	it('shows "+N" for favorite bonus when > 0', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} favoriteBonus={10} favoriteTeamCount={1} />);
		cy.contains('Favorite boost').parent().contains('+10').should('exist');
	});

	it('shows the favorite team count note when favoriteBonus > 0', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} favoriteBonus={10} favoriteTeamCount={1} />);
		cy.get('.powerscore-breakdown-note').should('contain', 'favorite team');
	});

	it('shows "+N" for game boost when > 0', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} currentBoost={15} />);
		cy.contains('Game boost').parent().contains('+15').should('exist');
	});

	it('shows "+N" for postseason boost when > 0', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} postseasonBoost={5} />);
		cy.contains('Postseason boost').parent().contains('+5').should('exist');
	});
});

const channel = (value: number) => {
	const scaled = value / 255;
	return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};

const luminance = (rgb: string) => {
	const [red, green, blue] = rgb.match(/\d+/g)!.map(Number);
	return 0.2126 * channel(red!) + 0.7152 * channel(green!) + 0.0722 * channel(blue!);
};

// The breakdown is a #f8fafc card in both themes, and the numbers on it are 0.6rem text. Their
// colours started as the icon colours, where the gold reached 1.6:1 and the green 2.2:1.
describe('PowerScoreBreakdown legibility', () => {
	it('writes every boost and penalty value at 4.5:1 or better on the card', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} stallPenalty={4} winProbabilityVariance={6} favoriteBonus={10} favoriteTeamCount={1} currentBoost={15} scoringOpportunityBoost={3} postseasonBoost={5} />);
		cy.get('.powerscore-breakdown').then(([card]: JQuery<HTMLElement>) => {
			const ground = luminance(getComputedStyle(card).backgroundColor);
			cy.get('.powerscore-breakdown-value').should('have.length', 6).each(([value]: JQuery<HTMLElement>) => {
				const ratio = (ground + 0.05) / (luminance(getComputedStyle(value).color) + 0.05);
				expect(ratio, value.textContent ?? '').to.be.at.least(4.5);
			});
		});
	});

	it('draws its help icons at 3:1 on the card, with the brand focus ring', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.get('.powerscore-breakdown').then(([card]: JQuery<HTMLElement>) => {
			const ground = luminance(getComputedStyle(card).backgroundColor);
			cy.get('.powerscore-breakdown .setting-tooltip-btn').first().then(([icon]: JQuery<HTMLElement>) => {
				expect((ground + 0.05) / (luminance(getComputedStyle(icon).color) + 0.05)).to.be.at.least(3);
				icon.focus();
			});
		});
		cy.get('.powerscore-breakdown .setting-tooltip-btn').first().should('have.css', 'outline-color', 'rgb(247, 92, 3)');
	});

	it('sets the values in tabular figures so they hold still as they change', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.get('.powerscore-breakdown-value, .powerscore-signal-value').each(([value]: JQuery<HTMLElement>) => {
			expect(getComputedStyle(value).fontFamily).to.match(/^"?Geist/);
		});
	});
});

describe('PowerScoreBreakdown in every language', () => {
	const signalKeys = ['signalCloseness', 'signalLateGame', 'signalMomentum', 'signalLeadChanges', 'signalComeback'] as const;

	// Swapped in place rather than remounted per locale, the way the tab strip spec does it: the
	// column has to hold each language's names on one line, at the width the popup gives the card.
	it('keeps every signal name on one line, with the bars lined up under each other', () => {
		cy.viewport(320, 500);
		cy.mount(<div style={{ width: '276px' }}><PowerScoreBreakdown {...defaultProps} /></div>);
		cy.get('.powerscore-signal-row').then($rows => {
			const baseline = [...$rows].map(row => row.getBoundingClientRect().height);
			for (const [code, bundle] of Object.entries(locales)) {
				[...$rows].forEach((row, index) => {
					const name = row.querySelector<HTMLElement>('.powerscore-signal-name')!;
					const original = name.textContent;
					name.textContent = (bundle as typeof en).powerScore[signalKeys[index]!];
					expect(row.getBoundingClientRect().height, `${code} ${signalKeys[index]} row height`).to.be.at.most(baseline[index]! + 0.5);
					expect(name.scrollWidth, `${code} ${signalKeys[index]} fits its column`).to.be.at.most(name.clientWidth + 0.5);
					name.textContent = original;
				});
			}
		});
		cy.get('.powerscore-signal-progress').then($bars => {
			const starts = [...$bars].map(bar => bar.getBoundingClientRect().left);
			expect(new Set(starts).size, 'every bar starts on the same line').to.equal(1);
		});
	});
});

const zeroBoosts = (ids: string[]) => ids.map(id => ({ id, points: 0 }));

// The same reading defaultProps describes, as the background now sends it.
const classicBreakdown: ScoreBreakdown = {
	modeId: 'classic',
	signals: [
		{ id: 'closeness', points: 12, ceiling: scoreMaxCloseness, disabled: false },
		{ id: 'lateGame', points: 8, ceiling: scoreMaxLateGame, disabled: false },
		{ id: 'momentum', points: 5, ceiling: scoreMaxMomentum, disabled: false },
		{ id: 'leadChanges', points: 3, ceiling: scoreMaxLeadChanges, disabled: false },
		{ id: 'comeback', points: 0, ceiling: scoreMaxComeback, disabled: false },
	],
	boosts: [
		{ id: 'favoriteBoost', points: 0, meta: { teams: 0 } },
		...zeroBoosts(['gameBoost', 'scoringOpportunity', 'goAheadRun', 'twoMinuteDrill', 'redCard', 'noHitter', 'upsetWatch', 'stakes', 'postseasonBoost']),
	],
	reasons: [],
	frozen: false,
	scaledSubtotal: 28,
	signalCeiling: 156,
};

const blowoutsBreakdown: ScoreBreakdown = {
	modeId: 'blowouts',
	signals: [
		{ id: 'blowoutMargin', points: 41, ceiling: 50, disabled: false },
		{ id: 'sustained', points: 22, ceiling: 30, disabled: false },
		{ id: 'timing', points: 9, ceiling: 25, disabled: false },
		{ id: 'pileOn', points: 6, ceiling: 15, disabled: false },
	],
	boosts: [
		{ id: 'favoriteBoost', points: 0, meta: { teams: 0 } },
		...zeroBoosts(['gameBoost', 'noHitter']),
		{ id: 'upsetRout', points: 8 },
		{ id: 'postseasonBoost', points: 0 },
	],
	reasons: [],
	frozen: false,
	scaledSubtotal: 78,
	signalCeiling: 120,
	classicTotal: 31,
};

const fantasyBreakdown: ScoreBreakdown = {
	modeId: 'fantasy',
	signals: [
		{ id: 'situation', points: 38, ceiling: 50, disabled: false },
		{ id: 'production', points: 20, ceiling: 35, disabled: false },
		{ id: 'exposure', points: 10, ceiling: 15, disabled: false },
	],
	boosts: [{ id: 'favoriteBoost', points: 0, meta: { teams: 0 } }, ...zeroBoosts(['gameBoost', 'postseasonBoost'])],
	reasons: [],
	frozen: false,
	scaledSubtotal: 68,
	signalCeiling: 100,
	classicTotal: 70,
};

interface cardShape {
	text: string;
	height: number;
	signalRows: number[];
	factorRows: number[];
}

const shapeOf = (): Cypress.Chainable<cardShape> => cy.get('.powerscore-breakdown').then(([card]: JQuery<HTMLElement>) => ({
	text: card.innerText,
	height: card.getBoundingClientRect().height,
	signalRows: [...card.querySelectorAll('.powerscore-signal-row')].map(row => row.getBoundingClientRect().height),
	factorRows: [...card.querySelectorAll('.powerscore-breakdown-row')].map(row => row.getBoundingClientRect().height),
}));

const atPopupWidth = (props: Partial<Parameters<typeof PowerScoreBreakdown>[0]>) => {
	cy.viewport(320, 700);
	cy.mount(<div style={{ width: '276px' }}><PowerScoreBreakdown {...defaultProps} {...props} /></div>);
};

const localeString = (bundle: object, key: string): string | undefined => {
	const value = (bundle as { powerScore: Record<string, unknown> }).powerScore[key];
	return typeof value === 'string' ? value : undefined;
};

describe('PowerScoreBreakdown from a PowerScore 3 breakdown', () => {
	// Classic sent as a breakdown has to draw exactly what the flat fields drew.
	it('draws Classic identically whether it arrives flat or as a breakdown', () => {
		atPopupWidth({});
		shapeOf().then(flat => {
			atPopupWidth({ breakdown: classicBreakdown });
			shapeOf().then(keyed => {
				expect(keyed.text).to.equal(flat.text);
				expect(keyed.signalRows).to.deep.equal(flat.signalRows);
				expect(keyed.factorRows).to.deep.equal(flat.factorRows);
				expect(Math.abs(keyed.height - flat.height)).to.be.at.most(0.5);
			});
		});
	});

	it('shows a Classic boost only while it pays, alongside the four that always show', () => {
		const goAhead = { ...classicBreakdown, boosts: classicBreakdown.boosts.map(boost => boost.id === 'goAheadRun' ? { ...boost, points: 8 } : boost) };
		atPopupWidth({ breakdown: goAhead, clockBased: false });
		cy.contains('Go-ahead run on base').parent().contains('+8').should('exist');
		cy.contains('Two-minute drill').should('not.exist');
		cy.get('.powerscore-breakdown-row .powerscore-factor-icon').should('have.length', 5);
	});

	it('draws a Blowouts game in its own four signals, at Classic\'s row height', () => {
		atPopupWidth({});
		shapeOf().then(classic => {
			atPopupWidth({ breakdown: blowoutsBreakdown });
			cy.get('.powerscore-breakdown-heading').should('have.text', 'Blowouts Breakdown');
			cy.get('[role="progressbar"]').should('have.length', 4);
			cy.get('[role="progressbar"]').then($bars => {
				expect([...$bars].map(bar => bar.getAttribute('aria-valuenow'))).to.deep.equal(['41', '22', '9', '6']);
				expect([...$bars].map(bar => bar.getAttribute('aria-valuemax'))).to.deep.equal(['50', '30', '25', '15']);
			});
			cy.get('.powerscore-signal-name').then($names => {
				expect([...$names].map(name => name.textContent)).to.deep.equal(['Margin', 'Lead held', 'Early rout', 'Piling on']);
			});
			shapeOf().then(blowouts => {
				// The first row has no rule above it, in every mode.
				blowouts.signalRows.forEach((height, index) => expect(Math.abs(height - classic.signalRows[index]!), `signal row ${index}`).to.be.at.most(0.5));
				for (const height of blowouts.factorRows.slice(1, -1)) expect(Math.abs(height - classic.factorRows[1]!)).to.be.at.most(0.5);
			});
		});
		cy.contains('Upset').parent().contains('+8').should('exist');
		cy.contains('No-hitter').should('not.exist');
		cy.contains('Scoring opportunity').should('not.exist');
		cy.contains('Classic score').parent().contains('31').should('exist');
		cy.contains('Clock stall penalty').should('exist');
	});

	it('draws a Fantasy game in its three signals, with no stall row', () => {
		atPopupWidth({ breakdown: fantasyBreakdown, clockBased: true });
		cy.get('.powerscore-breakdown-heading').should('have.text', 'Fantasy Breakdown');
		cy.get('[role="progressbar"]').should('have.length', 3);
		cy.get('.powerscore-signal-name').then($names => {
			expect([...$names].map(name => name.textContent)).to.deep.equal(['In the action', 'Fantasy points', 'Your players']);
		});
		cy.contains('Clock stall penalty').should('not.exist');
		cy.contains('Classic score').parent().contains('70').should('exist');
		cy.get('.powerscore-breakdown-row-subtotal').should('contain', '68');
	});

	it('marks a switched-off signal from the breakdown itself', () => {
		const disabled = { ...blowoutsBreakdown, signals: blowoutsBreakdown.signals.map(signal => signal.id === 'timing' ? { ...signal, points: 0, disabled: true } : signal), scaledSubtotal: 80 };
		atPopupWidth({ breakdown: disabled });
		cy.get('.powerscore-signal-row.opacity-50').should('have.length', 1).and('contain', 'Early rout');
		cy.get('.powerscore-subtotal-raw').should('have.text', '69');
	});

	it('writes every new boost value at 4.5:1 or better on the card', () => {
		const paying = { ...classicBreakdown, boosts: classicBreakdown.boosts.map(boost => ({ ...boost, points: 4 })) };
		atPopupWidth({ breakdown: paying });
		cy.get('.powerscore-breakdown').then(([card]: JQuery<HTMLElement>) => {
			const ground = luminance(getComputedStyle(card).backgroundColor);
			cy.get('.powerscore-breakdown-value').should('have.length', 11).each(([value]: JQuery<HTMLElement>) => {
				const ratio = (ground + 0.05) / (luminance(getComputedStyle(value).color) + 0.05);
				expect(ratio, value.textContent ?? '').to.be.at.least(4.5);
			});
		});
	});

	// The column has to hold the longest name in each language on one line. A locale still waiting
	// on its translation is measured in English.
	const modeCases = [
		{ breakdown: blowoutsBreakdown, keys: ['signalBlowoutMargin', 'signalSustained', 'signalTiming', 'signalPileOn'] },
		{ breakdown: fantasyBreakdown, keys: ['signalSituation', 'signalProduction', 'signalExposure'] },
	] as const;

	for (const { breakdown, keys } of modeCases) {
		it(`keeps every ${breakdown.modeId} signal name on one line, with no sideways overflow`, () => {
			atPopupWidth({ breakdown });
			cy.get('.powerscore-signal-row').then($rows => {
				const baseline = [...$rows].map(row => row.getBoundingClientRect().height);
				for (const [code, bundle] of Object.entries(locales)) {
					[...$rows].forEach((row, index) => {
						const name = row.querySelector<HTMLElement>('.powerscore-signal-name')!;
						const original = name.textContent;
						name.textContent = localeString(bundle, keys[index]!) ?? en.powerScore[keys[index]!];
						expect(row.getBoundingClientRect().height, `${code} ${keys[index]} row height`).to.be.at.most(baseline[index]! + 0.5);
						expect(name.scrollWidth, `${code} ${keys[index]} fits its column`).to.be.at.most(name.clientWidth + 0.5);
						const card = row.closest<HTMLElement>('.powerscore-breakdown')!;
						expect(card.scrollWidth, `${code} card overflow`).to.be.at.most(card.clientWidth + 0.5);
						name.textContent = original;
					});
				}
			});
		});
	}

	it('keeps every new boost row on one line in each language', () => {
		const paying = { ...classicBreakdown, boosts: classicBreakdown.boosts.map(boost => ({ ...boost, points: 4 })) };
		const labelKeys = ['goAheadRun', 'twoMinuteDrill', 'redCard', 'noHitter', 'upsetWatch', 'stakes'] as const;
		atPopupWidth({ breakdown: paying });
		cy.get('.powerscore-breakdown-row').eq(1).then(([reference]: JQuery<HTMLElement>) => {
			const oneLine = reference.getBoundingClientRect().height;
			for (const [code, bundle] of Object.entries(locales)) {
				for (const key of labelKeys) {
					const english = en.powerScore[key];
					cy.contains('.powerscore-breakdown-row', english).then(([row]: JQuery<HTMLElement>) => {
						const label = [...row.querySelector('span')!.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent === english)!;
						label.textContent = localeString(bundle, key) ?? english;
						expect(row.getBoundingClientRect().height, `${code} ${key}`).to.be.at.most(oneLine + 0.5);
						expect(row.scrollWidth, `${code} ${key} overflow`).to.be.at.most(row.clientWidth + 0.5);
						label.textContent = english;
					});
				}
			}
		});
	});
});

describe('PowerScoreBreakdown tooltips', () => {
	const seriesBreakdown: ScoreBreakdown = {
		...classicBreakdown,
		boosts: classicBreakdown.boosts.map(boost => (boost.id === 'stakes'
			? { id: 'stakes', points: 4, details: [{ key: 'seriesClinch', params: { team: 'CHW' } }] }
			: boost)),
	};

	it('says what this game decides, not the general rule', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} breakdown={seriesBreakdown} />);
		cy.contains('.powerscore-breakdown-row', 'Stakes').find('.setting-tooltip-btn').focus();
		cy.get('.tooltip').should('contain', 'A win and CHW takes the series.');
	});

	it('names a favorite playing in the game', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} favoriteBonus={10} favoriteTeamCount={1} favoriteTeams={['CLE']} />);
		cy.contains('.powerscore-breakdown-row', 'Favorite boost').find('.setting-tooltip-btn').focus();
		cy.get('.tooltip').should('contain', 'CLE is one of your favorites.');
	});
});
