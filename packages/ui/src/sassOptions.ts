import bootstrapPkg from 'bootstrap/package.json';

// Bootstrap 5.3.x compiles through Dart Sass's legacy @import, global built-in functions, legacy
// colour functions and legacy if(), and its own docs say to ignore the warnings until a long-term
// fix lands. twbs/bootstrap#40962 tracks that work and is labelled v5, and the roadmap in twbs
// discussion #41370 puts "refactor our Sass code to use the Sass module system" in 5.5.0 — under the
// maintainers' caveat that it moves to v6 if it turns out too large.
//
// So the threshold is the announced fix rather than the next major. Land 5.5.0 fixed and the
// silencing lifts on its own; land it still warning because the work slipped and the warnings come
// back until somebody raises this number. Loud and wrong beats quiet and wrong for a switch whose
// whole job is hiding output.
const bootstrapSassFixedIn = '5.5.0';

// Prereleases are compared on the release part alone, so 5.5.0-beta1 counts as 5.5.0 and shows its
// warnings — trialling a prerelease is exactly when you want to see them. A version that will not
// parse gives NaN, which loses every comparison and so leaves the warnings on: the same safe
// direction. The weights assume a minor or patch never reaches 1000, which no Bootstrap release has
// come close to.
const releaseOrder = (version: string) => {
	const [major = 0, minor = 0, patch = 0] = (version.split('-')[0] ?? '').split('.').map(Number);
	return major * 1e6 + minor * 1e3 + patch;
};

// quietDeps rather than silenceDeprecations because it is scoped by origin instead of by
// deprecation id: Dart Sass counts anything reached through a load path or an importer as a
// dependency, so node_modules goes quiet and our own stylesheets stay audible. An id list would
// also swallow the global-builtin and slash-div warnings our own Sass is capable of emitting.
export default releaseOrder(bootstrapPkg.version) < releaseOrder(bootstrapSassFixedIn)
	? { quietDeps: true }
	: {};
