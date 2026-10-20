# Crop mismatch cause

**Proven cause:** Cropping against an EXIF-oriented display size while
`expo-image-manipulator` operated on the unbaked pixel buffer (and/or
`locationX/locationY` relative to a child Image) produced a source-pixel
rectangle that did not match the on-screen selection.

**Fix:**
1. `bakeExifOrientation` once before measure + crop (shared modal + capture path).
2. Gesture hit-tests use `pageX/pageY − stage.measureInWindow` (stage coords).
3. Image overlay uses `pointerEvents="none"` so the stage owns the touch target.
4. `mapCropRectToSourcePixels` uses natural dims of that same baked buffer.

Fixture PNGs in this folder compare selected contain-fit rectangles to sliced
output bytes for full / center / bottom-right / landscape letterbox cases.
