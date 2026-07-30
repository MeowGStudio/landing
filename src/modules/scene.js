import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0x87CEEB, 25, 70);

  // Cámara isométrica (ortográfica)
  const frustumSize = 12;
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.5,
    100
  );
  camera.position.set(8, 8, 8);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

  // Luces
  scene.add(new THREE.AmbientLight(0x404066, 0.6));

  const sunLight = new THREE.DirectionalLight(0xffeedd, 1.5);
  sunLight.position.set(20, 30, 10);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 512;
  sunLight.shadow.mapSize.height = 512;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 60;
  sunLight.shadow.camera.left = -25;
  sunLight.shadow.camera.right = 25;
  sunLight.shadow.camera.top = 25;
  sunLight.shadow.camera.bottom = -25;
  scene.add(sunLight);

  return { scene, camera, renderer, frustumSize };
}
