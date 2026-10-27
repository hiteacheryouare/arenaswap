export interface multiviewGrid {
	columns: number;
	rows: number;
	// How many columns and rows the big box covers, from the top-left corner.
	span: number;
}

export interface gridPlacement {
	column: string;
	row: string;
}

// Featured + rail: the big box takes the top-left square, the rest fill the right column top to
// bottom and then the bottom row left to right. Every cell is 16:9, so the grid is too. Each count
// takes the shape that leaves no cell empty, which only 5 and 7 cannot manage.
export const multiviewGridFor = (count: number): multiviewGrid => {
	if (count <= 1) return { columns: 1, rows: 1, span: 1 };
	if (count === 2) return { columns: 2, rows: 1, span: 1 };
	if (count === 3) return { columns: 3, rows: 2, span: 2 };
	if (count === 4) return { columns: 4, rows: 3, span: 3 };
	if (count <= 6) return { columns: 3, rows: 3, span: 2 };
	return { columns: 4, rows: 4, span: 3 };
};

const railCells = ({ columns, rows, span }: multiviewGrid): gridPlacement[] => {
	const cells: gridPlacement[] = [];
	for (let row = 1; row <= span; row++) cells.push({ column: String(columns), row: String(row) });
	for (let row = span + 1; row <= rows; row++) {
		for (let column = 1; column <= columns; column++) cells.push({ column: String(column), row: String(row) });
	}
	return cells;
};

// Shown boxes in, the featured one wherever it sits: the rest keep their relative order on the rail.
export const placeBoxes = (shownIds: readonly string[], featuredId: string | null): Map<string, gridPlacement> => {
	const grid = multiviewGridFor(shownIds.length);
	const featured = featuredId !== null && shownIds.includes(featuredId) ? featuredId : shownIds[0];
	const rail = railCells(grid);
	const placements = new Map<string, gridPlacement>();
	let railIndex = 0;
	for (const id of shownIds) {
		if (id === featured) {
			placements.set(id, { column: `1 / span ${grid.span}`, row: `1 / span ${grid.span}` });
			continue;
		}
		// The grid tops out at eight. Anything past that waits under the big box, the way a loading one does.
		const cell = rail[railIndex++];
		if (cell) placements.set(id, cell);
	}
	return placements;
};
