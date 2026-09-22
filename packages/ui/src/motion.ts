// The same scale as `_motion.scss`, for the motion that is configured in JavaScript rather than
// declared in CSS. Today that is the ECharts charts in the popup and on the landing page, which
// take a duration in milliseconds and an easing by name.
//
// Two copies of a number is a drift risk, so the SCSS file is the one to edit and this one follows.
// It cannot read the Sass: these values are consumed at runtime by a chart library, and the
// stylesheet is compiled long before that.

export const motionDuration = {
	instant: 100,
	snap: 140,
	quick: 180,
	base: 240,
	slow: 400,
	deliberate: 700,
	epic: 1000,
} as const;

export const motionLoop = {
	urgent: 500,
	pulse: 1500,
	ambient: 3000,
} as const;

// ECharts takes an easing by name and has no cubic-bezier input, so the signature curve is named
// rather than spelled: `cubic-bezier(0.22, 1, 0.36, 1)` is the usual approximation of a quintic
// ease-out, and `quinticOut` is the closest thing ECharts draws to it.
export const chartEasing = 'quinticOut';

export default motionDuration;
