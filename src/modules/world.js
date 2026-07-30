import * as THREE from 'three';
import { waveHeight, createIsland, createColliderRing, createWaterRoughnessTexture } from '../utils/helpers.js';

export function initWorld(scene, initialWaveIntensity) {
  // Fondo marino
  const floorGeometry = new THREE.PlaneGeometry(90, 90, 1, 1);
  floorGeometry.rotateX(-Math.PI / 2);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x0e4d63, roughness: 0.95, metalness: 0 });
  const seaFloor = new THREE.Mesh(floorGeometry, floorMaterial);
  seaFloor.position.y = -2.4;
  scene.add(seaFloor);

  // Mar
  const seaSize = 60;
  const seaSegments = 80;
  const seaGeometry = new THREE.PlaneGeometry(seaSize, seaSize, seaSegments, seaSegments);
  seaGeometry.rotateX(-Math.PI / 2);

  // Color base del agua en calma y color de espuma para las crestas del
  // oleaje (se mezclan por vértice, ver update()). El material queda en
  // blanco para que sea el color de vértice quien determine el tono real,
  // igual que haría una baseColorTexture.
  const seaBaseColor = new THREE.Color(0x3aa8d8);
  const seaFoamColor = new THREE.Color(0xf2ffff);

  const seaRoughnessMap = createWaterRoughnessTexture();

  const seaMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    flatShading: true,
    roughness: 0.35,
    roughnessMap: seaRoughnessMap,
    metalness: 0,
    transmission: 0.88,
    thickness: 3.0,
    ior: 1.33,
    attenuationColor: 0x0a4a68,
    attenuationDistance: 2.3,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    specularIntensity: 0.5,
    envMapIntensity: 1.3,
    side: THREE.DoubleSide,
  });
  const sea = new THREE.Mesh(seaGeometry, seaMaterial);
  sea.receiveShadow = true;
  scene.add(sea);

  // Guardar alturas originales para el oleaje
  const positionAttribute = seaGeometry.attributes.position;
  const originalY = new Float32Array(positionAttribute.count);
  for (let i = 0; i < positionAttribute.count; i++) {
    originalY[i] = positionAttribute.getY(i);
  }

  // Colores de vértice: se recalculan cada frame según la altura del
  // oleaje para aclarar las crestas (espuma) y dejar los valles con el
  // tono profundo original.
  const seaColors = new Float32Array(positionAttribute.count * 3);
  seaGeometry.setAttribute('color', new THREE.BufferAttribute(seaColors, 3));

  // Islas
  const island1 = createIsland(-8, -4);
  const island2 = createIsland(7, 5);
  scene.add(island1);
  scene.add(island2);
  const islands = [island1, island2];

  // Colliders de islas (aros)
  let islandCollisionRadius = 2.5;
  const islandColliderRings = islands.map(island => {
    const ring = createColliderRing(islandCollisionRadius, 0xffaa33);
    island.add(ring);
    return ring;
  });

  // Reutilizado en update() para no crear un THREE.Color por vértice y frame
  const _seaVertexColor = new THREE.Color();

  // Objeto público con todo lo necesario
  const world = {
    sea,
    seaGeometry,
    originalY,
    islands,
    islandColliderRings,
    islandCollisionRadius,
    seaSize,

    update(time, intensity) {
      const positions = seaGeometry.attributes.position;
      const colors = seaGeometry.attributes.color;

      // Amplitud máxima aproximada de waveHeight (0.2 + 0.2 + 0.15 = 0.55
      // por unidad de intensidad); sirve para normalizar el degradado de
      // espuma sea cual sea la intensidad del oleaje.
      const amp = Math.max(intensity, 0.001) * 0.55;

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        const wave = waveHeight(x, z, time, intensity);
        positions.setY(i, originalY[i] + wave);

        // Solo la parte alta de cada cresta se aclara hacia el color de
        // espuma; el resto de la superficie conserva el tono profundo.
        const t = THREE.MathUtils.clamp((wave / amp - 0.35) / 0.65, 0, 1);
        _seaVertexColor.copy(seaBaseColor).lerp(seaFoamColor, t * t);
        colors.setXYZ(i, _seaVertexColor.r, _seaVertexColor.g, _seaVertexColor.b);
      }
      positions.needsUpdate = true;
      colors.needsUpdate = true;
      seaGeometry.computeVertexNormals();

      // Micro-desplazamiento de la textura de rugosidad para un ligero
      // centelleo en la superficie.
      seaRoughnessMap.offset.set((time * 0.02) % 1, (time * 0.015) % 1);
    },

    setIslandScale(scale) {
      islands.forEach(island => {
        island.scale.setScalar(scale);
        const foam = island.userData.foamRing;
        if (foam) {
          foam.geometry.dispose();
          foam.geometry = new THREE.TorusGeometry(2.2 * scale, 0.12, 8, 32);
        }
      });
      const newRadius = 2.5 * scale;
      islandColliderRings.forEach(ring => {
        ring.geometry.dispose();
        ring.geometry = new THREE.TorusGeometry(newRadius, 0.08, 8, 32);
      });
      this.islandCollisionRadius = newRadius;
    }
  };

  return world;
}
