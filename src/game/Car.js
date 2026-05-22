import * as THREE from 'three';

/**
 * Player Car & Arcade Physics System for Asphalt Neon
 * Procedurally models the 3D chassis, wheels, glowing exhausts, headlights, and tail flame particles.
 * Simulates drift mechanics, vertical jump gravity, nitro thrust, and track snapping.
 */
export default class Car {
  constructor(scene, color = 0x00f3ff, stats = { speed: 80, accel: 75, handling: 70, nitro: 85 }) {
    this.scene = scene;
    this.color = color;
    this.stats = stats;

    this.mesh = null;
    this.wheels = [];
    
    // Physics variables
    this.position = new THREE.Vector3(0, 0.4, 0);
    this.velocity = new THREE.Vector3();
    this.speed = 0;
    this.heading = 0; // Rotation angle around Y
    
    // Custom stats mapping
    this.maxSpeed = 50 + (stats.speed / 100) * 45; // Max velocity (m/s)
    this.accelRate = 8 + (stats.accel / 100) * 12; // Acceleration speed
    this.handlingRate = 2.0 + (stats.handling / 100) * 1.5; // Turn sensitivity
    this.nitroPower = 1.3 + (stats.nitro / 100) * 0.4; // Nitro speed multiplier

    // State flags
    this.isDrifting = false;
    this.driftDirection = 0; // -1 Left, 1 Right
    this.driftAngle = 0; // Skew angle during drift
    this.driftScore = 0;
    
    this.nitro = 1.0; // Current nitro charge (0.0 to 1.0)
    this.isNitroActive = false;
    this.nitroDrainRate = 0.35; // Drains in ~3 seconds

    // Jump / Ramps
    this.isAirborne = false;
    this.vy = 0; // Vertical velocity
    this.gravity = 18.0;

    // Thruster tail flame particles
    this.flameParticles = [];
    this.flameGroup = null;

    this.buildCarMesh();
  }

