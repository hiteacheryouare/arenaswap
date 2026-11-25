export interface BuildStamp {
	builtAt: number;
	timeZone: string;
	environment: string;
}

// SOURCE_DATE_EPOCH is the reproducible-builds convention. Pinning the time zone with it keeps an
// AMO reviewer's rebuild byte-identical to ours, wherever their machine is.
export default (env: NodeJS.ProcessEnv = process.env): BuildStamp => {
	const pinnedSeconds = env.SOURCE_DATE_EPOCH;
	return {
		builtAt: pinnedSeconds ? Number(pinnedSeconds) * 1000 : Date.now(),
		timeZone: pinnedSeconds ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone,
		environment: env.GITHUB_ACTIONS === 'true' ? 'GitHub Actions' : env.CI ? 'CI' : 'Local',
	};
};
