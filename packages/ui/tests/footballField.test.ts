import type { Game } from '@arenaswap/core/types';
import {
	acrossToY,
	buildHashPath,
	fieldWidthYards,
	hashLength,
	numberRowsY,
	resolveFieldDiagram,
	resolveFieldFrame,
	resolveHashRows,
	stripHeight,
	stripYards,
	yardLineToX,
	yardNumbers,
} from '../src/components/footballField';

// Philadelphia at home, Dallas away, which puts yardLine 0 on the Eagles' own goal line and 100 on
// the Cowboys'. Every fixture below overrides only the situation.
const makeGame = (overrides: Partial<Game> = {}): Game => ({
	id: 'g1',
	league: 'nfl',
	sportType: 'football',
	homeTeam: { id: 'phi', name: 'Philadelphia Eagles', abbreviation: 'PHI', score: 17 },
	awayTeam: { id: 'dal', name: 'Dallas Cowboys', abbreviation: 'DAL', score: 14 },
	period: 4,
	clockSeconds: 480,
	status: 'in',
	down: 1,
	distance: 10,
	fieldPosition: 'PHI 30',
	...overrides,
});

describe('yardLineToX', () => {
	// The strip is 120 yards wide with the away end zone first, so the home goal line — yardLine 0 —
	// lands at the far end.
	test('puts the away goal line at 10 and the home goal line at 110', () => {
		expect(yardLineToX(100)).toBe(10);
		expect(yardLineToX(0)).toBe(110);
		expect(yardLineToX(50)).toBe(60);
	});

	test('reproduces the yard marker ESPN labels a spot with', () => {
		// "UTEP 18" on an away team's own 18 arrives as 82, and sits 18 yards inside the left edge.
		expect(yardLineToX(82)).toBe(28);
		// "STAN 25" on a home team's own 25 arrives as 25, and sits 25 yards inside the right one.
		expect(stripYards - yardLineToX(25)).toBe(35);
	});
});

describe('yardNumbers', () => {
	test('paints the field the way a groundskeeper does, mirrored about the 50', () => {
		expect(yardNumbers.map(n => n.label)).toEqual([10, 20, 30, 40, 50, 40, 30, 20, 10]);
	});

	test('spaces them ten yards apart inside the goal lines', () => {
		expect(yardNumbers.map(n => n.x)).toEqual([20, 30, 40, 50, 60, 70, 80, 90, 100]);
		expect(yardNumbers.filter(n => n.isMidfield)).toHaveLength(1);
	});
});

describe('acrossToY', () => {
	test('squashes 53 1/3 yards of field into the viewBox without moving the sidelines', () => {
		expect(acrossToY(0)).toBe(0);
		expect(acrossToY(fieldWidthYards)).toBe(stripHeight);
		expect(acrossToY(fieldWidthYards / 2)).toBe(stripHeight / 2);
	});
});

describe('resolveHashRows', () => {
	// 70'9" from each sideline in the NFL and 60'0" in college, which leaves the pro rows 18'6"
	// apart — the width of the uprights — and the college ones 40'.
	test('sets the college rows more than twice as far apart as the professional ones', () => {
		const [nflTop, nflBottom] = resolveHashRows('nfl');
		const [collegeTop, collegeBottom] = resolveHashRows('ncaaf');
		expect(nflBottom - nflTop).toBeCloseTo(acrossToY(18.5 / 3), 6);
		expect(collegeBottom - collegeTop).toBeCloseTo(acrossToY(40 / 3), 6);
		expect(collegeBottom - collegeTop).toBeGreaterThan((nflBottom - nflTop) * 2);
	});

	test('centres both pairs on the middle of the field', () => {
		for (const league of ['nfl', 'ncaaf']) {
			const [top, bottom] = resolveHashRows(league);
			expect((top + bottom) / 2).toBeCloseTo(stripHeight / 2, 6);
		}
	});

	// The UFL and anything else ESPN starts sending falls back rather than losing its hash rows.
	test('falls back to the professional rows for a league it has never seen', () => {
		expect(resolveHashRows('xfl')).toEqual(resolveHashRows('nfl'));
	});
});