  buildCarMesh() {
    this.mesh = new THREE.Group();

    // 1. Sleek Chassis Base (High-fidelity physical metallic paint clearcoat)
    const chassisGeom = new THREE.BoxGeometry(2.0, 0.4, 4.2);
    const chassisMat = new THREE.MeshPhysicalMaterial({
      color: this.color,
      roughness: 0.14,
      metalness: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 1.0
    });
    const chassis = new THREE.Mesh(chassisGeom, chassisMat);
    chassis.position.y = 0.25;
    this.mesh.add(chassis);

    // 2. High-Tech Glass Cockpit Cabin
    const cabinGeom = new THREE.BoxGeometry(1.4, 0.4, 2.0);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x050510,
      roughness: 0.0,
      metalness: 1.0,
      transparent: true,
      opacity: 0.8
    });
    const cabin = new THREE.Mesh(cabinGeom, cabinMat);
    cabin.position.set(0, 0.55, -0.2);
    this.mesh.add(cabin);

    // 3. Neon Underglow strip
    const underglowGeom = new THREE.BoxGeometry(1.9, 0.05, 3.8);
    const underglowMat = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.9
    });
    const underglow = new THREE.Mesh(underglowGeom, underglowMat);
    underglow.position.y = 0.02;
    this.mesh.add(underglow);

    // 4. Heavy-duty tires (4 wheels)
    const wheelGeom = new THREE.CylinderGeometry(0.45, 0.45, 0.5, 12);
    wheelGeom.rotateZ(Math.PI / 2); // Lay flat cylinder
    
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x080808,
      roughness: 0.8,
      metalness: 0.2
    });

    const wheelPositions = [
      [-1.1, 0.22, 1.3],  // Front Left
      [1.1, 0.22, 1.3],   // Front Right
      [-1.1, 0.22, -1.3], // Rear Left
      [1.1, 0.22, -1.3]   // Rear Right
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);
      wheel.position.set(...pos);
      this.mesh.add(wheel);
      this.wheels.push(wheel);
    });

    // 5. Dual exhaust thrusters (where nitro exhausts flame)
    const exhaustGeom = new THREE.CylinderGeometry(0.12, 0.18, 0.5, 8);
    exhaustGeom.rotateX(Math.PI / 2);

    const exhaustMat = new THREE.MeshStandardMaterial({
      color: 0x111115,
      metalness: 0.9,
      roughness: 0.1
    });

    const leftExhaust = new THREE.Mesh(exhaustGeom, exhaustMat);
    leftExhaust.position.set(-0.45, 0.2, -2.1);
    
    const rightExhaust = leftExhaust.clone();
    rightExhaust.position.set(0.45, 0.2, -2.1);

    this.mesh.add(leftExhaust, rightExhaust);

    // 6. Setup Nitro tail flame particles group
    this.flameGroup = new THREE.Group();
    this.mesh.add(this.flameGroup);

    // Lights (Bright Glowing Cylinder Mesh)
    const headLightGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8);
    headLightGeom.rotateX(Math.PI / 2);
    const headLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    const lLight = new THREE.Mesh(headLightGeom, headLightMat);
    lLight.position.set(-0.8, 0.22, 2.1);
    const rLight = lLight.clone();
    rLight.position.set(0.8, 0.22, 2.1);
    this.mesh.add(lLight, rLight);

    // [UPGRADE] Physical glowing red taillights blocks at the rear
    const tailLightGeom = new THREE.BoxGeometry(0.35, 0.08, 0.08);
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
    const lTail = new THREE.Mesh(tailLightGeom, tailLightMat);
    lTail.position.set(-0.7, 0.26, -2.1);
    const rTail = lTail.clone();
    rTail.position.set(0.7, 0.26, -2.1);
    this.mesh.add(lTail, rTail);

    // [UPGRADE] Focused White Headlight Spotlight (casts dynamic road light pools)
    const headlightsBeam = new THREE.SpotLight(0xffffff, 7.0, 40, Math.PI / 5, 0.5, 1.0);
    headlightsBeam.position.set(0, 0.22, 2.15);
    const headlightsTarget = new THREE.Object3D();
    headlightsTarget.position.set(0, -0.4, 10.0);
    this.mesh.add(headlightsTarget);
    headlightsBeam.target = headlightsTarget;
    this.mesh.add(headlightsBeam);

    // [UPGRADE] Dynamic rear red PointLight (casts glowing red trails behind car)
    const taillightsGlow = new THREE.PointLight(0xff0033, 2.5, 8);
    taillightsGlow.position.set(0, 0.22, -2.2);
    this.mesh.add(taillightsGlow);

    // Enable shadows on car
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  update(input, dt, track) {
    if (!this.mesh) return;

    // 1. Vertical Physics (Airborne Ramps & Snapping)
    this.handleElevation(track, dt);

    // 2. Throttle and Braking
    const speedRatio = this.speed / this.maxSpeed;
    
    // Nitro triggers boost
    if (input.nitro && this.nitro > 0 && this.speed > 5) {
      this.isNitroActive = true;
      this.nitro -= this.nitroDrainRate * dt;
      if (this.nitro < 0) this.nitro = 0;
    } else {
      this.isNitroActive = false;
    }

    const currentMaxSpeed = this.isNitroActive ? this.maxSpeed * this.nitroPower : this.maxSpeed;

    if (input.forward && !this.isAirborne) {
      // Accelerate
      const accel = this.isNitroActive ? this.accelRate * 2.0 : this.accelRate;
      this.speed += accel * dt;
      if (this.speed > currentMaxSpeed) this.speed = currentMaxSpeed;
    } else if (input.backward && !this.isAirborne) {
      // Brake/Reverse
      this.speed -= this.accelRate * 1.5 * dt;
      if (this.speed < -this.maxSpeed * 0.3) this.speed = -this.maxSpeed * 0.3;
    } else {
      // Passive rolling resistance friction drag
      const drag = this.isDrifting ? 1.8 : 0.8;
      if (this.speed > 0) {
        this.speed -= drag * dt * 8;
        if (this.speed < 0) this.speed = 0;
      } else if (this.speed < 0) {
        this.speed += drag * dt * 8;
        if (this.speed > 0) this.speed = 0;
      }
    }

    // 3. Steering & Drifting
    let steeringMultiplier = 1.0;
    if (this.isDrifting) {
      steeringMultiplier = 1.6; // Turn tighter while sliding
    }

    // Steer angle velocity increases at medium speeds, drops at extreme speeds
    const steerSpeedFactor = Math.min(1.0, this.speed / 15);
    const steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    
    this.heading += steerInput * this.handlingRate * steeringMultiplier * steerSpeedFactor * dt;

    // Drifting state transitions
    if (input.drift && Math.abs(steerInput) > 0.1 && this.speed > 18 && !this.isAirborne) {
      if (!this.isDrifting) {
        this.isDrifting = true;
        this.driftDirection = steerInput;
      }
      
      // Increment drift scoring and refill nitro slightly
      this.driftScore += Math.floor(this.speed * dt * 10);
      this.nitro = Math.min(1.0, this.nitro + 0.12 * dt); // Drifting charges nitro!
      
      // Pivot visual drift mesh angle
      const targetDriftAngle = this.driftDirection * 0.32;
      this.driftAngle += (targetDriftAngle - this.driftAngle) * 8 * dt;
    } else {
      this.isDrifting = false;
      this.driftAngle += (0 - this.driftAngle) * 6 * dt;
    }

    // 4. Update Position & Physics Vector Velocity
    // Heading plus drift angle determines exact move direction
    const moveHeading = this.heading + this.driftAngle;
    this.velocity.set(
      Math.sin(moveHeading) * this.speed,
      this.isAirborne ? this.vy : 0,
      Math.cos(moveHeading) * this.speed
    );

    this.position.addScaledVector(this.velocity, dt);

    // Snap to grid boundary if player veers extremely far off-track
    const trackInfo = track.getNearestPoint(this.position);
    if (trackInfo.distance > track.trackWidth * 1.5) {
      // Drifting off track boundaries slows down drastically
      this.speed *= 0.95;
    }

    // 5. Update Visual Object Mesh Position & Rotations
    this.mesh.position.copy(this.position);
    
    // Smooth orient heading Y rot
    this.mesh.rotation.y = this.heading + this.driftAngle;

    // Align wheels spinning speed
    const spinSpeed = (this.speed / 0.45) * dt;
    this.wheels.forEach((wheel, idx) => {
      wheel.rotation.x += spinSpeed;
      // Angle front wheels when turning
      if (idx < 2) {
        wheel.rotation.y = steerInput * 0.35;
      }
    });

    // 6. Nitro Flame Particles Effect
    this.updateTailFlames(dt);
  }

  handleElevation(track, dt) {
    const trackInfo = track.getNearestPoint(this.position);
    
    // Check if player is over ramp
    let overRamp = false;
    let rampHeight = 0;

    track.ramps.forEach(ramp => {
      const dist = this.position.distanceTo(ramp.position);
      if (dist < 5.0) {
        overRamp = true;
        // Ramp incline height calculation
        rampHeight = ramp.position.y + 0.8;
      }
    });

    if (overRamp) {
      // Incline boost upward!
      if (!this.isAirborne && this.speed > 10) {
        this.isAirborne = true;
        this.vy = 8.0 + (this.speed * 0.15); // Velocity depends on speed
      }
    }

    if (this.isAirborne) {
      // Apply gravity falling
      this.vy -= this.gravity * dt;
      this.position.y += this.vy * dt;

      // Check collision landing back onto road
      const roadY = trackInfo.point.y + 0.4;
      if (this.position.y <= roadY) {
        this.position.y = roadY;
        this.isAirborne = false;
        this.vy = 0;
      }
    } else {
      // Ground snap following track hills
      const roadY = trackInfo.point.y + 0.4;
      this.position.y = roadY;
    }
  }

  updateTailFlames(dt) {
    if (!this.flameGroup) return;

    // Spawn new flame particles during nitro
    if (this.isNitroActive) {
      // 1. Standard sparks
      const particleGeom = new THREE.ConeGeometry(0.1, 0.4, 4);
      particleGeom.rotateX(-Math.PI / 2);
      const particleMat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0x00f3ff : 0x7f00ff,
        transparent: true,
        opacity: 0.8
      });

      const p = new THREE.Mesh(particleGeom, particleMat);
      
      // Offset from dual exhausts
      const exhaustOffset = Math.random() > 0.5 ? -0.45 : 0.45;
      p.position.set(exhaustOffset, 0.2, -2.2);
      p.life = 0.2; // Sparks dissolve in 200ms
      p.vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        -15.0 - Math.random() * 10
      );

      this.flameGroup.add(p);
      this.flameParticles.push(p);

      // 2. [UPGRADE] Periodic expanding sonic ring shockwaves
      if (!this.lastShockwaveTime) this.lastShockwaveTime = 0;
      const now = performance.now();
      if (now - this.lastShockwaveTime > 120) { // Spawn every 120ms
        this.lastShockwaveTime = now;
        
        const ringGeom = new THREE.TorusGeometry(0.3, 0.04, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: this.color,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const shockwave = new THREE.Mesh(ringGeom, ringMat);
        shockwave.position.set(0, 0.2, -2.1);
        shockwave.life = 0.3; // Dissolves quickly
        shockwave.scaleRate = 8.5; // Expands outward rapidly
        
        this.flameGroup.add(shockwave);
        this.flameParticles.push(shockwave);
      }
    }

    // Tick flame particles
    for (let i = this.flameParticles.length - 1; i >= 0; i--) {
      const p = this.flameParticles[i];
      p.life -= dt;
      
      if (p.scaleRate) {
        // [UPGRADE] Expand and push back sonic rings
        p.scale.addScalar(p.scaleRate * dt);
        p.position.z -= 8.0 * dt; // Blow backwards
        if (p.material) {
          p.material.opacity = Math.max(0, (p.life / 0.3) * 0.8);
        }
      } else {
        // Move standard spark relative to car local space
        p.position.addScaledVector(p.vel, dt);
        p.scale.multiplyScalar(0.9);
      }

      if (p.life <= 0) {
        this.flameGroup.remove(p);
        this.flameParticles.splice(i, 1);
      }
    }
  }

  reset(track) {
    // Snap player back to closest track checkpoint
    const trackInfo = track.getNearestPoint(this.position);
    
    this.position.copy(trackInfo.point);
    this.position.y += 0.4;
    this.speed = 0;
    this.heading = track.curve.getTangentAt(trackInfo.progress).normalize().angleTo(new THREE.Vector3(0,0,1));
    this.velocity.set(0, 0, 0);
    this.isAirborne = false;
    this.vy = 0;
    this.isDrifting = false;

    // Reset heading rotation properly
    const tangent = track.curve.getTangentAt(trackInfo.progress).normalize();
    this.heading = Math.atan2(tangent.x, tangent.z);
  }
}
