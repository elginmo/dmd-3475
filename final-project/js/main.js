console.log("AUDIO VISUALIZER");

// dom references.

const hero = document.getElementById("hero");
const upload = document.getElementById("upload");
const selectFileBtn = document.getElementById("selectFileBtn");
const demoBtn = document.getElementById("demoBtn");

const playPauseBtn = document.getElementById("playPauseBtn");
const seekBar = document.getElementById("seekBar");
const changeFileBtn = document.getElementById("changeFileBtn");

const trackName = document.getElementById("trackName");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");

const factText = document.getElementById("factText");

const canvas = document.getElementById("visualizer");
const audio = document.getElementById("audio");

// fetch api requirement (Useless facts API that shows up on hero screen)

async function fetchUselessFact() {
  if (!factText) return;

  try {
    const res = await fetch("https://uselessfacts.jsph.pl/random.json?language=en");
    const data = await res.json();

    factText.classList.add("fade");

    setTimeout(() => {
      factText.textContent = data.text;
      factText.classList.remove("fade");
    }, 300);

  } catch (err) {
    factText.textContent = "system offline...";
    console.error(err);
  }
}

// track data.

const tracks = [
  {
    id: 1,
    name: "Laputa - Panchiko",
    src: "assets/laputa.mp3"
  }
];

// audio system logic.

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();

analyser.fftSize = 256;

const data = new Uint8Array(analyser.frequencyBinCount);

let source = null;
let audioConnected = false;

function connectAudio() {
  if (audioConnected) return;

  source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  audioConnected = true;
}

// unlock audio context.
document.addEventListener("click", () => {
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
});

// hero screen logic

function closeHero() {
  hero.style.transition = "opacity 0.4s ease";
  hero.style.opacity = "0";

  setTimeout(() => {
    hero.style.display = "none";
  }, 400);
}

selectFileBtn.addEventListener("click", () => {
  upload.click();
});

// playback system logic.

function playTrack(track) {
  audio.src = track.src;
  trackName.textContent = track.name;

  audio.play().catch(() => {});
  connectAudio();
  closeHero();
}

// demo button.
demoBtn.addEventListener("click", () => {
  playTrack(tracks[0]);
});

// upload button.
upload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);

  playTrack({
    name: file.name.replace(/\.[^/.]+$/, ""),
    src: url
  });
});

// playback controls ui logic.

function formatTime(sec) {
  if (!isFinite(sec)) return "0:00";

  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);

  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

audio.addEventListener("loadedmetadata", () => {
  seekBar.max = audio.duration;
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  seekBar.value = audio.currentTime;
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

seekBar.addEventListener("input", () => {
  audio.currentTime = seekBar.value;
});

playPauseBtn.addEventListener("click", async () => {
  if (audio.readyState === 0) return;

  if (audio.paused) {
    await audio.play();
    playPauseBtn.textContent = "pause";
  } else {
    audio.pause();
    playPauseBtn.textContent = "play";
  }
});

changeFileBtn.addEventListener("click", () => {
  upload.click();
});

// audio band analysis logic.

function getBands() {
  analyser.getByteFrequencyData(data);

  let bass = 0, mids = 0, highs = 0;
  const l = data.length;

  for (let i = 0; i < l * 0.2; i++) bass += data[i];
  for (let i = l * 0.2; i < l * 0.7; i++) mids += data[i];
  for (let i = l * 0.7; i < l; i++) highs += data[i];

  bass = bass / (l * 0.2) / 255;
  mids = mids / (l * 0.5) / 255;
  highs = highs / (l * 0.3) / 255;

  return {
    bass: isFinite(bass) ? bass : 0,
    mids: isFinite(mids) ? mids : 0,
    highs: isFinite(highs) ? highs : 0
  };
}

// three.js setup and animation logic.

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

camera.position.z = 5;

// shape setup (cube)

const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5, 24, 24, 24);

const material = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true
});

const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

const originalPositions = geometry.attributes.position.array.slice();

