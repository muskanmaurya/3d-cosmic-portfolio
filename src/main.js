import * as THREE from 'three';
import gsap from 'gsap';
import { 
  createStarTexture, 
  createGasGiantTexture, 
  createRingTexture, 
  createLavaTexture, 
  createIceTexture, 
  createNebulaTexture 
} from './scene/utils.js';

// --- State Management ---
// States: 'IDLE' | 'WARPING' | 'EXPLORING'
let currentSceneState = 'IDLE';

// --- WebGL Setup ---
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 2000);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// --- Global Lighting ---
// Toned-down ambient to maintain deep space atmosphere
const ambientLight = new THREE.AmbientLight(0x0a0c16, 0.4);
scene.add(ambientLight);

// Hemisphere Light for soft cosmic color fill
const hemiLight = new THREE.HemisphereLight(0x00f0ff, 0xbd00ff, 0.45);
scene.add(hemiLight);

// Directional Sun Light
const sunLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
sunLight.position.set(60, 50, 80);
scene.add(sunLight);

// --- DOM Bindings ---
const loaderOverlay = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');
const loaderPercentage = document.getElementById('loader-percentage');

const heroInterface = document.getElementById('hero-interface');
const exploreBtn = document.getElementById('explore-btn');
const travelAlert = document.getElementById('travel-alert');
const flashOverlay = document.getElementById('flash-overlay');

const hudNav = document.getElementById('hud-nav');
const navButtons = document.querySelectorAll('.nav-btn');

const hudCoordinates = document.getElementById('hud-coordinates');
const hudVelocity = document.getElementById('hud-velocity');
const hudTargetObj = document.getElementById('hud-target');
const hudAutopilot = document.getElementById('hud-autopilot');
const warpStatusHUD = document.getElementById('warp-status');
const radValueHUD = document.getElementById('rad-value');
const radarStatusText = document.getElementById('radar-status-text');

// Radar blips
const blips = {
  intro: document.getElementById('blip-intro'),
  skills: document.getElementById('blip-skills'),
  projects: document.getElementById('blip-projects'),
  contact: document.getElementById('blip-contact')
};

// Portfolio overlay
const portfolioOverlay = document.getElementById('portfolio-overlay');
const closeCardBtn = document.getElementById('close-card-btn');
const cards = {
  intro: document.getElementById('card-intro'),
  skills: document.getElementById('card-skills'),
  projects: document.getElementById('card-projects'),
  contact: document.getElementById('card-contact')
};

// --- Flight & Look Variables ---
let isThrusting = false;
let warpSpeedFactor = 1.0; // Speeds up particles during dive
let lineStretchFactor = 1.0; // Stretches line length during dive
let currentVelocity = 0; // km/s displayed on HUD
const maxThrustSpeed = 65.0; // Units per second in WebGL space

const targetRotation = { x: 0, y: 0 };
let currentYaw = 0;
let currentPitch = 0;

// Mouse coordinates
const mouse = new THREE.Vector2();

// Autopilot proximity lock
let isPlanetLocked = false;
let lockedPlanet = null;

// Camera shake variables (for black hole entry turbulence)
let shakeIntensity = 0.0;

// --- 3D Scene Components ---

// Group containers
const heroGroup = new THREE.Group();
scene.add(heroGroup);

const planetGroup = new THREE.Group();
planetGroup.visible = false;
scene.add(planetGroup);

// Raycaster for exploration mode
const raycaster = new THREE.Raycaster();

// --- 1. HERO SCENE: THE BLACK HOLE & TIME-TUNNEL LINES ---
let eventHorizon, corona, lensingRing, blackHoleParticles, timeTunnelLines;
const bhParticleData = [];
const tunnelLineData = [];

