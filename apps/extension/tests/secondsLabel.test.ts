import { formatSecondsLabel } from '../utils/secondsLabel';

const english = (key: string) => ({ 'detail.unitSeconds': 's', 'detail.unitMinutes': 'm' })[key] ?? key;
const japanese = (key: string) => ({ 'detail.unitSeconds': '秒', 'detail.unitMinutes': '分' })[key] ?? key;

describe('formatSecondsLabel', () => {
	test.each([
		[15, '15s'],
		[60, '1m'],
		[90, '1m 30s'],
		[180, '3m'],
	])('writes %i seconds as %s', (secs, expected) => {
		expect(formatSecondsLabel(secs, english)).toBe(expected);
	});

	test('takes its units from the locale rather than hard-coding English', () => {
		expect(formatSecondsLabel(90, japanese)).toBe('1分 30秒');
	});
});