// particle effect logic.

const particleCount = 6000;

const positions = new Float32Array(particleCount * 3);
const velocities = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount; i++) {
  const i3 = i * 3;

  positions[i3] = (Math.random() - 0.5) * 40;
  positions[i3 + 1] = (Math.random() - 0.5) * 40;
  positions[i3 + 2] = (Math.random() - 0.5) * 40;

  velocities[i3] = (Math.random() - 0.5) * 0.002;
  velocities[i3 + 1] = (Math.random() - 0.5) * 0.002;
  velocities[i3 + 2] = (Math.random() - 0.5) * 0.002;
}

const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const particleMat = new THREE.PointsMaterial({
  color: 0xbfd9ff,
  size: 0.09,
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

// sizing logic.

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// animation loop.

function animate() {
  requestAnimationFrame(animate);

  const bands = getBands();

  const safeBass = bands.bass;
  const safeMids = bands.mids;
  const safeHighs = bands.highs;

  camera.position.z = 5 + safeBass * 1.5;

  const pos = cube.geometry.attributes.position.array;

  for (let i = 0; i < pos.length; i += 3) {

    const ox = originalPositions[i];
    const oy = originalPositions[i + 1];
    const oz = originalPositions[i + 2];

    const noise =
      Math.sin(Date.now() * 0.003 + ox * 5) * safeBass * 0.4 +
      Math.cos(Date.now() * 0.003 + oy * 5) * safeMids * 0.3 +
      (Math.random() - 0.5) * safeHighs * 0.5;

    pos[i] = ox + ox * safeBass * 2.2 + noise;
    pos[i + 1] = oy + oy * safeMids * 0.8 + noise;
    pos[i + 2] = oz + oz * safeHighs * 1.2 + noise;
  }

  cube.geometry.attributes.position.needsUpdate = true;

  cube.rotation.x += 0.004 + safeHighs * 0.02;
  cube.rotation.y += 0.006 + safeMids * 0.02;

  const p = particles.geometry.attributes.position.array;

  for (let i = 0; i < p.length; i += 3) {

    const vx = velocities[i];
    const vy = velocities[i + 1];
    const vz = velocities[i + 2];

    const dx = p[i];
    const dy = p[i + 1];
    const dz = p[i + 2];

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const pull = 0.0005 / (dist + 1);

    const strength = safeMids * 0.003 + safeHighs * 0.004;

    p[i] += vx - dx * pull + (Math.random() - 0.5) * strength;
    p[i + 1] += vy - dy * pull + (Math.random() - 0.5) * strength;
    p[i + 2] += vz - dz * pull + (Math.random() - 0.5) * strength;
  }

  particles.geometry.attributes.position.needsUpdate = true;

  particleMat.opacity = 0.4 + safeHighs * 0.5;
  particleMat.size = 0.05 + safeHighs * 0.08;

  renderer.render(scene, camera);
}

// keyboard control update.

document.addEventListener("keydown", (e) => {
  // ignore when typing in inputs / file picker focus edge cases
  const activeTag = document.activeElement?.tagName;
  if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

  // SPACEBAR = play / pause toggle
  if (e.code === "Space") {
    e.preventDefault();

    // ensure audio context is usable (matches your click-unlock system)
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    // toggle playback using your existing system
    if (!audio.src) return; // no track loaded safety guard

    if (audio.paused) {
      audio.play().catch(() => {});
      playPauseBtn.textContent = "pause";
    } else {
      audio.pause();
      playPauseBtn.textContent = "play";
    }
  }

  // optional UX improvement: "P" key also toggles play/pause
  if (e.code === "KeyP") {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    if (!audio.src) return;

    if (audio.paused) {
      audio.play().catch(() => {});
      playPauseBtn.textContent = "pause";
    } else {
      audio.pause();
      playPauseBtn.textContent = "play";
    }
  }
});

animate();

// useless fact fetching.

fetchUselessFact();
setInterval(fetchUselessFact, 8000);