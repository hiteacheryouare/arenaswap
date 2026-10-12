import { offseasonGraceMs, resolveOffseason } from '../src/leagueSchedule';

const at = (iso: string) => Date.parse(iso);
const collegeBasketball = { startsAt: at('2026-11-01T07:00Z'), endsAt: at('2027-03-08T08:00Z') };

describe('telling a league between seasons from one playing through them', () => {
	it('promises the first game day of a season that has not started', () => {
		expect(resolveOffseason(collegeBasketball, at('2026-10-02T19:00Z'))).toEqual({ returnsAt: collegeBasketball.startsAt });
	});

	it('leaves a league alone from its first game day to its last', () => {
		expect(resolveOffseason(collegeBasketball, collegeBasketball.startsAt)).toBeNull();
		expect(resolveOffseason(collegeBasketball, collegeBasketball.endsAt)).toBeNull();
	});

	it('waits out the grace period before calling a season over', () => {
		expect(resolveOffseason(collegeBasketball, collegeBasketball.endsAt + offseasonGraceMs)).toBeNull();
		expect(resolveOffseason(collegeBasketball, collegeBasketball.endsAt + offseasonGraceMs + 1)).toEqual({});
	});

	it('calls a league with no dates out of season, with no date to promise', () => {
		expect(resolveOffseason({}, at('2026-10-02T19:00Z'))).toEqual({});
		expect(resolveOffseason({ startsAt: collegeBasketball.startsAt }, at('2026-10-02T19:00Z'))).toEqual({});
	});

	it('says nothing about a league it never heard back from', () => {
		expect(resolveOffseason(undefined, at('2026-10-02T19:00Z'))).toBeNull();
	});
});
