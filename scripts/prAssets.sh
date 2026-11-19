#!/usr/bin/env bash
# Publishes PR screenshots to refs/assets/pr on origin and prints their raw URLs.
# That ref sits outside refs/heads, so clones never download it, and nothing here touches
# HEAD, the index or the working tree.
#
# Usage: scripts/prAssets.sh <folder> <file>...
set -euo pipefail

if [ $# -lt 2 ]; then
	echo "Usage: scripts/prAssets.sh <folder> <file>..." >&2
	exit 1
fi

folder=${1%/}
shift
ref=refs/assets/pr
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)

scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
export GIT_INDEX_FILE=$scratch/index

parent=$(git ls-remote origin "$ref" | cut -f1)
if [ -n "$parent" ]; then
	git fetch --quiet origin "+$ref:$ref"
	git read-tree "$ref"
else
	git read-tree --empty
fi

for file in "$@"; do
	blob=$(git hash-object -w -- "$file")
	git update-index --add --cacheinfo "100644,$blob,$folder/$(basename "$file")"
done

tree=$(git write-tree)
commit=$(git commit-tree "$tree" ${parent:+-p "$parent"} -m "Add $folder")
git push --quiet origin "$commit:$ref"
git update-ref "$ref" "$commit"

for file in "$@"; do
	echo "https://raw.githubusercontent.com/$repo/$commit/$folder/$(basename "$file")"
done
