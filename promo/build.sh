#!/usr/bin/env bash
# ============================================================================
# MLP — 110s marketing video build script
#
# Produces:  promo/promo-110s.mp4  (1920x1080, 30fps, H.264 + AAC, faststart)
#
# Pipeline:
#   1. Render each of 22 scenes to tmp/sNN.mp4 (silent, text burned in)
#   2. Concatenate with FFmpeg concat demuxer
#   3. Mix in music.mp3 with fade-in/out (matches 110s music length)
#
# Run: bash promo/build.sh
# ============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROMO="$ROOT/promo"
TMP="$PROMO/tmp"
EVMEDIA="$ROOT/site/event-media"
BATH="$ROOT/site/css/js/assets/images/portfolio/bathrooms"
OUT="$PROMO/promo-110s.mp4"
MUSIC="$PROMO/music.mp3"

mkdir -p "$TMP"

# Fonts (matching the HTML preview — Cormorant Garamond + Inter from Google Fonts)
FS="promo/fonts/CormorantGaramond-Bold.ttf"   # display serif
FN="promo/fonts/Inter-Bold.ttf"               # UI / body
FM="promo/fonts/Inter-Bold.ttf"               # URL line (used to be consola; Inter avoids redistributing Microsoft fonts)

# Colors
GOLD="0xC8A766"
TERRA="0xA85A3B"
NAVY="0x0B0F17"
WARM="0x1A1208"
CREAM="0xF5F1E8"
INK_SOFT="0xC4BDA9"

ENC=(-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30 -s 1920x1080)

cd "$ROOT"

# -------------- HELPERS --------------------------------------------------

# args: dur(s) img tag tag_bg tag_fg out
render_tagged_still() {
  local DUR="$1" IMG="$2" TAG="$3" TAGBG="$4" TAGFG="$5" OUT="$6"
  ffmpeg -y -hide_banner -loglevel error \
    -loop 1 -t "$DUR" -i "$IMG" \
    -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,eq=brightness=-0.03:contrast=1.05,drawbox=x=96:y=65:w=210:h=52:color=$TAGBG@1:t=fill,drawtext=fontfile=$FN:text='$TAG':fontsize=24:fontcolor=$TAGFG:x=96+(210-text_w)/2:y=78,fade=t=in:st=0:d=0.5,fade=t=out:st=$(awk "BEGIN { print $DUR - 0.4 }"):d=0.4" \
    "${ENC[@]}" -an "$OUT"
}

# args: dur eyebrow title sub out
render_title_card() {
  local DUR="$1" EYE="$2" TITLE="$3" SUB="$4" OUT="$5"
  local SUB_LAYER=""
  if [ -n "$SUB" ]; then
    SUB_LAYER=",drawtext=fontfile=$FN:text='$SUB':fontsize=30:fontcolor=$INK_SOFT:x=(w-text_w)/2:y=620"
  fi
  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i "color=c=$NAVY:s=1920x1080:d=$DUR:r=30" \
    -vf "drawtext=fontfile=$FN:text='$EYE':fontsize=22:fontcolor=$GOLD:x=(w-text_w)/2:y=420,drawtext=fontfile=$FS:text='$TITLE':fontsize=88:fontcolor=$CREAM:x=(w-text_w)/2:y=480${SUB_LAYER},fade=t=in:st=0:d=0.5,fade=t=out:st=$(awk "BEGIN { print $DUR - 0.4 }"):d=0.4" \
    "${ENC[@]}" -an "$OUT"
}

# -------------- SCENES ----------------------------------------------------

