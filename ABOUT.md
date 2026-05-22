# Technical Architecture - Asphalt Neon

This document outlines the technical systems, math, and engine architectures behind the **Asphalt Neon** 3D arcade racing simulator.

---

## 🔊 Procedural Audio Synthesis (Web Audio API)

Instead of relying on large MP3/WAV static downloads, `AudioSystem.js` synthesizes all sound effects in real-time. This eliminates load latency and ensures audio is perfectly synced to physical parameters.

```
                  +---> Sawtooth Osc (Base RPM) --+
                  |                               |
[Car Speed] ----->+---> Triangle Osc (Sub RPM) ---+---> Lowpass Filter (220Hz) ---> Gain Nodes (Throttling) ---> SFX Destination
                  |                               |
                  +---> LFO / Modulation --------+
```

### 1. Retro Engine Hum
Synthesized using a Sawtooth oscillator (rich in high harmonics) layered with a Sub-Triangle oscillator:
- **Base Pitch**: Snaps between $50\text{ Hz}$ (idle) and $170\text{ Hz}$ (redline), modulated directly by speed ratio:
  $$f_{\text{engine}} = f_{\text{idle}} + \left(\frac{v}{v_{\text{max}}}\right) \times 120\text{ Hz}$$
- **Low-pass Filter**: Swept dynamically with a cutoff around $220\text{ Hz}$ to isolate deep base tones and give a guttural V8 engine feel.

### 2. Tire Drift Squeals
Generated via procedural white noise fed into a narrow **Bandpass Filter**:
- **Cutoff Sweep**: Filter frequency fluctuates between $1200\text{ Hz}$ and $1800\text{ Hz}$ based on lateral slip:
  $$f_{\text{squeal}} = 1200\text{ Hz} + \text{driftIntensity} \times 600\text{ Hz}$$
- **Drift Volume**: Gain rises from $0.0$ to $0.12$ relative to slip speed, mimicking friction heating.

### 3. Loop Synthwave Sequencer
Includes a self-contained sequencer driving synthesis tracks at $125\text{ BPM}$:
- **Bassline**: Driving 8th notes syncopating between root octaves using a sawtooth synth.
- **Chord Pads**: Employs harmonic standard major/minor triads (A minor, F major, C major, G major) using triangle oscillators.
- **Hi-hats**: High-pass filtered noise bursts on the off-beat steps.

---

## 🏎️ Arcade Car Physics & Drifting Math

The physics engine is custom-built to support drift mechanics:

### 1. Velocity & Heading Vectors
The car has a forward speed $s$ and Y-axis rotation heading $\theta$.
- **Normal Drive**: Heading angle determines movement direction:
  $$\mathbf{v} = \begin{bmatrix} s \sin(\theta) \\ 0 \\ s \cos(\theta) \end{bmatrix}$$
- **Drift Slip Angle**: During drift, a lateral slip angle $\theta_{\text{drift}}$ is calculated:
  $$\mathbf{v} = \begin{bmatrix} s \sin(\theta + \theta_{\text{drift}}) \\ v_y \\ s \cos(\theta + \theta_{\text{drift}}) \end{bmatrix}$$
- When input drift is active, steering turn rate is boosted by $1.6\times$ (oversteer), while passive drag is increased to scrub speed, making drifts feel extremely punchy.
- Every second spent drifting increments the player's nitro container by $+12\%$.

### 2. Airborne Gravity & Snap Snappings
When launching off ramps, the car detaches from track floor:
- Vertical velocity $v_y$ decays under simulated gravity:
  $$v_y(t + dt) = v_y(t) - g \cdot dt$$
  $$y(t + dt) = y(t) + v_y(t) \cdot dt$$
- Snaps back cleanly when $y \le y_{\text{track}}$.

---

## 📹 Follow Camera Spring Math

Camera updates use follow-spring equations to mimic cinematic inertia:

1. **Spring Interpolation (Lerping)**:
   The camera position $\mathbf{p}_{\text{cam}}$ and look-at target $\mathbf{t}_{\text{cam}}$ smoothly chase target points via linear interpolation (lerp):
   $$\mathbf{p}_{\text{cam}}(t+dt) = \mathbf{p}_{\text{cam}}(t) + \left(\mathbf{p}_{\text{target}} - \mathbf{p}_{\text{cam}}(t)\right) \times 8 \times dt$$
2. **Speed Stretch FOV**:
   Field of view expands dynamically at speed to simulate high-velocity wind drag:
   $$\text{FOV} = 60^{\circ} + \left(\frac{v}{v_{\text{max}}}\right) \times 20^{\circ} + \text{NitroBonus}$$
3. **Drift Rolls**:
   To make drifting feel intense, the camera rolls its Z-axis slightly into the turn depending on the drift direction:
   $$\text{Roll}_z = -\text{driftDirection} \times 0.08\text{ rad}$$
