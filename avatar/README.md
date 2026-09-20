# Sheriff Rourke talking-avatar visual

This package adds realistic speech movement without changing the voice backend. It uses one resting portrait, seven speech shapes, and a blink frame. All final frames have genuine alpha transparency. Only the mouth or eyes swap; the rest of Sheriff Rourke stays steady. The real audio level selects the mouth shape, while natural blinking and very small body motion keep him from looking frozen.

## Files

- `assets/rourke-real-smile-rest-transparent-v2.webp` — real-face friendly resting smile
- `assets/rourke-real-smile-ah-transparent-v2.webp` — smiling open `AH` shape
- `assets/rourke-real-smile-oo-transparent-v2.webp` — smiling rounded `OO` shape
- `assets/rourke-real-smile-ee-transparent-v2.webp` — smiling teeth-visible `EE` shape
- `assets/rourke-real-smile-mbp-transparent-v2.webp` — pressed-lips `M/B/P` shape
- `assets/rourke-real-smile-fv-transparent-v2.webp` — upper-teeth-to-lower-lip `F/V` shape
- `assets/rourke-real-smile-th-transparent-v2.webp` — tongue-visible `TH` shape
- `assets/rourke-real-smile-l-transparent-v2.webp` — tongue-up `L` shape
- `assets/rourke-real-smile-blink-transparent-v2.webp` — natural closed-eyes blink
- `sheriff-rourke-avatar.css` — aligned mouth mask and subtle idle motion
- `sheriff-rourke-avatar.js` — audio analyser and mouth-frame selection
- `index.html` — visual preview

All nine real-face browser assets total under 350 KB.

## Wire it to the existing ElevenLabs audio

Add the CSS and JavaScript, then replace the static Sheriff Rourke image with:

```html
<div id="cw-sheriff-rourke" class="sr-avatar" aria-label="Sheriff Rourke"></div>
```

Create the avatar once:

```js
const sheriffRourke = new SheriffRourkeAvatar(
  document.querySelector('#cw-sheriff-rourke'),
  {
    rest: 'YOUR_ASSET_PATH/rourke-real-smile-rest-transparent-v2.webp',
    ah: 'YOUR_ASSET_PATH/rourke-real-smile-ah-transparent-v2.webp',
    oo: 'YOUR_ASSET_PATH/rourke-real-smile-oo-transparent-v2.webp',
    ee: 'YOUR_ASSET_PATH/rourke-real-smile-ee-transparent-v2.webp',
    mbp: 'YOUR_ASSET_PATH/rourke-real-smile-mbp-transparent-v2.webp',
    fv: 'YOUR_ASSET_PATH/rourke-real-smile-fv-transparent-v2.webp',
    th: 'YOUR_ASSET_PATH/rourke-real-smile-th-transparent-v2.webp',
    l: 'YOUR_ASSET_PATH/rourke-real-smile-l-transparent-v2.webp',
    blink: 'YOUR_ASSET_PATH/rourke-real-smile-blink-transparent-v2.webp'
  }
);
```

In the existing `speak()` function, immediately after creating the `Audio` object and before calling `audio.play()`:

```js
sheriffRourke.attachAudio(audio);
```

This is audio-reactive viseme animation, not phoneme-accurate studio lip sync. It is intentionally lightweight for mobile.

## Image generation

The built-in image-generation tool used Richard's authorized real photograph of his son as the facial-identity reference, then applied the established Sheriff Rourke plaid-shirt presentation. A friendly resting smile was created first. Each speech frame changed only the mouth while preserving the real face, relaxed expression, hair, shirt, pose, crop, and lighting.
