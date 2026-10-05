#!/usr/bin/env bash
# 히어로 영상 조각 3개를 이어 붙여 프레임 이미지(webp)로 뽑습니다.
#
# 사용법:
#   ./tools/extract-frames.sh clip1.mp4 clip2.mp4 clip3.mp4 [출력폴더] [가로px] [fps]
#
# 기본값: 출력폴더=frames, 가로=1280px, fps=30
# 결과:   frames/0001.webp ~ frames/NNNN.webp  (끝에 프레임 개수를 출력합니다)
#         → 그 숫자를 hero-scroll.html 의 count 에 넣으세요.
set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "사용법: $0 clip1.mp4 clip2.mp4 clip3.mp4 [출력폴더] [가로px] [fps]" >&2
  exit 1
fi

C1="$1"; C2="$2"; C3="$3"
OUT="${4:-frames}"
WIDTH="${5:-1280}"
FPS="${6:-30}"
QUALITY="${QUALITY:-78}"

command -v ffmpeg >/dev/null || { echo "ffmpeg 가 필요합니다." >&2; exit 1; }

mkdir -p "$OUT"
rm -f "$OUT"/*.webp

# 조각 2, 3 은 첫 프레임이 앞 조각의 마지막 프레임과 같으므로 한 장씩 뺍니다(이음매 중복 방지).
ffmpeg -hide_banner -loglevel error -y \
  -i "$C1" -i "$C2" -i "$C3" \
  -filter_complex "\
[0:v]fps=${FPS},scale=${WIDTH}:-2,setsar=1[a];\
[1:v]fps=${FPS},scale=${WIDTH}:-2,setsar=1,trim=start_frame=1,setpts=PTS-STARTPTS[b];\
[2:v]fps=${FPS},scale=${WIDTH}:-2,setsar=1,trim=start_frame=1,setpts=PTS-STARTPTS[c];\
[a][b][c]concat=n=3:v=1:a=0[v]" \
  -map "[v]" -c:v libwebp -quality "$QUALITY" -compression_level 4 \
  "$OUT/%04d.webp"

COUNT=$(ls "$OUT"/*.webp | wc -l | tr -d ' ')
SIZE=$(du -sh "$OUT" | cut -f1)
echo "프레임 ${COUNT}장 / ${SIZE} → ${OUT}/"
echo "hero-scroll.html 의 count 를 ${COUNT} 로 설정하세요."