echo "==> 01 · Brand intro (4s)"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=$NAVY:s=1920x1080:d=4:r=30" \
  -vf "drawbox=x=830:y=290:w=260:h=260:color=$GOLD@1:t=fill,drawtext=fontfile=$FS:text=M:fontsize=180:fontcolor=$WARM:x=(w-text_w)/2:y=330,drawtext=fontfile=$FS:text='MLP Reno & Design':fontsize=78:fontcolor=$CREAM:x=(w-text_w)/2:y=620,drawtext=fontfile=$FN:text='CONCEVOIR  CONSTRUIRE  OPTIMISER':fontsize=22:fontcolor=$GOLD:x=(w-text_w)/2:y=730,fade=t=in:st=0:d=0.5,fade=t=out:st=3.5:d=0.5" \
  "${ENC[@]}" -an "$TMP/s01.mp4"

echo "==> 02 · Services (5s) — 3 words on separate lines, no overlap"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=$NAVY:s=1920x1080:d=5:r=30" \
  -vf "drawtext=fontfile=$FN:text='CE QU ON FAIT':fontsize=22:fontcolor=$GOLD:x=(w-text_w)/2:y=260,drawtext=fontfile=$FS:text='Acheter.':fontsize=120:fontcolor=$CREAM:x=(w-text_w)/2:y=320:enable='gte(t,0.4)':alpha='if(lt(t,0.4),0,min(1,(t-0.4)*2.5))',drawtext=fontfile=$FS:text='Rénover.':fontsize=120:fontcolor=$GOLD:x=(w-text_w)/2:y=480:enable='gte(t,1.2)':alpha='if(lt(t,1.2),0,min(1,(t-1.2)*2.5))',drawtext=fontfile=$FS:text='Optimiser.':fontsize=120:fontcolor=$CREAM:x=(w-text_w)/2:y=640:enable='gte(t,2.0)':alpha='if(lt(t,2.0),0,min(1,(t-2.0)*2.5))',fade=t=in:st=0:d=0.5,fade=t=out:st=4.5:d=0.5" \
  "${ENC[@]}" -an "$TMP/s02.mp4"

echo "==> 03 · Audience (6.5s, slower stagger)"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=$NAVY:s=1920x1080:d=6.5:r=30" \
  -vf "drawtext=fontfile=$FN:text='À QUI ON S ADRESSE':fontsize=22:fontcolor=$GOLD:x=(w-text_w)/2:y=200,drawtext=fontfile=$FS:text='Trois profils. Une équipe.':fontsize=70:fontcolor=$CREAM:x=(w-text_w)/2:y=260,drawbox=x=180:y=480:w=480:h=300:color=$WARM@0.5:t=fill:enable='gte(t,0.6)',drawtext=fontfile=$FS:text='Propriétaires':fontsize=42:fontcolor=$GOLD:x=180+(480-text_w)/2:y=560:enable='gte(t,0.6)':alpha='if(lt(t,0.6),0,min(1,(t-0.6)*2))',drawtext=fontfile=$FN:text='Maison · condo · plex':fontsize=22:fontcolor=$INK_SOFT:x=180+(480-text_w)/2:y=640:enable='gte(t,0.6)':alpha='if(lt(t,0.6),0,min(1,(t-0.6)*2))',drawbox=x=720:y=480:w=480:h=300:color=$WARM@0.5:t=fill:enable='gte(t,1.6)',drawtext=fontfile=$FS:text='Acheteurs':fontsize=42:fontcolor=$GOLD:x=720+(480-text_w)/2:y=560:enable='gte(t,1.6)':alpha='if(lt(t,1.6),0,min(1,(t-1.6)*2))',drawtext=fontfile=$FN:text='Première ou suivante':fontsize=22:fontcolor=$INK_SOFT:x=720+(480-text_w)/2:y=640:enable='gte(t,1.6)':alpha='if(lt(t,1.6),0,min(1,(t-1.6)*2))',drawbox=x=1260:y=480:w=480:h=300:color=$WARM@0.5:t=fill:enable='gte(t,2.6)',drawtext=fontfile=$FS:text='Investisseurs':fontsize=42:fontcolor=$GOLD:x=1260+(480-text_w)/2:y=560:enable='gte(t,2.6)':alpha='if(lt(t,2.6),0,min(1,(t-2.6)*2))',drawtext=fontfile=$FN:text='Portefeuille immobilier':fontsize=22:fontcolor=$INK_SOFT:x=1260+(480-text_w)/2:y=640:enable='gte(t,2.6)':alpha='if(lt(t,2.6),0,min(1,(t-2.6)*2))',fade=t=in:st=0:d=0.5,fade=t=out:st=6.0:d=0.5" \
  "${ENC[@]}" -an "$TMP/s03.mp4"

