import { launchFromTeam } from '../entrypoints/popup/confettiLaunch';

// The popup: a 320x560 canvas, with the sticky header covering the list's top 60px.
const canvas = { top: 0, left: 0, right: 320, bottom: 560 };
const visible = { top: 60, left: 0, right: 320, bottom: 560 };
const crestAt = (x: number, y: number) => ({ top: y - 16, bottom: y + 16, left: x - 16, right: x + 16 });

describe('launchFromTeam', () => {
	test('fires straight up from the middle of a crest in view', () => {
		expect(launchFromTeam(crestAt(80, 280), visible, canvas)).toEqual({ origin: { x: 0.25, y: 0.5 }, angle: 90 });
	});

	test('fires up from the bottom edge, under the crest, for a team scrolled below the list', () => {
		expect(launchFromTeam(crestAt(240, 900), visible, canvas)).toEqual({ origin: { x: 0.75, y: 1 }, angle: 90 });
	});

	test('fires down from under the header for a team scrolled above the list', () => {
		expect(launchFromTeam(crestAt(80, 40), visible, canvas)).toEqual({ origin: { x: 0.25, y: 60 / 560 }, angle: 270 });
	});

	test('fires inward from the side a team is scrolled past', () => {
		const guideVisible = { top: 40, left: 168, right: 1200, bottom: 800 };
		const guideCanvas = { top: 0, left: 0, right: 1200, bottom: 800 };
		expect(launchFromTeam(crestAt(100, 400), guideVisible, guideCanvas)).toEqual({ origin: { x: 0.14, y: 0.5 }, angle: 0 });
		expect(launchFromTeam(crestAt(1500, 400), guideVisible, guideCanvas)).toEqual({ origin: { x: 1, y: 0.5 }, angle: 180 });
	});

	test('measures against a canvas that does not start at the top left of the page', () => {
		const offsetCanvas = { top: 100, left: 50, right: 370, bottom: 660 };
		const offsetVisible = { top: 160, left: 50, right: 370, bottom: 660 };
		expect(launchFromTeam(crestAt(130, 380), offsetVisible, offsetCanvas).origin).toEqual({ x: 0.25, y: 0.5 });
	});
});
