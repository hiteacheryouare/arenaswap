export const bodyTextContrast = 4.5;
export const captionContrast = 3;

const channelsOf = (cssColor: string): [number, number, number] => {
	if (cssColor.startsWith('#')) {
		const hex = cssColor.slice(1);
		return [0, 2, 4].map(start => parseInt(hex.slice(start, start + 2), 16)) as [number, number, number];
	}
	const matched = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(cssColor)!;
	return [Number(matched[1]), Number(matched[2]), Number(matched[3])];
};

export const luminanceOf = (cssColor: string): number => {
	const [red, green, blue] = channelsOf(cssColor).map(channel => {
		const scaled = channel / 255;
		return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
	});
	return (0.2126 * red!) + (0.7152 * green!) + (0.0722 * blue!);
};

export const contrastRatio = (first: string, second: string): number => {
	const [lighter, darker] = [luminanceOf(first), luminanceOf(second)].toSorted((a, b) => b - a);
	return (lighter! + 0.05) / (darker! + 0.05);
};
