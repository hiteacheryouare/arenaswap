#!/usr/bin/env bash
# Regenerates apps/docs/public/video/ from Wikimedia Commons: the hero's clips and the Multiview demo's.
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
# The sides are then cropped to 840x580, which is roughly the shape of the window the
# clips play in. That window is as tall as it is because it holds a 320x560 popup at
# the popup's real size, so it is nearer 3:2 than 16:9. Cropping to the target here
# rather than letting `object-fit: cover` do it means one resample instead of two, and
# it means choosing which part of the frame survives instead of always the middle of a
# 16:9 centre-cut.
#
# The start times are not arbitrary. Each source runs from one to eight minutes and most
# of that is a title card, a press conference or a set piece, so the windows below were
# picked by watching each source through and timing the hero's beats against it: each
# hero clip opens a few seconds before the play its card is waiting on, so the hero
# switches in, the play happens on screen, and the hero leaves once it is over.

set -euo pipefail

cd "$(dirname "$0")/../../apps/docs/public/video"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

ua='ArenaSwapDocsBot/1.0 (https://github.com/hiteacheryouare/arenaswap)'
commons='https://upload.wikimedia.org/wikipedia/commons'

# name|commons path|file name|start|seconds|kept fraction of frame height|crf|pan
#
# Three clips, one per sport, and each one a game in a league ArenaSwap tracks so the popup can name
# it: Tampa Bay at St. Louis, Minnesota State at Bemidji State, Oregon at Washington State. A Mexican
# League baseball game and a UEFA Nations League match were dropped for the opposite reason — good
# footage, but neither league is tracked, so no card could describe what was on screen.
#
# Each window is timed against heroGames.ts: Wetherholt makes contact 2.2s in, Bemidji State ties it
# 3s in, and the 3:47 snap is at the start of the football clip. Every clip runs longer than its tab
# stays on screen, so none of them loops back to the start mid-story. The hockey window stops short
# of the source's 28s mark, where it cuts to Bemidji State against a different opponent.
#
# The popup covers the right of the window: at 1440 and 1536 wide, only 14% to 66% of a clip's width
# is ever visible. `pan` places the 840x580 window across the source, 0 at its left edge and 1 at its
# right, and baseball sits hard right so Wetherholt's swing lands left of the popup rather than
# behind it.
#
# The crf is per clip rather than global. Eleven seconds of a fan's 360p upload costs far fewer bits
# than seven seconds of broadcast hockey, and a single quality setting either wastes bytes on the
# still clips or smears the busy ones. The baseball upload is itself 360p, so Commons has no 480p
# transcode of it and the original is fetched instead.
clips=(
	"baseball|e/eb|Wetherholt_homerun_and_first_hit.webm.360p.webm|4.5|11|1|30|1"
	"hockey|3/32|BSU_Men%27s_Hockey_To_Play_In_2019_Mariucci_Classic.webm|13.75|7.5|0.77|34|0.5"
	"football|d/d2|Oregon_vs._Washington_St_-_FOX_COLLEGE_FOOTBALL_HIGHLIGHTS.webm|202|11|0.84|34|0.5"
)

for clip in "${clips[@]}"; do
	IFS='|' read -r name dir file start secs keep crf pan <<<"$clip"
	src="$work/$name.webm"

	url="$commons/transcoded/$dir/$file/$file.480p.vp9.webm"
	[[ "$name" == baseball ]] && url="$commons/$dir/$file"
	curl -sSfL -A "$ua" -o "$src" "$url"

	# -nostdin matters: without it ffmpeg eats a byte of the loop's heredoc and the next
	# iteration looks for a file whose name is missing its first letter.
	ffmpeg -nostdin -hide_banner -loglevel error \
		-ss "$start" -t "$secs" -i "$src" -an \
		-vf "crop=iw:ih*$keep:0:0,crop=ih*1.448:ih:(iw-ih*1.448)*$pan:0,scale=840:580,fps=24" \
		-c:v libx264 -profile:v high -pix_fmt yuv420p \
		-crf "$crf" -preset veryslow -movflags +faststart \
		-y "$name.mp4"

	ffmpeg -nostdin -hide_banner -loglevel error \
		-i "$name.mp4" -frames:v 1 -vf "scale=480:-2" -q:v 6 -y "$name.jpg"

	printf '%-11s %7s  %s\n' "$name" "$(du -h "$name.mp4" | cut -f1)" "$file"
done

# The home page's Multiview demo: four more games, none of them the hero's, cut to 16:9 because a
# Multiview box is a 16:9 picture under its crest bar.
#
# name|commons path|file name|start|seconds|kept fraction of frame height|crf|cropped fraction off the top
#
# The extra field trims a club logo off the top of two of them.
multiview=(
	"soccer|c/c8|Rayan_scores_his_first_goal_for_AFC_Bournemouth_against_Aston_Villa_in_the_2025-26_Premier_League.webm|1.5|6.5|0.86|30|0.13"
	"football|2/27|All_Hands_Update-_Army_vs_Navy.webm|17.5|6|0.90|30|0"
	"wnba|6/65|Golden_State_Valkyries_at_Indiana_Fever_-_May_2026_-_Sarah_Stierch_44.webm|2.75|7|0.80|31|0.27"
	"basketball|a/ac|Hawaii_Basketball_-_Highlights_From_Northern_Arizona_Game.webm|24.5|7|0.78|31|0"
)

mkdir -p multiview
for clip in "${multiview[@]}"; do
	IFS='|' read -r name dir file start secs keep crf top <<<"$clip"
	src="$work/multiview-$name.webm"

	curl -sSfL -A "$ua" -o "$src" "$commons/transcoded/$dir/$file/$file.480p.vp9.webm"

	ffmpeg -nostdin -hide_banner -loglevel error \
		-ss "$start" -t "$secs" -i "$src" -an \
		-vf "crop=iw:ih*($keep-$top):0:ih*$top,crop=ih*16/9:ih:(iw-ih*16/9)/2:0,scale=640:360,setsar=1,fps=24" \
		-c:v libx264 -profile:v high -pix_fmt yuv420p \
		-crf "$crf" -preset veryslow -movflags +faststart \
		-y "multiview/$name.mp4"

	ffmpeg -nostdin -hide_banner -loglevel error \
		-i "multiview/$name.mp4" -frames:v 1 -vf "scale=480:-2" -q:v 6 -y "multiview/$name.jpg"

	printf '%-15s %7s  %s\n' "$name" "$(du -h "multiview/$name.mp4" | cut -f1)" "$file"
done
