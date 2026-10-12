// A summary payload carries every play of the game and the night's articles. The popup reads
// none of that, and keeping it would put tens of megabytes of play-by-play in the data file.
const droppedKeys = ['plays', 'news', 'article', 'videos', 'commentary', 'meta', 'shot'];

const trimSummary = (raw: Record<string, unknown>): Record<string, unknown> => {
	const trimmed: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(raw)) {
		if (droppedKeys.includes(key)) continue;
		trimmed[key] = value;
	}
	const drives = trimmed.drives as { previous?: { plays?: unknown }[]; current?: { plays?: unknown } } | undefined;
	if (drives) {
		trimmed.drives = {
			...drives,
			previous: drives.previous?.map(({ plays: _plays, ...drive }) => drive),
			...(drives.current ? { current: (({ plays: _plays, ...drive }) => drive)(drives.current) } : {}),
		};
	}
	return trimmed;
};

export default trimSummary;
