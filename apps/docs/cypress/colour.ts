// Chrome reports a colour in whatever space it was mixed in, oklch included, so it is painted to a
// canvas and read back as sRGB.
export const toRgb = (color: string): [number, number, number] => {
	const context = document.createElement('canvas').getContext('2d')!;
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
	return [r!, g!, b!];
};

export const luminance = (color: string) => {
	const [r, g, b] = toRgb(color).map(channel => {
		const value = channel / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

export const contrast = (a: string, b: string) => {
	const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
	return (hi! + 0.05) / (lo! + 0.05);
};
