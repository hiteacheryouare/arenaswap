import type { ShotKind } from '../cuts/cutTypes';
import browserShot from './browserShot';
import card from './card';
import { credits, legal, signature } from './credits';
import { assign, favorite, payoff, popupOpen, ranked, standby, swaps } from './deskShots';
import endCard from './endCard';
import { detail, guide, leagues, pregame, settings } from './montageShots';
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
	settings,
	guide,
	leagues,
	favorite,
	payoff,
	card,
	pregame,
	standby,
	endCard,
	credits,
	signature,
	legal,
};

export default shotModules;
