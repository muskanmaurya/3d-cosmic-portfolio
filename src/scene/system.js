import * as THREE from 'three';
import gsap from 'gsap';
import { 
  createStarTexture, 
  createGasGiantTexture, 
  createRingTexture, 
  createLavaTexture, 
  createIceTexture, 
  createNebulaTexture 
} from './utils.js';

export class SystemScene {
  constructor(scene, camera, onFocusPlanet, onExitPlanet) {
    this.scene = scene;
    this.camera = camera;
    this.onFocusPlanet = onFocusPlanet;
    this.onExitPlanet = onExitPlanet;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Planets and interaction references
    this.planets = [];
    this.hoveredObject = null;
    this.focusedPlanet = null;

    // Raycaster for mouse picking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Default overview coordinates for the system view
    this.systemOverviewPos = { x: 0, y: 1.5, z: 15 };
    this.systemOverviewTarget = { x: 0, y: 0.2, z: -5 };

    // Current camera lookAt target for animation lerping
    this.cameraTarget = new THREE.Vector3().copy(this.systemOverviewTarget);

    // Movement speeds for visual interest
    this.rotationSpeeds = [];
    
    // Lights array for cleanup
    this.lights = [];

    this.init();
  }

  init() {
    // 1. Scene Lighting
    const ambientLight = new THREE.AmbientLight(0x0e1726, 0.85);
    this.scene.add(ambientLight);
    this.lights.push(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
    sunLight.position.set(12, 10, 15);
    this.scene.add(sunLight);
    this.lights.push(sunLight);

    // 2. Starfield Background
    const starCount = 3000;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Spawn stars in a large bounding sphere
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 80.0 + Math.random() * 60.0; // Distance between 80 and 140

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Star color temperatures (blue-white, white, orange)
      const rand = Math.random();
      if (rand < 0.4) {
        starColors[i * 3] = 0.9; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0; // Cool Blue
      } else if (rand < 0.85) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 1.0; starColors[i * 3 + 2] = 1.0; // Pure White
      } else {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.8; starColors[i * 3 + 2] = 0.6; // Warm Orange
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starTexture = createStarTexture();
    const starMat = new THREE.PointsMaterial({
      size: 0.28,
      map: starTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    this.starfield = new THREE.Points(starGeo, starMat);
    this.group.add(this.starfield);

    // 3. Volumetric Nebula Clouds
    this.createNebulaeClouds();

    // 4. PLANET 1: AEGIS (Gas Giant for Intro)
    this.createPlanetAegis();

    // 5. PLANET 2: PYROIS (Lava/Volcanic for Skills)
    this.createPlanetPyrois();

    // 6. PLANET 3: KRYOS (Ice Crystal for Projects)
    this.createPlanetKryos();

    // 7. PLANET 4: AETHER (Cyber Wireframe for Contact)
    this.createPlanetAether();

    // Prepare camera at initial overview
    this.camera.position.set(this.systemOverviewPos.x, this.systemOverviewPos.y, this.systemOverviewPos.z);
    this.camera.lookAt(this.cameraTarget);
  }

  createNebulaeClouds() {
    const nebulaColors = ['0, 170, 255', '153, 0, 255', '255, 0, 170'];
    this.nebulae = [];

    for (let i = 0; i < 4; i++) {
      const geo = new THREE.PlaneGeometry(60, 60);
      const texture = createNebulaTexture(nebulaColors[i % nebulaColors.length]);
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geo, mat);
      
      // Position far away in background, forming a nice backdrop wrap
      const angle = (i / 4) * Math.PI * 2;
      mesh.position.set(
        Math.cos(angle) * 45,
        (Math.random() - 0.5) * 15,
        Math.sin(angle) * 45 - 20
      );
      
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.group.add(mesh);
      this.nebulae.push(mesh);
    }
  }

  createPlanetAegis() {
    const aegisGroup = new THREE.Group();
    aegisGroup.position.set(-6.5, 0.2, -3);
    aegisGroup.name = 'intro';

    // Planet Body
    const bodyGeo = new THREE.SphereGeometry(1.3, 64, 64);
    const bodyTexture = createGasGiantTexture();
    const bodyMat = new THREE.MeshStandardMaterial({
      map: bodyTexture,
      roughness: 0.8,
      metalness: 0.1
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    aegisGroup.add(bodyMesh);

    // Planet Rings
    const ringGeo = new THREE.RingGeometry(1.7, 3.4, 64);
    
    // Map ring texture coords to span radial bands properly
    // Rotate ring plane profile coordinates
    const pos = ringGeo.attributes.position;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      ringGeo.attributes.uv.setXY(i, v3.length() / 3.4, 0);
    }
    
    const ringTexture = createRingTexture();
    const ringMat = new THREE.MeshBasicMaterial({
      map: ringTexture,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI * 0.45; // Tilt ring
    aegisGroup.add(ringMesh);

    this.group.add(aegisGroup);
    this.planets.push(aegisGroup);
    this.rotationSpeeds.push({ body: 0.12, parent: aegisGroup, customSpin: (t) => {
      bodyMesh.rotation.y = t * 0.15;
      ringMesh.rotation.z = -t * 0.05;
    }});
  }

  createPlanetPyrois() {
    const pyroisGroup = new THREE.Group();
    pyroisGroup.position.set(-2, 1.2, -10);
    pyroisGroup.name = 'skills';

    // Planet Body
    const bodyGeo = new THREE.SphereGeometry(1.0, 64, 64);
    const bodyTexture = createLavaTexture();
    const bodyMat = new THREE.MeshStandardMaterial({
      map: bodyTexture,
      roughness: 0.9,
      metalness: 0.2,
      emissive: new THREE.Color(0xff4500),
      emissiveIntensity: 0.18,
      emissiveMap: bodyTexture
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    pyroisGroup.add(bodyMesh);

    // Volumetric Flame Atmosphere
    const atmoGeo = new THREE.SphereGeometry(1.05, 32, 32);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0xff3a00,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    pyroisGroup.add(atmoMesh);

    this.group.add(pyroisGroup);
    this.planets.push(pyroisGroup);
    this.rotationSpeeds.push({ body: 0.08, parent: pyroisGroup, customSpin: (t) => {
      bodyMesh.rotation.y = -t * 0.08;
      // Pulse atmosphere size slightly
      const pulse = 1.05 + Math.sin(t * 1.5) * 0.015;
      atmoMesh.scale.set(pulse, pulse, pulse);
    }});
  }

  createPlanetKryos() {
    const kryosGroup = new THREE.Group();
    kryosGroup.position.set(4, -0.6, -7);
    kryosGroup.name = 'projects';

    // Ice crystals are polyhedrals
    // Use an Icosahedron with low segment count + flat shading for crystal facets
    const crystalGeo = new THREE.IcosahedronGeometry(0.95, 2);
    const iceTexture = createIceTexture();
    const crystalMat = new THREE.MeshPhongMaterial({
      map: iceTexture,
      color: 0xbae6fd,
      specular: 0xffffff,
      shininess: 120,
      flatShading: true,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    kryosGroup.add(crystalMesh);

    // Sub-layer spinning core
    const coreGeo = new THREE.IcosahedronGeometry(0.5, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    kryosGroup.add(coreMesh);

    this.group.add(kryosGroup);
    this.planets.push(kryosGroup);
    this.rotationSpeeds.push({ body: 0.05, parent: kryosGroup, customSpin: (t) => {
      crystalMesh.rotation.y = t * 0.05;
      crystalMesh.rotation.x = t * 0.02;
      coreMesh.rotation.y = -t * 0.12;
    }});
  }

  createPlanetAether() {
    const aetherGroup = new THREE.Group();
    aetherGroup.position.set(8.5, 1.4, -13);
    aetherGroup.name = 'contact';

    // 1. Dark Solid Core
    const coreGeo = new THREE.SphereGeometry(0.68, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x050a12,
      roughness: 0.3,
      metalness: 0.9,
      emissive: 0x001122
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    aetherGroup.add(coreMesh);

    // 2. Wireframe Neon Outer Grid
    const gridGeo = new THREE.SphereGeometry(0.9, 24, 24);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const gridMesh = new THREE.Mesh(gridGeo, gridMat);
    aetherGroup.add(gridMesh);

    // 3. Orbiting Satellite Rings
    const orbitRingGeo = new THREE.RingGeometry(1.2, 1.22, 64);
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15
    });
    
    const ring1 = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    ring1.rotation.x = Math.PI * 0.35;
    ring1.rotation.y = Math.PI * 0.1;
    aetherGroup.add(ring1);

    // Tiny orbiting satellite moon
    const moonGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    aetherGroup.add(moon);

    this.group.add(aetherGroup);
    this.planets.push(aetherGroup);
    this.rotationSpeeds.push({ body: 0.1, parent: aetherGroup, customSpin: (t) => {
      gridMesh.rotation.y = -t * 0.08;
      gridMesh.rotation.x = t * 0.03;
      coreMesh.rotation.y = t * 0.04;
      
      // Animate satellite position along circular ring
      const angle = t * 0.8;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Project circle onto tilted ring coordinates
      // Orbit radius 1.2
      const x = cos * 1.2;
      const y = sin * 1.2 * Math.cos(Math.PI * 0.35);
      const z = sin * 1.2 * Math.sin(Math.PI * 0.35);
      
      moon.position.set(x, y, z);
    }});
  }

  /**
   * Translates viewport click coordinates for planet picking
   */
  handleMouseClick(event) {
    // If a planet is already focused, click actions are captured by the HUD card
    if (this.focusedPlanet) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Test intersection against nested planet groups
    // Intersects can hits any descendants (body meshes, rings, grid lines)
    const intersects = this.raycaster.intersectObjects(this.planets, true);

    if (intersects.length > 0) {
      // Traverse up to find which top-level planet group was clicked
      let obj = intersects[0].object;
      while (obj.parent && !this.planets.includes(obj)) {
        obj = obj.parent;
      }
      
      if (this.planets.includes(obj)) {
        this.focusPlanet(obj);
      }
    }
  }

  /**
   * Tracks cursor positions to handle hover highlighting of planets
   */
  handleMouseMove(event) {
    if (this.focusedPlanet) return; // Disable highlights during focused cards

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.planets, true);

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !this.planets.includes(obj)) {
        obj = obj.parent;
      }

      if (this.planets.includes(obj)) {
        if (this.hoveredObject !== obj) {
          // Revert previous hover
          this.revertHover();

          // Highlight new hovered planet
          this.hoveredObject = obj;
          document.body.style.cursor = 'pointer';
          
          // Micro-animation: GSAP scale up
          gsap.to(obj.scale, {
            x: 1.15,
            y: 1.15,
            z: 1.15,
            duration: 0.3,
            ease: 'power2.out'
          });
        }
      }
    } else {
      this.revertHover();
    }
  }

  revertHover() {
    if (this.hoveredObject) {
      document.body.style.cursor = 'default';
      gsap.to(this.hoveredObject.scale, {
        x: 1.0,
        y: 1.0,
        z: 1.0,
        duration: 0.3,
        ease: 'power2.out'
      });
      this.hoveredObject = null;
    }
  }

  /**
   * Camera interpolation towards a selected planet
   */
  focusPlanet(planetGroup) {
    this.focusedPlanet = planetGroup;
    this.revertHover();

    // Call user callback to show corresponding portfolio layout
    if (this.onFocusPlanet) {
      this.onFocusPlanet(planetGroup.name);
    }

    // Target offsets for camera close-up orbits
    // Keep offset slightly in front (+Z) of planet positions
    const planetPos = new THREE.Vector3();
    planetGroup.getWorldPosition(planetPos);

    let offset;
    switch (planetGroup.name) {
      case 'intro':
        offset = new THREE.Vector3(0, 0.4, 3.6); // Slightly zoomed out for Aegis and its ring
        break;
      case 'skills':
        offset = new THREE.Vector3(0.5, 0, 2.5);
        break;
      case 'projects':
        offset = new THREE.Vector3(-0.3, 0.2, 2.4);
        break;
      case 'contact':
        offset = new THREE.Vector3(0, 0.1, 2.2);
        break;
      default:
        offset = new THREE.Vector3(0, 0, 3.0);
    }

    const targetCamPos = planetPos.clone().add(offset);

    // Animate camera position and camera lookAt target using GSAP
    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.cameraTarget);

    gsap.to(this.camera.position, {
      x: targetCamPos.x,
      y: targetCamPos.y,
      z: targetCamPos.z,
      duration: 1.8,
      ease: 'power3.inOut'
    });

    gsap.to(this.cameraTarget, {
      x: planetPos.x,
      y: planetPos.y,
      z: planetPos.z,
      duration: 1.8,
      ease: 'power3.inOut'
    });
  }

  /**
   * Camera interpolation back to solar system overview
   */
  exitPlanetFocus() {
    if (!this.focusedPlanet) return;
    this.focusedPlanet = null;

    if (this.onExitPlanet) {
      this.onExitPlanet();
    }

    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.cameraTarget);

    gsap.to(this.camera.position, {
      x: this.systemOverviewPos.x,
      y: this.systemOverviewPos.y,
      z: this.systemOverviewPos.z,
      duration: 1.6,
      ease: 'power2.inOut'
    });

    gsap.to(this.cameraTarget, {
      x: this.systemOverviewTarget.x,
      y: this.systemOverviewTarget.y,
      z: this.systemOverviewTarget.z,
      duration: 1.6,
      ease: 'power2.inOut'
    });
  }

  update(deltaTime, elapsedTime) {
    // 1. Orbit & Spin Animations
    for (let i = 0; i < this.rotationSpeeds.length; i++) {
      const rot = this.rotationSpeeds[i];
      // Perform planet-specific custom coordinate spins
      rot.customSpin(elapsedTime);
      
      // Perform general orbital drift
      // Slowly revolve around center (only slightly, so sections stay relatively static)
      // Aegis revolves around a virtual sun
      const radius = Math.sqrt(rot.parent.position.x * rot.parent.position.x + rot.parent.position.z * rot.parent.position.z);
      // Let's add a very tiny orbital velocity so it looks dynamic, but doesn't drift away too far
      const speed = 0.006 / radius;
      const currentAngle = Math.atan2(rot.parent.position.z, rot.parent.position.x);
      const newAngle = currentAngle + speed * deltaTime * 12;
      
      // rot.parent.position.x = Math.cos(newAngle) * radius;
      // rot.parent.position.z = Math.sin(newAngle) * radius;
    }

    // 2. Slow starfield drift for interstellar backdrop sensation
    if (this.starfield) {
      this.starfield.rotation.y = elapsedTime * 0.008;
      this.starfield.rotation.x = elapsedTime * 0.003;
    }

    // 3. Update Camera lookAt pointing vector
    if (!this.focusedPlanet) {
      // In overview: camera rotation is managed by main.js cock-pit tilt controls
    } else {
      // In close-up focus: lock camera to planet lookAt coordinate points
      this.camera.lookAt(this.cameraTarget);
    }
  }

  destroy() {
    this.scene.remove(this.group);

    // Lights cleanup
    this.lights.forEach(light => this.scene.remove(light));

    // Starfield cleanup
    if (this.starfield) {
      this.starfield.geometry.dispose();
      this.starfield.material.map.dispose();
      this.starfield.material.dispose();
    }

    // Nebulae cleanup
    if (this.nebulae) {
      this.nebulae.forEach(mesh => {
        mesh.geometry.dispose();
        mesh.material.map.dispose();
        mesh.material.dispose();
      });
    }

    // Planets meshes cleanup
    this.planets.forEach(planet => {
      planet.traverse(child => {
        if (child.isMesh) {
          child.geometry.dispose();
          if (child.material.map) child.material.map.dispose();
          if (child.material.emissiveMap) child.material.emissiveMap.dispose();
          child.material.dispose();
        }
      });
    });
  }
}
