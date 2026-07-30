import './styles/main.css';
import * as THREE from 'three';
import { createScene } from './modules/scene.js';
import { initWorld } from './modules/world.js';
import { initPlayer } from './modules/player.js';
import { setupUI } from './modules/ui.js';

// 1. Escena
const { scene, camera, renderer, frustumSize } = createScene();

// 2. Configuración de cámara (se actualizará desde UI)
let cameraSettings = {
  frustumSize: frustumSize,
  offsetX: 8,
  offsetZ: 8,
  waveCamX: 0.2,
  waveCamZ: 0.2,
  speedOffset: 0.5,
  lerpSpeed: 0.05
};

// 3. UI
let waveIntensity, islandScale;

function onCameraChange(key, value) {
  cameraSettings[key] = value;
  if (key === 'frustumSize') {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = -value * aspect / 2;
    camera.right = value * aspect / 2;
    camera.top = value / 2;
    camera.bottom = -value / 2;
    camera.updateProjectionMatrix();
  }
}

const ui = setupUI(
  (val) => { waveIntensity = val; },
  (val) => {
    islandScale = val;
    world.setIslandScale(val);
  },
  (visible) => {
    world.islandColliderRings.forEach(ring => ring.visible = visible);
    player.setColliderVisible(visible);
  },
  onCameraChange
);

waveIntensity = ui.waveIntensity;
islandScale = ui.islandScale;
// Actualizar cameraSettings con valores iniciales de UI
cameraSettings = { ...cameraSettings, ...ui.camera };

// 4. Mundo
const world = initWorld(scene, waveIntensity);

// 5. Jugador
const player = initPlayer(scene, camera, waveIntensity, cameraSettings);

// 6. Game Loop
const clock = new THREE.Clock();

function animate() {
  const delta = Math.min(clock.getDelta(), 0.1);
  const time = performance.now() * 0.001;

  world.update(time, waveIntensity);
  player.update(delta, time, waveIntensity, world.islands, world.islandCollisionRadius, world.seaSize, cameraSettings);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

// 7. Resize
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  const fs = cameraSettings.frustumSize || frustumSize;
  camera.left = -fs * aspect / 2;
  camera.right = fs * aspect / 2;
  camera.top = fs / 2;
  camera.bottom = -fs / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