describe('buildHashPath', () => {
	const rows = resolveHashRows('nfl');
	const marks = buildHashPath(rows)
		.split('M')
		.filter(Boolean)
		.map(segment => {
			const [start, length] = segment.split('h');
			const [x, y] = start!.trim().split(' ').map(Number);
			return { x: x!, y: y!, length: Number(length) };
		});

	test('paints every yard that has no line on it already, in both rows', () => {
		// 99 yards inside the field of play, less the 19 that carry a five-yard line, twice over.
		expect(marks).toHaveLength(160);
		expect(new Set(marks.map(mark => mark.y))).toEqual(new Set(rows));
	});

	test('runs each mark lengthwise, 24 inches long and straddling its yard', () => {
		expect(new Set(marks.map(mark => mark.length))).toEqual(new Set([hashLength]));
		expect(hashLength).toBeCloseTo(2 / 3, 6);
		// Centred on the yard rather than starting at it, so the marks stay evenly pitched.
		expect(marks.map(mark => mark.x + hashLength / 2)).toContain(11);
		expect(marks.map(mark => mark.x + hashLength / 2)).toContain(109);
	});

	test('keeps out of the end zones and off the yard lines', () => {
		const centres = marks.map(mark => mark.x + hashLength / 2);
		expect(Math.min(...centres)).toBeGreaterThan(yardLineToX(100));
		expect(Math.max(...centres)).toBeLessThan(yardLineToX(0));
		expect(centres.some(centre => (centre - 10) % 5 === 0)).toBe(false);
	});
});

describe('numberRowsY', () => {
	test('mirrors the two rows about the centre line', () => {
		const [top, bottom] = numberRowsY;
		expect((top + bottom) / 2).toBeCloseTo(stripHeight / 2, 6);
		expect(top).toBeCloseTo(acrossToY(12), 6);
	});
});

