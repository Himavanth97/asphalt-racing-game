/**
 * Procedural Audio System for Asphalt Neon
 * Synthesizes engine pitches, drift squeals, nitro blasts, crashes, and a looping synthwave music track.
 * Uses Web Audio API. Requires user interaction to start.
 */
export default class AudioSystem {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.masterVolume = 0.8;
    this.musicVolume = 0.6;

    // Node references
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    // Engine Nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineGain = null;

    // Drift Nodes
    this.driftFilter = null;
    this.driftGain = null;

    // Sequencer properties
    this.musicSeqInterval = null;
    this.seqStep = 0;
    
    // Synthwave Track Chords (A Minor, F Major, C Major, G Major)
    this.chords = [
      [110.00, 130.81, 164.81], // Am (A2, C3, E3)
      [87.31,  130.81, 174.61], // F  (F2, C3, F3)
      [130.81, 164.81, 196.00], // C  (C3, E3, G3)
      [98.00,  146.83, 196.00]  // G  (G2, D3, G3)
    ];

    // Bass notes corresponding to chords
    this.bassline = [55.00, 43.65, 65.41, 49.00]; // A1, F1, C2, G1
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Main Gain Nodes
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Create sounds
      this.setupEngine();
      this.setupDrift();
      this.startMusic();

      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported or blocked: ", e);
    }
  }

  // Set Volumes
  setSFXVolume(val) {
    this.masterVolume = val / 100;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.1);
    }
  }

  setMusicVolume(val) {
    this.musicVolume = val / 100;
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.1);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngine() {
    // Synth engine using a Sawtooth and a Triangle oscillator
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(60, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(30, this.ctx.currentTime);

    // Filter to make it less harsh and more rumble-like
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    // Connect engine nodes
    this.engineOsc1.connect(filter);
    this.engineOsc2.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  updateEngine(speedRatio, isNitro) {
    if (!this.initialized || !this.engineOsc1) return;

    // Pitch changes based on speed ratio
    const baseFreq = 50 + speedRatio * 120;
    const modifier = isNitro ? 1.4 : 1.0;

    this.engineOsc1.frequency.setTargetAtTime(baseFreq * modifier, this.ctx.currentTime, 0.05);
    this.engineOsc2.frequency.setTargetAtTime((baseFreq * 0.5) * modifier, this.ctx.currentTime, 0.05);

    // Engine volume swells on nitro or speed
    const engineVol = 0.05 + speedRatio * 0.05 + (isNitro ? 0.08 : 0);
    this.engineGain.gain.setTargetAtTime(engineVol, this.ctx.currentTime, 0.08);
  }

  // Create White Noise Buffer for Drift/Nitro
  createNoiseBuffer() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  setupDrift() {
    // Setup filtered noise for tires squealing
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();
    noise.loop = true;

    this.driftFilter = this.ctx.createBiquadFilter();
    this.driftFilter.type = 'bandpass';
    this.driftFilter.frequency.setValueAtTime(1500, this.ctx.currentTime);
    this.driftFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.driftGain = this.ctx.createGain();
    this.driftGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    noise.connect(this.driftFilter);
    this.driftFilter.connect(this.driftGain);
    this.driftGain.connect(this.sfxGain);

    noise.start();
  }

  updateDrift(driftIntensity) {
    if (!this.initialized || !this.driftGain) return;

    // Squealing intensity controls volume
    const targetVol = driftIntensity * 0.12;
    this.driftGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.05);

    // Slightly slide the squealing frequency based on speed
    const targetFreq = 1200 + driftIntensity * 600;
    this.driftFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
  }

  // Nitro exhaust thrust noise blast
  playNitroBlast(active) {
    if (!this.initialized) return;

    if (active) {
      // Create dedicated nitro generator node
      const nitroSource = this.ctx.createBufferSource();
      nitroSource.buffer = this.createNoiseBuffer();

      const nitroFilter = this.ctx.createBiquadFilter();
      nitroFilter.type = 'lowpass';
      nitroFilter.frequency.setValueAtTime(800, this.ctx.currentTime);

      const nitroGain = this.ctx.createGain();
      nitroGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      nitroSource.connect(nitroFilter);
      nitroFilter.connect(nitroGain);
      nitroGain.connect(this.sfxGain);

      // Boost sweeps down in frequency
      nitroFilter.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 1.5);
      nitroGain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.5);

      nitroSource.start();
      nitroSource.stop(this.ctx.currentTime + 1.5);
    }
  }

  // Collision Impact sound
  playCrash() {
    if (!this.initialized) return;

    // Sub thud
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.4);
    gain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.4);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);

    // Friction scrape noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer();

    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'bandpass';
    nFilter.frequency.setValueAtTime(300, this.ctx.currentTime);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain);

    nGain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.3);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.3);
  }

  // SYNTHWAVE MUSIC SEQUENCER
  startMusic() {
    const tempo = 125; // BPM
    const stepDuration = 60 / tempo / 2; // Eighth notes

    this.musicSeqInterval = setInterval(() => {
      if (this.ctx && this.ctx.state === 'running') {
        this.playSeqStep();
      }
    }, stepDuration * 1000);
  }

  playSeqStep() {
    const chordIndex = Math.floor(this.seqStep / 16) % this.chords.length;
    const subStep = this.seqStep % 16;
    const time = this.ctx.currentTime;

    // 1. Play Bassline (Every step has a driving retro 8th note bass)
    const bassNote = this.bassline[chordIndex];
    // Retro syncopated bass octave pattern
    const octave = (subStep % 2 === 0) ? 1 : 2;
    this.playSynthNote(bassNote * octave, 0.05, 0.08, 'sawtooth', time);

    // 2. Play Retro Chord Pad (Every 8 steps)
    if (subStep % 8 === 0) {
      const chord = this.chords[chordIndex];
      chord.forEach(freq => {
        this.playSynthNote(freq, 0.8, 0.015, 'triangle', time);
      });
    }

    // 3. Play Cyber Arpeggiator Lead (Pattern shifts)
    const arpNotes = this.chords[chordIndex];
    let leadNote = null;

    if (subStep % 4 === 0) {
      leadNote = arpNotes[0] * 4;
    } else if (subStep % 4 === 1) {
      leadNote = arpNotes[1] * 4;
    } else if (subStep % 4 === 2) {
      leadNote = arpNotes[2] * 4;
    } else if (subStep % 4 === 3) {
      leadNote = arpNotes[1] * 4;
    }

    if (leadNote && subStep % 2 === 0) {
      this.playSynthNote(leadNote, 0.12, 0.018, 'sine', time);
    }

    // 4. Procedural Synth Hi-Hat (White noise, steps 2, 6, 10, 14)
    if (subStep % 4 === 2) {
      this.playHiHat(time);
    }

    this.seqStep++;
  }

  playSynthNote(freq, duration, volume, type, time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    // Bandpass filter on notes to soften synthwave tones
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(type === 'sine' ? 2000 : 800, time);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  playHiHat(time) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.createNoiseBuffer();

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.015, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    source.start(time);
    source.stop(time + 0.06);
  }

  stop() {
    if (this.musicSeqInterval) {
      clearInterval(this.musicSeqInterval);
    }
    if (this.ctx) {
      this.ctx.close();
    }
  }
}