function createHeroScene() {
  const starTex = createStarTexture();

  // Event Horizon
  const ehGeo = new THREE.SphereGeometry(1.6, 64, 64);
  const ehMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  eventHorizon = new THREE.Mesh(ehGeo, ehMat);
  heroGroup.add(eventHorizon);

  // Volumetric Corona Glow (Behind Black Hole)
  const coronaGeo = new THREE.PlaneGeometry(5.8, 5.8);
  const coronaMat = new THREE.MeshBasicMaterial({
    map: starTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  corona = new THREE.Mesh(coronaGeo, coronaMat);
  corona.position.z = -0.1;
  heroGroup.add(corona);

  // Gravitational Lensing Ring
  const lensGeo = new THREE.RingGeometry(1.8, 3.4, 64);
  const lensMat = new THREE.MeshBasicMaterial({
    color: 0xff8c00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  lensingRing = new THREE.Mesh(lensGeo, lensMat);
  lensingRing.rotation.x = Math.PI * 0.42;
  lensingRing.rotation.y = Math.PI * 0.05;
  heroGroup.add(lensingRing);

  // Particle Accretion Disk (Keplerian orbits)
  const particleCount = 20000;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const bhGeo = new THREE.BufferGeometry();

  const colorInside = new THREE.Color('#ffffff'); // Hot central White
  const colorMiddle = new THREE.Color('#ff8c00'); // Orange accretion
  const colorOutside = new THREE.Color('#ff2200'); // Fading red
  const colorOuter = new THREE.Color('#3b0055'); // Boundary Purple

  for (let i = 0; i < particleCount; i++) {
    const radius = 2.2 + Math.pow(Math.random(), 2.0) * 15.0;
    const angle = Math.random() * Math.PI * 2;
    
    // Orbital speed inversely proportional to square root of radius
    const speed = (1.6 / Math.sqrt(radius)) * (0.8 + Math.random() * 0.4);
    const thickness = (1.0 / (radius + 1.0)) * 0.6;
    const yDispersion = (Math.random() - 0.5) * thickness;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = yDispersion;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    let mixedColor;
    if (radius < 4.5) {
      mixedColor = colorInside.clone().lerp(colorMiddle, (radius - 2.2) / 2.3);
    } else if (radius < 9.5) {
      mixedColor = colorMiddle.clone().lerp(colorOutside, (radius - 4.5) / 5.0);
    } else {
      mixedColor = colorOutside.clone().lerp(colorOuter, (radius - 9.5) / 7.7);
    }

    colors[i * 3] = mixedColor.r;
    colors[i * 3 + 1] = mixedColor.g;
    colors[i * 3 + 2] = mixedColor.b;

    bhParticleData.push({ radius, angle, speed, yDispersion });
  }

  bhGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  bhGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const bhMat = new THREE.PointsMaterial({
    size: 0.12,
    map: starTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true
  });

  blackHoleParticles = new THREE.Points(bhGeo, bhMat);
  blackHoleParticles.rotation.x = Math.PI * 0.08;
  heroGroup.add(blackHoleParticles);

  // Time-Tunnel Speed Lines (Wormhole overlay during dive)
  const lineCount = 400;
  const linePositions = new Float32Array(lineCount * 6);
  const lineColors = new Float32Array(lineCount * 6);
  const tunnelGeo = new THREE.BufferGeometry();

  const cyanColor = new THREE.Color(0x00f0ff);
  const magentaColor = new THREE.Color(0xff00bb);

  for (let i = 0; i < lineCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 3.5 + 0.5; // Tunnel thickness
    const z = (Math.random() - 0.5) * 35.0; // Spread along Z path
    const speed = Math.random() * 25.0 + 15.0;
    const baseLength = Math.random() * 0.4 + 0.15; // Short lines initially

    tunnelLineData.push({ angle, radius, z, speed, baseLength });

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Vertex 1
    linePositions[i * 6] = cos * radius;
    linePositions[i * 6 + 1] = sin * radius;
    linePositions[i * 6 + 2] = z;

    // Vertex 2
    linePositions[i * 6 + 3] = cos * radius;
    linePositions[i * 6 + 4] = sin * radius;
    linePositions[i * 6 + 5] = z + baseLength;

    // Color interpolation
    const mixed = cyanColor.clone().lerp(magentaColor, radius / 4.0);
    lineColors[i * 6] = mixed.r;
    lineColors[i * 6 + 1] = mixed.g;
    lineColors[i * 6 + 2] = mixed.b;

    // Fade out trailing vertex
    lineColors[i * 6 + 3] = mixed.r * 0.15;
    lineColors[i * 6 + 4] = mixed.g * 0.15;
    lineColors[i * 6 + 5] = mixed.b * 0.15;
  }

  tunnelGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  tunnelGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

  const tunnelMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.05, // Almost invisible in IDLE
    blending: THREE.AdditiveBlending
  });

  timeTunnelLines = new THREE.LineSegments(tunnelGeo, tunnelMat);
  heroGroup.add(timeTunnelLines);

  // Position camera for landing page
  camera.position.set(0, 0, 12);
  camera.lookAt(0, 0, 0);
}

// --- 2. THE RICH GALAXY ENVIRONMENT (EXPLORING WORLD) ---
const asteroids = [];

function createPlanetScene() {
  // A. Dense Deep Space Starfield (12,000+ points)
  const starCount = 12000;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  const starCols = new Float32Array(starCount * 3);
  const starTex = createStarTexture();

  for (let i = 0; i < starCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2 * Math.PI;
    const phi = Math.acos(2 * v - 1);
    
    // Position stars in a giant hollow shell
    const r = 250 + Math.random() * 650;

    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);

    // Tints (Cyan, Purple, Pure white)
    const rand = Math.random();
    if (rand < 0.4) {
      // Soft blue/cyan tint
      starCols[i * 3] = 0.75; starCols[i * 3 + 1] = 0.90; starCols[i * 3 + 2] = 1.0;
    } else if (rand < 0.75) {
      // White stars
      starCols[i * 3] = 1.0; starCols[i * 3 + 1] = 1.0; starCols[i * 3 + 2] = 1.0;
    } else {
      // Purple/magenta tint
      starCols[i * 3] = 0.92; starCols[i * 3 + 1] = 0.70; starCols[i * 3 + 2] = 1.0;
    }
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCols, 3));

  const starMat = new THREE.PointsMaterial({
    size: 0.95,
    map: starTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true
  });
  const galaxyStarfield = new THREE.Points(starGeo, starMat);
  planetGroup.add(galaxyStarfield);

  // B. Volumetric Nebula Clouds
  const nebulaColors = ['0, 160, 255', '140, 0, 255', '255, 0, 150'];
  for (let i = 0; i < 5; i++) {
    const geo = new THREE.PlaneGeometry(350, 350);
    const texture = createNebulaTexture(nebulaColors[i % nebulaColors.length]);
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    const angle = (i / 5) * Math.PI * 2;
    mesh.position.set(Math.cos(angle) * 200, (Math.random() - 0.5) * 100, Math.sin(angle) * 200 - 150);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    planetGroup.add(mesh);
  }

  // C. Local Planetary Lights (Inject color overlays in space coordinates)
  const introLight = new THREE.PointLight(0x00aaff, 5, 200);
  introLight.position.set(-85, 15, -130);
  planetGroup.add(introLight);

  const skillsLight = new THREE.PointLight(0xff3b00, 6, 250);
  skillsLight.position.set(-30, -45, -280);
  planetGroup.add(skillsLight);

  const contactLight = new THREE.PointLight(0xc084fc, 6, 250);
  contactLight.position.set(95, -20, -320);
  planetGroup.add(contactLight);

  // D. Procedural Dwarf Planets / Asteroids Field (30 meshes scattered in background)
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d414a,
    roughness: 0.95,
    metalness: 0.05
  });

  for (let i = 0; i < 30; i++) {
    // Random polyhedral rock structures
    const geometry = new THREE.IcosahedronGeometry(Math.random() * 2.8 + 1.2, 1);
    
    // Distort vertices slightly to make rocks look irregular and organic
    const pos = geometry.attributes.position;
    for (let j = 0; j < pos.count; j++) {
      const idx = j * 3;
      pos.array[idx] += (Math.random() - 0.5) * 0.4;
      pos.array[idx + 1] += (Math.random() - 0.5) * 0.4;
      pos.array[idx + 2] += (Math.random() - 0.5) * 0.4;
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();

    const rock = new THREE.Mesh(geometry, rockMaterial);
    
    // Position scattered far in the backdrop
    const x = (Math.random() - 0.5) * 450;
    const y = (Math.random() - 0.5) * 250;
    const z = -100 - Math.random() * 380;
    
    // Make sure rocks do not intersect close-up orbit paths of main planets
    rock.position.set(x, y, z);
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    
    planetGroup.add(rock);
    
    // Save rotation speeds
    asteroids.push({
      mesh: rock,
      rotSpeedX: (Math.random() - 0.5) * 0.2,
      rotSpeedY: (Math.random() - 0.5) * 0.2
    });
  }

  // E. CREATE 4 MAIN DETAILED INTERACTIVE PLANETS

  // Planet 1: About Me (Blue/Water)
  const p1Group = new THREE.Group();
  p1Group.position.set(-85, 15, -130);
  p1Group.name = 'intro';
  
  const p1Body = new THREE.Mesh(
    new THREE.SphereGeometry(15, 64, 64),
    new THREE.MeshStandardMaterial({
      map: createGasGiantTexture(),
      roughness: 0.65,
      metalness: 0.15,
      emissive: new THREE.Color(0x004488),
      emissiveIntensity: 0.15
    })
  );
  p1Group.add(p1Body);

  const ringGeo = new THREE.RingGeometry(18, 35, 64);
  const pos = ringGeo.attributes.position;
  const v3 = new THREE.Vector3();
  if (!ringGeo.attributes.uv) {
    const uvs = new Float32Array(pos.count * 2);
    ringGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }
  const uvAttr = ringGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    uvAttr.setXY(i, v3.length() / 35, 0);
  }
  const p1Rings = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({
      map: createRingTexture(),
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  p1Rings.rotation.x = Math.PI * 0.45;
  p1Group.add(p1Rings);

  planetGroup.add(p1Group);
  planets.push(p1Group);

  // Planet 2: Skills (Orange/Lava)
  const p2Group = new THREE.Group();
  p2Group.position.set(-30, -45, -280);
  p2Group.name = 'skills';

  const lavaTex = createLavaTexture();
  const p2Body = new THREE.Mesh(
    new THREE.SphereGeometry(14, 64, 64),
    new THREE.MeshStandardMaterial({
      map: lavaTex,
      roughness: 0.85,
      metalness: 0.2,
      emissive: new THREE.Color(0xff3a00),
      emissiveIntensity: 0.25,
      emissiveMap: lavaTex
    })
  );
  p2Group.add(p2Body);

  const p2Atmo = new THREE.Mesh(
    new THREE.SphereGeometry(14.8, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff3b00,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    })
  );
  p2Group.add(p2Atmo);

  planetGroup.add(p2Group);
  planets.push(p2Group);

  // Planet 3: Projects (Green/Earth)
  const p3Group = new THREE.Group();
  p3Group.position.set(75, 20, -180);
  p3Group.name = 'projects';

  const p3Body = new THREE.Mesh(
    new THREE.SphereGeometry(13, 64, 64),
    new THREE.MeshStandardMaterial({
      color: 0x052e16,
      roughness: 0.8,
      metalness: 0.1,
      emissive: new THREE.Color(0x059669),
      emissiveIntensity: 0.08
    })
  );
  p3Group.add(p3Body);

  const p3Clouds = new THREE.Mesh(
    new THREE.SphereGeometry(13.4, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
      blending: THREE.AdditiveBlending
    })
  );
  p3Group.add(p3Clouds);

  planetGroup.add(p3Group);
  planets.push(p3Group);

  // Planet 4: Contact (Purple/Crystal)
  const p4Group = new THREE.Group();
  p4Group.position.set(95, -20, -320);
  p4Group.name = 'contact';

  const crystalGeo = new THREE.IcosahedronGeometry(12, 2);
  const iceTex = createIceTexture();
  const p4Body = new THREE.Mesh(
    crystalGeo,
    new THREE.MeshPhongMaterial({
      map: iceTex,
      color: 0xc084fc,
      specular: 0xffffff,
      shininess: 120,
      flatShading: true,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    })
  );
  p4Group.add(p4Body);

  const p4Cage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(13.2, 1),
    new THREE.MeshBasicMaterial({
      color: 0x9333ea,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending
    })
  );
  p4Group.add(p4Cage);

  planetGroup.add(p4Group);
  planets.push(p4Group);
}

