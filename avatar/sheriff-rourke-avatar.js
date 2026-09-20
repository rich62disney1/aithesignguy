(function () {
  const DEFAULT_ASSETS = {
    rest: 'assets/rourke-real-smile-rest-transparent-v2.webp',
    ah: 'assets/rourke-real-smile-ah-transparent-v2.webp',
    oo: 'assets/rourke-real-smile-oo-transparent-v2.webp',
    ee: 'assets/rourke-real-smile-ee-transparent-v2.webp',
    mbp: 'assets/rourke-real-smile-mbp-transparent-v2.webp',
    fv: 'assets/rourke-real-smile-fv-transparent-v2.webp',
    th: 'assets/rourke-real-smile-th-transparent-v2.webp',
    l: 'assets/rourke-real-smile-l-transparent-v2.webp',
    blink: 'assets/rourke-real-smile-blink-transparent-v2.webp'
(function () {
  const DEFAULT_ASSETS = {
    rest: 'rourke-real-smile-rest-transparent-v2.webp',
    ah: 'rourke-real-smile-ah-transparent-v2.webp',
    oo: 'rourke-real-smile-oo-transparent-v2.webp',
    ee: 'rourke-real-smile-ee-transparent-v2.webp',
    mbp: 'rourke-real-smile-mbp-transparent-v2.webp',
    fv: 'rourke-real-smile-fv-transparent-v2.webp',
    th: 'rourke-real-smile-th-transparent-v2.webp',
    l: 'rourke-real-smile-l-transparent-v2.webp',
    blink: 'rourke-real-smile-blink-transparent-v2.webp'
  };

  class SheriffRourkeAvatar {
    constructor(root, assets = DEFAULT_ASSETS) {
      this.root = root;
      this.assets = assets;
      this.layers = {};
      this.frameRequest = 0;
      this.previewTimer = 0;
      this.blinkTimer = 0;
      this.lastShape = 'rest';
      this.lastSwap = 0;
      this.attached = false;
      this.audioContext = null;
      this.analyser = null;
      this.samples = null;
      this.render();
      this.scheduleBlink();
    }

    render() {
      this.root.textContent = '';
      const base = this.makeImage(this.assets.rest, 'sr-avatar__base');
      this.root.append(base);

      ['ah', 'oo', 'ee', 'mbp', 'fv', 'th', 'l'].forEach((shape) => {
        const layer = this.makeImage(this.assets[shape], 'sr-avatar__mouth');
        layer.dataset.shape = shape;
        this.layers[shape] = layer;
        this.root.append(layer);
      });

      this.blinkLayer = this.makeImage(this.assets.blink, 'sr-avatar__blink');
      this.root.append(this.blinkLayer);
    }

    makeImage(src, className) {
      const image = new Image();
      image.src = src;
      image.alt = '';
      image.decoding = 'async';
      image.className = className;
      return image;
    }

    show(shape) {
      if (shape === this.lastShape) return;
      Object.entries(this.layers).forEach(([name, layer]) => {
        layer.classList.toggle('is-active', name === shape);
      });
      this.lastShape = shape;
    }

    scheduleBlink() {
      clearTimeout(this.blinkTimer);
      this.blinkTimer = window.setTimeout(() => {
        this.blinkLayer.classList.add('is-active');
        window.setTimeout(() => this.blinkLayer.classList.remove('is-active'), 115);
        this.scheduleBlink();
      }, 2600 + Math.random() * 3400);
    }

    // NOTE (adapted from the original handoff): the site reuses ONE
    // persistent <audio> element for the entire conversation (a Safari/iOS
    // autoplay-policy fix - see widget.js), instead of creating a fresh
    // Audio object per reply. That changes two things here versus the
    // original design:
    //   1. attachAudio() must only ever run ONCE for that element's whole
    //      lifetime - a browser only allows a single
    //      createMediaElementSource() call per <audio> element, ever.
    //      The `attached` guard below enforces that.
    //   2. The 'playing'/'ended'/'pause' listeners must fire on EVERY
    //      reply, not just the first - so they're added without
    //      `{ once: true }`, and stop() no longer closes the AudioContext
    //      (it stays open and gets reused turn after turn).
    attachAudio(audio) {
      if (this.attached) return;
      this.attached = true;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        audio.addEventListener('playing', () => this.preview(Number.MAX_SAFE_INTEGER));
        audio.addEventListener('ended', () => this.stop());
        return;
      }

      this.audioContext = new AudioContextClass();
      this.audioContext.resume().catch(() => {});
      const source = this.audioContext.createMediaElementSource(audio);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.58;
      this.samples = new Float32Array(this.analyser.fftSize);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      audio.addEventListener('playing', () => this.startAudioAnimation());
      audio.addEventListener('ended', () => this.stop());
      audio.addEventListener('pause', () => {
        if (!audio.ended) this.stop();
      });
    }

    startAudioAnimation() {
      this.root.classList.add('is-speaking');
      const tick = (time) => {
        this.analyser.getFloatTimeDomainData(this.samples);
        let sum = 0;
        for (let index = 0; index < this.samples.length; index += 1) {
          sum += this.samples[index] * this.samples[index];
        }
        const rms = Math.sqrt(sum / this.samples.length);

        if (time - this.lastSwap > 72) {
          this.show(this.shapeForLevel(rms, time));
          this.lastSwap = time;
        }
        this.frameRequest = requestAnimationFrame(tick);
      };
      this.frameRequest = requestAnimationFrame(tick);
    }

    shapeForLevel(rms, time) {
      if (rms < 0.012) return 'rest';
      const sequence = ['mbp', 'ee', 'oo', 'l', 'ah', 'fv', 'ee', 'th'];
      const phase = Math.floor(time / 82) % sequence.length;
      if (rms > 0.115) return phase % 2 ? 'ah' : 'ee';
      if (rms < 0.03) return phase % 3 ? 'oo' : 'mbp';
      return sequence[phase];
    }

    preview(duration = 7000) {
      this.stop();
      this.root.classList.add('is-speaking');
      const sequence = ['mbp', 'ee', 'oo', 'l', 'ah', 'fv', 'ee', 'th', 'oo', 'ah', 'rest'];
      let index = 0;
      const advance = () => {
        this.show(sequence[index % sequence.length]);
        index += 1;
        this.previewTimer = window.setTimeout(advance, 90 + Math.random() * 55);
      };
      advance();
      window.setTimeout(() => this.stop(), duration);
    }

    stop() {
      cancelAnimationFrame(this.frameRequest);
      clearTimeout(this.previewTimer);
      this.frameRequest = 0;
      this.previewTimer = 0;
      this.root.classList.remove('is-speaking');
      this.show('rest');
      // Intentionally NOT closing audioContext here - it's attached once
      // to the one persistent <audio> element for the whole conversation
      // and needs to stay alive to animate every future reply, not just
      // the first one.
    }
  }

  window.SheriffRourkeAvatar = SheriffRourkeAvatar;
})();

  class SheriffRourkeAvatar {
    constructor(root, assets = DEFAULT_ASSETS) {
      this.root = root;
      this.assets = assets;
      this.layers = {};
      this.frameRequest = 0;
      this.previewTimer = 0;
      this.blinkTimer = 0;
      this.lastShape = 'rest';
      this.lastSwap = 0;
      this.audioContext = null;
      this.analyser = null;
      this.samples = null;
      this.render();
      this.scheduleBlink();
    }

    render() {
      this.root.textContent = '';
      const base = this.makeImage(this.assets.rest, 'sr-avatar__base');
      this.root.append(base);

      ['ah', 'oo', 'ee', 'mbp', 'fv', 'th', 'l'].forEach((shape) => {
        const layer = this.makeImage(this.assets[shape], 'sr-avatar__mouth');
        layer.dataset.shape = shape;
        this.layers[shape] = layer;
        this.root.append(layer);
      });

      this.blinkLayer = this.makeImage(this.assets.blink, 'sr-avatar__blink');
      this.root.append(this.blinkLayer);
    }

    makeImage(src, className) {
      const image = new Image();
      image.src = src;
      image.alt = '';
      image.decoding = 'async';
      image.className = className;
      return image;
    }

    show(shape) {
      if (shape === this.lastShape) return;
      Object.entries(this.layers).forEach(([name, layer]) => {
        layer.classList.toggle('is-active', name === shape);
      });
      this.lastShape = shape;
    }

    scheduleBlink() {
      clearTimeout(this.blinkTimer);
      this.blinkTimer = window.setTimeout(() => {
        this.blinkLayer.classList.add('is-active');
        window.setTimeout(() => this.blinkLayer.classList.remove('is-active'), 115);
        this.scheduleBlink();
      }, 2600 + Math.random() * 3400);
    }

    attachAudio(audio) {
      this.stop();
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        audio.addEventListener('playing', () => this.preview(Number.MAX_SAFE_INTEGER), { once: true });
        audio.addEventListener('ended', () => this.stop(), { once: true });
        return;
      }

      this.audioContext = new AudioContextClass();
      const source = this.audioContext.createMediaElementSource(audio);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.58;
      this.samples = new Float32Array(this.analyser.fftSize);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      audio.addEventListener('playing', () => this.startAudioAnimation(), { once: true });
      audio.addEventListener('ended', () => this.stop(), { once: true });
      audio.addEventListener('pause', () => {
        if (!audio.ended) this.stop();
      }, { once: true });
    }

    startAudioAnimation() {
      this.root.classList.add('is-speaking');
      const tick = (time) => {
        this.analyser.getFloatTimeDomainData(this.samples);
        let sum = 0;
        for (let index = 0; index < this.samples.length; index += 1) {
          sum += this.samples[index] * this.samples[index];
        }
        const rms = Math.sqrt(sum / this.samples.length);

        if (time - this.lastSwap > 72) {
          this.show(this.shapeForLevel(rms, time));
          this.lastSwap = time;
        }
        this.frameRequest = requestAnimationFrame(tick);
      };
      this.frameRequest = requestAnimationFrame(tick);
    }

    shapeForLevel(rms, time) {
      if (rms < 0.012) return 'rest';
      const sequence = ['mbp', 'ee', 'oo', 'l', 'ah', 'fv', 'ee', 'th'];
      const phase = Math.floor(time / 82) % sequence.length;
      if (rms > 0.115) return phase % 2 ? 'ah' : 'ee';
      if (rms < 0.03) return phase % 3 ? 'oo' : 'mbp';
      return sequence[phase];
    }

    preview(duration = 7000) {
      this.stop();
      this.root.classList.add('is-speaking');
      const sequence = ['mbp', 'ee', 'oo', 'l', 'ah', 'fv', 'ee', 'th', 'oo', 'ah', 'rest'];
      let index = 0;
      const advance = () => {
        this.show(sequence[index % sequence.length]);
        index += 1;
        this.previewTimer = window.setTimeout(advance, 90 + Math.random() * 55);
      };
      advance();
      window.setTimeout(() => this.stop(), duration);
    }

    stop() {
      cancelAnimationFrame(this.frameRequest);
      clearTimeout(this.previewTimer);
      this.frameRequest = 0;
      this.previewTimer = 0;
      this.root.classList.remove('is-speaking');
      this.show('rest');
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
      this.audioContext = null;
    }
  }

  window.SheriffRourkeAvatar = SheriffRourkeAvatar;
})();
