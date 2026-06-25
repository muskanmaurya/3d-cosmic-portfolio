import * as THREE from 'three';
import { createStarTexture } from './utils.js';

export class HeroScene {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.particles = null;
    this.eventHorizon = null;
    this.corona = null;
    this.lensingRing = null;

    // Movement parameters for spaceship flight simulation
    this.targetCameraPos = { x: 0, y: 0, z: 12 };
    this.currentCameraPos = { x: 0, y: 0, z: 12 };
    this.targetCameraRot = { x: 0, y: 0, z: 0 };
    this.currentCameraRot = { x: 0, y: 0, z: 0 };

    this.mouse = { x: 0, y: 0 };

    this.init();
  }

  init() {
    // 1. Central Event Horizon (Black Sphere)
    const ehGeometry = new THREE.SphereGeometry(1.6, 64, 64);
    const ehMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.eventHorizon = new THREE.Mesh(ehGeometry, ehMaterial);
    this.group.add(this.eventHorizon);

    // 2. Volumetric Glow Corona (behind event horizon)
    const coronaGeo = new THREE.PlaneGeometry(5.5, 5.5);
    const coronaTexture = createStarTexture();
    const coronaMat = new THREE.MeshBasicMaterial({
      map: coronaTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.corona = new THREE.Mesh(coronaGeo, coronaMat);
    this.corona.position.z = -0.1;
    this.group.add(this.corona);

    // 3. Gravitational Lensing Visual (vertical ring intersecting event horizon)
    // This simulates light from behind the black hole warped by gravity
    const lensRingGeo = new THREE.RingGeometry(1.8, 3.2, 64);
    const lensRingMat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    // Create a custom vertex shader for the lensing ring to distort edges?
    // A standard mesh ring with subtle rotation is highly performant and looks fantastic.
    this.lensingRing = new THREE.Mesh(lensRingGeo, lensRingMat);
    this.lensingRing.rotation.x = Math.PI * 0.42; // Tilt it highly
    this.lensingRing.rotation.y = Math.PI * 0.05;
    this.group.add(this.lensingRing);

    // 4. Accretion Disk (Spiraling Particle System)
    const particleCount = 25000;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Store particle-specific properties for physics simulation
    this.particleData = [];

    const colorInside = new THREE.Color('#ffffff'); // White hot near center
    const colorMiddle = new THREE.Color('#ff8c00'); // Orange accretion
    const colorOutside = new THREE.Color('#ff2200'); // Fading red-purple
    const colorOuterEdge = new THREE.Color('#3a0055'); // Deep purple boundary

    for (let i = 0; i < particleCount; i++) {
      // Radius distribution: cluster particles closer to the event horizon (power law)
      const radius = 2.0 + Math.pow(Math.random(), 2.0) * 16.0;
      const angle = Math.random() * Math.PI * 2;
      
      // Keplerian orbit: speed is inversely proportional to square root of radius
      const speed = (1.5 / Math.sqrt(radius)) * (0.8 + Math.random() * 0.4);
      
      // Volumetric thickness: thicker near center, flared out
      const thickness = (1.0 / (radius + 1.0)) * 0.6;
      const yDispersion = (Math.random() - 0.5) * thickness;

      const x = Math.cos(angle) * radius;
      const y = yDispersion;
      const z = Math.sin(angle) * radius;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color based on radius (hot to cool)
      let mixedColor;
      if (radius < 4.0) {
        // Inner region
        const ratio = (radius - 2.0) / 2.0;
        mixedColor = colorInside.clone().lerp(colorMiddle, ratio);
      } else if (radius < 9.0) {
        // Mid region
        const ratio = (radius - 4.0) / 5.0;
        mixedColor = colorMiddle.clone().lerp(colorOutside, ratio);
      } else {
        // Outer region
        const ratio = (radius - 9.0) / 9.0;
        mixedColor = colorOutside.clone().lerp(colorOuterEdge, ratio);
      }

      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;

      this.particleData.push({
        radius,
        angle,
        speed,
        yDispersion
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starTexture = createStarTexture();
    const material = new THREE.PointsMaterial({
      size: 0.12,
      map: starTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    this.particles = new THREE.Points(geometry, material);
    // Tilt the accretion disk slightly relative to the camera/cockpit view
    this.particles.rotation.x = Math.PI * 0.08;
    this.particles.rotation.z = Math.PI * 0.02;
    this.group.add(this.particles);

    // Position the black hole slightly forward
    this.group.position.set(0, 0.2, 0);

    // Initial Camera setup
    this.camera.position.set(0, 0, 12);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Tracks mouse movement to tilt spaceship cockpit view
   */
  handleMouseMove(event) {
    // Normalize coordinates (-1 to 1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Cockpit tilt offsets
    // Move camera slightly in response to cursor (pitch/yaw)
    this.targetCameraPos.x = this.mouse.x * 2.2;
    this.targetCameraPos.y = this.mouse.y * 1.5;

    // Rotate camera to look towards cursor
    this.targetCameraRot.y = -this.mouse.x * 0.25;
    this.targetCameraRot.x = this.mouse.y * 0.18;
  }

  update(deltaTime) {
    // 1. Accretion Disk Physics Simulation: Keplerian shear
    const positions = this.particles.geometry.attributes.position.array;
    
    for (let i = 0; i < this.particleData.length; i++) {
      const data = this.particleData[i];
      // Increment orbital angle based on speed
      data.angle += data.speed * deltaTime * 0.55;

      // Recalculate Cartesian positions
      positions[i * 3] = Math.cos(data.angle) * data.radius;
      positions[i * 3 + 1] = data.yDispersion + Math.sin(data.angle * 1.5) * 0.02; // Add a wave ripple
      positions[i * 3 + 2] = Math.sin(data.angle) * data.radius;
    }
    
    this.particles.geometry.attributes.position.needsUpdate = true;

    // 2. Slow orbital spin for lensing ring
    if (this.lensingRing) {
      this.lensingRing.rotation.z += 0.03 * deltaTime;
    }

    // 3. Keep Corona pointing at the camera
    if (this.corona) {
      this.corona.quaternion.copy(this.camera.quaternion);
    }

    // 4. Smooth spaceship view pan/tilt interpolation (lerp)
    this.currentCameraPos.x += (this.targetCameraPos.x - this.currentCameraPos.x) * 0.05;
    this.currentCameraPos.y += (this.targetCameraPos.y - this.currentCameraPos.y) * 0.05;
    this.currentCameraPos.z += (this.targetCameraPos.z - this.currentCameraPos.z) * 0.05;

    this.currentCameraRot.x += (this.targetCameraRot.x - this.currentCameraRot.x) * 0.05;
    this.currentCameraRot.y += (this.targetCameraRot.y - this.currentCameraRot.y) * 0.05;

    this.camera.position.set(this.currentCameraPos.x, this.currentCameraPos.y, this.currentCameraPos.z);
    this.camera.rotation.set(this.currentCameraRot.x, this.currentCameraRot.y, 0, 'YXZ');
  }

  destroy() {
    this.scene.remove(this.group);
    
    // Dispose resources
    if (this.eventHorizon) {
      this.eventHorizon.geometry.dispose();
      this.eventHorizon.material.dispose();
    }
    if (this.corona) {
      this.corona.geometry.dispose();
      this.corona.material.map.dispose();
      this.corona.material.dispose();
    }
    if (this.lensingRing) {
      this.lensingRing.geometry.dispose();
      this.lensingRing.material.dispose();
    }
    if (this.particles) {
      this.particles.geometry.dispose();
      this.particles.material.map.dispose();
      this.particles.material.dispose();
    }
  }
}
