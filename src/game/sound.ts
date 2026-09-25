/**
 * A tiny WebAudio synth that recreates the arcade sounds: the marching bass
 * beat, pew shots, explosions, the UFO warble and the extra-life chime.
 * No audio assets, and nothing is created until the first user gesture.
 */

type Osc = OscillatorNode

export class Sound {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private ufoOscs: Osc[] = []
  private ufoGain: GainNode | null = null
  private muted = false

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.5
      this.master.connect(this.ctx.destination)
      this.noise = this.makeNoise(this.ctx)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02)
    }
    if (muted) this.ufoStop()
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 1.2)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  private tone(
    type: OscillatorType,
    from: number,
    to: number,
    duration: number,
    volume: number,
    delay = 0,
  ): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return
    const t = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + duration)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(volume, t + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain).connect(master)
    osc.start(t)
    osc.stop(t + duration + 0.02)
  }

  private burst(duration: number, volume: number, cutoff: number, sweepTo = cutoff): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || !this.noise) return
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(cutoff, t)
    filter.frequency.exponentialRampToValueAtTime(Math.max(sweepTo, 40), t + duration)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    src.connect(filter).connect(gain).connect(master)
    src.start(t)
    src.stop(t + duration)
  }

  shoot(): void {
    this.tone('square', 1100, 260, 0.16, 0.12)
    this.burst(0.08, 0.05, 3000, 600)
  }

  alienDie(): void {
    this.burst(0.22, 0.22, 2200, 200)
    this.tone('square', 420, 90, 0.2, 0.08)
  }

  playerDie(): void {
    this.burst(0.7, 0.3, 1800, 80)
    this.tone('sawtooth', 300, 40, 0.7, 0.12)
  }

  shieldHit(): void {
    this.burst(0.09, 0.07, 1200, 300)
  }

  /** `step` is 0..3 and picks one of the four descending bass notes. */
  march(step: number): void {
    const notes = [98, 92, 87, 82]
    this.tone('square', notes[step % 4], notes[step % 4] * 0.75, 0.12, 0.16)
  }

  extraLife(): void {
    const notes = [523, 659, 784, 1047]
    notes.forEach((n, i) => this.tone('square', n, n, 0.12, 0.12, i * 0.08))
  }

  levelStart(): void {
    const notes = [392, 523, 659]
    notes.forEach((n, i) => this.tone('square', n, n, 0.16, 0.1, i * 0.1))
  }

  gameOver(): void {
    const notes = [440, 392, 330, 262]
    notes.forEach((n, i) => this.tone('triangle', n, n * 0.9, 0.3, 0.14, i * 0.18))
  }

  ufoStart(): void {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || this.ufoOscs.length) return
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.gain.setTargetAtTime(0.07, ctx.currentTime, 0.05)
    gain.connect(master)
    const oscs: Osc[] = []
    for (const detune of [0, 8, -6]) {
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = 440
      osc.detune.value = detune
      const lfo = ctx.createOscillator()
      lfo.type = 'square'
      lfo.frequency.value = 18
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 14
      lfo.connect(lfoGain).connect(osc.frequency)
      lfo.start()
      osc.connect(gain)
      osc.start()
      oscs.push(osc, lfo)
    }
    this.ufoOscs = oscs
    this.ufoGain = gain
  }

  ufoStop(): void {
    if (!this.ctx) return
    const stopAt = this.ctx.currentTime
    if (this.ufoGain) this.ufoGain.gain.setTargetAtTime(0, stopAt, 0.02)
    for (const osc of this.ufoOscs) {
      try {
        osc.stop(stopAt + 0.15)
      } catch {
        /* already stopped */
      }
    }
    this.ufoOscs = []
    this.ufoGain = null
  }
}