echo "==> 04 · Section transition (3s)"
render_title_card 3 "NOS RÉALISATIONS" "Voici ce qu on fait." "" "$TMP/s04.mp4"

echo "==> 05 · Project 1 title — Maison Thomas-Dubuc (4.5s)"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=$NAVY:s=1920x1080:d=4.5:r=30" \
  -vf "drawtext=fontfile=$FN:text='PROJET · MONTRÉAL':fontsize=24:fontcolor=$GOLD:x=(w-text_w)/2:y=280,drawtext=fontfile=$FS:text='Maison Thomas-Dubuc':fontsize=92:fontcolor=$CREAM:x=(w-text_w)/2:y=340,drawbox=x=910:y=520:w=100:h=2:color=$GOLD@0.8:t=fill,drawtext=fontfile=$FN:text='Conversion d une maison unifamiliale en duplex avec studio.':fontsize=30:fontcolor=$INK_SOFT:x=(w-text_w)/2:y=580,drawtext=fontfile=$FN:text='Faisabilité avec la Ville · Permis · Rénovation complète des 3 unités.':fontsize=26:fontcolor=$INK_SOFT:x=(w-text_w)/2:y=640,fade=t=in:st=0:d=0.5,fade=t=out:st=4.0:d=0.5" \
  "${ENC[@]}" -an "$TMP/s05.mp4"

echo "==> 06-09 · Thomas-Dubuc Façade + Salon B/A (slowed)"
render_tagged_still 3.5 "$EVMEDIA/thomas-dubuc/before/Before-frontage.jpeg"     "AVANT" "$NAVY" "$CREAM" "$TMP/s06.mp4"
render_tagged_still 4.5 "$EVMEDIA/thomas-dubuc/after/Frontage-1.jpeg"            "APRÈS" "$GOLD" "$WARM"  "$TMP/s07.mp4"
render_tagged_still 3.5 "$EVMEDIA/thomas-dubuc/before/Before-Living-room.jpeg"  "AVANT" "$NAVY" "$CREAM" "$TMP/s08.mp4"
render_tagged_still 4.5 "$EVMEDIA/thomas-dubuc/after/Living-room-1.jpeg"         "APRÈS" "$GOLD" "$WARM"  "$TMP/s09.mp4"

echo "==> 10 · Gallery transition title — Thomas-Dubuc (2.5s)"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=$NAVY:s=1920x1080:d=2.5:r=30" \
  -vf "drawtext=fontfile=$FN:text='MAISON THOMAS-DUBUC':fontsize=22:fontcolor=$GOLD:x=(w-text_w)/2:y=440,drawtext=fontfile=$FS:text='Et toute la maison.':fontsize=88:fontcolor=$CREAM:x=(w-text_w)/2:y=500,drawbox=x=910:y=680:w=100:h=2:color=$GOLD@0.7:t=fill,fade=t=in:st=0:d=0.5,fade=t=out:st=2.0:d=0.4" \
  "${ENC[@]}" -an "$TMP/s10.mp4"

