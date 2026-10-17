import type { ScoreBreakdown } from '@arenaswap/core/types';
import { scoreMaxCloseness, scoreMaxComeback, scoreMaxLateGame, scoreMaxLeadChanges, scoreMaxMomentum } from '@arenaswap/core/constants';
import PowerScoreBreakdown from '../../entrypoints/popup/components/powerScoreBreakdown';
import { breakdownFoldsKey } from '../../utils/breakdownFolds';
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
	breakPenalty: 0,
	hasBreaks: true,
	favoriteBonus: 0,
	currentBoost: 0,
	scoringOpportunityBoost: 0,
	postseasonBoost: 0,
	totalLabel: '28 / 100',
	sportType: 'football',
} as const;

// Every factor paying at once, so each row is on the card.
const everyFactor = { breakPenalty: 15, winProbabilityVariance: 3, favoriteBonus: 10, currentBoost: 5, scoringOpportunityBoost: 3, postseasonBoost: 5 } as const;

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

	// A signal is part of the score's make-up, so it stays on the card at 0 where a boost would not.
	it('keeps an idle signal on the card at zero', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.contains('.powerscore-signal-row', 'Comeback').should('contain', '0/');
	});

	it('carries the total label it was handed through to the reader', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} totalLabel='41 / 100' />);
		cy.contains('41 / 100').should('exist');
		cy.contains('28 / 100').should('not.exist');
	});
});

describe('PowerScoreBreakdown commercial break penalty', () => {
	it('leaves the row out while the game is not on a break', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.contains('Commercial break penalty').should('not.exist');
	});

	// Scoped to its own row: an unscoped match is satisfied by a -15 anywhere on the card.
	// A real minus sign, which is the width of the plus it sits under, not a hyphen.
	it('shows the penalty as a negative on the break row', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} breakPenalty={15} signalsSubtotal={28} />);
		cy.contains('Commercial break penalty').parent().contains('\u221215').should('exist');
	});

	it('shows the row for a sport that goes to commercial', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} hasBreaks breakPenalty={15} />);
		cy.get('.powerscore-breakdown-row-penalty').should('exist');
	});

	it('hides the row entirely for soccer, which never goes to commercial during play', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} hasBreaks={false} breakPenalty={15} signalsSubtotal={28} />);
		cy.contains('Commercial break penalty').should('not.exist');
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

	it('leaves out a line that measured flat, since it moved nothing', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} winProbabilityVariance={0} />);
		cy.contains(/volatility/i).should('not.exist');
	});
});

describe('PowerScoreBreakdown factor icons', () => {
	// The rule, not the table: every factor row carries exactly one icon and no two rows share one.
	// Pinning the six class names in source order made choosing a nicer icon a test edit.
	it('gives every factor row an icon of its own', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} {...everyFactor} />);
		cy.get('.powerscore-factor-icon').then(($icons: JQuery<HTMLElement>) => {
			const rows = [...$icons].map(icon => icon.closest('.powerscore-breakdown-row'));
			expect(new Set(rows).size, 'no row carries two icons').to.equal(rows.length);
			const names = [...$icons].map(icon => [...icon.classList].find(name => name.startsWith('bi-') && name !== 'bi-'));
			expect(new Set(names).size, 'no icon is used twice').to.equal(names.length);
		});
	});

	it('draws no factor rows, and no section for them, when nothing is paying', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		cy.get('.powerscore-factor-icon').should('not.exist');
		cy.get('.powerscore-breakdown-section-heading').should('have.length', 1).and('have.text', 'Signals');
		cy.get('.powerscore-breakdown-row-total').should('contain', '28 / 100');
	});

	it('hides the icons from assistive tech, leaving the label text to carry the meaning', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} {...everyFactor} />);
		cy.get('.powerscore-factor-icon').each($icon => {
			cy.wrap($icon).should('have.attr', 'aria-hidden', 'true');
		});
	});
});

