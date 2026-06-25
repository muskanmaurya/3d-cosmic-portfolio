import * as THREE from 'three';

// --- Procedural Canvas Texture Generators ---
// Creating textures dynamically via canvas allows hyper-realistic visual fidelity with zero asset loading latency.

/**
 * Creates a glowing circle texture for particles (stars, corona, etc.)
 */
export function createStarTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Radial gradient
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.1, 'rgba(255, 240, 220, 1)');
  gradient.addColorStop(0.25, 'rgba(255, 120, 0, 0.4)');
  gradient.addColorStop(0.5, 'rgba(255, 50, 0, 0.08)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Creates a procedurally banded texture for a gas giant planet (e.g. Planet Aegis)
 */
export function createGasGiantTexture() {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Draw horizontal bands
  for (let y = 0; y < height; y++) {
    // Generate noise for color variation
    const noise = Math.sin(y * 0.1) * Math.cos(y * 0.05) * 0.3 + Math.sin(y * 0.3) * 0.1;
    // Base bands
    let r, g, b;
    if (y < 40 || y > 210) {
      // Polar regions: cooler dark blue-grey
      r = 30 + noise * 10;
      g = 45 + noise * 15;
      b = 75 + noise * 20;
    } else if (y >= 40 && y < 110) {
      // Mid latitudes: cyan, turquoise, deep teal
      r = 10 + noise * 10;
      g = 120 + noise * 30;
      b = 180 + noise * 40;
    } else if (y >= 110 && y < 140) {
      // Equator stripe: bright glowing blue
      r = 50 + noise * 20;
      g = 200 + noise * 20;
      b = 255 + noise * 10;
    } else {
      // Lower latitudes: dark navy
      r = 15 + noise * 10;
      g = 30 + noise * 15;
      b = 60 + noise * 25;
    }

    ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    ctx.fillRect(0, y, width, 1);
  }

  // Add some swirling storm spots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.ellipse(width * 0.3, height * 0.5, 30, 15, Math.PI / 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
  ctx.beginPath();
  ctx.ellipse(width * 0.7, height * 0.3, 20, 8, -Math.PI / 18, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Creates flat, concentric planetary rings texture (Aegis rings)
 */
export function createRingTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');

  // Fill horizontal rings profile (will map radially)
  ctx.clearRect(0, 0, size, 16);
  for (let x = 0; x < size; x++) {
    const factor = x / size;
    // Generate concentric empty gaps & bands
    const opacity = (Math.sin(factor * 60) * 0.5 + 0.5) * (Math.sin(factor * 12) * 0.4 + 0.6) * (factor > 0.15 ? 1 : 0);
    const blueVal = Math.floor(180 + factor * 75);
    
    ctx.fillStyle = `rgba(0, ${Math.floor(160 + factor * 80)}, ${blueVal}, ${opacity * 0.6})`;
    ctx.fillRect(x, 0, 1, 16);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Creates a molten lava texture (Planet Pyrois)
 */
export function createLavaTexture() {
  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fill background with dark cooling rock
  ctx.fillStyle = '#110502';
  ctx.fillRect(0, 0, width, height);

  // Generate fractal cell noise (lava cracks)
  for (let i = 0; i < 25; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 60 + 20;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255, 60, 0, 0.8)');      // Bright molten red-yellow
    grad.addColorStop(0.3, 'rgba(255, 0, 0, 0.5)');     // Darker red
    grad.addColorStop(0.6, 'rgba(80, 10, 0, 0.3)');     // Cooling crust
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw bright, fine magma lines (cracks)
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 15; i++) {
    ctx.strokeStyle = 'rgba(255, 140, 0, 0.9)';
    ctx.shadowColor = 'rgba(255, 50, 0, 0.8)';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    let currX = Math.random() * width;
    let currY = Math.random() * height;
    ctx.moveTo(currX, currY);
    
    for (let j = 0; j < 8; j++) {
      currX += (Math.random() - 0.5) * 60;
      currY += (Math.random() - 0.5) * 60;
      ctx.lineTo(currX, currY);
    }
    ctx.stroke();
  }

  // Reset shadow for subsequent canvas usage
  ctx.shadowBlur = 0;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates a crystalline ice texture (Planet Kryos)
 */
export function createIceTexture() {
  const width = 512;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Fill base color
  ctx.fillStyle = '#1e1b4b'; // Deep violet-blue
  ctx.fillRect(0, 0, width, height);

  // Generate icy frost polygons
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 80 + 30;
    
    ctx.fillStyle = `rgba(${Math.floor(180 + Math.random() * 75)}, ${Math.floor(220 + Math.random() * 35)}, 255, 0.08)`;
    ctx.strokeStyle = `rgba(255, 255, 255, 0.15)`;
    ctx.lineWidth = 0.5;

    ctx.beginPath();
    const sides = 5 + Math.floor(Math.random() * 3);
    for (let s = 0; s < sides; s++) {
      const angle = (s / sides) * Math.PI * 2 + Math.random() * 0.2;
      const sx = x + Math.cos(angle) * radius;
      const sy = y + Math.sin(angle) * radius;
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates a custom noise/nebula cloud canvas texture
 */
export function createNebulaTexture(rgb = '255, 0, 170') {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, size, size);

  // Volumetric cloud layer
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, `rgba(${rgb}, 0.35)`); // Semi-opaque
  gradient.addColorStop(0.3, `rgba(${rgb}, 0.15)`);
  gradient.addColorStop(0.6, `rgba(${rgb}, 0.05)`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}
