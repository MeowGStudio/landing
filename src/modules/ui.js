export function setupUI(onWaveChange, onIslandChange, onColliderToggle, onCameraChange) {
  // Controles existentes
  const waveSlider = document.getElementById('waveSlider');
  const waveValue = document.getElementById('waveValue');
  const islandSlider = document.getElementById('islandSlider');
  const islandValue = document.getElementById('islandValue');
  const showColliders = document.getElementById('showColliders');

  // Nuevos controles de cámara
  const zoomSlider = document.getElementById('zoomSlider');
  const zoomValue = document.getElementById('zoomValue');
  const offsetXSlider = document.getElementById('offsetXSlider');
  const offsetXValue = document.getElementById('offsetXValue');
  const offsetZSlider = document.getElementById('offsetZSlider');
  const offsetZValue = document.getElementById('offsetZValue');
  const waveCamXSlider = document.getElementById('waveCamXSlider');
  const waveCamXValue = document.getElementById('waveCamXValue');
  const waveCamZSlider = document.getElementById('waveCamZSlider');
  const waveCamZValue = document.getElementById('waveCamZValue');
  const speedOffsetSlider = document.getElementById('speedOffsetSlider');
  const speedOffsetValue = document.getElementById('speedOffsetValue');
  const lerpSpeedSlider = document.getElementById('lerpSpeedSlider');
  const lerpSpeedValue = document.getElementById('lerpSpeedValue');
  const resetBtn = document.getElementById('resetCamBtn');

  // Valores por defecto para reset
  const defaults = {
    frustumSize: 12,
    offsetX: 8,
    offsetZ: 8,
    waveCamX: 0.2,
    waveCamZ: 0.2,
    speedOffset: 0.5,
    lerpSpeed: 0.05
  };

  // Función auxiliar para actualizar display
  function updateDisplay(slider, span) {
    span.textContent = parseFloat(slider.value).toFixed(2);
  }

  // Event listeners
  waveSlider.addEventListener('input', () => {
    const val = parseFloat(waveSlider.value);
    waveValue.textContent = val.toFixed(2);
    onWaveChange(val);
  });

  islandSlider.addEventListener('input', () => {
    const val = parseFloat(islandSlider.value);
    islandValue.textContent = val.toFixed(1);
    onIslandChange(val);
  });

  showColliders.addEventListener('change', () => {
    onColliderToggle(showColliders.checked);
  });

  zoomSlider.addEventListener('input', () => {
    updateDisplay(zoomSlider, zoomValue);
    onCameraChange('frustumSize', parseFloat(zoomSlider.value));
  });
  offsetXSlider.addEventListener('input', () => {
    updateDisplay(offsetXSlider, offsetXValue);
    onCameraChange('offsetX', parseFloat(offsetXSlider.value));
  });
  offsetZSlider.addEventListener('input', () => {
    updateDisplay(offsetZSlider, offsetZValue);
    onCameraChange('offsetZ', parseFloat(offsetZSlider.value));
  });
  waveCamXSlider.addEventListener('input', () => {
    updateDisplay(waveCamXSlider, waveCamXValue);
    onCameraChange('waveCamX', parseFloat(waveCamXSlider.value));
  });
  waveCamZSlider.addEventListener('input', () => {
    updateDisplay(waveCamZSlider, waveCamZValue);
    onCameraChange('waveCamZ', parseFloat(waveCamZSlider.value));
  });
  speedOffsetSlider.addEventListener('input', () => {
    updateDisplay(speedOffsetSlider, speedOffsetValue);
    onCameraChange('speedOffset', parseFloat(speedOffsetSlider.value));
  });
  lerpSpeedSlider.addEventListener('input', () => {
    updateDisplay(lerpSpeedSlider, lerpSpeedValue);
    onCameraChange('lerpSpeed', parseFloat(lerpSpeedSlider.value));
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    zoomSlider.value = defaults.frustumSize;
    zoomValue.textContent = defaults.frustumSize;
    offsetXSlider.value = defaults.offsetX;
    offsetXValue.textContent = defaults.offsetX;
    offsetZSlider.value = defaults.offsetZ;
    offsetZValue.textContent = defaults.offsetZ;
    waveCamXSlider.value = defaults.waveCamX;
    waveCamXValue.textContent = defaults.waveCamX;
    waveCamZSlider.value = defaults.waveCamZ;
    waveCamZValue.textContent = defaults.waveCamZ;
    speedOffsetSlider.value = defaults.speedOffset;
    speedOffsetValue.textContent = defaults.speedOffset;
    lerpSpeedSlider.value = defaults.lerpSpeed;
    lerpSpeedValue.textContent = defaults.lerpSpeed;

    onCameraChange('frustumSize', defaults.frustumSize);
    onCameraChange('offsetX', defaults.offsetX);
    onCameraChange('offsetZ', defaults.offsetZ);
    onCameraChange('waveCamX', defaults.waveCamX);
    onCameraChange('waveCamZ', defaults.waveCamZ);
    onCameraChange('speedOffset', defaults.speedOffset);
    onCameraChange('lerpSpeed', defaults.lerpSpeed);
  });

  // Devolver valores iniciales
  return {
    waveIntensity: parseFloat(waveSlider.value),
    islandScale: parseFloat(islandSlider.value),
    showColliders: showColliders.checked,
    camera: {
      frustumSize: parseFloat(zoomSlider.value),
      offsetX: parseFloat(offsetXSlider.value),
      offsetZ: parseFloat(offsetZSlider.value),
      waveCamX: parseFloat(waveCamXSlider.value),
      waveCamZ: parseFloat(waveCamZSlider.value),
      speedOffset: parseFloat(speedOffsetSlider.value),
      lerpSpeed: parseFloat(lerpSpeedSlider.value)
    }
  };
}