describe('PowerScoreBreakdown boosts', () => {
	it('shows "+N" for favorite bonus when > 0', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} favoriteBonus={10} />);
		cy.contains('Favorite boost').parent().contains('+10').should('exist');
	});

	it('says under the favorite boost which favorite is playing', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} favoriteBonus={10} favoriteTeams={['CLE']} />);
		cy.contains('.powerscore-breakdown-row', 'Favorite boost').next('.powerscore-breakdown-note').should('have.text', 'CLE is one of your favorites.');
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
		cy.mount(<PowerScoreBreakdown {...defaultProps} {...everyFactor} />);
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

	it('keeps the commercial break label on one line beside its value', () => {
		cy.viewport(320, 500);
		cy.mount(<div style={{ width: '276px' }}><PowerScoreBreakdown {...defaultProps} breakPenalty={15} /></div>);
		cy.get('.powerscore-breakdown-row-penalty').first().then(([row]: JQuery<HTMLElement>) => {
			const baseline = row.getBoundingClientRect().height;
			const label = [...row.querySelector('span')!.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!;
			const original = label.textContent;
			for (const [code, bundle] of Object.entries(locales)) {
				label.textContent = (bundle as typeof en).powerScore.breakPenalty;
				expect(row.getBoundingClientRect().height, `${code} break penalty row height`).to.be.at.most(baseline + 0.5);
				expect(row.scrollWidth, `${code} break penalty row fits the card`).to.be.at.most(row.clientWidth + 0.5);
			}
			label.textContent = original;
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

const payingBreakdown: ScoreBreakdown = { ...classicBreakdown, boosts: classicBreakdown.boosts.map(boost => ({ ...boost, points: 4 })) };

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

const factorRowSelector = '.powerscore-breakdown-row:not(.powerscore-breakdown-row-subtotal):not(.powerscore-breakdown-row-total)';

const shapeOf = (): Cypress.Chainable<cardShape> => cy.get('.powerscore-breakdown').then(([card]: JQuery<HTMLElement>) => ({
	text: card.innerText,
	height: card.getBoundingClientRect().height,
	signalRows: [...card.querySelectorAll('.powerscore-signal-row')].map(row => row.getBoundingClientRect().height),
	factorRows: [...card.querySelectorAll(factorRowSelector)].map(row => row.getBoundingClientRect().height),
}));

const sectionTotal = (label: string) => cy.contains('.powerscore-breakdown-row-subtotal', label).find('span').last();

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

	it('shows only the boosts paying right now, under the game\'s sport', () => {
		const goAhead = { ...classicBreakdown, boosts: classicBreakdown.boosts.map(boost => boost.id === 'goAheadRun' ? { ...boost, points: 8 } : boost) };
		atPopupWidth({ breakdown: goAhead, hasBreaks: true, sportType: 'baseball' });
		cy.contains('Go-ahead run on base').parent().contains('+8').should('exist');
		cy.get('.powerscore-breakdown-row .powerscore-factor-icon').should('have.length', 1);
		cy.get('.powerscore-breakdown-section-heading').then($headings => {
			expect([...$headings].map(heading => heading.textContent)).to.deep.equal(['Signals', 'Baseball Boosts & Penalties']);
		});
	});

	it('never shows another sport\'s boost, even one the breakdown says is paying', () => {
		atPopupWidth({ breakdown: payingBreakdown, sportType: 'baseball' });
		cy.contains('No-hitter').should('exist');
		cy.contains('Two-minute drill').should('not.exist');
		cy.contains('Red card').should('not.exist');
	});

	it('files general and sport boosts under their own headings, each with its own total', () => {
		const paying = {
			...classicBreakdown,
			boosts: classicBreakdown.boosts.map(boost => ({ ...boost, points: ({ gameBoost: 6, stakes: 4, scoringOpportunity: 5, twoMinuteDrill: 7, redCard: 9 } as Record<string, number>)[boost.id] ?? 0 })),
		};
		atPopupWidth({ breakdown: paying, breakPenalty: 3, winProbabilityVariance: -2, totalLabel: '45 / 100' });
		cy.get('.powerscore-breakdown-section-heading').then($headings => {
			expect([...$headings].map(heading => heading.textContent)).to.deep.equal(['Signals', 'Boosts & Penalties', 'Football Boosts & Penalties']);
		});
		sectionTotal('Signals total').should('have.text', '28');
		sectionTotal('Boosts & penalties total').should('have.text', '+5');
		sectionTotal('Football total').should('have.text', '+12');
		cy.contains('Red card').should('not.exist');
		cy.get('.powerscore-breakdown-row-total').should('contain', '45 / 100');
	});

	it('writes a section total that the penalties pull under zero with a real minus', () => {
		atPopupWidth({ breakdown: classicBreakdown, breakPenalty: 6 });
		sectionTotal('Boosts & penalties total').should('have.text', '\u22126');
	});

	it('leaves the sport section out for a sport with no boosts of its own', () => {
		atPopupWidth({ breakdown: payingBreakdown, sportType: 'basketball' });
		cy.get('.powerscore-breakdown-section-heading').should('have.length', 2);
		cy.contains('Scoring opportunity').should('not.exist');
		cy.contains('Basketball total').should('not.exist');
	});

	it('draws a Blowouts game in its own four signals, at Classic\'s row height', () => {
		atPopupWidth({ breakPenalty: 15 });
		shapeOf().then(classic => {
			atPopupWidth({ breakdown: blowoutsBreakdown, breakPenalty: 15 });
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
				for (const height of blowouts.factorRows) expect(Math.abs(height - classic.factorRows[0]!)).to.be.at.most(0.5);
			});
		});
		cy.contains('Upset').parent().contains('+8').should('exist');
		cy.contains(/^Volatility$/).should('not.exist');
		cy.contains('No-hitter').should('not.exist');
		cy.contains('Scoring opportunity').should('not.exist');
		cy.contains('Classic score').parent().contains('31').should('exist');
		cy.contains('Commercial break penalty').should('exist');
	});

	it('draws a Fantasy game in its three signals, with no commercial break row', () => {
		atPopupWidth({ breakdown: fantasyBreakdown, hasBreaks: true, breakPenalty: 15 });
		cy.get('.powerscore-breakdown-heading').should('have.text', 'Fantasy Breakdown');
		cy.get('[role="progressbar"]').should('have.length', 3);
		cy.get('.powerscore-signal-name').then($names => {
			expect([...$names].map(name => name.textContent)).to.deep.equal(['In the action', 'Fantasy points', 'Your players']);
		});
		cy.contains('Commercial break penalty').should('not.exist');
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
		atPopupWidth({ breakdown: payingBreakdown });
		cy.get('.powerscore-breakdown').then(([card]: JQuery<HTMLElement>) => {
			const ground = luminance(getComputedStyle(card).backgroundColor);
			cy.get('.powerscore-breakdown-value').should('have.length', 7).each(([value]: JQuery<HTMLElement>) => {
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

	const sportLabelCases = [
		{ sportType: 'football', keys: ['twoMinuteDrill', 'upsetWatch', 'stakes'] },
		{ sportType: 'baseball', keys: ['goAheadRun', 'noHitter'] },
		{ sportType: 'soccer', keys: ['redCard'] },
	] as const;

	for (const { sportType, keys } of sportLabelCases) {
		it(`keeps every ${sportType} boost row on one line in each language`, () => {
			atPopupWidth({ breakdown: payingBreakdown, sportType });
			cy.get('.powerscore-breakdown-row').eq(1).then(([reference]: JQuery<HTMLElement>) => {
				const oneLine = reference.getBoundingClientRect().height;
				for (const [code, bundle] of Object.entries(locales)) {
					for (const key of keys) {
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
	}

	// "American football" is the longest sport name in most languages, so it is the one measured.
	it('keeps every section heading and total on one line in each language', () => {
		atPopupWidth({ breakdown: payingBreakdown });
		cy.get('.powerscore-breakdown-section-heading').last().then(([heading]: JQuery<HTMLElement>) => {
			const oneLine = heading.getBoundingClientRect().height;
			const label = [...heading.childNodes].find(node => node.nodeType === Node.TEXT_NODE)!;
			for (const [code, bundle] of Object.entries(locales)) {
				const strings = (bundle as typeof en);
				label.textContent = strings.powerScore.sportHeading.replace('{sport}', strings.sport.football);
				expect(heading.getBoundingClientRect().height, `${code} sport heading`).to.be.at.most(oneLine + 0.5);
				expect(heading.scrollWidth, `${code} sport heading overflow`).to.be.at.most(heading.clientWidth + 0.5);
			}
		});
		cy.get('.powerscore-breakdown-row-subtotal').then($rows => {
			const oneLine = $rows[0]!.getBoundingClientRect().height;
			for (const [code, bundle] of Object.entries(locales)) {
				const strings = (bundle as typeof en);
				const labels = [strings.powerScore.signalsTotal, strings.powerScore.generalTotal, strings.powerScore.sportTotal.replace('{sport}', strings.sport.football)];
				[...$rows].forEach((row, index) => {
					row.querySelector('span')!.textContent = labels[index]!;
					expect(row.getBoundingClientRect().height, `${code} total ${index}`).to.be.at.most(oneLine + 0.5);
					expect(row.scrollWidth, `${code} total ${index} overflow`).to.be.at.most(row.clientWidth + 0.5);
				});
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

	it('describes the boost in its tooltip and says what this game decides underneath', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} breakdown={seriesBreakdown} />);
		cy.contains('.powerscore-breakdown-row', 'Stakes').next('.powerscore-breakdown-note').should('have.text', 'A win and CHW takes the series.');
		cy.contains('.powerscore-breakdown-row', 'Stakes').find('.setting-tooltip-btn').focus();
		cy.get('.tooltip').should('contain', en.powerScore.tooltipStakes).and('not.contain', 'CHW');
	});

	it('gives the favorite boost the general rule, and names the favorite underneath', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} favoriteBonus={10} favoriteTeams={['CLE']} />);
		cy.contains('.powerscore-breakdown-row', 'Favorite boost').find('.setting-tooltip-btn').focus();
		cy.get('.tooltip').should('have.text', 'Applies when one or more of your favorite teams are in the matchup.');
		cy.contains('.powerscore-breakdown-note', 'CLE is one of your favorites.').should('exist');
	});

	it('writes no line underneath a boost it has no reason for', () => {
		atPopupWidth({ breakdown: payingBreakdown });
		cy.contains('.powerscore-breakdown-row', 'Upset watch').next().should('not.have.class', 'powerscore-breakdown-note');
	});
});

const heading = (label: string) => cy.contains('.powerscore-breakdown-section-heading', label);
const section = (label: string) => heading(label).parent('details');

describe('PowerScoreBreakdown folding sections', () => {
	beforeEach(() => {
		localStorage.removeItem(breakdownFoldsKey);
	});

	it('opens every section the first time', () => {
		atPopupWidth({ breakdown: payingBreakdown });
		cy.get('details.powerscore-breakdown-section').should('have.length', 3).each($section => {
			cy.wrap($section).should('have.attr', 'open');
		});
		cy.get('.powerscore-signal-row').should('have.length', 5).first().should('be.visible');
	});

	it('folds a section\'s rows away and keeps its total in sight', () => {
		atPopupWidth({ breakdown: payingBreakdown });
		heading('Boosts & Penalties').click();
		section('Boosts & Penalties').should('not.have.attr', 'open');
		cy.contains('Stakes').should('not.be.visible');
		cy.contains('.powerscore-breakdown-row-subtotal', 'Boosts & penalties total').should('be.visible');
		cy.contains('Two-minute drill').should('be.visible');
		cy.get('.powerscore-signal-row').first().should('be.visible');
	});

	it('opens a folded section again', () => {
		atPopupWidth({ breakdown: payingBreakdown });
		heading('Signals').click();
		cy.get('.powerscore-signal-row').first().should('not.be.visible');
		heading('Signals').click();
		section('Signals').should('have.attr', 'open');
		cy.get('.powerscore-signal-row').first().should('be.visible');
	});

	it('remembers a fold the next time the card opens, on another game', () => {
		atPopupWidth({ breakdown: payingBreakdown });
		heading('Football Boosts & Penalties').click();
		cy.contains('Two-minute drill').should('not.be.visible');
		atPopupWidth({ breakdown: payingBreakdown, sportType: 'baseball', totalLabel: '61 / 100' });
		section('Baseball Boosts & Penalties').should('not.have.attr', 'open');
		cy.contains('No-hitter').should('not.be.visible');
		cy.contains('.powerscore-breakdown-row-subtotal', 'Baseball total').should('be.visible');
		section('Signals').should('have.attr', 'open');
	});

	it('keeps a fold through the next poll\'s re-render', () => {
		cy.viewport(320, 700);
		cy.mount(<div style={{ width: '276px' }}><PowerScoreBreakdown {...defaultProps} breakdown={classicBreakdown} /></div>).then(({ rerender }) => {
			heading('Signals').click();
			cy.get('.powerscore-signal-row').first().should('not.be.visible').then(() => {
				rerender(<div style={{ width: '276px' }}><PowerScoreBreakdown {...defaultProps} breakdown={{ ...classicBreakdown, scaledSubtotal: 31 }} totalLabel='31 / 100' /></div>);
			});
		});
		cy.get('.powerscore-breakdown-row-total').should('contain', '31 / 100');
		section('Signals').should('not.have.attr', 'open');
		cy.get('.powerscore-signal-row').first().should('not.be.visible');
	});

	// A real key press through Chrome, because Cypress's synthetic Enter only clicks buttons and
	// inputs, and a summary's toggle is the browser's own default action.
	it('folds from the keyboard', () => {
		atPopupWidth({ breakdown: payingBreakdown });
		// Cypress's .focus() turns a <summary> down, though browsers focus one natively.
		heading('Signals').then($summary => $summary[0]!.focus());
		cy.then(() => Cypress.automation('remote:debugger:protocol', {
			command: 'Input.dispatchKeyEvent',
			params: { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
		}));
		cy.then(() => Cypress.automation('remote:debugger:protocol', {
			command: 'Input.dispatchKeyEvent',
			params: { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 },
		}));
		section('Signals').should('not.have.attr', 'open');
	});
});
