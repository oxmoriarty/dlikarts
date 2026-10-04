// One decoded buffer shared by all motors, one uninterrupted source per kart.
// Unlike HTML media looping, AudioBufferSourceNode has sample-accurate repeats.
export function seamlessMotorBuffer(context, original) {
  const overlap = Math.min(Math.floor(original.sampleRate * .035), Math.floor(original.length / 8));
  const length = original.length - overlap;
  const buffer = context.createBuffer(original.numberOfChannels, length, original.sampleRate);
  for (let channel = 0; channel < original.numberOfChannels; channel++) {
    const src = original.getChannelData(channel), dst = buffer.getChannelData(channel);
    dst.set(src.subarray(overlap));
    for (let i = 0; i < overlap; i++) {
      const t = i / Math.max(1, overlap - 1);
      dst[length - overlap + i] = src[original.length - overlap + i] * (1 - t) + src[i] * t;
    }
  }
  return buffer;
}

export class GaplessMotor {
  constructor(manager, sound = 'engine', loop = true) {
    this.manager = manager; this.paused = true; this._wanted = false;
    this.sound = sound; this.loop = loop; this.ended = true; this.playCount = 0;
    this._gain = 0; this._fadeToken = 0; this._stopping = false;
    this._volume = 0; this._rate = 1; this.generation = 0;
    this.source = null; this.node = null; this.startedAt = 0;
  }
  get currentTime() { return this.source ? this.manager.context.currentTime - this.startedAt : 0; }
  set currentTime(value) { /* A stopped buffer source always starts at zero. */ }
  get volume() { return this._volume; }
  set volume(value) {
    this._volume = value;
    if (this.node) this.node.gain.setTargetAtTime(value, this.manager.context.currentTime, .035);
  }
  get playbackRate() { return this._rate; }
  set playbackRate(value) {
    this._rate = value;
    if (this.source) this.source.playbackRate.setTargetAtTime(value, this.manager.context.currentTime, .06);
  }
  async play() {
    if (!this.paused) return;
    this.paused = false; this.ended = false;
    const generation = ++this.generation;
    try {
      const buffer = await this.manager.prepareSound(this.sound);
      if (generation !== this.generation || this.paused) return;
      if (!buffer) { this.paused = true; this._failed = true; return; }
      const context = this.manager.context;
      this.node = context.createGain(); this.node.gain.value = 0;
      this.source = context.createBufferSource(); this.source.buffer = buffer;
      this.source.loop = this.loop; this.source.playbackRate.value = this._rate;
      this.source.connect(this.node); this.node.connect(context.destination);
      const source = this.source, node = this.node;
      source.onended = () => {
        source.disconnect(); node.disconnect();
        if (generation === this.generation) { this.paused = true; this.ended = true; this.source = null; this.node = null; }
      };
      this.startedAt = context.currentTime; this.ended = false; this.playCount++;
      this.source.start(); this.volume = this._volume;
    } catch { this.paused = true; this._failed = true; }
  }
  pause() {
    this.paused = true; ++this.generation;
    const source = this.source, node = this.node, context = this.manager.context;
    if (source && node) {
      node.gain.cancelScheduledValues(context.currentTime);
      node.gain.setTargetAtTime(0, context.currentTime, .008);
      source.stop(context.currentTime + .045);
      source.onended = () => { source.disconnect(); node.disconnect(); };
    }
    this.source = null; this.node = null;
  }
}
