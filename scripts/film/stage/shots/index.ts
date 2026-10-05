import type { ShotKind } from '../cuts/cutTypes';
import browserShot from './browserShot';
import { assign, favorite, payoff, popupOpen, ranked, swaps } from './deskShots';
import endCard from './endCard';
import { boxScore, detail, guide, leagues, scorebugs, settings } from './montageShots';
import type { ShotModule } from './shotTypes';
import wall from './wall';

const shotModules: Record<ShotKind, ShotModule> = {
	wall,
	browser: browserShot,
	flick: browserShot,
	popupOpen,
	ranked,
	assign,
	swaps,
	detail,
	scorebugs,
	boxScore,
	settings,
	guide,
	leagues,
	favorite,
	payoff,
	endCard,
};

export default shotModules;
