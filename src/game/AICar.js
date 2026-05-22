import * as THREE from 'three';

/**
 * AI Competitor Vehicle System for Asphalt Neon
 * Procedurally models opponent racing machines with unique neon color profiles.
 * Tracks splines ahead, incorporates steering lane variations, snaps to hills, and manages stats.
 */
export default class AICar {
  constructor(scene, color = 0xff00ff, startProgress = 0, name = "AI PILOT", difficulty = 0.85) {
    this.scene = scene;
    this.color = color;
    this.startProgress = startProgress;
    this.name = name;
    this.difficulty = difficulty; // Multiplier on stats

    this.mesh = null;
    this.wheels = [];
    
    // Physics variables
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.speed = 0;
    this.heading = 0;
    this.progress = startProgress; // Current spline progress (0.0 to 1.0)
    
    // AI Stats
    this.maxSpeed = 38 + difficulty * 15; // Max velocity (m/s)
    this.accelRate = 8 + difficulty * 6;
    
    // Lane behaviors
    this.laneOffset = (Math.random() - 0.5) * 6; // Stay on a specific side lane of road
    this.targetOffsetSpeed = 0.5;

    this.buildCarMesh();
  }

  buildCarMesh() {
    this.mesh = new THREE.Group();

    // 1. Futuristic Aerodynamic Chassis
    const chassisGeom = new THREE.BoxGeometry(2.0, 0.38, 4.0);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.15,
      metalness: 0.8
    });
    const chassis = new THREE.Mesh(chassisGeom, chassisMat);
    chassis.position.y = 0.24;
    this.mesh.add(chassis);

    // 2. High-Tech Glass Canopy
    const canopyGeom = new THREE.BoxGeometry(1.3, 0.38, 1.8);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x050510,
      roughness: 0.0,
      metalness: 1.0,
      transparent: true,
      opacity: 0.8
    });
    const canopy = new THREE.Mesh(canopyGeom, canopyMat);
    canopy.position.set(0, 0.5, -0.15);
    this.mesh.add(canopy);

    // 3. Glowing Neon Striping
    const neonGeom = new THREE.BoxGeometry(0.1, 0.1, 3.6);
    const neonMat = new THREE.MeshBasicMaterial({ color: this.color });
    
    const leftStrip = new THREE.Mesh(neonGeom, neonMat);
    leftStrip.position.set(-1.01, 0.24, 0);
    const rightStrip = leftStrip.clone();
    rightStrip.position.set(1.01, 0.24, 0);
    this.mesh.add(leftStrip, rightStrip);

    // 4. Wheels
    const wheelGeom = new THREE.CylinderGeometry(0.45, 0.45, 0.48, 10);
    wheelGeom.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d });

    const wheelPositions = [
      [-1.08, 0.22, 1.25],  // FL
      [1.08, 0.22, 1.25],   // FR
      [-1.08, 0.22, -1.25], // RL
      [1.08, 0.22, -1.25]   // RR
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);
      wheel.position.set(...pos);
      this.mesh.add(wheel);
      this.wheels.push(wheel);
    });

    this.scene.add(this.mesh);
  }

  update(dt, track, playerPos) {
    if (!this.mesh) return;

    // 1. AI Steering Pathfinding Logic
    // Target coordinate is placed slightly ahead along the track spline
    let targetProgress = this.progress + 0.015;
    if (targetProgress > 1.0) targetProgress -= 1.0;

    const baseTarget = track.curve.getPointAt(targetProgress);
    const tangent = track.curve.getTangentAt(targetProgress).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Incorporate lateral lane offsets
    const finalTarget = baseTarget.clone().add(normal.clone().multiplyScalar(this.laneOffset));

    // Calculate heading angle toward target
    const dx = finalTarget.x - this.position.x;
    const dz = finalTarget.z - this.position.z;
    const targetHeading = Math.atan2(dx, dz);

    // Smoothly interpolate heading angle Y rot
    // Handle angle wrapping
    let diff = targetHeading - this.heading;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    this.heading += diff * 4.5 * dt;

    // 2. Throttle speed
    // AI accelerates steadily toward max speed
    this.speed += this.accelRate * dt;
    
    // Slow down slightly if steering extremely sharply to avoid flying off track
    const steerSharpness = Math.abs(diff);
    if (steerSharpness > 0.15) {
      this.speed *= 0.98;
    }

    // Avoidance behaviors: Slow down slightly if too close to player to keep races intense
    const distToPlayer = this.position.distanceTo(playerPos);
    if (distToPlayer < 6.0) {
      // Steer slightly away laterally
      const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
      const sideDot = toPlayer.dot(normal);
      if (sideDot > 0) {
        // Player is on AI right, steer slightly left
        this.laneOffset -= 2.0 * dt;
      } else {
        // Player is on AI left, steer slightly right
        this.laneOffset += 2.0 * dt;
      }
      this.laneOffset = THREE.MathUtils.clamp(this.laneOffset, -track.trackWidth * 0.4, track.trackWidth * 0.4);
    }

    // Cap velocity
    if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;

    // 3. Move Position & Snap Elevation Snapping
    this.velocity.set(
      Math.sin(this.heading) * this.speed,
      0,
      Math.cos(this.heading) * this.speed
    );

    this.position.addScaledVector(this.velocity, dt);

    // Snapping following track hills
    const trackInfo = track.getNearestPoint(this.position);
    this.position.y = trackInfo.point.y + 0.4;
    this.progress = trackInfo.progress;

    // 4. Update Visual Mesh Position & Orientation
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.heading;

    // Spin wheels
    const spinSpeed = (this.speed / 0.45) * dt;
    this.wheels.forEach((wheel) => {
      wheel.rotation.x += spinSpeed;
    });
  }

  reset(track) {
    const basePt = track.curve.getPointAt(this.startProgress);
    const tangent = track.curve.getTangentAt(this.startProgress).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    this.position.copy(basePt).add(normal.clone().multiplyScalar(this.laneOffset));
    this.position.y += 0.4;
    this.speed = 0;
    this.heading = Math.atan2(tangent.x, tangent.z);
    this.progress = this.startProgress;
    this.velocity.set(0, 0, 0);
  }
}
