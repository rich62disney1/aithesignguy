# Sheriff Rourke Talking Avatar — Integration Handoff

## Ready to integrate

Use only the final `*-transparent-v2.webp` assets. They have true alpha transparency, cleaned edges, and a five-pixel feather. The local preview uses `calico-wood-paneled-background.jpg` and is verified working.

## Files to copy into the concierge project

- `assets/rourke-real-smile-*-transparent-v2.webp` — nine final visual frames
- `sheriff-rourke-avatar.css` — transparent layered avatar styling
- `sheriff-rourke-avatar.js` — audio-reactive mouth selection, blink, and subtle movement

Do not copy the older non-v2 frames.

## Widget integration

1. Load `sheriff-rourke-avatar.css` and `sheriff-rourke-avatar.js` from the concierge service.
2. Replace the current static Sheriff Rourke image with:

```html
<div id="cw-sheriff-rourke" class="sr-avatar" aria-label="Sheriff Rourke"></div>
```

3. Create the avatar once after the widget DOM exists:

```js
const sheriffRourke = new SheriffRourkeAvatar(
  document.querySelector('#cw-sheriff-rourke'),
  {
    rest: `${BASE}/assets/rourke-real-smile-rest-transparent-v2.webp`,
    ah: `${BASE}/assets/rourke-real-smile-ah-transparent-v2.webp`,
    oo: `${BASE}/assets/rourke-real-smile-oo-transparent-v2.webp`,
    ee: `${BASE}/assets/rourke-real-smile-ee-transparent-v2.webp`,
    mbp: `${BASE}/assets/rourke-real-smile-mbp-transparent-v2.webp`,
    fv: `${BASE}/assets/rourke-real-smile-fv-transparent-v2.webp`,
    th: `${BASE}/assets/rourke-real-smile-th-transparent-v2.webp`,
    l: `${BASE}/assets/rourke-real-smile-l-transparent-v2.webp`,
    blink: `${BASE}/assets/rourke-real-smile-blink-transparent-v2.webp`
  }
);
```

4. In the existing ElevenLabs `speak()` function, immediately after creating the `Audio` object and before `audio.play()`:

```js
sheriffRourke.attachAudio(audio);
```

## Verification gate

Verify the deployed widget on the welcome page with real ElevenLabs output. Confirm mouth movement begins when audio begins, returns to rest when audio ends, blinking continues naturally, and no white edge appears against the wood background.
