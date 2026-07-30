import * as THREE from 'three';

export function waveHeight(x, z, t, intensity) {
  return (Math.sin(x * 0.8 + t * 2) * 0.2 +
    Math.cos(z * 0.6 + t * 1.5) * 0.2 +
    Math.sin((x + z) * 0.5 + t) * 0.15) * intensity;
}

// Textura de rugosidad procedural para el agua: pequeñas manchas suaves que
// simulan microturbulencia/espuma dispersa en la superficie, en el mismo
// espíritu que la metallicRoughnessTexture usada en water.gltf, pero
// generada en canvas para no depender de un archivo externo.
export function createWaterRoughnessTexture(size = 128, repeat = 6) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base uniforme (rugosidad media-baja)
  ctx.fillStyle = '#3c3c3c';
  ctx.fillRect(0, 0, size, size);

  // Manchas radiales de rugosidad variable
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 4 + Math.random() * 10;
    const shade = 60 + Math.random() * 150;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${shade},${shade},${shade},0.55)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  return texture;
}

export function createIsland(x, z) {
  const group = new THREE.Group();

  // Arena
  const baseGeom = new THREE.CylinderGeometry(1.8, 2.2, 0.4, 8);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xe0c090, flatShading: true });
  const base = new THREE.Mesh(baseGeom, baseMat);
  base.position.y = 0.2;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Montaña
  const mountainGeom = new THREE.ConeGeometry(1.4, 1.5, 7);
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, flatShading: true });
  const mountain = new THREE.Mesh(mountainGeom, mountainMat);
  mountain.position.y = 0.9;
  mountain.castShadow = true;
  mountain.receiveShadow = true;
  group.add(mountain);

  // Árboles
  const trees = [
    { angle: 0.7, radius: 1.9 },
    { angle: 2.5, radius: 2.0 },
    { angle: 4.2, radius: 1.8 },
  ];
  trees.forEach(({ angle, radius }) => {
    const tree = new THREE.Group();
    const trunkGeom = new THREE.CylinderGeometry(0.1, 0.12, 0.7, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, flatShading: true });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 0.55;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const foliageGeom = new THREE.ConeGeometry(0.25, 0.5, 6);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, flatShading: true });
    const foliage = new THREE.Mesh(foliageGeom, foliageMat);
    foliage.position.y = 1.0;
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    tree.add(foliage);

    tree.position.set(Math.cos(angle) * radius, 0.4, Math.sin(angle) * radius);
    group.add(tree);
  });

  // Espuma
  const foamRadius = 2.2;
  const foamGeom = new THREE.TorusGeometry(foamRadius, 0.12, 8, 32);
  const foamMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    flatShading: true,
    roughness: 0.5,
  });
  const foamRing = new THREE.Mesh(foamGeom, foamMat);
  foamRing.rotation.x = -Math.PI / 2;
  foamRing.position.y = 0.05;
  group.add(foamRing);
  group.userData.foamRing = foamRing;

  group.position.set(x, 0, z);
  return group;
}

export function createColliderRing(radius, color = 0x33aaff) {
  const geometry = new THREE.TorusGeometry(radius, 0.08, 8, 32);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  return ring;
}