// Generate components
createHeroScene();
createPlanetScene();

// --- Loader Progress Mock ---
let bootPercent = 0;
const bootInterval = setInterval(() => {
  bootPercent += Math.floor(Math.random() * 8) + 4;
  if (bootPercent >= 100) {
    bootPercent = 100;
    clearInterval(bootInterval);
    gsap.delayedCall(0.5, () => {
      loaderOverlay.style.opacity = '0';
      gsap.delayedCall(0.8, () => {
        loaderOverlay.style.display = 'none';
      });
    });
  }
  loaderBar.style.width = `${bootPercent}%`;
  loaderPercentage.innerText = `${bootPercent}%`;
}, 50);

// --- User Interaction Listeners ---

// 1. Mouse coordinate tracking
window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / sizes.width) * 2 - 1;
  mouse.y = -(e.clientY / sizes.height) * 2 + 1;

  if (currentSceneState === 'IDLE') {
    // Subtle tilt for landing page
    targetRotation.y = -mouse.x * 0.25;
    targetRotation.x = mouse.y * 0.18;
  } 
  else if (currentSceneState === 'EXPLORING' && !isPlanetLocked) {
    // Pitch & Yaw flight controls
    targetRotation.y = -mouse.x * 1.8;
    targetRotation.x = mouse.y * 1.2;
  }
});