echo "==> 11 · Gallery (6s) — 5 Thomas-Dubuc rooms"
GALLERY=(
  "$EVMEDIA/thomas-dubuc/after/Kitchen-2.jpeg"
  "$EVMEDIA/thomas-dubuc/after/Bathroom-2.jpeg"
  "$EVMEDIA/thomas-dubuc/after/Basement-Kitchen.jpeg"
  "$EVMEDIA/thomas-dubuc/after/Backyard.jpeg"
  "$EVMEDIA/thomas-dubuc/after/Basement-living-room.jpeg"
)
> "$TMP/gallery.txt"
i=1
for img in "${GALLERY[@]}"; do
  ffmpeg -y -hide_banner -loglevel error \
    -loop 1 -t 1.2 -i "$img" \
    -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,eq=brightness=-0.05:contrast=1.05" \
    "${ENC[@]}" -an "$TMP/g$i.mp4"
  echo "file 'g$i.mp4'" >> "$TMP/gallery.txt"
  i=$((i+1))
done
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$TMP/gallery.txt" -c copy "$TMP/g-cut.mp4"
ffmpeg -y -hide_banner -loglevel error \
  -i "$TMP/g-cut.mp4" \
  -vf "drawbox=x=110:y=920:w=720:h=90:color=$NAVY@0.72:t=fill:enable='gte(t,1.4)',drawtext=fontfile=$FN:text='Cuisine · chambre · sous-sol · extérieur':fontsize=24:fontcolor=$CREAM:x=140:y=950:enable='gte(t,1.4)':alpha='if(lt(t,1.4),0,min(1,(t-1.4)*2))',fade=t=in:st=0:d=0.4,fade=t=out:st=5.5:d=0.5" \
  "${ENC[@]}" -an "$TMP/s11.mp4"

echo "==> 12 · Project 2 title — Salles de bain (plural) (2.5s)"
render_title_card 2.5 "PROJETS · REDESIGN COMPLET" "Salles de bain." "" "$TMP/s12.mp4"

echo "==> 13-14 · Salle de bain 1 B/A"
render_tagged_still 3.5 "$BATH/bathroom-1-before.jpg" "AVANT" "$NAVY" "$CREAM" "$TMP/s13.mp4"
render_tagged_still 4.5 "$BATH/bathroom-1-after.jpg"  "APRÈS" "$GOLD" "$WARM"  "$TMP/s14.mp4"

echo "==> 15-16 · Salle de bain 2 B/A (NEW)"
render_tagged_still 3.5 "$BATH/bathroom-2-before.jpg" "AVANT" "$NAVY" "$CREAM" "$TMP/s15.mp4"
render_tagged_still 4.5 "$BATH/bathroom-2-after.jpg"  "APRÈS" "$GOLD" "$WARM"  "$TMP/s16.mp4"

echo "==> 17 · Stat — 10 ans · 150+ projets (4s) — tight spacing"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=$NAVY:s=1920x1080:d=4:r=30" \
  -vf "drawtext=fontfile=$FS:text='10':fontsize=240:fontcolor=$GOLD:x=480-text_w/2:y=360,drawtext=fontfile=$FN:text='ANS D EXPÉRIENCE':fontsize=32:fontcolor=$INK_SOFT:x=480-text_w/2:y=610,drawtext=fontfile=$FS:text='150+':fontsize=240:fontcolor=$GOLD:x=1440-text_w/2:y=360,drawtext=fontfile=$FN:text='PROJETS LIVRÉS':fontsize=32:fontcolor=$INK_SOFT:x=1440-text_w/2:y=610,drawtext=fontfile=$FS:text='Grand Montréal.':fontsize=54:fontcolor=$CREAM:x=(w-text_w)/2:y=750,fade=t=in:st=0:d=0.5,fade=t=out:st=3.5:d=0.5" \
  "${ENC[@]}" -an "$TMP/s17.mp4"

