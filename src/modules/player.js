import * as THREE from 'three';
import { waveHeight, createColliderRing } from '../utils/helpers.js';

// ---------------------------------------------------------------------------
// Geometría del casco: se construye a partir de "estaciones" (cortes
// transversales) a lo largo de la eslora, cada una con un ancho y una altura
// de cubierta/quilla distintos. Esto permite un casco curvo, con popa baja y
// roma y proa alta y afilada (inspirado en boat.jpeg), manteniendo el
// espíritu low-poly: solo caras planas, sin geometría suavizada.
// ---------------------------------------------------------------------------
function createHullGeometry() {
  // z negativo = popa (trasera), z positivo = proa (delantera, hacia donde
  // avanza el barco, ver vector (0,0,1) en update()).
  const stations = [
    { z: -1.10, hw: 0.02, deck: 0.16, keel: 0.14 }, // punta de popa
    { z: -0.80, hw: 0.26, deck: 0.24, keel: -0.01 },
    { z: -0.45, hw: 0.38, deck: 0.27, keel: -0.08 },
    { z: -0.05, hw: 0.44, deck: 0.28, keel: -0.11 }, // sección más ancha/profunda
    { z: 0.35, hw: 0.40, deck: 0.30, keel: -0.06 },
    { z: 0.70, hw: 0.28, deck: 0.36, keel: 0.04 },
    { z: 1.00, hw: 0.12, deck: 0.48, keel: 0.20 },
    { z: 1.25, hw: 0.00, deck: 0.62, keel: 0.40 }  // punta de proa, alta y afilada
  ];

  const positions = [];
  for (const s of stations) {
    positions.push(-s.hw, s.deck, s.z); // banda de babor
    positions.push(0, s.keel, s.z);     // quilla
    positions.push(s.hw, s.deck, s.z);  // banda de estribor
  }

  const hullIdx = [];
  const deckIdx = [];
  for (let i = 0; i < stations.length - 1; i++) {
    const a = i * 3;
    const b = (i + 1) * 3;
    // Costado de babor
    hullIdx.push(a + 0, a + 1, b + 1, a + 0, b + 1, b + 0);
    // Costado de estribor
    hullIdx.push(a + 1, a + 2, b + 2, a + 1, b + 2, b + 1);
    // Cubierta (borde superior, cierra la silueta del casco)
    deckIdx.push(a + 0, a + 2, b + 2, a + 0, b + 2, b + 0);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex([...hullIdx, ...deckIdx]);
  geom.addGroup(0, hullIdx.length, 0);       // grupo 0 -> material del casco
  geom.addGroup(hullIdx.length, deckIdx.length, 1); // grupo 1 -> material de cubierta
  geom.computeVertexNormals();

  return geom;
}

// ---------------------------------------------------------------------------
// Silueta de la vela: un polígono (solo líneas rectas, sin curvas) con el
// borde de proa (junto al mástil) ligeramente cóncavo, el borde de caída
// (a favor del viento) abombado hacia afuera, y el pie con un ligero
// festoneado, evocando la vela "hinchada" de tallas de madera como la de
// referencia.
// ---------------------------------------------------------------------------
function createSailShape() {
  const shape = new THREE.Shape();
  shape.moveTo(0.00, 0.85);   // puño de driza (arriba, junto al mástil)
  shape.lineTo(-0.07, 0.55);
  shape.lineTo(-0.05, 0.20);
  shape.lineTo(-0.02, 0.00);  // puño de amura (base, junto al mástil)
  shape.lineTo(0.14, 0.03);   // pie festoneado
  shape.lineTo(0.28, -0.03);
  shape.lineTo(0.42, 0.02);
  shape.lineTo(0.58, -0.04);  // puño de escota (base, extremo)
  shape.lineTo(0.46, 0.28);   // caída abombada (vela "llena" de viento)
  shape.lineTo(0.30, 0.55);
  shape.lineTo(0.12, 0.75);
  shape.lineTo(0.00, 0.85);
  return shape;
}

export function initPlayer(scene, camera, initialWaveIntensity, initialCameraSettings) {
  const boat = new THREE.Group();
  const boatBody = new THREE.Group();
  boat.add(boatBody);

  // Casco (dos tonos: costados más oscuros, cubierta más clara)
  const hullGeom = createHullGeometry();
  const hullSideMat = new THREE.MeshStandardMaterial({ color: 0xA9702D, flatShading: true, side: THREE.DoubleSide });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xE0C08A, flatShading: true, side: THREE.DoubleSide });
  const hull = new THREE.Mesh(hullGeom, [hullSideMat, deckMat]);
  hull.castShadow = true;
  hull.receiveShadow = true;
  boatBody.add(hull);

  // Mástil (madera oscura en vez de gris "metálico")
  const mastHeight = 1.15;
  const mastGeom = new THREE.CylinderGeometry(0.06, 0.08, mastHeight, 6);
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x6B4423, flatShading: true });
  const mast = new THREE.Mesh(mastGeom, mastMat);
  mast.position.set(0, 0.78, 0.55); // ligeramente hacia proa
  mast.castShadow = true;
  mast.receiveShadow = true;
  boatBody.add(mast);

  // Remate del mástil (detalle pequeño en la punta)
  const mastTopGeom = new THREE.ConeGeometry(0.05, 0.12, 5);
  const mastTop = new THREE.Mesh(mastTopGeom, mastMat);
  mastTop.position.set(0, 0.78 + mastHeight / 2 + 0.06, 0.55);
  mastTop.castShadow = true;
  boatBody.add(mastTop);

  // Botavara (verga horizontal en la base de la vela)
  const boomGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.55, 5);
  const boomMat = new THREE.MeshStandardMaterial({ color: 0x6B4423, flatShading: true });
  const boom = new THREE.Mesh(boomGeom, boomMat);
  boom.rotation.z = Math.PI / 2;
  boom.position.set(0.28, 0.44, 0.50);
  boom.castShadow = true;
  boatBody.add(boom);

  // Vela (silueta curva/festoneada extruida con un leve grosor, tono madera claro)
  const sailShape = createSailShape();
  const sailGeom = new THREE.ExtrudeGeometry(sailShape, { depth: 0.03, bevelEnabled: false });
  sailGeom.translate(0, 0, -0.015); // centra el grosor respecto al plano local
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xE8D3A6, side: THREE.DoubleSide, flatShading: true });
  const sail = new THREE.Mesh(sailGeom, sailMat);
  sail.position.set(0.0, 0.45, 0.48);
  sail.rotation.y = 0.35;
  sail.castShadow = true;
  sail.receiveShadow = true;
  boatBody.add(sail);

  boat.position.set(-7, 0.25, -3);
  scene.add(boat);

  // Collider del barco
  const boatCollisionRadius = 0.7;
  const boatColliderRing = createColliderRing(boatCollisionRadius, 0x33aaff);
  boat.add(boatColliderRing);

  // Estado de teclas
  const keyState = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
  };
  window.addEventListener('keydown', e => { if (e.key in keyState) { keyState[e.key] = true; e.preventDefault(); } });
  window.addEventListener('keyup', e => { if (e.key in keyState) { keyState[e.key] = false; e.preventDefault(); } });

  // Parámetros de movimiento
  const maxSpeed = 5.0;
  const acceleration = 4.0;
  const turnSpeed = 2.2;
  let currentSpeed = 0;

  // Variables de flotación
  const sampleDist = 0.7;
  const _eul = new THREE.Euler();
  const _forward = new THREE.Vector3();
  const _right = new THREE.Vector3();
  let pitch = 0, roll = 0;

  // Resolución de colisiones
  function resolveCollisions(islands, islandRadius) {
    const minDist = islandRadius + boatCollisionRadius;
    for (const island of islands) {
      const dx = boat.position.x - island.position.x;
      const dz = boat.position.z - island.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        const angle = Math.atan2(dz, dx);
        boat.position.x = island.position.x + Math.cos(angle) * minDist;
        boat.position.z = island.position.z + Math.sin(angle) * minDist;
        currentSpeed = 0;
      }
    }
  }

  // Update
  function update(delta, time, waveIntensity, islands, islandCollisionRadius, seaSize, camSettings) {
    // Movimiento
    const forward = keyState.w || keyState.ArrowUp;
    const backward = keyState.s || keyState.ArrowDown;
    const left = keyState.a || keyState.ArrowLeft;
    const right = keyState.d || keyState.ArrowRight;

    if (forward && !backward) {
      currentSpeed = Math.min(currentSpeed + acceleration * delta, maxSpeed);
    } else if (backward && !forward) {
      currentSpeed = Math.max(currentSpeed - acceleration * delta, -maxSpeed * 0.5);
    } else {
      currentSpeed += (0 - currentSpeed) * delta * 2.0;
      if (Math.abs(currentSpeed) < 0.01) currentSpeed = 0;
    }

    if (left && !right) boat.rotation.y += turnSpeed * delta;
    else if (right && !left) boat.rotation.y -= turnSpeed * delta;

    if (Math.abs(currentSpeed) > 0.001) {
      const dir = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, boat.rotation.y, 0));
      boat.position.x += dir.x * currentSpeed * delta;
      boat.position.z += dir.z * currentSpeed * delta;
    }

    const limit = seaSize / 2 - 3;
    boat.position.x = Math.max(-limit, Math.min(limit, boat.position.x));
    boat.position.z = Math.max(-limit, Math.min(limit, boat.position.z));

    resolveCollisions(islands, islandCollisionRadius);

    // Flotación
    _eul.set(0, boat.rotation.y, 0);
    _forward.set(0, 0, 1).applyEuler(_eul);
    _right.set(1, 0, 0).applyEuler(_eul);

    const center = waveHeight(boat.position.x, boat.position.z, time, waveIntensity);
    const front = waveHeight(boat.position.x + _forward.x * sampleDist, boat.position.z + _forward.z * sampleDist, time, waveIntensity);
    const back = waveHeight(boat.position.x - _forward.x * sampleDist, boat.position.z - _forward.z * sampleDist, time, waveIntensity);
    const rightH = waveHeight(boat.position.x + _right.x * sampleDist, boat.position.z + _right.z * sampleDist, time, waveIntensity);
    const leftH = waveHeight(boat.position.x - _right.x * sampleDist, boat.position.z - _right.z * sampleDist, time, waveIntensity);

    boat.position.y = 0.15 + center;

    const targetPitch = Math.atan2(back - front, sampleDist * 2);
    const targetRoll = Math.atan2(rightH - leftH, sampleDist * 2);
    const smooth = Math.min(delta * 5, 1);
    pitch += (targetPitch - pitch) * smooth;
    roll += (targetRoll - roll) * smooth;
    boatBody.rotation.x = pitch;
    boatBody.rotation.z = roll;

    // --- CÁMARA ISOMÉTRICA CON AJUSTES DESDE LA UI ---
    const { offsetX, offsetZ, waveCamX, waveCamZ, speedOffset, lerpSpeed } = camSettings;

    // Offset base (altura fija en Y = 8)
    const baseOffset = new THREE.Vector3(offsetX, 8, offsetZ);

    // Oscilación sutil por oleaje
    const waveOffX = Math.sin(time * 0.5) * waveCamX;
    const waveOffZ = Math.cos(time * 0.7) * waveCamZ;
    const waveOffY = Math.sin(time * 0.3) * 0.1;

    // Desplazamiento según velocidad
    const speedFactor = currentSpeed / maxSpeed;
    const forwardDir = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, boat.rotation.y, 0));
    const speedOff = forwardDir.clone().multiplyScalar(speedFactor * speedOffset);

    const totalOffset = baseOffset.clone()
      .add(new THREE.Vector3(waveOffX, waveOffY, waveOffZ))
      .add(speedOff);

    const targetCamPos = boat.position.clone().add(totalOffset);

    // Interpolación suave
    camera.position.lerp(targetCamPos, lerpSpeed);
    camera.lookAt(boat.position.x, boat.position.y + 0.5, boat.position.z);
  }

  return {
    boat,
    boatColliderRing,
    update,
    setColliderVisible(visible) {
      boatColliderRing.visible = visible;
    }
  };
}