// 2. Spaceship forward thrust triggers (Left Mouse Click)
window.addEventListener('mousedown', (e) => {
  if (currentSceneState === 'EXPLORING' && !isPlanetLocked && e.button === 0) {
    isThrusting = true;
  }
});

window.addEventListener('mouseup', () => {
  isThrusting = false;
});

// Keyboard thrust inputs ('W' / 'w')
window.addEventListener('keydown', (e) => {
  if (currentSceneState === 'EXPLORING' && !isPlanetLocked && (e.key === 'w' || e.key === 'W')) {
    isThrusting = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (currentSceneState === 'EXPLORING' && (e.key === 'w' || e.key === 'W')) {
    isThrusting = false;
  }
});

// --- Cinematic Warp Dive Sequence ---
exploreBtn.addEventListener('click', () => {
  if (currentSceneState !== 'IDLE') return;
  currentSceneState = 'WARPING';

  // 1. Hide HTML dashboards and alarm thrusters
  heroInterface.classList.add('hidden');
  travelAlert.classList.remove('hidden');
  warpStatusHUD.innerText = 'ACTIVE';
  warpStatusHUD.className = 'hud-value text-glow-red blinking';
  warpStatusHUD.style.color = '#ff3b3b';

  // Make wormhole lines visible
  if (timeTunnelLines) {
    timeTunnelLines.material.opacity = 0.85;
  }

  // 2. GSAP Dive and Warp Timeline
  const tl = gsap.timeline();

  // Phase A: Animate camera position DIRECTLY INTO the black hole center (0, 0, 0)
  // And apply camera barrel roll spin to simulate gravitational warping!
  tl.to(camera.position, {
    x: 0,
    y: 0.15, // Align close to event horizon center
    z: -0.8, // Dive straight past the singularity
    duration: 3.4,
    ease: 'power3.inOut'
  });

  // Stretch camera FOV to 120 (warp speed stretch effect)
  tl.to(camera, {
    fov: 120,
    duration: 3.4,
    ease: 'power3.in',
    onUpdate: () => {
      camera.updateProjectionMatrix();
    }
  }, 0);

  // Speed up and stretch the warp speed star lines
  tl.to({ valSpeed: 1.0, valStretch: 1.0, shake: 0.0 }, {
    valSpeed: 18.0,
    valStretch: 12.0,
    shake: 1.8, // Accelerate cockpit vibration noise
    duration: 3.4,
    ease: 'power3.in',
    onUpdate: function() {
      const obj = this.targets()[0];
      warpSpeedFactor = obj.valSpeed;
      lineStretchFactor = obj.valStretch;
      shakeIntensity = obj.shake;
    }
  }, 0);

  // Phase B: Blinding screen white flash right as camera hits the singularity
  tl.to(flashOverlay, {
    opacity: 1.0,
    duration: 0.35,
    ease: 'power1.out'
  }, 3.15); // Trigger just before positions align fully to capture moment

  // Scene Swap at peak whiteout
  tl.add(() => {
    // Deactivate black hole and warp lines meshes
    heroGroup.visible = false;
    
    // Reveal colorful planetary system
    planetGroup.visible = true;

    // Reset camera parameters
    camera.fov = 60;
    camera.updateProjectionMatrix();
    
    // Position spaceship at overview starting coordinates
    camera.position.set(0, 0, 90);
    camera.rotation.set(0, 0, 0);
    currentYaw = 0;
    currentPitch = 0;
    targetRotation.x = 0;
    targetRotation.y = 0;
    shakeIntensity = 0.0;

    // Swap state
    currentSceneState = 'EXPLORING';
    
    // Reset HUD panels
    travelAlert.classList.add('hidden');
    warpStatusHUD.innerText = 'OFFLINE';
    warpStatusHUD.className = 'hud-value green-text text-glow-green';
    warpStatusHUD.style.color = '';
    hudAutopilot.innerText = 'AUTO';
    hudAutopilot.className = 'hud-value text-glow-green';
    hudNav.classList.remove('hidden');

    // Reveal radar blips
    Object.keys(blips).forEach(k => blips[k].classList.remove('hidden'));
    radarStatusText.innerText = 'SYS NORMAL';
    radarStatusText.parentNode.querySelector('.color-dot').className = 'color-dot green';
  });

  // Phase C: Fade back in & establish free space flight controls
  tl.to(flashOverlay, {
    opacity: 0,
    duration: 1.2,
    ease: 'power2.inOut'
  });
});

// --- Planet Proximity Locked UI Actions ---

function lockOnPlanet(planetName, planetGroup) {
  isPlanetLocked = true;
  isThrusting = false;
  lockedPlanet = planetGroup;

  // Toggle HUD status
  hudAutopilot.innerText = 'LOCKED';
  hudAutopilot.className = 'hud-value text-glow-blue';
  hudTargetObj.innerText = planetName.toUpperCase();

  // Highlight navigation bar shortcuts
  navButtons.forEach(btn => {
    if (btn.getAttribute('data-destination') === planetName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Smoothly position camera in front of planet for orbit close-up
  const planetPos = new THREE.Vector3();
  planetGroup.getWorldPosition(planetPos);

  const lookTarget = planetPos.clone();
  
  // Custom camera look offsets per planet
  let lookOffset;
  if (planetName === 'intro') {
    lookOffset = new THREE.Vector3(0, 5, 45); // Aegis rings require zoom out
  } else if (planetName === 'skills') {
    lookOffset = new THREE.Vector3(8, 0, 32);
  } else if (planetName === 'projects') {
    lookOffset = new THREE.Vector3(-6, 4, 30);
  } else {
    lookOffset = new THREE.Vector3(0, 0, 28);
  }

  const destPos = planetPos.clone().add(lookOffset);

  // GSAP transition
  gsap.killTweensOf(camera.position);
  gsap.to(camera.position, {
    x: destPos.x,
    y: destPos.y,
    z: destPos.z,
    duration: 1.5,
    ease: 'power2.out',
    onUpdate: () => {
      camera.lookAt(lookTarget);
    },
    onComplete: () => {
      // Show portfolio overlays
      portfolioOverlay.classList.remove('hidden');
      Object.keys(cards).forEach(k => {
        if (k === planetName) {
          cards[k].classList.remove('hidden');
          gsap.fromTo(cards[k], { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5 });
        } else {
          cards[k].classList.add('hidden');
        }
      });
    }
  });
}

// Close and release autopilot lock
closeCardBtn.addEventListener('click', () => {
  releaseAutopilotLock();
});

function releaseAutopilotLock() {
  if (!isPlanetLocked) return;
  
  portfolioOverlay.classList.add('hidden');
  
  // Revert navigation sidebar
  navButtons.forEach(btn => {
    if (btn.getAttribute('data-destination') === 'system') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // GSAP push spaceship back slightly to clear proximity boundary
  const planetPos = new THREE.Vector3();
  lockedPlanet.getWorldPosition(planetPos);

  const pushDir = new THREE.Vector3().subVectors(camera.position, planetPos).normalize();
  const pushTarget = planetPos.clone().add(pushDir.multiplyScalar(65)); // Push beyond 25 unit limit

  gsap.to(camera.position, {
    x: pushTarget.x,
    y: pushTarget.y,
    z: pushTarget.z,
    duration: 1.5,
    ease: 'power2.inOut',
    onComplete: () => {
      isPlanetLocked = false;
      lockedPlanet = null;

      hudAutopilot.innerText = 'AUTO';
      hudAutopilot.className = 'hud-value text-glow-green';
      hudTargetObj.innerText = 'DEEP SPACE';
      
      // Sync Euler angle yaw/pitch offsets to current camera look vectors
      // prevents screen snapping when mouse takes control again
      const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      currentYaw = euler.y;
      currentPitch = euler.x;
      targetRotation.y = euler.y;
      targetRotation.x = euler.x;
    }
  });
}

// Quick Navigation Menu Click routing
navButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const dest = e.target.getAttribute('data-destination');
    if (currentSceneState !== 'EXPLORING') return;

    if (dest === 'system') {
      releaseAutopilotLock();
    } else {
      const targetPlanet = planets.find(p => p.name === dest);
      if (targetPlanet) {
        // If locked on another, release instantly and lock to new
        isPlanetLocked = false;
        portfolioOverlay.classList.add('hidden');
        lockOnPlanet(dest, targetPlanet);
      }
    }
  });
});

// Contact Form Encryption Mock
const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');
contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const submitBtn = contactForm.querySelector('.submit-btn');
  const btnContent = submitBtn.querySelector('.button-content');
  btnContent.innerText = 'ENCRYPTING PAYLOAD...';
  setTimeout(() => {
    contactForm.reset();
    btnContent.innerText = 'SEND TRANSMISSION';
    formStatus.classList.remove('hidden');
    setTimeout(() => formStatus.classList.add('hidden'), 4000);
  }, 1200);
});

