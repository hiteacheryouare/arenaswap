#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
outputDir="$root/apps/extension/.output"
distDir="$root/apps/extension/dist"
remoteUrl="$(git -C "$root" remote get-url origin)"
currentBranch="$(git -C "$root" rev-parse --abbrev-ref HEAD)"

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

zipSource() {
	local zip="$distDir/arenaswap-source.zip"
	local tmpDir
	tmpDir="$(mktemp -d)"

	echo "  cloning $remoteUrl ($currentBranch)..."
	git clone --branch "$currentBranch" --single-branch "$remoteUrl" "$tmpDir/arenaswap" 2>/dev/null

	rm -f "$zip"
	(cd "$tmpDir" && zip -r "$zip" arenaswap)
	rm -rf "$tmpDir"
	echo "  source ~> arenaswap-source.zip"
}

echo "Zipping builds..."
zipBuild "chrome-mv3"   "arenaswap-chrome"
zipBuild "edge-mv3"     "arenaswap-edge"
zipBuild "firefox-mv3"  "arenaswap-firefox"
echo "Zipping source..."
zipSource
echo "Done. Zips written to apps/extension/dist/"
