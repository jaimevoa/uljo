# tools

**extract-frames.swift** — dumps every frame of a clip as JPEG with
AVFoundation (no ffmpeg on this machine). Build once, then run:

```bash
swiftc -O tools/extract-frames.swift -o /tmp/extract
/tmp/extract assets/video/ec-kiosk-anim.mp4 /tmp/frames 1280
```

Then recompress to WebP at the display width (the case page shows the frame
1240 wide) — PIL, `quality=75, method=6` — into `assets/frames/<name>/f000.webp…`
and point the section at it:

```html
<section class="scrub wide" data-scrub data-frames="assets/frames/kiosk/f{i}.webp" data-frame-count="124">
```
