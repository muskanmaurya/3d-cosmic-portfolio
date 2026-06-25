import * as THREE from 'three';
import { createStarTexture } from './utils.js';

export class TransitionScene {
  constructor(scene, camera, onComplete) {
    this.scene = scene;
    this.camera = camera;
    this.onComplete = onComplete;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.tubeMesh = null;
    this.lines = null;
    
    // Animation progress: 0.0 to 1.0
    this.progress = 0.0;
    this.speed = 0.35; // Completion in ~3 seconds

    // Define wormhole path spline (goes down negative Z-axis with curve wiggles)
    this.points = [
      new THREE.Vector3(0, 0, 10),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1.5, 0.8, -12),
      new THREE.Vector3(-1.2, -1.0, -25),
      new THREE.Vector3(0.5, 0.5, -38),
      new THREE.Vector3(0, 0, -50)
    ];
    this.curve = new THREE.CatmullRomCurve3(this.points);

    this.init();
  }

  init() {
    // 1. Wormhole Tube Geometry
    const tubeGeometry = new THREE.TubeGeometry(this.curve, 80, 2.5, 20, false);
    
    // Create a wireframe and additive blended material for cyber-tunnel lines
    const tubeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide // Render inside of tube
    });

    this.tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    this.group.add(this.tubeMesh);

    // 2. High-speed warp stars (speed lines)
    const lineCount = 350;
    const lineGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(lineCount * 6); // 2 vertices per line (start, end)
    const colors = new Float32Array(lineCount * 6);

    this.lineSpeeds = [];
    this.lineLengths = [];
    this.lineRadii = [];
    this.lineAngles = [];

    const startColor = new THREE.Color(0x00f0ff);
    const endColor = new THREE.Color(0xff00bb);

    for (let i = 0; i < lineCount; i++) {
      const radius = Math.random() * 2.2 + 0.3; // Distance from center tube line
      const angle = Math.random() * Math.PI * 2;
      const length = Math.random() * 6.0 + 3.0;
      const speed = Math.random() * 80.0 + 40.0;
      
      this.lineRadii.push(radius);
      this.lineAngles.push(angle);
      this.lineLengths.push(length);
      this.lineSpeeds.push(speed);

      // Z coordinate range along the tube
      const z = -Math.random() * 60;
      
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Set start vertex
      positions[i * 6] = cos * radius;
      positions[i * 6 + 1] = sin * radius;
      positions[i * 6 + 2] = z;

      // Set end vertex (stretched backward along Z)
      positions[i * 6 + 3] = cos * radius;
      positions[i * 6 + 4] = sin * radius;
      positions[i * 6 + 5] = z + length;

      // Intercalate colors (blue to purple)
      const ratio = radius / 2.5;
      const mixedColor = startColor.clone().lerp(endColor, ratio);
      
      colors[i * 6] = mixedColor.r;
      colors[i * 6 + 1] = mixedColor.g;
      colors[i * 6 + 2] = mixedColor.b;
      
      colors[i * 6 + 3] = mixedColor.r * 0.2; // Fade out trailing vertex
      colors[i * 6 + 4] = mixedColor.g * 0.2;
      colors[i * 6 + 5] = mixedColor.b * 0.2;
    }

    lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      linewidth: 2 // Only works on some platforms, but looks clean anyway
    });

    this.lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    this.group.add(this.lines);

    // Prepare camera at path start
    const pos = this.curve.getPointAt(0);
    this.camera.position.copy(pos);
    this.camera.rotation.set(0, 0, 0);
  }

  update(deltaTime) {
    // 1. Advance transit progress
    this.progress += this.speed * deltaTime;
    
    if (this.progress >= 1.0) {
      this.progress = 1.0;
      if (this.onComplete) {
        this.onComplete();
      }
      return;
    }

    // 2. Animate Camera along Spline curve
    // Easing function to make acceleration and deceleration feel organic
    // Cubic Ease-in-out
    const easeProgress = this.progress < 0.5 
      ? 4 * this.progress * this.progress * this.progress 
      : 1 - Math.pow(-2 * this.progress + 2, 3) / 2;

    const camPos = this.curve.getPointAt(easeProgress);
    this.camera.position.copy(camPos);

    // Look slightly ahead of camera position along path
    const lookAheadProgress = Math.min(easeProgress + 0.05, 1.0);
    const lookAtPos = this.curve.getPointAt(lookAheadProgress);
    this.camera.lookAt(lookAtPos);

    // Add high-speed barrel roll rotation
    const rollAngle = easeProgress * Math.PI * 4; // 2 full spins
    this.camera.rotateZ(rollAngle);

    // 3. Animate Star Line Particle Coordinates
    const posAttr = this.lines.geometry.attributes.position;
    const positions = posAttr.array;

    for (let i = 0; i < this.lineSpeeds.length; i++) {
      const speed = this.lineSpeeds[i];
      const length = this.lineLengths[i];
      const radius = this.lineRadii[i];
      const angle = this.lineAngles[i];

      // Move points forward along Z (towards camera view direction, which travels negative Z)
      // Wait, since camera is traveling negative Z, particles should move positive Z (relative to tube center)
      // to look like camera is flying past them.
      let z1 = positions[i * 6 + 2] + speed * deltaTime;
      
      // Reset if line has flown past camera
      // Camera goes from Z=10 to Z=-50. If z is higher than camera Z, recycle it behind
      const currentCamZ = camPos.z;
      if (z1 > currentCamZ + 5) {
        z1 = currentCamZ - 45; // Put it back deep in the tunnel
      }

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Update start vertex
      positions[i * 6] = cos * radius;
      positions[i * 6 + 1] = sin * radius;
      positions[i * 6 + 2] = z1;

      // Update end vertex
      positions[i * 6 + 3] = cos * radius;
      positions[i * 6 + 4] = sin * radius;
      positions[i * 6 + 5] = z1 + length;
    }

    posAttr.needsUpdate = true;

    // 4. Animate Tube wireframe opacity to pulse or swell
    if (this.tubeMesh) {
      this.tubeMesh.material.opacity = 0.1 + Math.sin(this.progress * Math.PI * 8) * 0.08;
    }
  }

  destroy() {
    this.scene.remove(this.group);
    
    if (this.tubeMesh) {
      this.tubeMesh.geometry.dispose();
      this.tubeMesh.material.dispose();
    }
    if (this.lines) {
      this.lines.geometry.dispose();
      this.lines.material.dispose();
    }
  }
}