echo "==> 18 · Prize hook (4s) — 14 000 $"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=$NAVY:s=1920x1080:d=4:r=30" \
  -vf "drawtext=fontfile=$FN:text='TIRAGE AU SORT · 8 CADEAUX':fontsize=24:fontcolor=$GOLD:x=(w-text_w)/2:y=340,drawtext=fontfile=$FS:text='14 000 \$':fontsize=280:fontcolor=$GOLD:x=(w-text_w)/2:y=400:enable='gte(t,0.5)':alpha='if(lt(t,0.5),0,min(1,(t-0.5)*1.5))',drawtext=fontfile=$FN:text='SELON VOTRE PROFIL':fontsize=24:fontcolor=$GOLD:x=(w-text_w)/2:y=730:enable='gte(t,1.5)':alpha='if(lt(t,1.5),0,min(1,(t-1.5)*1.5))',fade=t=in:st=0:d=0.5,fade=t=out:st=3.5:d=0.5" \
  "${ENC[@]}" -an "$TMP/s18.mp4"

echo "==> 19 · Prizes A — Acheteurs & investisseurs (12s, 2.5s stagger)"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=$NAVY:s=1920x1080:d=12:r=30" \
  -vf "drawtext=fontfile=$FN:text='TIRAGE 1 · ACHETEUR OU INVESTISSEUR':fontsize=22:fontcolor=$GOLD:x=140:y=200,drawtext=fontfile=$FS:text='Vos cadeaux.':fontsize=86:fontcolor=$CREAM:x=140:y=240,drawtext=fontfile=$FS:text='6 000 \$.':fontsize=86:fontcolor=$GOLD:x=720:y=240,drawbox=x=140:y=470:w=1640:h=2:color=$GOLD@0.4:t=fill:enable='gte(t,2.0)',drawtext=fontfile=$FN:text='Plan d optimisation':fontsize=34:fontcolor=$CREAM:x=140:y=500:enable='gte(t,2.0)':alpha='if(lt(t,2.0),0,min(1,(t-2.0)*2))',drawtext=fontfile=$FS:text='1 500 \$':fontsize=56:fontcolor=$GOLD:x=1780-tw:y=490:enable='gte(t,2.0)':alpha='if(lt(t,2.0),0,min(1,(t-2.0)*2))',drawbox=x=140:y=590:w=1640:h=2:color=$GOLD@0.4:t=fill:enable='gte(t,4.5)',drawtext=fontfile=$FN:text='Étude de faisabilité':fontsize=34:fontcolor=$CREAM:x=140:y=620:enable='gte(t,4.5)':alpha='if(lt(t,4.5),0,min(1,(t-4.5)*2))',drawtext=fontfile=$FS:text='2 000 \$':fontsize=56:fontcolor=$GOLD:x=1780-tw:y=610:enable='gte(t,4.5)':alpha='if(lt(t,4.5),0,min(1,(t-4.5)*2))',drawbox=x=140:y=710:w=1640:h=2:color=$GOLD@0.4:t=fill:enable='gte(t,7.0)',drawtext=fontfile=$FN:text='Évaluation ROI · 3 propriétés':fontsize=34:fontcolor=$CREAM:x=140:y=740:enable='gte(t,7.0)':alpha='if(lt(t,7.0),0,min(1,(t-7.0)*2))',drawtext=fontfile=$FS:text='2 500 \$':fontsize=56:fontcolor=$GOLD:x=1780-tw:y=730:enable='gte(t,7.0)':alpha='if(lt(t,7.0),0,min(1,(t-7.0)*2))',drawbox=x=140:y=830:w=1640:h=2:color=$GOLD@0.4:t=fill:enable='gte(t,7.5)',fade=t=in:st=0:d=0.5,fade=t=out:st=11.5:d=0.5" \
  "${ENC[@]}" -an "$TMP/s19.mp4"

