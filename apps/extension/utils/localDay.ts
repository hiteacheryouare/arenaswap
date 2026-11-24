export const isSameLocalDay = (ms: number, other: number): boolean => {
	const a = new Date(ms);
	const b = new Date(other);
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};
