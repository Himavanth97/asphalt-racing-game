# Contributing to Asphalt Neon

We welcome contributions to help make this open-source 3D WebGL racing simulator even better! Please adhere to the following guidelines.

---

## 🛠️ Code Architecture Guidelines

- **Vanilla ES6 JavaScript**: Keep the codebase modular and dependency-light. Avoid importing heavy utility libraries or frameworks.
- **Three.js Geometries**: All assets (cars, buildings, roads, boosters) should be created procedurally using Three.js primitive geometries or parametric extrusions. Do not commit heavy `.gltf` or `.obj` assets unless absolutely necessary, to ensure fast load times.
- **Web Audio API**: Any new sound effects must be added via procedural audio node synthesis inside `src/game/AudioSystem.js`. Avoid committing static `.wav` or `.mp3` sound assets.
- **Responsive Aesthetics**: Style sheets should utilize pure custom Vanilla CSS. Ensure glassmorphic menus stay fully responsive and scale perfectly on both mobile screens and huge ultrawide displays.

---

## 🔄 Development Flow

1. **Fork the Repository** and clone it locally.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/cool-new-mechanic
   ```
3. **Make Modulations and Edits**:
   - Write clean, commented code.
   - Preserves all standard comments and docstrings.
4. **Verify Build Output**:
   Make sure the project compiles successfully with zero warnings:
   ```bash
   npm run build
   ```
5. **Submit a Pull Request** with a detailed description of your changes and screenshots of visual modulations.

---

## 🐞 Debugging Tips

- **Perspective Cameras**: Use the Settings Panel inside the game to switch between Chase, Cockpit, or Far follow views when inspecting vehicle snapping behaviors.
- **Graphics Quality Options**: Test on Low details to verify mobile frames per second performance.
- **Reset Keys**: Hit `R` on your keyboard during tests to instantly warp back onto the track if a physics calculation causes the vehicle to exit the racetrack boundaries.
