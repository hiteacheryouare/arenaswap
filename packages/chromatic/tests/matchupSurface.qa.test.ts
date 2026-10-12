import { matchupSurface } from '../src/colorUtils';

// Colours as our sources publish them.
const steelersGold = '#FFB612';
const rangersNavy = '#003278';
const lightBlue = '#8FBCE6';
const black = '#000000';
const darkInk = '#111827';

describe('the live card painted in both teams\' colours', () => {
	test('runs away on the left into home on the right', () => {
		const { backgroundImage } = matchupSurface(rangersNavy, steelersGold);
		expect(backgroundImage.indexOf(rangersNavy)).toBeLessThan(backgroundImage.indexOf(steelersGold));
		expect(backgroundImage).toMatch(/^linear-gradient\(180deg, rgba\(/);
	});

	test('sets a gold or a light blue side in dark ink and a navy side in white', () => {
		expect(matchupSurface(steelersGold, rangersNavy).inks).toEqual({ away: darkInk, home: '#ffffff', center: '#ffffff' });
		expect(matchupSurface(rangersNavy, lightBlue).inks.home).toBe(darkInk);
	});

	test('reads the same side the same way whichever end of the card it sits on', () => {
		const away = matchupSurface(steelersGold, black).inks.away;
		const home = matchupSurface(black, steelersGold).inks.home;
		expect(away).toBe(home);
	});

	// The delay shade is darker and browner, enough that white beats the dark ink across a gold
	// side's whole height. Pinned as the current choice so a refactor of the shade is a decision.
	test('switches every side to white under the delay shade, gold included', () => {
		expect(matchupSurface(steelersGold, rangersNavy, true).inks).toEqual({ away: '#ffffff', home: '#ffffff', center: '#ffffff' });
		expect(matchupSurface(steelersGold, rangersNavy, true).backgroundImage).not.toBe(matchupSurface(steelersGold, rangersNavy).backgroundImage);
	});
});
