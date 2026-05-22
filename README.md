# Asphalt Neon 🏎️⚡
> **3D Next-Gen Web Arcade Racing Game** powered by Three.js and Web Audio API. Playable on desktop and mobile, zero asset downloads required.

[![HTML5 Canvas](https://img.shields.io/badge/Render-WebGL--Three.js-00f3ff?style=for-the-badge&logo=opengl)](https://threejs.org/)
[![Web Audio API](https://img.shields.io/badge/Audio-Procedural--Synth-ff007f?style=for-the-badge&logo=webauthn)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Vite](https://img.shields.io/badge/Tool-Vite-9d00ff?style=for-the-badge&logo=vite)](https://vitejs.dev/)

---

## 🌟 Key Features

- **High-Performance 3D Graphics**: Designed using **Three.js**. Low-profile chassis supercars, glowing billboards, canyons, and skyscraper nightlines procedurally built on WebGL. Runs at a silky-smooth **60 FPS** on both desktop and mobile devices.
- **Arcade Drifting Mechanics**: Initiate a tight slide at high speed to scrub speed, rack up drift points, and charge your nitro booster.
- **Interactive Web Audio Synthesis**: Zero massive sound-asset downloads! Real-time engine RPM tones, tire friction squeals, jet nitro sweeps, and sub-thud collision crashes are synthesized procedurally in the browser.
- **Sleek Cyberpunk UI**: Glowing glassmorphism overlays (`backdrop-filter: blur(15px)`), pulsing speedometer SVG arcs, and dynamic rankings standings dashboard.
- **AI Competitors**: Challenge 3 high-intensity computer opponent racing profiles snaps on lane splines.
- **On-Screen Mobile HUD**: Responsive touch control panels for mobile pilots with automatic acceleration assistance.

---

## 🕹️ Control Interface

### Keyboard (Desktop)
- **`W` / `▲`**: Accelerate
- **`S` / `▼`**: Brake / Reverse
- **`A` / `◀`**: Steer Left
- **`D` / `▶`**: Steer Right
- **`SHIFT`**: Hold in turns to Drift
- **`SPACEBAR`**: Release Nitro Boost
- **`R`**: Reset back to track centerline
- **`ESC`**: Pause Simulation

### Tactile Touch (Mobile)
- **Left/Right Buttons**: Steer
- **Right "DRIFT" Button**: Activate drift and slide slowdowns
- **Right "NITRO" Button**: Release compressed booster
- **Touch HUD**: Auto-displayed on mobile layouts, fully responsive

---

## 🛠️ Installation & Setup

Set up and play locally in 3 simple steps:

1. **Clone the Repository** and navigate to the project directory:
   ```bash
   cd asphalt-racing-game
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Launch Local Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to the output URL (usually `http://localhost:5173`).

---

## 🚀 Deployment (Access Everywhere)

Because `Asphalt Neon` is built as a static client-side bundle, it can be deployed for **free** on any modern hosting provider:

### Vercel / Netlify / Vercel
Simply import the repository directly, set the build command to `npm run build` and output folder to `dist/`.

### GitHub Pages
1. Build the production files:
   ```bash
   npm run build
   ```
2. Deploy the `dist/` directory using standard GitHub Actions or package libraries:
   ```bash
   npx gh-pages -d dist
   ```

### Firebase Hosting
1. Initialize Firebase inside the directory:
   ```bash
   npx -y firebase-tools@latest init hosting
   ```
   Specify `dist` as your public directory.
2. Deploy:
   ```bash
   npx -y firebase-tools@latest deploy
   ```

---

## 📄 License
This project is open-source and licensed under the [MIT License](LICENSE).