describe('resolveFieldDiagram', () => {
	test('draws nothing without a football game in progress', () => {
		expect(resolveFieldDiagram(makeGame({ sportType: 'basketball', yardLine: 40 }))).toBeNull();
		expect(resolveFieldDiagram(makeGame({ status: 'pre', yardLine: 40 }))).toBeNull();
		expect(resolveFieldDiagram(makeGame({ status: 'post', yardLine: 40 }))).toBeNull();
	});

	test('draws nothing without a yard line', () => {
		expect(resolveFieldDiagram(makeGame({ possessionTeamId: 'phi' }))).toBeNull();
	});

	// A college kickoff is the shape that makes this necessary: `down: 1, distance: 10` with a real
	// yard line on it, and nothing but the nulled text to say it is not a first down. The NFL sends
	// `down: 0` for the same play, so the down cannot carry the gate on its own.
	describe('the snap gate', () => {
		test('draws nothing on a college kickoff, which arrives shaped like a first down', () => {
			expect(resolveFieldDiagram(makeGame({
				yardLine: 65, down: 1, distance: 10, fieldPosition: undefined,
			}))).toBeNull();
		});

		test('draws nothing on an NFL kickoff', () => {
			expect(resolveFieldDiagram(makeGame({
				yardLine: 65, down: 0, distance: 0, fieldPosition: undefined,
			}))).toBeNull();
		});

		// A yardLine sent after a score is not a spot at all: one home field goal reported 35 and
		// the touchdown before it 65 for what is the same place on the field.
		test('draws nothing after a score, where the yard line is meaningless', () => {
			expect(resolveFieldDiagram(makeGame({
				yardLine: 35, down: -1, distance: -1, fieldPosition: undefined,
			}))).toBeNull();
		});
	});

	test('puts the ball where the yard line says', () => {
		expect(resolveFieldDiagram(makeGame({ yardLine: 25 }))?.ballX).toBe(85);
		expect(resolveFieldDiagram(makeGame({ yardLine: 95 }))?.ballX).toBe(15);
	});

	test('clamps a yard line reported outside the field of play', () => {
		expect(resolveFieldDiagram(makeGame({ yardLine: -4 }))?.ballX).toBe(110);
		expect(resolveFieldDiagram(makeGame({ yardLine: 104 }))?.ballX).toBe(10);
	});

	describe('direction of travel', () => {
		test('sends the home offense right to left, toward the away end zone', () => {
			const diagram = resolveFieldDiagram(makeGame({ yardLine: 40, possessionTeamId: 'phi' }))!;
			expect(diagram.possession).toBe('home');
			expect(diagram.drivesRight).toBe(false);
		});

		test('sends the away offense left to right, toward the home end zone', () => {
			const diagram = resolveFieldDiagram(makeGame({ yardLine: 40, possessionTeamId: 'dal' }))!;
			expect(diagram.possession).toBe('away');
			expect(diagram.drivesRight).toBe(true);
		});

		// A team id belonging to neither side leaves the field drawn and everything that depends on
		// knowing which way the offense faces undrawn, rather than picking a direction at random.
		// ESPN drops possession on the first snap after every kickoff, so this is a real state.
		test('keeps the field but not the direction when possession is unknown', () => {
			const diagram = resolveFieldDiagram(makeGame({ yardLine: 40 }))!;
			expect(diagram.possession).toBeNull();
			expect(diagram.drivesRight).toBeNull();
			expect(diagram.firstDownX).toBeNull();
			expect(diagram.ballX).toBe(70);
		});
	});

	// At 2.4px to the yard the line to gain and the goal line are the same pixel column, so a
	// goal-to-go snap is not a choice between one line and two — it is a choice about what colour
	// that column is. Drawing the line at the clamped goal line paints it yellow, which is the
	// broadcast's result without a special case anywhere in the renderer.
	describe('the line to gain', () => {
		test('sets it ahead of the ball in the direction the offense is moving', () => {
			// 3rd & 5 from the home team's own 30: the line to gain is their own 35, five yards left.
			const home = resolveFieldDiagram(makeGame({ yardLine: 30, distance: 5, down: 3, possessionTeamId: 'phi' }))!;
			expect(home.firstDownX).toBe(75);
			expect(home.firstDownX!).toBeLessThan(home.ballX);

			// 2nd & 8 from the away team's own 45, which is five yards the other way.
			const away = resolveFieldDiagram(makeGame({ yardLine: 55, distance: 8, down: 2, possessionTeamId: 'dal' }))!;
			expect(away.firstDownX).toBe(63);
			expect(away.firstDownX!).toBeGreaterThan(away.ballX);
		});

		// ESPN sets `distance` to exactly the yards remaining on goal-to-go — a real "4th & Goal at
		// MIA 6" arrived as `distance: 6, yardLine: 94` — so the ordinary arithmetic already lands
		// on the paint, from either end.
		test('lands on the goal line on goal to go, rather than beyond it', () => {
			expect(resolveFieldDiagram(makeGame({
				yardLine: 95, distance: 5, down: 3, possessionTeamId: 'phi',
			}))!.firstDownX).toBe(10);
			expect(resolveFieldDiagram(makeGame({
				yardLine: 5, distance: 5, down: 4, possessionTeamId: 'dal',
			}))!.firstDownX).toBe(110);
		});

		// A penalty makes it 1st & 25 and a sack 2nd & 23, so nothing here may assume ten.
		test('handles a distance well past ten', () => {
			expect(resolveFieldDiagram(makeGame({
				yardLine: 17, distance: 25, down: 1, possessionTeamId: 'phi',
			}))!.firstDownX).toBe(68);
		});

		test('draws no line when the offense is unknown', () => {
			expect(resolveFieldDiagram(makeGame({ yardLine: 30, distance: 5 }))!.firstDownX).toBeNull();
		});

		// The ball is drawn at a yard line of 0 — an offense backed up onto its own goal line, which
		// is where a safety comes from — so the line to gain has to be too.
		test('still draws a line with the ball on the goal line', () => {
			const diagram = resolveFieldDiagram(makeGame({
				yardLine: 0, distance: 10, down: 1, possessionTeamId: 'phi',
			}))!;
			expect(diagram.ballX).toBe(110);
			expect(diagram.firstDownX).toBe(100);
		});

		// ESPN converts a first down that would land inside the end zone into goal-to-go itself, so
		// this is insurance rather than a state anyone has seen. Without the clamp the line is drawn
		// outside the viewBox, where the SVG quietly clips it away and it reads as missing data.
		test('holds the line at the goal line rather than losing it off the field', () => {
			expect(resolveFieldDiagram(makeGame({
				yardLine: 92, distance: 10, down: 1, possessionTeamId: 'phi',
			}))!.firstDownX).toBe(10);
		});
	});

	describe('the drive bar', () => {
		test("measures a home drive as the ground it has taken toward the away end zone", () => {
			// Stanford's real 11-play, 69-yard drive: their own 25 to the opponent's 6.
			const diagram = resolveFieldDiagram(makeGame({
				yardLine: 94, driveStartYardLine: 25, possessionTeamId: 'phi',
			}))!;
			expect(diagram.driveStartX).toBe(85);
			expect(diagram.driveStartX! - diagram.ballX).toBe(69);
		});

		test('measures an away drive in the opposite direction', () => {
			const diagram = resolveFieldDiagram(makeGame({
				yardLine: 30, driveStartYardLine: 75, possessionTeamId: 'dal',
			}))!;
			expect(diagram.driveStartX).toBe(35);
			expect(diagram.ballX - diagram.driveStartX!).toBe(45);
		});

		// Fresno State's "1 play, -1 yard" drive, and the shape every stale read takes for the one
		// poll after a punt or a turnover, when lastPlay still describes the other team's drive.
		test('draws no bar for a drive that has not gained ground', () => {
			expect(resolveFieldDiagram(makeGame({
				yardLine: 76, driveStartYardLine: 75, possessionTeamId: 'dal',
			}))!.driveStartX).toBeNull();
			expect(resolveFieldDiagram(makeGame({
				yardLine: 20, driveStartYardLine: 80, possessionTeamId: 'phi',
			}))!.driveStartX).toBeNull();
		});

		test('draws no bar at the snap that opens a drive', () => {
			expect(resolveFieldDiagram(makeGame({
				yardLine: 25, driveStartYardLine: 25, possessionTeamId: 'phi',
			}))!.driveStartX).toBeNull();
		});

		test('draws no bar without a drive or without possession', () => {
			expect(resolveFieldDiagram(makeGame({ yardLine: 40, possessionTeamId: 'phi' }))!.driveStartX).toBeNull();
			expect(resolveFieldDiagram(makeGame({ yardLine: 40, driveStartYardLine: 20 }))!.driveStartX).toBeNull();
		});

		// ESPN publishes a goal line as the start of a drive it has only just opened, under a
		// description that reports the real yardage. Taken literally it draws 40 yards of bar for a
		// drive that gained 5, and it inflates rather than inverts, so nothing else catches it.
		test('rejects a goal line as a drive start, which ESPN uses as a placeholder', () => {
			expect(resolveFieldDiagram(makeGame({
				yardLine: 40, driveStartYardLine: 0, possessionTeamId: 'phi',
			}))!.driveStartX).toBeNull();
			expect(resolveFieldDiagram(makeGame({
				yardLine: 60, driveStartYardLine: 100, possessionTeamId: 'dal',
			}))!.driveStartX).toBeNull();
		});
	});
});

