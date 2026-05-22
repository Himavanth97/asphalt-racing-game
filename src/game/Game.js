import * as THREE from 'three';
import Car from './Car';
import AICar from './AICar';
import Track from './Track';
import Input from './Input';
import AudioSystem from './AudioSystem';
import { UI } from './UI';

/**
 * Main Game Controller for Asphalt Neon
 * Orchestrates Three.js rendering pipelines, ambient lighting, follow-camera springs,
 * collision bounding spheres, lap checkpoint tracking, and menu states.
 */
export default class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = new THREE.Clock();

    // Systems
    this.input = null;
    this.audio = null;
    this.ui = null;

    // Entities
    this.track = null;
    this.playerCar = null;
    this.aiCars = [];

    // Game State
    this.state = 'LOADING'; // LOADING, MENU, PLAYING, PAUSED, FINISHED
    this.gameTime = 0;
    this.raceTimerActive = false;
    this.currentLap = 1;
    this.maxLaps = 3;
    
    // Stats for results
    this.peakSpeed = 0;
    
    // Checkpoint tracking
    this.playerLastCheckpoint = 0;
    this.checkpointTimeout = 0;

    // Cam spring properties
    this.camPerspective = 'third'; // third, first, far
    this.cameraTarget = new THREE.Vector3();
    this.cameraPosition = new THREE.Vector3();
    this.shakeIntensity = 0;

    // Standings leaderboard details
    this.pilotStandings = [];
  }

  init() {
    // 1. Initialize Three.js WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Scene with Deep Cyberpunk Purple Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05050a);
    this.scene.fog = new THREE.FogExp2(0x05050a, 0.002);

    // 3. Perspective Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.scene.add(this.camera);

    // 4. Lighting Config
    const ambientLight = new THREE.AmbientLight(0x221144, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f3ff, 1.2);
    dirLight.position.set(50, 150, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    // Secondary pink glow key light
    const keyLight = new THREE.DirectionalLight(0xff007f, 0.8);
    keyLight.position.set(-50, 100, -50);
    this.scene.add(keyLight);

    // 5. Initialize Modular Systems
    this.input = new Input();
    this.audio = new AudioSystem();
    this.ui = new UI(this);

    // Snug resizing listeners
    window.addEventListener('resize', () => this.handleResize());

    // 6. Spawn static menu carousel scenery
    this.setupMenuCarousel();

    // Start rendering frame tick loops
    this.state = 'MENU';
    this.ui.showScreen(this.ui.mainMenu);
    this.clock.getDelta(); // Reset clock
    this.tick();
  }

  setupMenuCarousel() {
    // Spawn rotating car grid for showcase in menu
    const showcaseCarGroup = new THREE.Group();
    showcaseCarGroup.name = 'menuShowcase';

    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.4, 4.2),
      new THREE.MeshStandardMaterial({ color: 0x00f3ff, metalness: 0.9, roughness: 0.1 })
    );
    chassis.position.y = 0.25;

    const underglow = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.05, 3.8),
      new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.8 })
    );
    underglow.position.y = 0.02;

    showcaseCarGroup.add(chassis, underglow);
    showcaseCarGroup.position.set(0, -1, -8);
    this.scene.add(showcaseCarGroup);

    // Neon showroom stage grid under car
    const stage = new THREE.GridHelper(30, 20, 0x00ffff, 0x111122);
    stage.name = 'menuStage';
    stage.position.set(0, -1.2, -8);
    this.scene.add(stage);
  }

  startRace(carDetails, trackType) {
    // 1. Wipe Menu Showcase objects
    const menuObj = this.scene.getObjectByName('menuShowcase');
    if (menuObj) this.scene.remove(menuObj);
    const stageObj = this.scene.getObjectByName('menuStage');
    if (stageObj) this.scene.remove(stageObj);

    // 2. Wipe existing race entities if retrying
    if (this.roadMesh) this.scene.remove(this.roadMesh);
    if (this.track) {
      // Clear procedural items from scene
      this.scene.children = this.scene.children.filter(child => {
        return !(child instanceof THREE.Line) && child.name !== 'scenery';
      });
    }
    if (this.playerCar) this.scene.remove(this.playerCar.mesh);
    this.aiCars.forEach(ai => this.scene.remove(ai.mesh));
    this.aiCars = [];

    // 3. Setup Audio Neural Link
    this.audio.init();
    this.audio.resume();

    // 4. Generate splined 3D Track & Environment scenery
    this.track = new Track(this.scene, trackType);

    // 5. Initialize Snapped Player Car
    this.playerCar = new Car(this.scene, carDetails.color, carDetails.stats);
    this.playerCar.reset(this.track);

    // 6. Spawn 3 Competitor AI Cars
    const aiVehicles = [
      { name: "APEX ROVER", color: 0xff7700, diff: 0.70 },
      { name: "CARBON FURY", color: 0xff00ff, diff: 0.82 },
      { name: "NEO BLAZER", color: 0x9900ff, diff: 0.90 }
    ];

    aiVehicles.forEach((veh, idx) => {
      // Offset starting progress slightly back along track spline
      const startProgress = 1.0 - (0.015 * (idx + 1));
      const ai = new AICar(this.scene, veh.color, startProgress, veh.name, veh.diff);
      ai.reset(this.track);
      this.aiCars.push(ai);
    });

    // Reset race metrics
    this.gameTime = 0;
    this.currentLap = 1;
    this.maxLaps = trackType === 'neon-city' ? 3 : 2;
    this.peakSpeed = 0;
    this.playerCar.driftScore = 0;
    this.playerLastCheckpoint = 0;
    
    // Set up leaderboard listings
    this.pilotStandings = [
      { name: "YOU", vehicle: carDetails.name, isPlayer: true, progress: 0, time: 0, dnf: false },
      ...aiVehicles.map(veh => ({ name: veh.name, vehicle: "AI HYBRID", isPlayer: false, progress: 0, time: 0, dnf: false }))
    ];

    // Trigger Countdown Alert
    this.raceTimerActive = false;
    this.ui.triggerAlert("3...");
    this.ui.updateHUD(0, 1.0, 1, this.maxLaps, 4, 4, 0);
    this.ui.updateTimer(0);
    this.ui.showScreen(this.ui.gameHud);

    let count = 2;
    const interval = setInterval(() => {
      if (this.state !== 'PLAYING' && this.state !== 'PAUSED') {
        clearInterval(interval);
        return;
      }
      if (count > 0) {
        this.ui.triggerAlert(count + "...");
      } else if (count === 0) {
        this.ui.triggerAlert("LAUNCH ENGINES!");
        this.raceTimerActive = true;
        this.clock.getDelta(); // flush clock
      } else {
        clearInterval(interval);
      }
      count--;
    }, 1000);

    this.state = 'PLAYING';
    this.input.checkHUDVisibility();
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.ui.showScreen(this.ui.pauseOverlay);
    if (this.audio.ctx) this.audio.ctx.suspend();
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.ui.showScreen(this.ui.gameHud);
    this.audio.resume();
    this.clock.getDelta(); // flush clock delta
  }

  restartRace() {
    // Quick reload
    const currentCar = this.ui.carsList[this.ui.currentCarIdx];
    this.startRace(currentCar, this.ui.selectedTrack);
  }

  quitToMenu() {
    this.state = 'MENU';
    this.ui.showScreen(this.ui.mainMenu);
    this.audio.stop();
    this.audio = new AudioSystem(); // Re-instantiate next time

    // Wipe scenery, return to showroom grid
    this.scene.children = this.scene.children.filter(child => {
      return child instanceof THREE.Light || child instanceof THREE.PerspectiveCamera;
    });

    this.setupMenuCarousel();
  }

  setQuality(level) {
    if (!this.renderer) return;
    const pixelRatio = level === 'low' ? 0.75 : level === 'medium' ? 1.0 : Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(pixelRatio);
  }

  setCameraPerspective(type) {
    this.camPerspective = type;
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // TICK FRAME LOOP
  tick() {
    requestAnimationFrame(() => this.tick());

    let dt = this.clock.getDelta();
    if (dt > 0.1) dt = 0.1; // Cap to avoid jumps

    const time = this.clock.getElapsedTime();

    if (this.state === 'MENU') {
      this.tickMenuShowcase(time, dt);
    } else if (this.state === 'PLAYING') {
      this.tickGameplay(time, dt);
    }

    // Render pass
    this.renderer.render(this.scene, this.camera);
  }

  tickMenuShowcase(time, dt) {
    // Softly rotate showcase machine
    const showcase = this.scene.getObjectByName('menuShowcase');
    if (showcase) {
      showcase.rotation.y = time * 0.4;
      showcase.position.y = -1 + Math.sin(time * 2) * 0.05; // Float
    }

    // Orbit menu camera around
    this.camera.position.set(
      Math.sin(time * 0.1) * 8,
      1.2,
      Math.cos(time * 0.1) * 8 - 8
    );
    this.camera.lookAt(new THREE.Vector3(0, -0.6, -8));
  }

  tickGameplay(time, dt) {
    if (this.raceTimerActive) {
      this.gameTime += dt;
      this.ui.updateTimer(this.gameTime);
    }

    // 1. Tick Player Physics
    this.playerCar.update(this.input, dt, this.track);
    if (this.playerCar.speed > this.peakSpeed) this.peakSpeed = this.playerCar.speed;

    // Check keyboard key reset trigger
    if (this.input.reset) {
      this.playerCar.reset(this.track);
      this.ui.triggerAlert("RECALIBRATED PILOT DRIVE!");
    }

    // 2. Tick Competitors
    this.aiCars.forEach(ai => {
      ai.update(dt, this.track, this.playerCar.position);
    });

    // 3. Tick Scenery (Spin capsules)
    this.track.tick(time);

    // 4. Interactive Collisions Check
    this.handleCollisions(dt);

    // 5. Track Snap checkpoint laps Snappings
    this.handleLapSplines();

    // 6. Sort Standings Leaderboards
    this.updateRaceStandings();

    // 7. Rig Follow Camera behind Player
    this.handleCameraChase(dt);

    // 8. Feed Audio System Pitches
    const rpmRatio = this.playerCar.speed / this.playerCar.maxSpeed;
    this.audio.updateEngine(rpmRatio, this.playerCar.isNitroActive);
    this.audio.updateDrift(this.playerCar.isDrifting ? 1.0 : 0.0);
  }

  handleCollisions(dt) {
    const playerBoxRadius = 1.8;

    // 1. Check Booster Pads intersections
    this.track.boosters.forEach(booster => {
      const dist = this.playerCar.position.distanceTo(booster.position);
      if (dist < 2.5 && !this.playerCar.isAirborne) {
        // Boost speed instantly
        this.playerCar.speed = this.playerCar.maxSpeed * 1.25;
        this.audio.playNitroBlast(true);
        this.shakeIntensity = 0.5;
        this.ui.triggerAlert("BOOSTER ENGAGED!");
      }
    });

    // 2. Check Nitro Canisters intersections
    for (let i = this.track.nitroCanisters.length - 1; i >= 0; i--) {
      const canister = this.track.nitroCanisters[i];
      const dist = this.playerCar.position.distanceTo(canister.position);
      if (dist < 2.0) {
        // Feed nitro, wipe canister
        this.playerCar.nitro = 1.0;
        this.scene.remove(canister);
        this.track.nitroCanisters.splice(i, 1);
        this.audio.playNitroBlast(true);
        this.ui.triggerAlert("NITRO FULL CHARGED!");
      }
    }

    // 3. Check Obstacles intersections
    this.track.obstacles.forEach(obs => {
      const dist = this.playerCar.position.distanceTo(obs.position);
      if (dist < 2.0) {
        // Crash thud, subtract speed
        if (this.playerCar.speed > 8.0) {
          this.playerCar.speed *= 0.3;
          this.audio.playCrash();
          this.shakeIntensity = 0.8;
          this.ui.triggerAlert("COLLISION IMPACT!");
          
          // Repel position slightly back
          const pushBack = new THREE.Vector3()
            .subVectors(this.playerCar.position, obs.position)
            .normalize()
            .multiplyScalar(2.0);
          this.playerCar.position.add(pushBack);
        }
      }
    });

    // 4. AI-Player Collision Bounding Sphere Snug
    this.aiCars.forEach(ai => {
      const dist = this.playerCar.position.distanceTo(ai.position);
      if (dist < 2.4) {
        // Repel each other
        const repelDir = new THREE.Vector3()
          .subVectors(this.playerCar.position, ai.position)
          .normalize();
        
        this.playerCar.position.addScaledVector(repelDir, 0.8);
        ai.position.addScaledVector(repelDir, -0.8);

        this.playerCar.speed *= 0.9;
        ai.speed *= 0.9;
        this.audio.playCrash();
        this.shakeIntensity = 0.3;
      }
    });
  }

  handleLapSplines() {
    const cpIdx = this.track.getCheckpointIndex(this.playerCar.position);

    if (cpIdx !== -1) {
      const expectedNext = (this.playerLastCheckpoint + 1) % this.track.checkpointCount;
      const expectedPrev = (this.playerLastCheckpoint - 1 + this.track.checkpointCount) % this.track.checkpointCount;

      if (cpIdx === expectedNext) {
        this.playerLastCheckpoint = cpIdx;
        
        // Final checkpoint loop completed! LAP DONE
        if (cpIdx === 0) {
          this.currentLap++;
          if (this.currentLap > this.maxLaps) {
            this.state = 'FINISHED';
            this.raceTimerActive = false;
            
            // Log final player standings time
            const playerStand = this.pilotStandings.find(s => s.isPlayer);
            playerStand.time = this.gameTime;

            // Trigger AI DNF or final simulated times
            this.pilotStandings.forEach(s => {
              if (!s.isPlayer) {
                s.time = this.gameTime + (Math.random() * 8 + 2); // Sim DNF / delay times
              }
            });

            // Sort podium standings
            this.pilotStandings.sort((a,b) => {
              if (a.dnf) return 1;
              if (b.dnf) return -1;
              return a.time - b.time;
            });

            const rank = this.pilotStandings.findIndex(s => s.isPlayer) + 1;
            this.ui.populateLeaderboard(this.pilotStandings);
            this.ui.showResults(rank, this.gameTime, this.peakSpeed, this.playerCar.driftScore);
          } else {
            this.ui.triggerAlert(this.currentLap === this.maxLaps ? "FINAL LAP!" : `LAP ${this.currentLap}`);
          }
        }
      } else if (cpIdx === expectedPrev) {
        // Going backward, soft snap
        this.playerLastCheckpoint = cpIdx;
      }
    }
  }

  updateRaceStandings() {
    const playerInfo = this.track.getNearestPoint(this.playerCar.position);
    
    // Player total progress is (Laps - 1) + splineProgress
    const playerProgress = (this.currentLap - 1) + playerInfo.progress;
    
    this.pilotStandings.forEach(pilot => {
      if (pilot.isPlayer) {
        pilot.progress = playerProgress;
      } else {
        const ai = this.aiCars.find(car => car.name === pilot.name);
        if (ai) {
          // AI progress calculations
          // Snag loop rollover approximations
          let lapGuess = this.currentLap;
          if (ai.progress < 0.2 && playerInfo.progress > 0.8) {
            lapGuess++;
          } else if (ai.progress > 0.8 && playerInfo.progress < 0.2) {
            lapGuess--;
          }
          pilot.progress = (lapGuess - 1) + ai.progress;
        }
      }
    });

    // Sort list by progress descending
    this.pilotStandings.sort((a, b) => b.progress - a.progress);

    const playerRank = this.pilotStandings.findIndex(p => p.isPlayer) + 1;
    this.ui.updateHUD(
      this.playerCar.speed,
      this.playerCar.nitro,
      this.currentLap > this.maxLaps ? this.maxLaps : this.currentLap,
      this.maxLaps,
      playerRank,
      4,
      this.playerCar.driftScore
    );
  }

  handleCameraChase(dt) {
    if (!this.playerCar || !this.playerCar.mesh) return;

    // Follow spring vector offsets based on chosen perspective
    let backOffset = 6.8;
    let upOffset = 2.4;
    let lookAhead = 8.0;

    if (this.camPerspective === 'first') {
      backOffset = -0.4;
      upOffset = 0.65;
      lookAhead = 15.0;
    } else if (this.camPerspective === 'far') {
      backOffset = 10.0;
      upOffset = 4.2;
      lookAhead = 6.0;
    }

    const carRot = this.playerCar.heading + this.playerCar.driftAngle;

    // 1. Calculate base camera follow position behind car
    const targetCamPos = new THREE.Vector3(
      this.playerCar.position.x - Math.sin(carRot) * backOffset,
      this.playerCar.position.y + upOffset,
      this.playerCar.position.z - Math.cos(carRot) * backOffset
    );

    // 2. Look target slightly ahead of car
    const targetLookAt = new THREE.Vector3(
      this.playerCar.position.x + Math.sin(carRot) * lookAhead,
      this.playerCar.position.y + 0.6,
      this.playerCar.position.z + Math.cos(carRot) * lookAhead
    );

    // 3. Smooth Camera Follow Spring Interpolations
    const lerpSpeed = this.camPerspective === 'first' ? 24.0 : 8.0;
    this.cameraPosition.lerp(targetCamPos, lerpSpeed * dt);
    this.cameraTarget.lerp(targetLookAt, lerpSpeed * dt);

    // 4. Dynamic speed stretches FOV
    const speedRatio = this.playerCar.speed / this.playerCar.maxSpeed;
    const targetFov = 60 + speedRatio * 20 + (this.playerCar.isNitroActive ? 10 : 0);
    this.camera.fov += (targetFov - this.camera.fov) * 5 * dt;
    this.camera.updateProjectionMatrix();

    // 5. Dynamic Camera Shake & Drifting rolls
    let driftRoll = 0;
    if (this.playerCar.isDrifting) {
      // Tilt rolls camera Y-rotation slightly inside the slide curve
      driftRoll = -this.playerCar.driftDirection * 0.08;
    }

    // Apply shake decay
    if (this.playerCar.isNitroActive) {
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.15);
    }
    
    const shake = new THREE.Vector3(
      (Math.random() - 0.5) * this.shakeIntensity,
      (Math.random() - 0.5) * this.shakeIntensity,
      (Math.random() - 0.5) * this.shakeIntensity
    );
    this.shakeIntensity *= Math.pow(0.1, dt); // Decay

    // Apply adjustments to camera transformation matrices
    this.camera.position.copy(this.cameraPosition).add(shake);
    this.camera.lookAt(this.cameraTarget);

    // Set camera Z rotation for aesthetic drift roll
    this.camera.rotation.z += driftRoll;
  }
}
