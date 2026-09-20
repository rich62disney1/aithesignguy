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
