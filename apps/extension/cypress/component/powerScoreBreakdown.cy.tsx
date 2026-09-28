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
	it('shows the penalty as a negative on the stall row', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} stallPenalty={5} signalsSubtotal={28} />);
		cy.contains('Clock stall penalty').parent().contains('-5').should('exist');
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
		cy.contains('-5').should('exist');
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

const rowOf = (label: string) => cy.contains('.powerscore-breakdown-row', label);

describe('PowerScoreBreakdown tones', () => {
	it('dims a row that adds nothing, so the rows that count stand out', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} favoriteBonus={10} favoriteTeamCount={1} />);
		rowOf('Game boost').should('have.class', 'is-zero');
		rowOf('Favorite boost').should('have.class', 'is-gain').and('not.have.class', 'is-zero');
	});

	it('draws a gain in the gain ink and a penalty in the penalty ink', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} stallPenalty={4} currentBoost={6} />);
		rowOf('Game boost').find('.num').then(([gain]: JQuery<HTMLElement>) => {
			rowOf('Clock stall penalty').should('have.class', 'is-penalty').find('.num').should(([penalty]: JQuery<HTMLElement>) => {
				expect(getComputedStyle(penalty).color, 'the two read differently').to.not.equal(getComputedStyle(gain).color);
			});
		});
		rowOf('Scoring opportunity').find('.num').then(([zero]: JQuery<HTMLElement>) => {
			rowOf('Game boost').find('.num').should(([gain]: JQuery<HTMLElement>) => {
				expect(getComputedStyle(gain).color, 'a gain is not the zero grey').to.not.equal(getComputedStyle(zero).color);
			});
		});
	});

	it('sets the total large and the scale quiet, without changing what it says', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} totalLabel='41 / 100' />);
		cy.get('.powerscore-breakdown-row-total .num').should('have.text', '41 / 100');
		cy.get('.powerscore-breakdown-row-total strong').should('have.text', '41').then(([figure]: JQuery<HTMLElement>) => {
			cy.get('.powerscore-breakdown-row-total small').should(([scale]: JQuery<HTMLElement>) => {
				expect(parseFloat(getComputedStyle(figure).fontSize)).to.be.greaterThan(parseFloat(getComputedStyle(scale).fontSize));
			});
		});
	});

	it('keeps a base-max total whole, emphasising its first figure', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} totalLabel='112 (base max 100)' />);
		cy.get('.powerscore-breakdown-row-total .num').should('have.text', '112 (base max 100)');
		cy.get('.powerscore-breakdown-row-total strong').should('have.text', '112');
	});

	// A switched-off signal says so in words, in the value column, rather than wearing a badge.
	it('marks a switched-off signal as off, with no tooltip and an empty bar', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} disabledSignals={['momentum']} signalsSubtotal={30} />);
		cy.get('.powerscore-signal-row.is-off').should('have.length', 1).within(() => {
			cy.get('.powerscore-signal-off').should('have.text', 'Off');
			cy.get('.setting-tooltip-btn').should('not.exist');
			cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '0');
		});
		cy.get('.powerscore-subtotal-raw').should('have.text', '28');
		cy.get('.powerscore-breakdown-note').should('contain.text', 'Re-scaled');
	});

	it('names the round under the postseason row', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} postseasonBoost={5} postseasonLabel='East Semifinals, Game 5' />);
		cy.contains('.powerscore-breakdown-row', 'Postseason boost').next('.powerscore-breakdown-qualifier')
			.should('have.text', 'East Semifinals, Game 5');
	});

	it('draws every signal in the palette the components chart uses', () => {
		cy.mount(<PowerScoreBreakdown {...defaultProps} />);
		const palette = ['rgb(34, 197, 94)', 'rgb(247, 92, 3)', 'rgb(34, 116, 165)', 'rgb(241, 196, 15)', 'rgb(217, 3, 104)'];
		cy.get('.powerscore-signal-dot').each(($dot, index) => {
			expect(getComputedStyle($dot[0]!).backgroundColor).to.equal(palette[index]);
		});
	});

	it('keeps every row inside the card at the popup width', () => {
		cy.mount(<div className='dt' style={{ width: 296 }}><PowerScoreBreakdown {...defaultProps} winProbabilityVariance={-3} postseasonBoost={5} postseasonLabel='Wild Card' /></div>);
		cy.get('.powerscore-breakdown-row, .powerscore-signal-row').each($row => {
			expect($row[0]!.scrollWidth, $row.text()).to.be.at.most($row[0]!.clientWidth);
		});
	});
});

// The signal name, its info button, the bar and the value share one row, and the longest locale's
// name has to leave the bar room to start after it rather than under it.
describe('PowerScoreBreakdown in every locale', () => {
	it('keeps each signal name clear of its bar, and the bar clear of the value', () => {
		cy.viewport(320, 560);
		cy.mount(<div className='dt' style={{ width: 296 }}><PowerScoreBreakdown {...defaultProps} /></div>);
		const keys = ['signalCloseness', 'signalLateGame', 'signalMomentum', 'signalLeadChanges', 'signalComeback'] as const;
		cy.get('.powerscore-signal-row').then($rows => {
			for (const [name, locale] of Object.entries(locales)) {
				[...$rows].forEach((row, index) => {
					const label = row.querySelector('.powerscore-signal-name')!;
					const text = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE)!;
					text.textContent = locale.powerScore[keys[index]!];
				});
				[...$rows].forEach(row => {
					const nameBox = row.querySelector('.powerscore-signal-name')!.getBoundingClientRect();
					const bar = row.querySelector('.powerscore-signal-progress')!.getBoundingClientRect();
					const value = row.querySelector('.powerscore-signal-value')!.getBoundingClientRect();
					expect(nameBox.right, `${name}: ${row.textContent} clears its bar`).to.be.at.most(bar.left);
					expect(bar.right, `${name}: the bar clears the value`).to.be.at.most(value.left);
					expect(bar.width, `${name}: the bar keeps a visible length`).to.be.at.least(24);
					expect(value.right, `${name}: the value stays in the card`).to.be.at.most(row.getBoundingClientRect().right + 0.5);
				});
				const starts = new Set([...$rows].map(row => Math.round(row.querySelector('.powerscore-signal-progress')!.getBoundingClientRect().left)));
				expect(starts.size, `${name}: the bars share a left edge`).to.equal(1);
			}
		});
	});
});
