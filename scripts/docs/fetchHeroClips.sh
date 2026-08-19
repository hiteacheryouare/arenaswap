#!/usr/bin/env bash
# Regenerates apps/docs/public/video/ from Wikimedia Commons.
#
# The hero plays real game footage. Every clip below is public domain, CC0 or CC BY,
# and the attribution the licences require is on /credits/. Nothing here runs in CI or
# during a build: the encoded output is committed, and this exists so the committed
# output can be reproduced or replaced.
#
# Needs ffmpeg on PATH. Sources are downloaded at Commons' 480p VP9 transcode rather
# than the original upload, which is the same footage at a twentieth of the bytes.
#
#   ./scripts/docs/fetchHeroClips.sh
#
# The bottom of every frame is cropped away. That is not a style choice: it is where
# broadcast lower-thirds, news chyrons and foreground spectators sit, and all three
# read as somebody else's video rather than as a stream in a tab.
#
# The start times are not arbitrary. Each source runs from one to eight minutes and most
# of that is a title card, a press conference or a set piece, so the windows below were
# picked by measuring frame-to-frame change across the whole clip and shortlisting the
# busiest few seconds, then looking at those. Motion alone is not enough on its own —
# the highest-scoring window in the Army-Navy clip is a touchdown celebration, which is
# a crowd of people jumping rather than a game being played — so the shortlist was
# eyeballed and the second-ranked window taken for football.

set -euo pipefail

cd "$(dirname "$0")/../../apps/docs/public/video"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

ua='ArenaSwapDocsBot/1.0 (https://github.com/hiteacheryouare/arenaswap)'
commons='https://upload.wikimedia.org/wikipedia/commons'

# name|commons path|file name|start|seconds|kept fraction of frame height|crf
#
# Three clips, one per sport, and each one a game in a league ArenaSwap tracks so the popup can name
# it: Northern Arizona at Hawai'i, Army at Navy, Minnesota State at Bemidji State. A Mexican League
# baseball game and a UEFA Nations League match were dropped for the opposite reason — good footage,
# but neither league is tracked, so no card could describe what was on screen.
#
# The crf is per clip rather than global. Seven seconds of basketball costs far more bits than seven
# seconds of a wide hockey shot, and a single quality setting either wastes bytes on the still clips
# or smears the busy ones.
clips=(
	"basketball|a/ac|Hawaii_Basketball_-_Highlights_From_Northern_Arizona_Game.webm|24.5|7|0.79|35"
	"football|2/27|All_Hands_Update-_Army_vs_Navy.webm|17.5|6|0.86|34"
	"hockey|3/32|BSU_Men%27s_Hockey_To_Play_In_2019_Mariucci_Classic.webm|26.25|7|0.86|34"
)

for clip in "${clips[@]}"; do
	IFS='|' read -r name dir file start secs keep crf <<<"$clip"
	src="$work/$name.webm"

	curl -sSfL -A "$ua" -o "$src" \
		"$commons/transcoded/$dir/$file/$file.480p.vp9.webm"

	# -nostdin matters: without it ffmpeg eats a byte of the loop's heredoc and the next
	# iteration looks for a file whose name is missing its first letter.
	ffmpeg -nostdin -hide_banner -loglevel error \
		-ss "$start" -t "$secs" -i "$src" -an \
		-vf "crop=iw:ih*$keep:0:0,scale=960:-2,fps=24" \
		-c:v libx264 -profile:v high -pix_fmt yuv420p \
		-crf "$crf" -preset veryslow -movflags +faststart \
		-y "$name.mp4"

	ffmpeg -nostdin -hide_banner -loglevel error \
		-i "$name.mp4" -frames:v 1 -vf "scale=480:-2" -q:v 6 -y "$name.jpg"

	printf '%-11s %7s  %s\n' "$name" "$(du -h "$name.mp4" | cut -f1)" "$file"
done