// --- Game Loop ---
const clock = new THREE.Clock();
let lastElapsedTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - lastElapsedTime;
  lastElapsedTime = elapsedTime;

  // --- PHASE 1: IDLE / WARPING (BLACK HOLE DIVE & TIMELAPSE WARP LINES) ---
  if (currentSceneState === 'IDLE' || currentSceneState === 'WARPING') {
    // 1. Keplerian disk shearing particles update
    if (blackHoleParticles) {
      const positions = blackHoleParticles.geometry.attributes.position.array;
      for (let i = 0; i < bhParticleData.length; i++) {
        const data = bhParticleData[i];
        // Multiply orbits by velocity multiplier during warping sequence
        data.angle += data.speed * deltaTime * 0.65 * warpSpeedFactor;
        
        positions[i * 3] = Math.cos(data.angle) * data.radius;
        positions[i * 3 + 1] = data.yDispersion + Math.sin(data.angle * 1.5) * 0.02;
        positions[i * 3 + 2] = Math.sin(data.angle) * data.radius;
      }
      blackHoleParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Animate and Stretch the Time-Tunnel Warp Lines
    if (timeTunnelLines) {
      const positions = timeTunnelLines.geometry.attributes.position.array;
      for (let i = 0; i < tunnelLineData.length; i++) {
        const data = tunnelLineData[i];
        
        // Move lines past camera along negative Z direction (since camera goes from Z=12 to Z=0)
        // Wait, camera moves in -Z direction (diving inside). Thus, lines should fly backwards (+Z) relative to camera!
        data.z += data.speed * deltaTime * warpSpeedFactor * 0.5;

        // Recycle lines when they pass behind the camera
        const currentCamZ = camera.position.z;
        if (data.z > currentCamZ + 5.0) {
          data.z = currentCamZ - 30.0;
        }

        const cos = Math.cos(data.angle);
        const sin = Math.sin(data.angle);
        const dynamicLength = data.baseLength * lineStretchFactor;

        // Vertex 1
        positions[i * 6] = cos * data.radius;
        positions[i * 6 + 1] = sin * data.radius;
        positions[i * 6 + 2] = data.z;

        // Vertex 2 (Stretched along Z direction)
        positions[i * 6 + 3] = cos * data.radius;
        positions[i * 6 + 4] = sin * data.radius;
        positions[i * 6 + 5] = data.z + dynamicLength;
      }
      timeTunnelLines.geometry.attributes.position.needsUpdate = true;
    }

    // 3. Slow lensing ring spins
    if (lensingRing) {
      lensingRing.rotation.z += 0.035 * deltaTime * warpSpeedFactor;
    }

    // 4. Keep volumetric corona billboard facing camera
    if (corona) {
      corona.quaternion.copy(camera.quaternion);
    }

    // 5. Smooth cockpit mouse lag tilt (Interpolation) + Turbulant Shake
    currentYaw += (targetRotation.y - currentYaw) * 0.05;
    currentPitch += (targetRotation.x - currentPitch) * 0.05;
    camera.rotation.set(currentPitch, currentYaw, 0, 'YXZ');

    // Add turbulence vibration as camera gets closer to singularity
    if (shakeIntensity > 0.0) {
      const shakeX = (Math.random() - 0.5) * 0.05 * shakeIntensity;
      const shakeY = (Math.random() - 0.5) * 0.05 * shakeIntensity;
      camera.position.x += shakeX;
      camera.position.y += shakeY;
    }

    // 6. Update HUD diagnostics
    hudCoordinates.innerText = `X: ${camera.position.x.toFixed(2)} Y: ${camera.position.y.toFixed(2)} Z: ${camera.position.z.toFixed(2)}`;
    
    if (currentSceneState === 'IDLE') {
      currentVelocity += (0 - currentVelocity) * 0.05;
      hudVelocity.innerText = `${currentVelocity.toFixed(2)} km/s`;
      const rad = 0.02 + Math.sin(elapsedTime * 4.0) * 0.005;
      radValueHUD.innerText = `${rad.toFixed(3)} mSv`;
    } else {
      // Warp speed increases 100x HUD readout!
      const warpVelocity = (elapsedTime - (elapsedTime - 3.4)) * 95000 * (warpSpeedFactor / 18);
      hudVelocity.innerText = `${Math.floor(warpVelocity).toLocaleString()} km/s`;
      const rad = 0.02 + Math.pow(warpSpeedFactor, 2.0) * 0.85;
      radValueHUD.innerText = `${rad.toFixed(2)} mSv`;
    }
  }

  // --- PHASE 2: EXPLORING (FREE GALAXY FLIGHT SPACESHIP CONTROLS & ASTEROIDS) ---
  else if (currentSceneState === 'EXPLORING') {
    // 1. Handle free spaceflight look rotation
    if (!isPlanetLocked) {
      currentYaw += (targetRotation.y - currentYaw) * 0.05;
      currentPitch += (targetRotation.x - currentPitch) * 0.05;
      camera.rotation.set(currentPitch, currentYaw, 0, 'YXZ');

      // 2. Handle forward spaceship thrust translation
      if (isThrusting) {
        // Accelerate velocity HUD values
        currentVelocity += (maxThrustSpeed * 1000 - currentVelocity) * 0.08;
        // Translate camera along local forward direction (negative Z)
        camera.translateZ(-maxThrustSpeed * deltaTime);
      } else {
        // Decelerate velocity HUD readouts
        currentVelocity += (0 - currentVelocity) * 0.05;
      }
    } else {
      // LOCKED proximity speedometer remains 0
      currentVelocity += (0 - currentVelocity) * 0.08;
    }

    hudVelocity.innerText = `${Math.floor(currentVelocity).toLocaleString()} km/s`;
    hudCoordinates.innerText = `X: ${camera.position.x.toFixed(2)} Y: ${camera.position.y.toFixed(2)} Z: ${camera.position.z.toFixed(2)}`;
    
    // Core stable radiation readings
    const rad = 0.06 + Math.sin(elapsedTime * 0.4) * 0.004;
    radValueHUD.innerText = `${rad.toFixed(3)} mSv`;

    // 3. Perform planet rotations
    planets.forEach(p => {
      p.traverse(child => {
        if (child.isMesh) {
          if (p.name === 'contact') {
            if (child.geometry.type === 'IcosahedronGeometry' && child.material.wireframe) {
              child.rotation.y = -elapsedTime * 0.12;
            } else {
              child.rotation.y = elapsedTime * 0.06;
            }
          } else if (p.name === 'intro' && child.geometry.type === 'RingGeometry') {
            child.rotation.z = -elapsedTime * 0.03;
          } else {
            child.rotation.y = elapsedTime * 0.08;
          }
        }
      });
    });

    // Rotate dwarf planets/asteroids
    asteroids.forEach(ast => {
      ast.mesh.rotation.x += ast.rotSpeedX * deltaTime;
      ast.mesh.rotation.y += ast.rotSpeedY * deltaTime;
    });

    // 4. Center Crosshair Raycasting (Object highlights & HUD naming)
    if (!isPlanetLocked) {
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const intersects = raycaster.intersectObjects(planets, true);

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !planets.includes(obj)) {
          obj = obj.parent;
        }

        if (planets.includes(obj)) {
          if (hoveredPlanet !== obj) {
            if (hoveredPlanet) {
              hoveredPlanet.children[0].material.emissiveIntensity = hoveredPlanet.name === 'skills' ? 0.25 : 0.08;
            }

            hoveredPlanet = obj;
            
            // Highlight: increase emissive glow
            hoveredPlanet.children[0].material.emissiveIntensity = 0.65;
            
            // Update HUD target name
            hudTargetObj.innerText = hoveredPlanet.name.toUpperCase();
            hudTargetObj.className = 'hud-value text-glow-green';
          }
        }
      } else {
        if (hoveredPlanet) {
          hoveredPlanet.children[0].material.emissiveIntensity = hoveredPlanet.name === 'skills' ? 0.25 : 0.08;
          hoveredPlanet = null;
          hudTargetObj.innerText = 'DEEP SPACE';
          hudTargetObj.className = 'hud-value text-glow';
        }
      }

      // 5. Proximity triggers (Detect close range collisions for locking panels)
      for (let i = 0; i < planets.length; i++) {
        const p = planets[i];
        const planetPos = new THREE.Vector3();
        p.getWorldPosition(planetPos);
        const dist = camera.position.distanceTo(planetPos);
        
        if (dist < 42.0) { // Limit lock proximity
          lockOnPlanet(p.name, p);
          break;
        }
      }
    }
  }

  // Render WebGL frame
  renderer.render(scene, camera);

  // Request next frame
  window.requestAnimationFrame(tick);
};

// Start tick render loops
tick();
