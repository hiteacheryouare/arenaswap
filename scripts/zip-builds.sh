#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
outputDir="$root/apps/extension/.output"
distDir="$root/apps/extension/dist"

mkdir -p "$distDir"

zipBuild() {
	local browser="$1"
	local name="$2"
	local dir="$outputDir/$browser"
	local zip="$distDir/$name.zip"

	if [ ! -d "$dir" ]; then
		echo "  skip $browser (not built)"
		return
	fi

	rm -f "$zip"
	(cd "$dir" && zip -r "$zip" .)
	echo "  $browser ~> $name.zip"
}

echo "Zipping builds..."
zipBuild "chrome-mv3"   "arenaswap-chrome"
zipBuild "edge-mv3"     "arenaswap-edge"
zipBuild "firefox-mv3"  "arenaswap-firefox"
echo "Done. Zips written to apps/extension/dist/"