// A timeout, the two-minute warning and the end of a period all clear the down and the yard marker
// while the ball sits where it is; a score clears the same fields and moves the yard line to
// something meaningless. Both were captured live: timeouts held at 62, 84, 6 and 75, and three
// post-score states jumped 6 to 65, 83 to 35 and 97 to 65.
describe('resolveFieldFrame', () => {
	const live = makeGame({ yardLine: 62, possessionTeamId: 'phi', driveStartYardLine: 30 });
	const frame = resolveFieldFrame(live, null)!;

	test('records the frame whenever there is a snap to draw', () => {
		expect(frame.yardLine).toBe(62);
		expect(frame.diagram.ballX).toBe(48);
	});

	test('holds the frame through a dead ball that leaves the ball where it is', () => {
		const timeout = makeGame({ yardLine: 62, down: 0, distance: 0, fieldPosition: undefined });
		expect(resolveFieldFrame(timeout, frame)).toBe(frame);
	});

	test('clears the frame once the yard line moves off the held spot', () => {
		const afterScore = makeGame({ yardLine: 35, down: -1, distance: -1, fieldPosition: undefined });
		expect(resolveFieldFrame(afterScore, frame)).toBeNull();
	});

	test('holds nothing when there was never a frame to hold', () => {
		const timeout = makeGame({ yardLine: 62, down: 0, distance: 0, fieldPosition: undefined });
		expect(resolveFieldFrame(timeout, null)).toBeNull();
	});

	// The component writes this back into a ref during render, so feeding it its own output has to
	// be a no-op or a second pass would drift.
	test('is idempotent, so writing the result back during render is safe', () => {
		expect(resolveFieldFrame(live, frame)).toEqual(frame);
		const timeout = makeGame({ yardLine: 62, down: 0, distance: 0, fieldPosition: undefined });
		expect(resolveFieldFrame(timeout, resolveFieldFrame(timeout, frame))).toBe(frame);
	});
});