echo "==> 20 · Prizes B — Rénovation (14s, 2s stagger)"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=$NAVY:s=1920x1080:d=14:r=30" \
  -vf "drawtext=fontfile=$FN:text='TIRAGE 2 · RÉNOVATION OU PROJET DESIGN':fontsize=22:fontcolor=$GOLD:x=140:y=140,drawtext=fontfile=$FS:text='Vos cadeaux.':fontsize=78:fontcolor=$CREAM:x=140:y=180,drawtext=fontfile=$FS:text='8 000 \$.':fontsize=78:fontcolor=$GOLD:x=680:y=180,drawbox=x=140:y=350:w=1640:h=2:color=$GOLD@0.4:t=fill:enable='gte(t,2.0)',drawtext=fontfile=$FN:text='Îlot de cuisine':fontsize=30:fontcolor=$CREAM:x=140:y=380:enable='gte(t,2.0)':alpha='if(lt(t,2.0),0,min(1,(t-2.0)*2))',drawtext=fontfile=$FS:text='2 000 \$':fontsize=44:fontcolor=$GOLD:x=1780-tw:y=370:enable='gte(t,2.0)':alpha='if(lt(t,2.0),0,min(1,(t-2.0)*2))',drawbox=x=140:y=450:w=1640:h=2:color=$GOLD@0.4:t=fill:enable='gte(t,4.0)',drawtext=fontfile=$FN:text='Bain ou douche installé':fontsize=30:fontcolor=$CREAM:x=140:y=480:enable='gte(t,4.0)':alpha='if(lt(t,4.0),0,min(1,(t-4.0)*2))',drawtext=fontfile=$FS:text='1 500 \$':fontsize=44:fontcolor=$GOLD:x=1780-tw:y=470:enable='gte(t,4.0)':alpha='if(lt(t,4.0),0,min(1,(t-4.0)*2))',drawbox=x=140:y=550:w=1640:h=2:color=$GOLD@0.4:t=fill:enable='gte(t,6.0)',drawtext=fontfile=$FN:text='Redesign cuisine, salle de bain ou sous-sol':fontsize=30:fontcolor=$CREAM:x=140:y=580:enable='gte(t,6.0)':alpha='if(lt(t,6.0),0,min(1,(t-6.0)*2))',drawtext=fontfile=$FS:text='1 500 \$':fontsize=44:fontcolor=$GOLD:x=1780-tw:y=570:enable='gte(t,6.0)':alpha='if(lt(t,6.0),0,min(1,(t-6.0)*2))',drawbox=x=140:y=650:w=1640:h=2:color=$GOLD@0.4:t=fill:enable='gte(t,8.0)',drawtext=fontfile=$FN:text='Carte-cadeau MLP':fontsize=30:fontcolor=$CREAM:x=140:y=680:enable='gte(t,8.0)':alpha='if(lt(t,8.0),0,min(1,(t-8.0)*2))',drawtext=fontfile=$FS:text='1 000 \$':fontsize=44:fontcolor=$GOLD:x=1780-tw:y=670:enable='gte(t,8.0)':alpha='if(lt(t,8.0),0,min(1,(t-8.0)*2))',drawbox=x=140:y=750:w=1640:h=2:color=$GOLD@0.4:t=fill:enable='gte(t,10.0)',drawtext=fontfile=$FN:text='Carte-cadeau MLP':fontsize=30:fontcolor=$CREAM:x=140:y=780:enable='gte(t,10.0)':alpha='if(lt(t,10.0),0,min(1,(t-10.0)*2))',drawtext=fontfile=$FS:text='2 000 \$':fontsize=44:fontcolor=$GOLD:x=1780-tw:y=770:enable='gte(t,10.0)':alpha='if(lt(t,10.0),0,min(1,(t-10.0)*2))',drawbox=x=140:y=850:w=1640:h=2:color=$GOLD@0.4:t=fill:enable='gte(t,10.5)',fade=t=in:st=0:d=0.5,fade=t=out:st=13.5:d=0.5" \
  "${ENC[@]}" -an "$TMP/s20.mp4"

echo "==> 21 · CTA + QR (6s)"
QR_PNG="$ROOT/public/qr/qr-diagnostic.png"
if [ ! -f "$QR_PNG" ]; then
  mkdir -p "$ROOT/public/qr"
  curl -sS -o "$QR_PNG" "https://api.qrserver.com/v1/create-qr-code/?size=800x800&margin=2&data=https%3A%2F%2Fmlprenodesign.ca%2Fdiagnostic"
