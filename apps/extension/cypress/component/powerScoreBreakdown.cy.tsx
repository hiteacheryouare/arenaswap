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

// The breakdown is a #f8fafc card in both themes, and the numbers on it are 0.6rem text. Their
// colours started as the icon colours, where the gold reached 1.6:1 and the green 2.2:1.
describe('PowerScoreBreakdown legibility', () => {
	const channel = (value: number) => {
		const scaled = value / 255;
		return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
	};
	const luminance = (rgb: string) => {
		const [red, green, blue] = rgb.match(/\d+/g)!.map(Number);
		return 0.2126 * channel(red!) + 0.7152 * channel(green!) + 0.0722 * channel(blue!);
	};

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
