#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1-}" ]; then
	echo "Usage: $0 <version>"
	echo "Example: $0 1.2.3"
	exit 1
fi

version="$1"

if ! echo "$version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
	echo "Error: version must be in semver format (e.g. 1.2.3)"
	exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
updated=0

while IFS= read -r file; do
	if [[ "$file" == *"/node_modules/"* ]]; then
		continue
	fi

	current=$(grep -m1 '"version"' "$file" | sed 's/.*"version": *"\([^"]*\)".*/\1/')

	if [ -z "$current" ]; then
		continue
	fi

	tmp="$(mktemp)"
	sed "s/\"version\": \"$current\"/\"version\": \"$version\"/" "$file" > "$tmp"
	mv "$tmp" "$file"

	echo "  $file  $current ~> $version"
	updated=$((updated + 1))
done < <(find "$root" -name "package.json" -not -path "*/node_modules/*")

echo ""
echo "$updated package.json file(s) updated to $version"