fi
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=$NAVY:s=1920x1080:d=6:r=30" \
  -i "$QR_PNG" \
  -filter_complex "[1:v]scale=480:480[qr];[0:v]drawtext=fontfile=$FN:text='INSCRIVEZ-VOUS AU TIRAGE':fontsize=24:fontcolor=$GOLD:x=140:y=380,drawtext=fontfile=$FS:text='Scannez':fontsize=80:fontcolor=$CREAM:x=140:y=430,drawtext=fontfile=$FS:text='pour participer.':fontsize=80:fontcolor=$GOLD:x=140:y=540,drawtext=fontfile=$FN:text='30 secondes pour s inscrire · Tirage au sort.':fontsize=28:fontcolor=$INK_SOFT:x=140:y=680,drawtext=fontfile=$FM:text='mlprenodesign.ca/diagnostic':fontsize=24:fontcolor=$INK_SOFT:x=140:y=730,drawbox=x=1200:y=270:w=540:h=540:color=$CREAM@1:t=fill[bg];[bg][qr]overlay=1230:300,fade=t=in:st=0:d=0.5,fade=t=out:st=5.5:d=0.5" \
  "${ENC[@]}" -an "$TMP/s21.mp4"

echo "==> 22 · Closeout (4s)"
ffmpeg -y -hide_banner -loglevel error \
  -f lavfi -i "color=c=$NAVY:s=1920x1080:d=4:r=30" \
  -vf "drawbox=x=860:y=340:w=200:h=200:color=$GOLD@1:t=fill,drawtext=fontfile=$FS:text=M:fontsize=140:fontcolor=$WARM:x=(w-text_w)/2:y=380,drawtext=fontfile=$FN:text='VOYEZ PLUS LOIN AVEC':fontsize=20:fontcolor=$GOLD:x=(w-text_w)/2:y=600,drawtext=fontfile=$FS:text='MLP Reno & Design':fontsize=68:fontcolor=$CREAM:x=(w-text_w)/2:y=640,drawtext=fontfile=$FM:text='(450) 500-8936  ·  mlprenodesign.ca':fontsize=22:fontcolor=$INK_SOFT:x=(w-text_w)/2:y=800,fade=t=in:st=0:d=0.5,fade=t=out:st=3.5:d=0.5" \
  "${ENC[@]}" -an "$TMP/s22.mp4"

# -------------- CONCAT 22 scenes ------------------------------------------

echo "==> Concatenating 22 scenes"
> "$TMP/list.txt"
for k in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22; do
  echo "file 's$k.mp4'" >> "$TMP/list.txt"
done
ffmpeg -y -hide_banner -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -c copy "$TMP/visual.mp4"

# -------------- MIX MUSIC -------------------------------------------------

if [ -f "$MUSIC" ]; then
  echo "==> Mixing music (110s · fade-in 1.5s · fade-out 2.5s)"
  ffmpeg -y -hide_banner -loglevel error \
    -i "$TMP/visual.mp4" \
    -i "$MUSIC" \
    -filter_complex "[1:a]aformat=sample_fmts=fltp:channel_layouts=stereo,aresample=44100,atrim=0:110,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1.5,afade=t=out:st=107.5:d=2.5,volume=0.7[a]" \
    -map 0:v -map "[a]" \
    -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest \
    "$OUT"
else
  echo "==> No music file — exporting silent"
  ffmpeg -y -hide_banner -loglevel error \
    -i "$TMP/visual.mp4" \
    -f lavfi -t 110 -i "anullsrc=channel_layout=stereo:sample_rate=44100" \
    -map 0:v -map 1:a \
    -c:v copy -c:a aac -b:a 128k -movflags +faststart -shortest \
    "$OUT"
fi

echo ""
echo "✓ Output: $OUT"
ls -lh "$OUT"
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT"
