import type { PopupHostApi } from './popup/popupHost';

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
	cx: number;
	cy: number;
}

const toBox = (x: number, y: number, width: number, height: number): Box => ({ x, y, width, height, cx: x + width / 2, cy: y + height / 2 });

const createMeasure = (stage: HTMLElement, host: PopupHostApi) => {
	const stageBox = () => stage.getBoundingClientRect();

	const inStage = (selector: string): Box | null => {
		const element = stage.querySelector(selector);
		if (!element) return null;
		const origin = stageBox();
		const rect = element.getBoundingClientRect();
		return toBox(rect.left - origin.left, rect.top - origin.top, rect.width, rect.height);
	};

	const inPopup = (popupId: string, selector: string): Box | null => {
		const frame = host.runtimes.get(popupId)?.frame;
		const element = frame?.contentDocument?.querySelector(selector);
		if (!frame || !element) return null;
		const origin = stageBox();
		const frameRect = frame.getBoundingClientRect();
		const scale = frameRect.width / frame.clientWidth;
		const rect = element.getBoundingClientRect();
		return toBox(
			frameRect.left - origin.left + rect.left * scale,
			frameRect.top - origin.top + rect.top * scale,
			rect.width * scale,
			rect.height * scale,
		);
	};

	return { inStage, inPopup };
};

export type Measure = ReturnType<typeof createMeasure>;

export default createMeasure;
