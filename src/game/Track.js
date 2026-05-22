import * as THREE from 'three';

/**
 * 3D Track & Environment Generator for Asphalt Neon
 * Generates closed spline loops, road meshes, neon arches, obstacles, ramps, boosters, and cyberpunk city towers.
 */
export default class Track {
  constructor(scene, trackType = 'neon-city') {
    this.scene = scene;
    this.trackType = trackType;

    this.curve = null;
    this.roadMesh = null;
    this.trackWidth = 14;

    // Interactive Items
    this.boosters = [];
    this.ramps = [];
    this.nitroCanisters = [];
    this.obstacles = [];
    this.scenery = [];
    this.checkpointCount = 8;
    this.checkpoints = [];

    this.generate();
  }

  generate() {
    // 1. Create Spline Curve for the track
    let controlPoints = [];

    if (this.trackType === 'neon-city') {
      // Sleek grid cityscape loop with some elevation
      controlPoints = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(120, 0, 80),
        new THREE.Vector3(260, 10, 160),
        new THREE.Vector3(380, 20, 80),
        new THREE.Vector3(450, 5, -80),
        new THREE.Vector3(320, -5, -220),
        new THREE.Vector3(140, 25, -140),
        new THREE.Vector3(-100, 0, -80)
      ];
    } else {
      // Winding canyon with steep hills and jumps
      controlPoints = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(80, 20, 150),
        new THREE.Vector3(200, 45, 280),
        new THREE.Vector3(380, 10, 180),
        new THREE.Vector3(420, 0, -50),
        new THREE.Vector3(240, 30, -220),
        new THREE.Vector3(60, -10, -180),
        new THREE.Vector3(-120, 15, -100)
      ];
    }

    this.curve = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal');

    // 2. Generate Road Mesh using Extrude Geometry along Spline
    this.createRoadGeometry();

    // 3. Populate Checkpoints for Lap System
    this.createCheckpoints();

    // 4. Place Neon Arches, Boosters, Ramps, and Pickups
    this.populateTrackItems();

    // 5. Generate Decorative Cyberpunk Scenery
    this.generateScenery();
  }

  createRoadGeometry() {
    const segments = 200;
    const radialSegments = 4; // Flat plane extrusion

    // Extrude a flat rectangle road along curve
    const roadShape = new THREE.Shape();
    const halfW = this.trackWidth / 2;
    roadShape.moveTo(-halfW, -0.2);
    roadShape.lineTo(halfW, -0.2);
    roadShape.lineTo(halfW, 0.1);
    roadShape.lineTo(-halfW, 0.1);
    roadShape.lineTo(-halfW, -0.2);

    const extrudeSettings = {
      steps: segments,
      bevelEnabled: false,
      extrudePath: this.curve
    };

    const geom = new THREE.ExtrudeGeometry(roadShape, extrudeSettings);

    // Create high-tech dark grid materials for road
    const material = new THREE.MeshStandardMaterial({
      color: 0x08080f,
      roughness: 0.2,
      metalness: 0.8,
      bumpScale: 0.15
    });

    // Create glowing neon track borders
    this.roadMesh = new THREE.Mesh(geom, material);
    this.scene.add(this.roadMesh);

    // Generate neon border lines
    const points = this.curve.getSpacedPoints(segments);
    const leftBorderGeom = new THREE.BufferGeometry();
    const rightBorderGeom = new THREE.BufferGeometry();

    const leftVertices = [];
    const rightVertices = [];

    const colorScheme = this.trackType === 'neon-city' ? 0x00ffff : 0xff007f;

    for (let i = 0; i <= segments; i++) {
      const pt = points[i % points.length];
      const tangent = this.curve.getTangentAt(i / segments).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const leftPt = pt.clone().add(normal.clone().multiplyScalar(halfW));
      const rightPt = pt.clone().add(normal.clone().multiplyScalar(-halfW));

      leftVertices.push(leftPt.x, leftPt.y + 0.15, leftPt.z);
      rightVertices.push(rightPt.x, rightPt.y + 0.15, rightPt.z);
    }

    leftBorderGeom.setAttribute('position', new THREE.Float32BufferAttribute(leftVertices, 3));
    rightBorderGeom.setAttribute('position', new THREE.Float32BufferAttribute(rightVertices, 3));

    const borderMaterial = new THREE.LineBasicMaterial({
      color: colorScheme,
      linewidth: 4 // Note: linewidth > 1 usually ignored by WebGL but we simulate glow below
    });

    const leftLine = new THREE.Line(leftBorderGeom, borderMaterial);
    const rightLine = new THREE.Line(rightBorderGeom, borderMaterial);
    this.scene.add(leftLine);
    this.scene.add(rightLine);
  }

  createCheckpoints() {
    for (let i = 0; i < this.checkpointCount; i++) {
      const t = i / this.checkpointCount;
      const pos = this.curve.getPointAt(t);
      this.checkpoints.push({
        position: pos,
        radius: this.trackWidth + 10
      });
    }
  }

  populateTrackItems() {
    const itemCount = 50;
    const colorScheme = this.trackType === 'neon-city' ? 0x00ffff : 0xff007f;
    const accentColor = this.trackType === 'neon-city' ? 0xff007f : 0x00ffff;

    for (let i = 0; i < itemCount; i++) {
      const t = i / itemCount;
      const pos = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Look direction at target
      const lookTarget = pos.clone().add(tangent);

      // 1. Neon Arches (Regular intervals)
      if (i % 6 === 0) {
        this.createNeonArch(pos, lookTarget, colorScheme);
      }

      // 2. Speed Booster Pads (Chevrons on track)
      if (i % 8 === 2) {
        this.createBoosterPad(pos, lookTarget, accentColor);
      }

      // 3. Jump Ramps (A few sparse ones)
      if (i % 15 === 7) {
        this.createJumpRamp(pos, lookTarget);
      }

      // 4. Nitro Canisters
      if (i % 4 === 1) {
        // Offset canister slightly to left or right lane
        const sideOffset = (Math.random() > 0.5 ? 1 : -1) * (this.trackWidth * 0.25);
        const canisterPos = pos.clone().add(normal.clone().multiplyScalar(sideOffset));
        canisterPos.y += 1.0; // Float
        this.createNitroCanister(canisterPos);
      }

      // 5. Obstacles (Barriers or Cones)
      if (i % 5 === 3 && i % 15 !== 7) {
        const sideOffset = (Math.random() > 0.5 ? 1 : -1) * (this.trackWidth * 0.25);
        const obsPos = pos.clone().add(normal.clone().multiplyScalar(sideOffset));
        this.createObstacle(obsPos, lookTarget);
      }
    }
  }

  createNeonArch(pos, lookTarget, color) {
    const archGroup = new THREE.Group();
    archGroup.position.copy(pos);
    archGroup.lookAt(lookTarget);

    const halfW = this.trackWidth / 2;
    const archH = 8;

    // Arch Frame Geometries
    const leftPillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, archH, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x111115, metalness: 0.9 })
    );
    leftPillar.position.set(-halfW - 0.2, archH/2, 0);

    const rightPillar = leftPillar.clone();
    rightPillar.position.set(halfW + 0.2, archH/2, 0);

    const topBeam = new THREE.Mesh(
      new THREE.BoxGeometry(this.trackWidth + 1.0, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x111115, metalness: 0.9 })
    );
    topBeam.position.set(0, archH, 0);

    // Glowing Neon Rings
    const ringMat = new THREE.MeshBasicMaterial({ color: color });
    const leftNeon = new THREE.Mesh(new THREE.BoxGeometry(0.2, archH - 0.5, 0.2), ringMat);
    leftNeon.position.set(-halfW - 0.2, archH/2, 0.4);

    const rightNeon = leftNeon.clone();
    rightNeon.position.set(halfW + 0.2, archH/2, 0.4);

    const topNeon = new THREE.Mesh(new THREE.BoxGeometry(this.trackWidth, 0.2, 0.2), ringMat);
    topNeon.position.set(0, archH - 0.3, 0.4);

    archGroup.add(leftPillar, rightPillar, topBeam, leftNeon, rightNeon, topNeon);
    this.scene.add(archGroup);
  }

  createBoosterPad(pos, lookTarget, color) {
    const geom = new THREE.ConeGeometry(1.5, 0.1, 4);
    geom.rotateX(Math.PI / 2); // Lay flat
    
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8
    });

    const boosterMesh = new THREE.Mesh(geom, mat);
    boosterMesh.position.copy(pos);
    boosterMesh.position.y += 0.05; // Slightly above road
    boosterMesh.lookAt(lookTarget);
    boosterMesh.scale.set(1.5, 0.1, 3.0); // Make it a long arrow

    this.scene.add(boosterMesh);
    this.boosters.push(boosterMesh);
  }

  createJumpRamp(pos, lookTarget) {
    const rampGroup = new THREE.Group();
    rampGroup.position.copy(pos);
    rampGroup.lookAt(lookTarget);

    const rampMesh = new THREE.Mesh(
      new THREE.BoxGeometry(6, 2, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a1a24, metalness: 0.8, roughness: 0.4 })
    );
    // Sheared box or rotated to make ramp
    rampMesh.rotation.x = -Math.PI / 16;
    rampMesh.position.set(0, 0.4, 0);

    // Chevron indicators on ramp
    const indicator = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.1, 1),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    indicator.position.set(0, 1.05, 1);
    indicator.rotation.x = -Math.PI / 16;

    rampGroup.add(rampMesh, indicator);
    this.scene.add(rampGroup);
    this.ramps.push(rampGroup);
  }

  createNitroCanister(pos) {
    const geom = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x9d00ff,
      transparent: true,
      opacity: 0.9
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(pos);

    // Glowing wireframe aura
    const glowGeom = new THREE.CylinderGeometry(0.5, 0.5, 1.4, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const glowMesh = new THREE.Mesh(glowGeom, glowMat);
    mesh.add(glowMesh);

    this.scene.add(mesh);
    this.nitroCanisters.push(mesh);
  }

  createObstacle(pos, lookTarget) {
    const barrier = new THREE.Group();
    barrier.position.copy(pos);
    barrier.position.y += 0.5; // Offset half height
    barrier.lookAt(lookTarget);

    // Road obstacle block
    const geom = new THREE.BoxGeometry(2.5, 0.8, 0.5);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      metalness: 0.6,
      roughness: 0.3
    });

    const mesh = new THREE.Mesh(geom, mat);
    barrier.add(mesh);

    // Yellow stripe indicator
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.2, 0.52),
      new THREE.MeshBasicMaterial({ color: 0xffcc00 })
    );
    stripe.position.set(0, 0, 0);
    barrier.add(stripe);

    this.scene.add(barrier);
    this.obstacles.push(barrier);
  }

  generateScenery() {
    // 1. Grid Floor
    const gridHelper = new THREE.GridHelper(2000, 100, 0x7f00ff, 0x111122);
    gridHelper.position.y = -15;
    this.scene.add(gridHelper);

    // 2. Cyberpunk towers (glowing skyscraper boxes in background)
    const towerGeom = new THREE.BoxGeometry(1, 1, 1);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x050510,
      metalness: 0.9,
      roughness: 0.1
    });

    const towerCount = 60;
    for (let i = 0; i < towerCount; i++) {
      const tower = new THREE.Mesh(towerGeom, towerMat);
      
      const scaleX = 20 + Math.random() * 40;
      const scaleY = 100 + Math.random() * 200;
      const scaleZ = 20 + Math.random() * 40;
      tower.scale.set(scaleX, scaleY, scaleZ);

      // Disperse towers outside track boundaries
      let posX, posZ;
      do {
        posX = (Math.random() - 0.5) * 1200;
        posZ = (Math.random() - 0.5) * 1200;
      } while (posX * posX + posZ * posZ < 250000); // Exclude center track zone

      tower.position.set(posX, scaleY / 2 - 15, posZ);
      this.scene.add(tower);

      // Skyscraper neon striping lights
      const lightGeom = new THREE.BoxGeometry(1, scaleY, 1);
      const lightMat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0x00f3ff : 0xff007f
      });
      const neonStrip = new THREE.Mesh(lightGeom, lightMat);
      neonStrip.scale.set(0.1, 1.002, 0.1);
      
      // Position neon strip along edge of tower
      neonStrip.position.set(scaleX / 2 + 0.1, 0, scaleZ / 2 + 0.1);
      tower.add(neonStrip);
    }

    // 3. Background mountains for Canyon track
    if (this.trackType === 'canyon-cove') {
      const mountainGeom = new THREE.ConeGeometry(100, 300, 4);
      const mountainMat = new THREE.MeshStandardMaterial({
        color: 0x180905,
        roughness: 0.9
      });

      for (let i = 0; i < 20; i++) {
        const mountain = new THREE.Mesh(mountainGeom, mountainMat);
        const theta = (i / 20) * Math.PI * 2;
        const radius = 600 + Math.random() * 200;
        mountain.position.set(Math.cos(theta) * radius, 100, Math.sin(theta) * radius);
        mountain.scale.set(1 + Math.random() * 0.5, 0.5 + Math.random() * 0.5, 1 + Math.random() * 0.5);
        this.scene.add(mountain);
      }
    }
  }

  // Animates items (floating canister rotations)
  tick(time) {
    this.nitroCanisters.forEach((canister) => {
      canister.rotation.y += 0.02;
      canister.position.y += Math.sin(time * 3 + canister.position.x) * 0.005;
    });
  }

  // Math to get nearest position on track loop
  getNearestPoint(pos) {
    const t = this.curve.getUtoTmapping(0, 1); // Sample spline
    let minDistance = Infinity;
    let nearestPt = null;
    let nearestProgress = 0;

    // Sweep samples
    const samples = 250;
    for (let i = 0; i < samples; i++) {
      const u = i / samples;
      const pt = this.curve.getPointAt(u);
      const dist = pos.distanceTo(pt);
      if (dist < minDistance) {
        minDistance = dist;
        nearestPt = pt;
        nearestProgress = u;
      }
    }

    return {
      point: nearestPt,
      distance: minDistance,
      progress: nearestProgress
    };
  }

  getCheckpointIndex(pos) {
    let nearestIdx = -1;
    let minDistance = Infinity;

    for (let i = 0; i < this.checkpointCount; i++) {
      const dist = pos.distanceTo(this.checkpoints[i].position);
      if (dist < minDistance && dist < this.checkpoints[i].radius) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    return nearestIdx;
  }
}
