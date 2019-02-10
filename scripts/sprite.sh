# Given crossproduct's tracker images, make sprite pages.

# First, copy the missing images

for a in 1 2; do
  for b in 1 2 3; do
    for c in 00 01; do
      cp ${a}0$c.png $a$b$c.png
    done
  done
done
cp 3000.png 4600.png
cp 3001.png 4601.png

# Now build up the sprites

montage -background '#0070ec' -geometry +0+0 -border 0 ??01.png disabled.png
montage -background '#0070ec' -geometry +0+0 -border 0 ??11.png enabled.png
