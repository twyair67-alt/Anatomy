import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { createPlayer, updatePlayer } from './player.js';
import {
    createInserviente,
    isInservienteChasing,
    isInservienteInView,
    isInservienteLookedAt,
    revealInserviente,
    resetInserviente,
    startInservienteChase,
    triggerPeripheralApparition,
    updateInserviente
} from './inserviente.js';
import { initAudio } from './audio.js';
import { createHospitalWorld } from './world.js';
import {
    createDottore,
    damageDottore,
    getDottoreGroup,
    isDottoreFinalEncounter,
    resetDottore,
    startDottoreFinalEncounter,
    stunDottore,
    updateDottore
} from './dottore.js';
import {
    hideAmbientJumpscare,
    hideDeathScreen,
    showAmbientJumpscare,
    showDeathScreen,
    triggerFalseJumpscare,
    updateWeaponStatus
} from './ui.js';

const BASE_URL = import.meta.env?.BASE_URL ?? './';

export function createCreepyTexture(type) {
    const supportedTypes = new Set(['blood', 'face', 'static']);
    if (!supportedTypes.has(type)) {
        throw new Error(`Tipo di texture non supportato: ${type}`);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    if (type === 'blood') {
        context.fillStyle = '#090809';
        context.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 28; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * 180;
            const radius = 12 + Math.random() * 54;
            context.fillStyle = `rgba(${65 + Math.random() * 90}, 0, 0, ${0.3 + Math.random() * 0.55})`;
            context.beginPath();
            context.ellipse(x, y, radius, radius * (0.35 + Math.random()), Math.random(), 0, Math.PI * 2);
            context.fill();
            if (Math.random() > 0.35) {
                const dripWidth = 3 + Math.random() * 13;
                const dripLength = 25 + Math.random() * 180;
                context.fillRect(x - dripWidth / 2, y, dripWidth, dripLength);
                context.beginPath();
                context.arc(x, y + dripLength, dripWidth / 2, 0, Math.PI * 2);
                context.fill();
            }
        }

        context.save();
        context.translate(256, 305);
        context.rotate(-0.12);
        context.font = 'bold 52px Courier New';
        context.fillStyle = 'rgba(145, 15, 19, 0.82)';
        context.shadowColor = '#600';
        context.shadowBlur = 8;
        for (let line = 0; line < 4; line++) {
            const scratches = Array.from({ length: 13 }, () =>
                String.fromCharCode(0x16a0 + Math.floor(Math.random() * 96))
            ).join('');
            context.fillText(scratches, -230 + Math.random() * 45, line * 48);
            context.beginPath();
            context.moveTo(-225, line * 48 + 5);
            context.lineTo(220, line * 48 - 12 + Math.random() * 24);
            context.lineWidth = 1 + Math.random() * 4;
            context.strokeStyle = 'rgba(175, 20, 24, 0.75)';
            context.stroke();
        }
        context.restore();
    } else if (type === 'face') {
        context.fillStyle = '#050608';
        context.fillRect(0, 0, canvas.width, canvas.height);
        const haze = context.createRadialGradient(256, 205, 15, 256, 250, 260);
        haze.addColorStop(0, 'rgba(95, 106, 112, 0.35)');
        haze.addColorStop(1, 'rgba(5, 6, 8, 0)');
        context.fillStyle = haze;
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = '#08090b';
        context.beginPath();
        context.moveTo(72, 512);
        context.quadraticCurveTo(82, 360, 167, 326);
        context.quadraticCurveTo(120, 234, 163, 133);
        context.quadraticCurveTo(203, 46, 270, 65);
        context.quadraticCurveTo(364, 74, 374, 184);
        context.quadraticCurveTo(400, 290, 339, 337);
        context.quadraticCurveTo(440, 370, 452, 512);
        context.closePath();
        context.fill();

        const faceGradient = context.createRadialGradient(262, 212, 16, 260, 218, 144);
        faceGradient.addColorStop(0, '#e0ddd4');
        faceGradient.addColorStop(0.72, '#aaa9a5');
        faceGradient.addColorStop(1, '#55595b');
        context.fillStyle = faceGradient;
        context.beginPath();
        context.ellipse(260, 205, 102, 143, -0.04, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = '#f7f5ed';
        context.beginPath();
        context.ellipse(218, 200, 25, 15, -0.1, 0, Math.PI * 2);
        context.ellipse(301, 200, 25, 15, 0.1, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'rgba(15, 17, 19, 0.8)';
        context.beginPath();
        context.ellipse(260, 260, 12, 32, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#171719';
        context.lineWidth = 8;
        context.beginPath();
        context.moveTo(222, 310);
        context.quadraticCurveTo(260, 327, 300, 308);
        context.stroke();
    } else {
        const image = context.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < image.data.length; i += 4) {
            const noise = Math.random() < 0.08 ? 0 : Math.floor(Math.random() * 256);
            image.data[i] = noise;
            image.data[i + 1] = noise;
            image.data[i + 2] = noise;
            image.data[i + 3] = 255;
        }
        context.putImageData(image, 0, 0);
        context.fillStyle = 'rgba(240, 240, 240, 0.22)';
        for (let i = 0; i < 18; i++) {
            const y = Math.random() * canvas.height;
            context.fillRect(0, y, canvas.width, 1 + Math.random() * 5);
        }
        context.fillStyle = 'rgba(0, 0, 0, 0.32)';
        for (let y = 0; y < canvas.height; y += 4) {
            context.fillRect(0, y, canvas.width, 1);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    return texture;
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020204, 0.055);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
document.body.appendChild(renderer.domElement);

function configureLoadedModel(model) {
    model.traverse((object) => {
        if (!object.isMesh) return;
        object.frustumCulled = true;
        object.castShadow = false;
        object.receiveShadow = true;
    });
}

const player = createPlayer(scene, camera);
const controls = player;
const inservienteGroup = createInserviente(scene);
const dottoreGroup = createDottore(scene);
const transitionDoctorGroup = new THREE.Group();
transitionDoctorGroup.name = 'transition-scare-doctor';
transitionDoctorGroup.visible = false;
scene.add(transitionDoctorGroup);
let transitionDoctorModelLoaded = false;
let transitionDoctorActive = false;
let transitionDoctorDefeated = false;
let transitionDoctorHealth = 2;

function addTransitionDoctorModel(model) {
    if (transitionDoctorModelLoaded) return;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    if (size.y <= 0) return;
    model.scale.multiplyScalar(2.1 / size.y);
    const scaledBounds = new THREE.Box3().setFromObject(model);
    const center = scaledBounds.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -scaledBounds.min.y, -center.z);
    configureLoadedModel(model);
    transitionDoctorGroup.add(model);
    transitionDoctorModelLoaded = true;
    if (transitionDoctorActive && !transitionDoctorDefeated) transitionDoctorGroup.visible = true;
}

const transitionDoctorUrl = new URL('../models/dottore.obj', import.meta.url).href;
new OBJLoader().load(
    transitionDoctorUrl,
    addTransitionDoctorModel,
    undefined,
    (error) => console.error(`Impossibile caricare il modello del Dottore (${transitionDoctorUrl}):`, error)
);
let heartbeat;
const startScreen = document.getElementById('start-screen');
const crosshair = document.getElementById('crosshair');
const interactionPrompt = document.getElementById('interaction-prompt');
const anxietyVignette = document.getElementById('anxiety-vignette');
const panicIndicator = document.getElementById('panic-indicator');
const panicFill = document.getElementById('panic-fill');
const panicValue = document.getElementById('panic-value');
const staminaFill = document.getElementById('stamina-fill');
const staminaValue = document.getElementById('stamina-value');
const batteryStatus = document.getElementById('battery-status');
const bloodSpitOverlay = document.getElementById('blood-spit');
const distortionOverlay = document.getElementById('panic-distortion');
const hallucinationOverlay = document.getElementById('panic-hallucinations');
const eyesClosedOverlay = document.getElementById('eyes-closed');
const jumpscareOverlay = document.getElementById('jumpscare-overlay');
const doctorJumpscareOverlay = document.getElementById('doctor-jumpscare');
const tensionSubtitle = document.getElementById('tension-subtitle');
const noteOverlay = document.getElementById('note-overlay');
const noteText = document.getElementById('note-text');
const inventoryOverlay = document.getElementById('inventory-overlay');
const inventoryContent = document.getElementById('inventory-content');
let gameStarted = false;
let startingGame = false;
let eyesClosed = false;
let panicLevel = 0;
let isDead = false;
let gazeTime = 0;
let lookBackTime = 0;
let eyesClosedStartedAt = 0;
let subtitleRemaining = 0;
let tensionInterval = 8;
let tensionElapsed = 0;
let previousTensionBand = -1;
let introShown = false;
let spaceSpamCount = 0;
let lastSpacePressAt = -Infinity;
let panicGameOverPending = false;
let bloodEffectRemaining = 0;
let apparitionTimer = THREE.MathUtils.randFloat(60, 120);
let pinoScareTimer = THREE.MathUtils.randFloat(60, 120);
let pinoApproachRemaining = 0;
let pinoVisibleRemaining = 0;
let hallucinationTimer = 0;
let hallucinationRemaining = 0;
let batteryCount = 0;
let apparitionPanic = 0;
let macroareaTwoEntered = false;
let macroareaThreeEntered = false;
let checkpoint = null;
let axeUses = 7;
let axeCollected = false;
let shotgunCollected = false;
let shotgunLoaded = 2;
let shotgunAmmo = 8;
let reloadRemaining = 0;
let axeDrawerOpened = false;
let woodDoorBroken = false;
let lastAxeAttackAt = -Infinity;
let falseJumpscareTimer = THREE.MathUtils.randFloat(8, 16);
let ambientJumpscareTimer = THREE.MathUtils.randFloat(180, 240);
let ambientJumpscareIndex = 0;
let ambientJumpscareActive = false;
let idleStillElapsed = 0;
let idleGlassBreakChecked = false;
let doctorNoisyTimer = 0;
let doctorAngularTimer = THREE.MathUtils.randFloat(35, 60);
let blueButtonPressed = false;
let yellowButtonPressed = false;
let doctorFinalEncounterReady = false;
let doctorFinalEncounterStarted = false;
let doctorFinalDefeated = false;
let macroareaThreeUnlocked = false;
let macroareaFourEntered = false;
let psychiatryLetterCount = 0;
let psychiatryDoctors = [];
let psychiatryDoctorsDefeated = 0;
let psychiatryScareTimer = THREE.MathUtils.randFloat(28, 48);
let aslCollected = false;
let macroareaFourDoorBroken = false;
let blurRemovalTimer = 0;
let doctorJumpscareTimeout = 0;

function showSubtitle(text, duration = 3.5) {
    tensionSubtitle.textContent = text;
    tensionSubtitle.classList.add('visible');
    subtitleRemaining = duration;
}

function createDoctorCodeLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 118px monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = '#ff1111';
    context.shadowBlur = 34;
    context.fillStyle = '#ff2929';
    context.fillText('1525', 256, 82);
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
    }));
    label.scale.set(2.4, 0.75, 1);
    label.visible = false;
    scene.add(label);
    return label;
}

const doctorCodeLabel = createDoctorCodeLabel();

function startMacroareaThreeTransition() {
    macroareaThreeUnlocked = true;
    areaThreeGate.visible = false;
    keypadTarget.visible = false;
    keypadDoor.rotation.y = -Math.PI / 2;
    player.corridorEndZ = areaThreeEndZ;
    heartbeat?.playWoodCrash();
    keypadDoor.visible = false;
    showSubtitle('Il passaggio si apre. La Macroarea 3 ti attende.', 6);

    const macro = window.AnatomyMacro34;
    if (!macro || typeof macro.startMacro3 !== 'function') {
        console.error('[Anatomy] AnatomyMacro34.startMacro3 non disponibile.');
        return;
    }

    Promise.resolve().then(() => macro.startMacro3()).catch((error) => {
        console.error('[Anatomy] errore durante la transizione alla Macroarea 3', error);
    });
}

function closeNote() {
    noteOverlay.classList.remove('visible');
    noteOverlay.setAttribute('aria-hidden', 'true');
}

function tryPlayGlassBreak() {
    if (Math.random() < 0.75) heartbeat?.playGlassBreak();
}

function triggerAmbientJumpscare() {
    ambientJumpscareActive = true;
    player.setUiPaused(true);
    heartbeat?.playAmbientJumpscare();
    const imageName = ambientJumpscareIndex % 2 === 0 ? 'jumpscare2.jpg' : 'jumpscare3.jpg';
    ambientJumpscareIndex += 1;
    const imageUrl = `${BASE_URL}images/${imageName}`;
    showAmbientJumpscare(imageUrl, THREE.MathUtils.randInt(1000, 2000), () => {
        ambientJumpscareActive = false;
        if (isDead) return;
        player.setUiPaused(false);
        ambientJumpscareTimer = THREE.MathUtils.randFloat(180, 240);
    });
}

window.addEventListener('keydown', (event) => {
    if (!ambientJumpscareActive) return;
    event.preventDefault();
    event.stopImmediatePropagation();
}, true);

window.addEventListener('mousedown', (event) => {
    if (!ambientJumpscareActive) return;
    event.preventDefault();
    event.stopImmediatePropagation();
}, true);

function triggerGameOver(cause) {
    if (isDead) return;
    if (cause === 'panic-spam') {
        if (!panicGameOverPending) return;
    } else if (cause === 'monster-caught') {
        if (macroareaTwoEntered || !isInservienteChasing()) return;
    } else if (cause === 'doctor-attack') {
        if (!macroareaTwoEntered) return;
    } else {
        throw new Error(`Causa Game Over non valida: ${cause}`);
    }

    isDead = true;
    if (ambientJumpscareActive) {
        ambientJumpscareActive = false;
        hideAmbientJumpscare();
    }
    panicLevel = 100;
    player.setUiPaused(false);
    player.movementDisabled = true;
    player.keys.clear();
    player.velocity.set(0, 0);
    showDeathScreen(
        () => macroareaTwoEntered ? respawnAtCheckpoint() : restartGame(true),
        Boolean(checkpoint),
        () => restartGame(true)
    );
    distortionOverlay.classList.remove('active');
    hallucinationOverlay.classList.remove('active');
    document.body.classList.remove('panic-high');
    heartbeat?.playJumpscare();
    player.unlock();
}

function enterMacroareaTwo(movePlayer = false) {
    if (macroareaTwoEntered) return;
    macroareaTwoEntered = true;
    player.isInMacroareaTwo = true;
    player.areaTwoStartZ = areaTwoStartZ;
    player.corridorEndZ = areaTwoEndZ;
    if (movePlayer) {
        player.camera.position.set(0, 1.6, areaTwoStartZ - 1.5);
        player.velocity.set(0, 0);
    }
    transitionDoor.rotation.y = -Math.PI / 2;
    checkpoint = {
        position: new THREE.Vector3(0, 1.6, areaTwoStartZ - 1.5),
        rotation: player.camera.rotation.clone(),
        battery: player.flashlightBattery
    };
    heartbeat?.setArea(2);
    resetInserviente();
    resetDottore();
    scene.fog.color.setHex(0x17232a);
    scene.fog.density = 0.028;
    showSubtitle('Checkpoint salvato. Sei entrato nei reparti operativi dell’ospedale.', 5);
}

function enterMacroareaThree() {
    if (macroareaThreeEntered || !macroareaThreeUnlocked) return;
    macroareaThreeEntered = true;
    player.isInMacroareaThree = true;
    player.areaThreeStartZ = areaThreeStartZ;
    player.areaThreeEndZ = areaThreeEndZ;
    player.psychiatryLane = null;
    scene.fog.color.setHex(0x25112f);
    scene.fog.density = 0.018;
    document.body.classList.add('macroarea-three');
    heartbeat?.setArea(3);
    heartbeat?.updateDoctor(Infinity, 0, false, false);
    spawnPsychiatryDoctors();
    psychiatryScareTimer = THREE.MathUtils.randFloat(28, 48);
    showSubtitle('MACROAREA 3 · REPARTO DI PSICHIATRIA', 6);
}

function enterMacroareaFour() {
    if (macroareaFourEntered || !macroareaFourDoorBroken) return;
    macroareaFourEntered = true;
    player.isInMacroareaThree = false;
    player.psychiatryLane = null;
    scene.fog.color.setHex(0x07090c);
    scene.fog.density = 0.035;
    showSubtitle('MACROAREA 4 · ACCESSO AL BLOCCO SUCCESSIVO', 7);
}

function spawnPsychiatryDoctors() {
    if (psychiatryDoctors.length) return;
    for (const [index, offset] of [62, 118, 171].entries()) {
        const group = dottoreGroup.clone(true);
        group.name = `dottore-psichiatria-${index + 1}`;
        group.visible = false;
        group.position.set(0, 0, areaThreeStartZ - offset);
        scene.add(group);
        psychiatryDoctors.push({
            group,
            final: index === 2,
            health: 1,
            spawned: false,
            defeated: false
        });
    }
}

function updatePsychiatryDoctors(delta) {
    for (const doctor of psychiatryDoctors) {
        if (doctor.defeated) continue;
        if (doctor.final && (psychiatryLetterCount < 2 || psychiatryDoctorsDefeated < 2)) continue;
        const { group } = doctor;
        if (!doctor.spawned && player.camera.position.z <= group.position.z + 14) {
            doctor.spawned = true;
            group.visible = true;
            heartbeat?.playScream();
            player.triggerCameraShake(doctor.final ? 0.05 : 0.025, doctor.final ? 0.8 : 0.4);
        }
        if (!doctor.spawned) continue;
        const inCentralLane = player.psychiatryLane === null || player.psychiatryLane === 0;
        const targetX = inCentralLane ? player.camera.position.x : 0;
        const dx = targetX - group.position.x;
        const dz = player.camera.position.z - group.position.z;
        const targetDistance = Math.hypot(dx, dz);
        if (targetDistance > 0.05) {
            const speed = doctor.final ? 6.8 : 2.4;
            const step = Math.min(targetDistance, speed * Math.min(delta, 0.05));
            group.position.x += dx / targetDistance * step;
            group.position.z += dz / targetDistance * step;
            group.rotation.y = Math.atan2(dx, dz);
        }
        if (inCentralLane && targetDistance < 1.45) triggerGameOver('doctor-attack');
    }
    const activeDoctors = psychiatryDoctors.filter(({ spawned, defeated }) => spawned && !defeated);
    if (activeDoctors.length) {
        const nearestDistance = Math.min(...activeDoctors.map(({ group }) => Math.hypot(
            player.camera.position.x - group.position.x,
            player.camera.position.z - group.position.z
        )));
        heartbeat?.updateDoctor(nearestDistance, delta, true, true);
    } else {
        heartbeat?.updateDoctor(Infinity, delta, false, false);
    }
}

function getPsychiatryDoctor(object) {
    let candidate = object;
    while (candidate) {
        const doctor = psychiatryDoctors.find((entry) => entry.group === candidate);
        if (doctor) return doctor;
        candidate = candidate.parent;
    }
    return null;
}

function resetPsychiatryProgress() {
    for (const doctor of psychiatryDoctors) scene.remove(doctor.group);
    psychiatryDoctors = [];
    psychiatryDoctorsDefeated = 0;
    psychiatryLetterCount = 0;
    psychiatryScareTimer = THREE.MathUtils.randFloat(28, 48);
    macroareaThreeUnlocked = false;
    macroareaFourEntered = false;
    aslCollected = false;
    macroareaFourDoorBroken = false;
    doctorCodeLabel.visible = false;
    keypadDoor.visible = true;
    keypadDoor.rotation.set(0, 0, 0);
    keypadTarget.visible = true;
    macroareaFourDoor.visible = true;
    macroareaFourDoor.rotation.set(0, 0, 0);
    aslPickup.visible = false;
    aslTarget.visible = false;
    macroareaFourDoorTarget.visible = true;
    areaThreeGate.visible = true;
    for (const drawer of psychiatryDrawerTargets) {
        drawer.opened = false;
        drawer.target.visible = true;
        drawer.drawer.position.x = drawer.target.position.x;
    }
}

function revealFinalDottore() {
    if (!macroareaTwoEntered || !shotgunCollected || !blueButtonPressed
        || !yellowButtonPressed || doctorFinalEncounterReady || doctorFinalDefeated) return;
    doctorFinalEncounterReady = true;
    showSubtitle('Il passaggio finale è pronto. Qualcosa ti aspetta oltre il corridoio.', 5);
}

function startFinalDottoreEncounter() {
    if (!doctorFinalEncounterReady || doctorFinalEncounterStarted || doctorFinalDefeated
        || player.camera.position.z > areaTwoEndZ + 22) return;
    const forward = camera.getWorldDirection(new THREE.Vector3());
    forward.y = 0;
    forward.normalize();
    const position = player.camera.position.clone().addScaledVector(forward, 5.5);
    position.x = THREE.MathUtils.clamp(position.x, -4.2, 4.2);
    position.z = Math.max(position.z, areaTwoEndZ + 4);
    position.y = 0;
    pinoApproachRemaining = 0;
    pinoVisibleRemaining = 0;
    pinoGroup.visible = false;
    startDottoreFinalEncounter(position);
    doctorFinalEncounterStarted = true;
    showSubtitle('Il Dottore ti sbarra la strada! Difenditi con il fucile a pompa.', 5);
}

function triggerDoctorAngularJumpscare() {
    if (doctorJumpscareOverlay.classList.contains('active') || isDead) return;
    const closeup = dottoreGroup.clone(true);
    const side = Math.random() < 0.5 ? -1 : 1;
    closeup.position.set(side * 0.82, -1.05, -1.5);
    closeup.rotation.set(0, side * 0.72, 0);
    closeup.scale.setScalar(0.82);
    camera.add(closeup);
    doctorJumpscareOverlay.classList.add('active');
    doctorJumpscareOverlay.setAttribute('aria-hidden', 'false');
    heartbeat?.playScream();
    player.triggerCameraShake(0.065, 1.3);
    window.clearTimeout(doctorJumpscareTimeout);
    doctorJumpscareTimeout = window.setTimeout(() => {
        camera.remove(closeup);
        doctorJumpscareOverlay.classList.remove('active');
        doctorJumpscareOverlay.setAttribute('aria-hidden', 'true');
    }, 1450);
}

function updatePinoScare(delta) {
    if (player.uiPaused || inventoryOverlay.classList.contains('visible')
        || noteOverlay.classList.contains('visible')) return;
    if (pinoVisibleRemaining > 0) {
        pinoVisibleRemaining = Math.max(0, pinoVisibleRemaining - delta);
        if (pinoVisibleRemaining === 0) {
            pinoGroup.visible = false;
            pinoScareTimer = THREE.MathUtils.randFloat(60, 120);
        }
        return;
    }
    if (pinoApproachRemaining > 0) {
        pinoApproachRemaining = Math.max(0, pinoApproachRemaining - delta);
        if (pinoApproachRemaining === 0) {
            const forward = camera.getWorldDirection(new THREE.Vector3());
            pinoGroup.position.copy(player.camera.position).addScaledVector(forward, 3.2);
            pinoGroup.position.y = 0;
            pinoGroup.rotation.y = Math.atan2(
                player.camera.position.x - pinoGroup.position.x,
                player.camera.position.z - pinoGroup.position.z
            );
            pinoGroup.visible = true;
            pinoVisibleRemaining = 1.5;
            heartbeat?.playPinoScream();
        }
        return;
    }
    if (doctorFinalEncounterStarted || doctorFinalDefeated) return;
    pinoScareTimer -= delta;
    if (pinoScareTimer <= 0) {
        heartbeat?.playPinoApproach();
        pinoApproachRemaining = 0.85;
    }
}

function playDoctorFalseJumpscare() {
    if (document.getElementById('false-jumpscare').classList.contains('active')) return;
    const closeup = dottoreGroup.clone(true);
    closeup.position.set(0, -1.05, -1.15);
    closeup.rotation.set(0, 0, 0);
    closeup.scale.setScalar(0.86);
    camera.add(closeup);
    triggerFalseJumpscare(
        () => heartbeat.playScream(),
        dottoreGroup.userData.modelLoaded === true,
        () => player.triggerCameraShake(0.045, 0.4)
    );
    window.setTimeout(() => camera.remove(closeup), 420);
}

function respawnAtCheckpoint() {
    isDead = false;
    ambientJumpscareActive = false;
    hideAmbientJumpscare();
    ambientJumpscareTimer = THREE.MathUtils.randFloat(180, 240);
    idleStillElapsed = 0;
    idleGlassBreakChecked = false;
    eyesClosed = false;
    panicLevel = 0;
    panicGameOverPending = false;
    spaceSpamCount = 0;
    axeUses = 7;
    axeCollected = false;
    shotgunCollected = false;
    shotgunLoaded = 2;
    shotgunAmmo = 8;
    reloadRemaining = 0;
    axeDrawerOpened = false;
    woodDoorBroken = false;
    lastAxeAttackAt = -Infinity;
    blueButtonPressed = false;
    yellowButtonPressed = false;
    doctorFinalEncounterReady = false;
    doctorFinalEncounterStarted = false;
    doctorFinalDefeated = false;
    resetPsychiatryProgress();
    macroareaThreeEntered = false;
    pinoScareTimer = THREE.MathUtils.randFloat(60, 120);
    pinoApproachRemaining = 0;
    pinoVisibleRemaining = 0;
    doctorAngularTimer = THREE.MathUtils.randFloat(35, 60);
    player.reset();
    player.isInMacroareaTwo = true;
    player.areaTwoStartZ = areaTwoStartZ;
    player.corridorEndZ = areaTwoEndZ;
    player.camera.position.copy(checkpoint.position);
    player.setLookRotation(checkpoint.rotation);
    player.setWeaponOwned('axe', false);
    player.setWeaponOwned('shotgun', false);
    resetDottore();
    transitionDoor.rotation.y = -Math.PI / 2;
    scene.fog.color.setHex(0x17232a);
    scene.fog.density = 0.028;
    woodDoor.visible = true;
    woodDoor.userData.broken = false;
    if (woodDoor.userData.model && woodDoor.userData.model.parent !== woodDoor) {
        woodDoor.add(woodDoor.userData.model);
    }
    woodDoorPanel.visible = true;
    areaThreeGate.visible = true;
    pinoGroup.visible = false;
    axeTarget.visible = false;
    axeDrawerDisplay.visible = false;
    shotgunTarget.visible = true;
    ammoTargets.splice(0, ammoTargets.length, ...initialAmmoTargets);
    for (const target of initialAmmoTargets) target.visible = true;
    for (const { target, pickup } of initialAntibioticTargets) {
        target.visible = true;
        pickup.visible = true;
    }
    for (const { button, type } of buttonTargets) {
        button.material.emissiveIntensity = type === 'blueButton' ? 2.2 : 3.2;
    }
    interactionTargets.splice(0, interactionTargets.length, ...baseInteractionTargets);
    jumpscareOverlay.classList.remove('active');
    hideDeathScreen();
    document.getElementById('false-jumpscare').classList.remove('active');
    document.getElementById('false-jumpscare').setAttribute('aria-hidden', 'true');
    doctorJumpscareOverlay.classList.remove('active');
    doctorJumpscareOverlay.setAttribute('aria-hidden', 'true');
    window.clearTimeout(doctorJumpscareTimeout);
    document.body.classList.remove('macroarea-three');
    window.clearTimeout(blurRemovalTimer);
    renderer.domElement.classList.remove('blur-effect');
    renderer.domElement.style.transition = '';
    distortionOverlay.classList.remove('active');
    hallucinationOverlay.classList.remove('active');
    document.getElementById('false-jumpscare').classList.remove('active');
    document.getElementById('false-jumpscare').setAttribute('aria-hidden', 'true');
    falseJumpscareTimer = THREE.MathUtils.randFloat(8, 16);
    heartbeat?.reset();
    heartbeat?.setArea(2);
    startScreen.style.display = 'none';
    enterGame();
}

function releaseEyesClosed() {
    if (!eyesClosed) return;
    const heldFor = (performance.now() - eyesClosedStartedAt) / 1000;
    eyesClosed = false;
    eyesClosedOverlay.classList.remove('active');
    if (heldFor >= 2 && isInservienteChasing()) {
        if (!inservienteGroup.visible) {
            revealInserviente(player.camera.position, camera, 2.8);
        }
        triggerGameOver('monster-caught');
    }
    eyesClosedStartedAt = 0;
}

function enterGame() {
    if (isDead || startingGame) return;
    startingGame = true;
    startScreen.style.display = 'none';

    try {
        if (!heartbeat) heartbeat = initAudio();
        const lockRequest = typeof controls?.lock === 'function'
            ? controls.lock()
            : document.body.requestPointerLock();
        const audioStart = heartbeat.start();
        gameStarted = true;
        previousTime = performance.now();
        animate();
        Promise.all([lockRequest, audioStart])
            .catch((error) => {
                console.error('Avvio del gioco non riuscito:', error);
                heartbeat?.reset();
                player.unlock();
                gameStarted = false;
                startScreen.style.display = 'flex';
            })
            .finally(() => {
                startingGame = false;
            });
    } catch (error) {
        player.unlock();
        gameStarted = false;
        startScreen.style.display = 'flex';
        console.error('Avvio del gioco non riuscito:', error);
        startingGame = false;
    }
}

window.addEventListener('click', enterGame, { once: true });

document.addEventListener('pointerlockchange', () => {
    const active = player.isLocked;
    startScreen.style.display = active || gameStarted || isDead ? 'none' : 'flex';
    crosshair.style.display = active && !isDead ? 'block' : 'none';
    panicIndicator.style.display = active || isDead ? 'block' : 'none';
    if (!active) {
        heartbeat?.updatePlayerSteps(false, false);
        interactionPrompt.style.display = 'none';
        releaseEyesClosed();
        player.setUiPaused(false);
        inventoryOverlay.classList.remove('visible');
        inventoryOverlay.setAttribute('aria-hidden', 'true');
    }
});

window.addEventListener('keydown', (event) => {
    if (isDead && event.code === 'KeyN' && !event.repeat) {
        event.preventDefault();
        restartGame();
        return;
    }
    if (!isDead && event.code === 'Space' && !event.repeat && player.isLocked) {
        event.preventDefault();
        const now = performance.now();
        spaceSpamCount = now - lastSpacePressAt <= 850 ? spaceSpamCount + 1 : 1;
        lastSpacePressAt = now;
        if (spaceSpamCount >= 5) {
            bloodEffectRemaining = 1.35;
            bloodSpitOverlay.classList.add('active');
            heartbeat?.playBloodSpit();
            const panicLines = [
                'Non ce la faccio...',
                'Sento la testa scoppiare!',
                'Devo... devo calmarmi...'
            ];
            showSubtitle(panicLines[Math.min(spaceSpamCount - 5, panicLines.length - 1)], 2.4);
        }
        if (spaceSpamCount >= 11) {
            if (panicGameOverPending) return;
            panicGameOverPending = true;
            if (!isInservienteChasing()) startInservienteChase(player.camera.position);
            revealInserviente(player.camera.position, camera, 2.8);
            showSubtitle('Il panico ti ha tradito.', 1.5);
            player.movementDisabled = true;
            player.keys.clear();
            player.velocity.set(0, 0);
            window.setTimeout(() => triggerGameOver('panic-spam'), 350);
            return;
        }
        eyesClosed = true;
        eyesClosedStartedAt = performance.now();
        eyesClosedOverlay.classList.add('active');
    }
});

window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') {
        releaseEyesClosed();
    }
});

window.addEventListener('blur', () => {
    releaseEyesClosed();
});

const {
    doorPivot,
    doorPanel,
    sideDoors,
    explorationRooms,
    letterPlacements,
    radioTargets,
    exitDoor,
    exitPanel,
    exitDoorZ,
    mainDoorZ,
    corridorEndZ,
    transitionDoor,
    transitionPanel,
    transitionDoorZ,
    areaTwoStartZ,
    areaTwoEndZ,
    areaThreeStartZ,
    areaThreeEndZ,
    axeDrawerTarget,
    axeTarget,
    axeDrawerDisplay,
    shotgunTarget,
    ammoTargets,
    antibioticTargets,
    buttonTargets,
    pinoGroup,
    areaThreeGate,
    cabinetDrawerTargets,
    keypadDoor,
    keypadTarget,
    psychiatryDrawerTargets,
    macroareaFourDoor,
    macroareaFourDoorTarget,
    aslPickup,
    aslTarget,
    areaFourStartZ,
    areaFourEndZ,
    woodDoorPanel,
    woodDoor,
    woodDoorZ,
    neonLights
} = createHospitalWorld(scene);
const initialAmmoTargets = [...ammoTargets];
const initialAntibioticTargets = [...antibioticTargets];
player.explorationRooms = explorationRooms;
player.corridorEndZ = corridorEndZ;
player.mainDoorZ = mainDoorZ;
player.canCrossMainDoor = () => doorOpen;
player.areaTwoStartZ = areaTwoStartZ;
player.canCrossWoodDoor = () => woodDoorBroken;
player.woodDoorZ = woodDoorZ;
player.areaThreeStartZ = areaThreeStartZ;
player.areaThreeEndZ = areaThreeEndZ;

const creepyPortraits = [
    { type: 'blood', x: -5.88, rotation: Math.PI / 2, z: -7 },
    { type: 'face', x: 5.88, rotation: -Math.PI / 2, z: -20 },
    { type: 'static', x: -5.88, rotation: Math.PI / 2, z: -34 }
];
for (const portrait of creepyPortraits) {
    const frame = new THREE.Mesh(
        new THREE.BoxGeometry(1.18, 1.55, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x171414, roughness: 0.9 })
    );
    frame.position.set(portrait.x, 1.75, portrait.z);
    frame.rotation.y = portrait.rotation;
    scene.add(frame);

    const image = new THREE.Mesh(
        new THREE.PlaneGeometry(1.02, 1.38),
        new THREE.MeshStandardMaterial({
            map: createCreepyTexture(portrait.type),
            side: THREE.DoubleSide,
            roughness: 1
        })
    );
    image.position.set(portrait.x + (portrait.x < 0 ? 0.05 : -0.05), 1.75, portrait.z);
    image.rotation.y = portrait.rotation;
    scene.add(image);
}

const keyMaterial = new THREE.MeshStandardMaterial({
    color: 0xffc84a,
    emissive: 0xffa000,
    emissiveIntensity: 1.5,
    metalness: 0.55,
    roughness: 0.25
});

const letterDefinitions = [
    { number: 1, text: 'La chiave è vicino all’ingresso. Quando la porta si aprirà, non restare fermo: lui ti sente anche nel buio.' },
    { number: 2, text: 'La luce lo tiene lontano, ma non per sempre. Ho sentito una porta aprirsi alla mia sinistra.' },
    { number: 3, text: 'Siamo bloccati nel vecchio ospedale psichiatrico... nel reparto di isolamento.' }
];
const letters = letterDefinitions.map((letter, index) => {
    const letterGroup = new THREE.Group();
    letterGroup.position.copy(letterPlacements[index]);
    const interactionTarget = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.12, 0.55),
        new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide
        })
    );
    interactionTarget.position.y = 0.06;
    interactionTarget.userData.interactionType = 'letter';
    letterGroup.add(interactionTarget);
    scene.add(letterGroup);
    return { ...letter, object: interactionTarget, group: letterGroup, collected: false };
});

const letterModelUrl = new URL('../models/lettera.glb', import.meta.url).href;
new GLTFLoader().load(
    letterModelUrl,
    (gltf) => {
        const template = gltf.scene;
        configureLoadedModel(template);
        const bounds = new THREE.Box3().setFromObject(template);
        const size = bounds.getSize(new THREE.Vector3());
        const largestDimension = Math.max(size.x, size.y, size.z);
        if (largestDimension <= 0) {
            console.error(`Il modello della lettera non ha dimensioni valide: ${letterModelUrl}`);
            return;
        }

        template.scale.setScalar(0.5 / largestDimension);
        const scaledBounds = new THREE.Box3().setFromObject(template);
        const center = scaledBounds.getCenter(new THREE.Vector3());
        template.position.set(-center.x, -scaledBounds.min.y, -center.z);
        for (const letter of letters) {
            const copy = template.clone(true);
            configureLoadedModel(copy);
            letter.group.add(copy);
        }
    },
    undefined,
    (error) => console.error(`Impossibile caricare i modelli delle lettere (${letterModelUrl}):`, error)
);

function createDrawerKey(drawerUnit) {
    const keyGroup = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.025, 8, 16), keyMaterial);
    ring.position.x = -0.14;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.045, 0.045), keyMaterial);
    shaft.position.x = 0.08;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.045), keyMaterial);
    tooth.position.set(0.18, -0.055, 0);
    keyGroup.add(ring, shaft, tooth);

    const target = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.18, 0.16),
        new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide
        })
    );
    target.userData.interactionType = 'key';
    keyGroup.add(target);
    keyGroup.position.set(0, 0.19, 0.05);
    target.position.x = -0.2;
    keyGroup.visible = false;
    drawerUnit.add(keyGroup);
    return { keyGroup, target };
}

function createDrawerBattery(drawerUnit) {
    const battery = new THREE.Group();
    const casing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.24, 8),
        new THREE.MeshStandardMaterial({
            color: 0x82916a,
            emissive: 0x28351b,
            emissiveIntensity: 0.35,
            metalness: 0.25,
            roughness: 0.55
        })
    );
    casing.rotation.z = Math.PI / 2;
    const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.035, 8),
        new THREE.MeshStandardMaterial({ color: 0xb4aa82, metalness: 0.7, roughness: 0.35 })
    );
    cap.rotation.z = Math.PI / 2;
    cap.position.x = 0.13;
    battery.add(casing, cap);
    const target = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.22, 0.22),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    target.position.x = 0.22;
    target.userData.interactionType = 'battery';
    battery.add(target);
    battery.position.set(0.28, 0.2, 0.08);
    battery.visible = false;
    drawerUnit.add(battery);
    return { group: battery, target };
}

const drawers = [
    { z: -65, side: 1 },
    { z: -145, side: -1 }
].map(({ z, side }, keyIndex) => {
    const cabinet = new THREE.Group();
    cabinet.position.set(side * 4.05, 0.75, z);
    const wood = new THREE.MeshStandardMaterial({ color: 0x30251e, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.35, 0.9), wood);
    cabinet.add(body);
    const drawerUnit = new THREE.Group();
    drawerUnit.position.set(-side * 0.7, 0.14, 0.06);
    const drawer = new THREE.Mesh(
        new THREE.BoxGeometry(0.86, 0.34, 0.16),
        new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide
        })
    );
    drawer.userData.interactionType = 'drawer';
    drawer.userData.side = side;
    drawerUnit.add(drawer);
    const handle = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x9b8a6b, metalness: 0.75, roughness: 0.3 })
    );
    handle.position.set(0, 0, -side * 0.07);
    drawerUnit.add(handle);
    cabinet.add(drawerUnit);
    scene.add(cabinet);
    const key = createDrawerKey(drawerUnit);
    const battery = createDrawerBattery(drawerUnit);
    return {
        cabinet,
        drawer,
        drawerUnit,
        keyGroup: key.keyGroup,
        keyTarget: key.target,
        batteryGroup: battery.group,
        batteryTarget: battery.target,
        opened: false,
        keyCollected: false,
        keyIndex,
        side,
        originalDrawerPosition: drawerUnit.position.clone()
    };
});

const drawerModelUrl = new URL('../models/cassetto.glb', import.meta.url).href;
new GLTFLoader().load(
    drawerModelUrl,
    (gltf) => {
        for (const drawer of drawers) {
            const model = gltf.scene.clone(true);
            configureLoadedModel(model);
            model.rotation.y = -drawer.side * Math.PI / 2;
            model.updateMatrixWorld(true);
            const bounds = new THREE.Box3().setFromObject(model);
            const size = bounds.getSize(new THREE.Vector3());
            const largestDimension = Math.max(size.x, size.y, size.z);
            if (largestDimension <= 0) {
                console.error(`Il modello del cassetto non ha dimensioni valide: ${drawerModelUrl}`);
                return;
            }

            model.scale.multiplyScalar(0.9 / largestDimension);
            model.updateMatrixWorld(true);
            const scaledBounds = new THREE.Box3().setFromObject(model);
            const center = scaledBounds.getCenter(new THREE.Vector3());
            model.position.set(-center.x, -center.y, -center.z);
            drawer.drawerUnit.add(model);
        }
    },
    undefined,
    (error) => console.error(`Impossibile caricare il modello del cassetto (${drawerModelUrl}):`, error)
);

const baseInteractionTargets = [
    doorPanel,
    ...sideDoors.map((door) => door.panel),
    ...radioTargets,
    exitPanel,
    ...letters.map((letter) => letter.object),
    ...drawers.map((drawer) => drawer.drawer),
    transitionPanel,
    axeDrawerTarget,
    shotgunTarget,
    ...ammoTargets,
    ...antibioticTargets.map(({ target }) => target),
    ...buttonTargets.map(({ target }) => target),
    ...cabinetDrawerTargets,
    keypadTarget,
    ...psychiatryDrawerTargets.map(({ target }) => target),
    aslTarget,
    macroareaFourDoorTarget,
    woodDoorPanel
];
const interactionTargets = [...baseInteractionTargets];
const doctorRaycaster = new THREE.Raycaster();
scene.traverse((object) => {
    if (!object.isMesh && !object.isInstancedMesh) return;
    object.frustumCulled = true;
    object.castShadow = object.userData.performanceShadow === true;
    object.receiveShadow = true;
});
const raycaster = new THREE.Raycaster();
raycaster.far = 2.5;
const screenCenter = new THREE.Vector2(0, 0);
const interactionOrigin = new THREE.Vector3();
const interactionHits = [];
const keysAvailable = new Set();
let progressionDoorsOpened = 0;
let lettersReadCount = 0;
let doorOpen = false;
let exitDoorOpen = false;

function getInteractionTarget() {
    camera.updateMatrixWorld(true);
    camera.getWorldPosition(interactionOrigin);
    raycaster.setFromCamera(screenCenter, camera);
    interactionHits.length = 0;
    raycaster.intersectObjects(interactionTargets, false, interactionHits);
    for (const hit of interactionHits) {
        if (interactionOrigin.distanceTo(hit.point) < raycaster.far) return hit;
    }
    let nearestAntibiotic = null;
    let nearestDistance = 1.8;
    for (const { target } of antibioticTargets) {
        if (!target.visible) continue;
        const distance = interactionOrigin.distanceTo(target.position);
        if (distance < nearestDistance) {
            nearestAntibiotic = target;
            nearestDistance = distance;
        }
    }
    if (nearestAntibiotic) return { object: nearestAntibiotic, distance: nearestDistance };
    return null;
}

function updateInventory() {
    const foundLetters = letters.filter((letter) => letter.collected);
    const diary = foundLetters.length
        ? foundLetters.map((letter) => `Lettera ${letter.number}: ${letter.text}`).join('\n\n')
        : 'Nessuna lettera trovata.';
    inventoryContent.textContent = [
        `Chiavi: ${keysAvailable.size}/2`,
        `Batterie raccolte: ${batteryCount}`,
        `Carica torcia: ${Math.floor(player.flashlightBattery)}%`,
        `Lettere: ${foundLetters.length}/2`,
        `Lettere Psichiatria: ${psychiatryLetterCount}/2`,
        `Dottori Psichiatria: ${psychiatryDoctorsDefeated}/3`,
        `Tesserino ASL: ${aslCollected ? 'raccolto' : 'non trovato'}`,
        `Arma equipaggiata: ${player.currentWeapon === 'axe' ? 'Ascia' : player.currentWeapon === 'shotgun' ? 'Fucile' : 'Torcia'}`,
        `Ascia: ${axeCollected ? `${axeUses}/7 utilizzi` : 'non trovata'}`,
        `Fucile: ${shotgunCollected ? `${shotgunLoaded} / ${shotgunAmmo}` : 'non trovato'}`,
        '',
        'DIARIO',
        diary
    ].join('\n');
}

function toggleInventory() {
    if (inventoryOverlay.classList.contains('visible')) {
        inventoryOverlay.classList.remove('visible');
        inventoryOverlay.setAttribute('aria-hidden', 'true');
        player.setUiPaused(false);
        return;
    }
    closeNote();
    updateInventory();
    player.setUiPaused(true);
    inventoryOverlay.classList.add('visible');
    inventoryOverlay.setAttribute('aria-hidden', 'false');
}

function startShotgunReload() {
    if (!shotgunCollected || reloadRemaining > 0) return;
    if (shotgunLoaded >= 2 || shotgunAmmo <= 0) {
        showSubtitle(shotgunAmmo <= 0 ? 'Non hai munizioni di riserva.' : 'Il fucile è già carico.');
        return;
    }
    reloadRemaining = 1.45;
    player.animateReload();
    heartbeat?.playReload();
}

window.addEventListener('keydown', (event) => {
    if (isDead || event.code !== 'Tab' || event.repeat || !player.isLocked) return;
    event.preventDefault();
    toggleInventory();
});

window.addEventListener('keydown', (event) => {
    if (isDead || event.code !== 'KeyR' || event.repeat || !player.isLocked) return;
    event.preventDefault();
    if (shotgunCollected) {
        startShotgunReload();
        return;
    }
    if (batteryCount === 0) {
        showSubtitle('Non hai batterie di riserva.');
        return;
    }
    if (player.flashlightBattery >= 100) {
        showSubtitle('La torcia è già completamente carica.');
        return;
    }
    batteryCount -= 1;
    const restored = player.rechargeFlashlight(45);
    heartbeat?.playPickup();
    batteryStatus.textContent = `TORCIA ${Math.floor(player.flashlightBattery)}% · PILE ${batteryCount}`;
    showSubtitle(`Batteria usata: +${Math.round(restored)}% di carica.`);
    if (inventoryOverlay.classList.contains('visible')) updateInventory();
});

window.addEventListener('keydown', (event) => {
    if (isDead || event.code !== 'KeyE' || event.repeat || !player.isLocked) return;
    if (inventoryOverlay.classList.contains('visible')) {
        toggleInventory();
        return;
    }
    if (noteOverlay.classList.contains('visible')) {
        closeNote();
        return;
    }

    const hit = getInteractionTarget();
    if (!hit) return;
    const type = hit.object.userData.interactionType;

    if (type === 'keypad') {
        startMacroareaThreeTransition();
    } else if (type === 'psychiatryDrawer') {
        const drawer = psychiatryDrawerTargets.find(({ target }) => target === hit.object);
        if (!drawer || drawer.opened) return;
        drawer.opened = true;
        drawer.target.visible = false;
        drawer.drawer.position.x += drawer.target.position.x < 0 ? -0.2 : 0.2;
        heartbeat?.playDrawer();
        tryPlayGlassBreak();
        if (drawer.cache === 'ammo') {
            shotgunAmmo += 4;
            syncWeaponStatus();
            showSubtitle('Nel cassetto trovi quattro cartucce per il fucile.');
        } else if (drawer.cache === 'letter1' || drawer.cache === 'letter2') {
            psychiatryLetterCount += 1;
            noteText.textContent = drawer.cache === 'letter1'
                ? 'Prima Lettera: «Il corridoio centrale non è vuoto. Se senti correre, mira al petto e non fermarti.»'
                : 'Seconda Lettera: «Il tesserino del reparto apre il blocco successivo. L’ascia può ancora abbattere una porta.»';
            noteOverlay.classList.add('visible');
            noteOverlay.setAttribute('aria-hidden', 'false');
            heartbeat?.playPickup();
            showSubtitle(`Lettere del reparto raccolte: ${psychiatryLetterCount}/2.`);
        } else {
            showSubtitle('Il cassetto è vuoto. Qualcuno l’ha già rovistato.');
        }
    } else if (type === 'asl') {
        if (!aslTarget.visible || aslCollected) return;
        aslCollected = true;
        aslTarget.visible = false;
        aslPickup.visible = false;
        heartbeat?.playPickup();
        showSubtitle('Hai raccolto il tesserino ASL del Dottore.');
    } else if (type === 'macroareaFourDoor') {
        showSubtitle(macroareaFourDoorBroken
            ? 'La porta è abbattuta.'
            : 'La porta è inchiodata. Usa l’ascia o il tesserino ASL con un colpo.');
    } else if (type === 'key') {
        let drawer = null;
        for (const entry of drawers) {
            if (entry.keyTarget === hit.object) {
                drawer = entry;
                break;
            }
        }
        if (!drawer || drawer.keyCollected) return;
        drawer.keyCollected = true;
        keysAvailable.add(drawer.keyIndex);
        drawer.keyGroup.visible = false;
        interactionTargets.splice(interactionTargets.indexOf(drawer.keyTarget), 1);
        heartbeat?.playPickup();
        showSubtitle(`Hai raccolto la chiave ${drawer.keyIndex + 1} (${keysAvailable.size}/2).`);
    } else if (type === 'battery') {
        let drawer = null;
        for (const entry of drawers) {
            if (entry.batteryTarget === hit.object) {
                drawer = entry;
                break;
            }
        }
        if (!drawer || drawer.batteryCollected) return;
        drawer.batteryCollected = true;
        batteryCount += 1;
        drawer.batteryGroup.visible = false;
        interactionTargets.splice(interactionTargets.indexOf(drawer.batteryTarget), 1);
        heartbeat?.playPickup();
        showSubtitle(`Batteria aggiunta all'inventario. Premi R per ricaricare la torcia (${batteryCount}).`);
    } else if (type === 'antibiotics') {
        const antibiotic = antibioticTargets.find(({ target }) => target === hit.object);
        if (!antibiotic) return;
        antibiotic.target.visible = false;
        antibiotic.pickup.visible = false;
        interactionTargets.splice(interactionTargets.indexOf(antibiotic.target), 1);
        panicLevel = Math.max(0, panicLevel - 40);
        renderer.domElement.style.transition = 'none';
        renderer.domElement.classList.remove('blur-effect');
        void renderer.domElement.offsetWidth;
        renderer.domElement.classList.add('blur-effect');
        void renderer.domElement.offsetWidth;
        renderer.domElement.style.transition = '';
        window.clearTimeout(blurRemovalTimer);
        blurRemovalTimer = window.setTimeout(() => {
            renderer.domElement.classList.remove('blur-effect');
        }, 1000);
        heartbeat?.playAntibiotics();
        showSubtitle('Antibiotici assunti: ansia ridotta, vista sfocata temporaneamente.');
    } else if (type === 'blueButton' || type === 'yellowButton') {
        const button = buttonTargets.find(({ target }) => target === hit.object);
        if (!button) return;
        if (type === 'blueButton' && !blueButtonPressed) {
            blueButtonPressed = true;
            button.button.material.emissiveIntensity = 0.35;
            heartbeat?.playBell();
            showSubtitle('Pulsante blu attivato.');
        } else if (type === 'yellowButton' && !yellowButtonPressed) {
            yellowButtonPressed = true;
            button.button.material.emissiveIntensity = 0.35;
            heartbeat?.playBell();
            showSubtitle('Pulsante giallo fluorescente attivato.');
        } else {
            showSubtitle('Il pulsante è già attivo.');
        }
        revealFinalDottore();
    } else if (type === 'door' && !doorOpen) {
        doorPivot.rotation.y = -Math.PI / 2;
        doorOpen = true;
        heartbeat?.playDoor();
        startInservienteChase(player.camera.position);
        gazeTime = 0;
        lookBackTime = 0;
        eyesClosedStartedAt = 0;
        tensionElapsed = 0;
        tensionInterval = 8;
        previousTensionBand = 2;
        showSubtitle('La porta si apre con un gemito. I passi iniziano alle tue spalle.');
    } else if (type === 'sideDoor') {
        let sideDoor = null;
        for (const door of sideDoors) {
            if (door.panel === hit.object) {
                sideDoor = door;
                break;
            }
        }
        if (!sideDoor) return;
        if (sideDoor.keyIndex !== null && !sideDoor.pivot.userData.isOpen) {
            if (!keysAvailable.has(sideDoor.keyIndex)) {
                showSubtitle(`Porta bloccata: serve la chiave ${sideDoor.keyIndex + 1}.`);
                heartbeat?.playLockedDoor();
                return;
            }
            progressionDoorsOpened += 1;
            sideDoor.pivot.userData.isOpen = true;
            sideDoor.pivot.rotation.y = sideDoor.side * Math.PI / 2;
        } else if (sideDoor.keyIndex === null) {
            sideDoor.pivot.userData.isOpen = !sideDoor.pivot.userData.isOpen;
            sideDoor.pivot.rotation.y = sideDoor.pivot.userData.isOpen
                ? sideDoor.side * Math.PI / 2
                : 0;
        } else {
            return;
        }
        heartbeat?.playDoor();
        showSubtitle(sideDoor.pivot.userData.isOpen
            ? 'La stanza è aperta. L’aria al suo interno è gelida.'
            : 'La porta si richiude alle tue spalle.');
    } else if (type === 'radio') {
        heartbeat?.playStaticInterference();
        showSubtitle('La radio gracchia: «...soggetto... reparto... non aprite...»');
    } else if (type === 'letter') {
        let letter = null;
        for (const entry of letters) {
            if (entry.object === hit.object) {
                letter = entry;
                break;
            }
        }
        if (!letter || letter.collected) return;
        noteText.textContent = `Lettera ${letter.number}: «${letter.text}»`;
        noteOverlay.classList.add('visible');
        noteOverlay.setAttribute('aria-hidden', 'false');
        heartbeat?.playPickup();
        letter.collected = true;
        lettersReadCount += 1;
        interactionTargets.splice(interactionTargets.indexOf(letter.object), 1);
    } else if (type === 'drawer') {
        const drawer = drawers.find((entry) => entry.drawer === hit.object);
        if (!drawer || drawer.opened) return;
        drawer.opened = true;
        interactionTargets.splice(interactionTargets.indexOf(drawer.drawer), 1);
        drawer.drawerUnit.position.x -= drawer.side * 0.38;
            drawer.keyGroup.visible = !drawer.keyCollected;
            drawer.batteryGroup.visible = !drawer.batteryCollected;
        interactionTargets.push(drawer.keyTarget);
        interactionTargets.push(drawer.batteryTarget);
        heartbeat?.playDrawer();
            tryPlayGlassBreak();
            showSubtitle('Nel cassetto trovi una chiave e una batteria di riserva.');
    } else if (type === 'exitDoor' && !exitDoorOpen) {
        if (lettersReadCount !== 2 || keysAvailable.size !== 2) {
            showSubtitle(`Uscita bloccata: servono esattamente 2 lettere (${lettersReadCount}/2) e 2 chiavi (${keysAvailable.size}/2).`);
            return;
        }
        exitDoor.rotation.y = Math.PI / 2;
        exitDoorOpen = true;
        player.corridorEndZ = areaTwoEndZ;
        player.transitionDoorZ = transitionDoorZ;
        player.onTransitionDoorCross = () => enterMacroareaTwo();
        player.camera.position.z = exitDoorZ - 1.1;
        heartbeat?.playDoor();
        showSubtitle('La porta si apre. Percorri il corridoio buio fino alla porta successiva.');
    } else if (type === 'transitionDoor' && exitDoorOpen && !macroareaTwoEntered) {
        enterMacroareaTwo(true);
    } else if (type === 'axeDrawer' && macroareaTwoEntered) {
        if (!axeDrawerOpened) {
            axeDrawerOpened = true;
            axeTarget.visible = true;
            axeDrawerDisplay.visible = true;
            interactionTargets.push(axeTarget);
            heartbeat?.playDrawer();
            tryPlayGlassBreak();
            showSubtitle('Nel cassetto c’è un’ascia insanguinata. Premi E per raccoglierla.');
        }
    } else if (type === 'axe' && macroareaTwoEntered && !axeCollected) {
        axeCollected = true;
        axeUses = 7;
        axeTarget.visible = false;
        axeDrawerDisplay.visible = false;
        interactionTargets.splice(interactionTargets.indexOf(axeTarget), 1);
        player.setWeaponOwned('axe', true);
        heartbeat?.playPickup();
        syncWeaponStatus();
        showSubtitle('Ascia raccolta: G cambia arma, click sinistro per colpire (7 utilizzi).');
    } else if (type === 'shotgun' && macroareaTwoEntered && !shotgunCollected) {
        shotgunCollected = true;
        shotgunTarget.visible = false;
        interactionTargets.splice(interactionTargets.indexOf(shotgunTarget), 1);
        player.setWeaponOwned('shotgun', true);
        heartbeat?.playPickup();
        syncWeaponStatus();
        showSubtitle('Fucile raccolto: G cambia arma, click sinistro per sparare, R ricarica.');
        revealFinalDottore();
    } else if (type === 'ammo' && macroareaTwoEntered) {
        const index = ammoTargets.indexOf(hit.object);
        if (index < 0) return;
        ammoTargets.splice(index, 1);
        interactionTargets.splice(interactionTargets.indexOf(hit.object), 1);
        shotgunAmmo += 4;
        heartbeat?.playPickup();
        syncWeaponStatus();
        showSubtitle('Munizioni raccolte: +4 colpi.');
    } else if (type === 'cabinetDrawer' && macroareaTwoEntered) {
        heartbeat?.playDrawer();
        showSubtitle('L’armadietto è vuoto. I cassetti metallici sono bloccati.');
    } else if (type === 'woodDoor' && macroareaTwoEntered && !woodDoorBroken) {
        showSubtitle('La porta di legno è inchiodata. Puoi abbatterla con l’ascia.');
    }
});

function syncWeaponStatus() {
    updateWeaponStatus({
        weapon: player.currentWeapon,
        axeUses,
        shotgunLoaded,
        shotgunAmmo,
        axeOwned: axeCollected,
        shotgunOwned: shotgunCollected
    });
}

function breakMacroareaFourDoor() {
    const canUseAxe = player.currentWeapon === 'axe' && axeCollected;
    if (psychiatryLetterCount < 2 || psychiatryDoctorsDefeated < 3
        || (!aslCollected && !canUseAxe)) {
        showSubtitle(`Servono 2 lettere (${psychiatryLetterCount}/2), 3 Dottori (${psychiatryDoctorsDefeated}/3) e l’ascia o il tesserino ASL.`);
        return false;
    }
    macroareaFourDoorBroken = true;
    macroareaFourDoor.rotation.y = -Math.PI / 2;
    macroareaFourDoorTarget.visible = false;
    player.corridorEndZ = areaFourEndZ;
    heartbeat?.playWoodCrash();
    showSubtitle('La porta cede. Il passaggio verso la Macroarea 4 è aperto.', 5);
    window.setTimeout(() => {
        macroareaFourDoor.visible = false;
    }, 650);
    return true;
}

window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyG' && !event.repeat) syncWeaponStatus();
});

window.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || isDead || !player.isLocked || !macroareaTwoEntered) return;
    if (inventoryOverlay.classList.contains('visible')
        || noteOverlay.classList.contains('visible')) return;
    doctorNoisyTimer = 4;

    if (macroareaThreeEntered) {
        raycaster.far = 3.2;
        const doorHit = getInteractionTarget();
        raycaster.far = 2.5;
        if (doorHit?.object === macroareaFourDoorTarget) {
            const usedAxe = player.currentWeapon === 'axe' && axeCollected;
            const opened = breakMacroareaFourDoor();
            if (opened && usedAxe) {
                axeUses -= 1;
                if (axeUses === 0) {
                    axeCollected = false;
                    player.setWeaponOwned('axe', false);
                    heartbeat?.playAxeBreak();
                }
                syncWeaponStatus();
            }
            return;
        }
    }

    if (player.currentWeapon === 'axe' && axeCollected) {
        const now = performance.now();
        if (now - lastAxeAttackAt < 800) return;
        lastAxeAttackAt = now;
        player.animateAxeAttack();
        raycaster.far = 3.2;
        const hit = getInteractionTarget();
        let used = false;
        const keypadDoorHit = raycaster.intersectObject(keypadDoor, true)[0];
        if (hit?.object === keypadTarget || (keypadDoorHit && keypadDoorHit.distance < 3.2)) {
            used = true;
            startMacroareaThreeTransition();
        } else if (hit?.object === woodDoorPanel && !woodDoorBroken) {
            woodDoorBroken = true;
            woodDoor.userData.broken = true;
            if (woodDoor.userData.model) woodDoor.remove(woodDoor.userData.model);
            woodDoorPanel.visible = false;
            interactionTargets.splice(interactionTargets.indexOf(woodDoorPanel), 1);
            used = true;
            heartbeat?.playWoodCrash();
            showSubtitle('Il muro di legno cede sotto il colpo d’ascia.');
        } else {
            camera.updateMatrixWorld(true);
            doctorRaycaster.setFromCamera(screenCenter, camera);
            doctorRaycaster.far = 3.2;
            const doctorHit = doctorRaycaster.intersectObject(dottoreGroup, true)[0];
            if (doctorHit) {
                if (isDottoreFinalEncounter()) {
                    stunDottore();
                    used = true;
                    heartbeat?.playAxeDamage();
                    showSubtitle('Il Dottore barcolla, ma l’ascia non basta a fermarlo.');
                } else {
                    const result = damageDottore(1);
                    used = true;
                    heartbeat?.playAxeDamage();
                    if (result.dead) showSubtitle('Il Dottore è crollato. Il corridoio è finalmente silenzioso.');
                    else showSubtitle(`Colpo d’ascia a segno. Il Dottore vacilla (${result.health}/4).`);
                }
            }
        }
        raycaster.far = 2.5;
        if (used) {
            axeUses -= 1;
            if (axeUses === 0) {
                axeCollected = false;
                player.setWeaponOwned('axe', false);
                heartbeat?.playAxeBreak();
                showSubtitle('L’ascia si è spezzata.');
            }
            syncWeaponStatus();
        }
        return;
    }

    if (player.currentWeapon !== 'shotgun' || !shotgunCollected) return;
    if (reloadRemaining > 0) return;
    if (shotgunLoaded <= 0) {
        startShotgunReload();
        return;
    }
    shotgunLoaded -= 1;
    player.animateShotgunFire();
    heartbeat?.playShotgun();
    camera.updateMatrixWorld(true);
    doctorRaycaster.setFromCamera(
        new THREE.Vector2((Math.random() - 0.5) * 0.045, (Math.random() - 0.5) * 0.045),
        camera
    );
    doctorRaycaster.far = 24;
    const doctorHit = doctorRaycaster.intersectObject(dottoreGroup, true)[0];
    const psychiatryHits = doctorRaycaster.intersectObjects(
        psychiatryDoctors.filter(({ spawned, defeated }) => spawned && !defeated)
            .map(({ group }) => group),
        true
    );
    const hit = [doctorHit, ...psychiatryHits]
        .filter(Boolean)
        .sort((first, second) => first.distance - second.distance)[0];
    if (hit) {
        const psychiatryDoctor = getPsychiatryDoctor(hit.object);
        if (psychiatryDoctor) {
            psychiatryDoctor.health -= 1;
            psychiatryDoctor.defeated = true;
            psychiatryDoctor.group.visible = false;
            psychiatryDoctorsDefeated += 1;
            heartbeat?.playBloodHit();
            if (psychiatryDoctor.final) {
                aslPickup.position.set(
                    psychiatryDoctor.group.position.x,
                    0.72,
                    psychiatryDoctor.group.position.z
                );
                aslTarget.position.copy(aslPickup.position);
                aslPickup.visible = true;
                aslTarget.visible = true;
                showSubtitle('Il Dottore finale cade e lascia il tesserino ASL.');
            } else {
                showSubtitle(`Dottori sconfitti: ${psychiatryDoctorsDefeated}/3.`);
            }
        } else {
        const finalEncounter = isDottoreFinalEncounter();
        const damage = finalEncounter && hit.distance <= 8 ? 2 : 1;
        const result = damageDottore(damage, finalEncounter ? 0.75 : 10);
        heartbeat?.playBloodHit();
        if (result.dead) {
            doctorFinalDefeated = finalEncounter;
            if (finalEncounter) {
                doctorCodeLabel.position.copy(dottoreGroup.position);
                doctorCodeLabel.position.y = 3.15;
                doctorCodeLabel.visible = true;
                heartbeat?.playDoctorDefeatMix();
                heartbeat?.updateDoctor(Infinity, 0, false, false);
                player.corridorEndZ = areaTwoEndZ + 0.12;
                showSubtitle('Il Dottore è crollato. Sul corpo brilla il codice 1525.', 5);
            } else {
                showSubtitle('Il Dottore è crollato. Il corridoio è finalmente silenzioso.');
            }
        } else {
            showSubtitle(finalEncounter
                ? `Il Dottore è ferito (${result.health}/2).`
                : `Il Dottore è stordito per 10 secondi (${result.health}/4).`);
        }
            }
    } else tryPlayGlassBreak();
    syncWeaponStatus();
    if (shotgunLoaded === 0) startShotgunReload();
});

function restartGame(showMainMenu = false) {
    isDead = false;
    ambientJumpscareActive = false;
    hideAmbientJumpscare();
    ambientJumpscareTimer = THREE.MathUtils.randFloat(180, 240);
    ambientJumpscareIndex = 0;
    idleStillElapsed = 0;
    idleGlassBreakChecked = false;
    eyesClosed = false;
    panicLevel = 0;
    gazeTime = 0;
    lookBackTime = 0;
    eyesClosedStartedAt = 0;
    subtitleRemaining = 0;
    tensionElapsed = 0;
    tensionInterval = 8;
    previousTensionBand = -1;
    introShown = false;
    spaceSpamCount = 0;
    lastSpacePressAt = -Infinity;
    panicGameOverPending = false;
    bloodEffectRemaining = 0;
    hallucinationTimer = 0;
    hallucinationRemaining = 0;
    apparitionPanic = 0;
    apparitionTimer = THREE.MathUtils.randFloat(60, 120);
    macroareaTwoEntered = false;
    macroareaThreeEntered = false;
    pinoScareTimer = THREE.MathUtils.randFloat(60, 120);
    pinoApproachRemaining = 0;
    pinoVisibleRemaining = 0;
    doctorAngularTimer = THREE.MathUtils.randFloat(35, 60);
    blueButtonPressed = false;
    yellowButtonPressed = false;
    doctorFinalEncounterReady = false;
    doctorFinalEncounterStarted = false;
    doctorFinalDefeated = false;
    resetPsychiatryProgress();
    checkpoint = null;
    axeUses = 7;
    axeCollected = false;
    shotgunCollected = false;
    shotgunLoaded = 2;
    shotgunAmmo = 8;
    reloadRemaining = 0;
    axeDrawerOpened = false;
    woodDoorBroken = false;
    lastAxeAttackAt = -Infinity;
    falseJumpscareTimer = THREE.MathUtils.randFloat(8, 16);
    window.clearTimeout(doctorJumpscareTimeout);
    doctorJumpscareOverlay.classList.remove('active');
    doctorJumpscareOverlay.setAttribute('aria-hidden', 'true');
    window.clearTimeout(blurRemovalTimer);
    renderer.domElement.classList.remove('blur-effect');
    renderer.domElement.style.transition = '';
    keysAvailable.clear();
    batteryCount = 0;
    progressionDoorsOpened = 0;
    lettersReadCount = 0;
    doorOpen = false;
    exitDoorOpen = false;
    player.corridorEndZ = corridorEndZ;
    player.isInMacroareaTwo = false;
    player.transitionDoorZ = transitionDoorZ;
    player.onTransitionDoorCross = null;
    player.reset();
    for (const neon of neonLights) {
        neon.light.intensity = neon.baseIntensity;
        neon.tube.material.color.setHex(0xd8f3ff);
        neon.flickerRemaining = 0;
        neon.permanentlyOff = false;
        neon.burnoutCountdown = null;
        neon.burnoutNextFlicker = 0;
        neon.nextFlicker = Math.random() * 5;
    }
    resetInserviente();
    resetDottore();
    doorPivot.rotation.set(0, 0, 0);
    exitDoor.rotation.set(0, 0, 0);
    transitionDoor.rotation.set(0, 0, 0);
    woodDoor.visible = true;
    woodDoor.userData.broken = false;
    if (woodDoor.userData.model && woodDoor.userData.model.parent !== woodDoor) {
        woodDoor.add(woodDoor.userData.model);
    }
    woodDoorPanel.visible = true;
    areaThreeGate.visible = true;
    pinoGroup.visible = false;
    axeTarget.visible = false;
    axeDrawerDisplay.visible = false;
    shotgunTarget.visible = true;
    for (const target of initialAmmoTargets) target.visible = true;
    for (const { target, pickup } of initialAntibioticTargets) {
        target.visible = true;
        pickup.visible = true;
    }
    for (const { button, type } of buttonTargets) {
        button.material.emissiveIntensity = type === 'blueButton' ? 2.2 : 3.2;
    }
    ammoTargets.splice(0, ammoTargets.length, ...initialAmmoTargets);
    for (const door of sideDoors) {
        door.pivot.rotation.set(0, 0, 0);
        door.pivot.userData.isOpen = false;
    }
    for (const drawer of drawers) {
        drawer.opened = false;
        drawer.keyCollected = false;
        drawer.batteryCollected = false;
        drawer.drawerUnit.position.copy(drawer.originalDrawerPosition);
        drawer.keyGroup.visible = false;
        drawer.batteryGroup.visible = false;
    }
    for (const letter of letters) letter.collected = false;
    interactionTargets.splice(0, interactionTargets.length, ...baseInteractionTargets);
    jumpscareOverlay.classList.remove('active');
    jumpscareOverlay.setAttribute('aria-hidden', 'true');
    hideDeathScreen();
    eyesClosedOverlay.classList.remove('active');
    closeNote();
    inventoryOverlay.classList.remove('visible');
    inventoryOverlay.setAttribute('aria-hidden', 'true');
    tensionSubtitle.classList.remove('visible');
    interactionPrompt.style.display = 'none';
    panicFill.style.width = '0%';
    panicValue.textContent = '0%';
    staminaFill.style.width = '100%';
    staminaValue.textContent = '100%';
    staminaFill.classList.remove('low');
    batteryStatus.textContent = 'TORCIA 100% · PILE 0';
    batteryStatus.classList.remove('low');
    bloodSpitOverlay.classList.remove('active');
    distortionOverlay.classList.remove('active');
    hallucinationOverlay.classList.remove('active');
    document.body.classList.remove('panic-high');
    document.body.classList.remove('macroarea-three');
    anxietyVignette.style.opacity = '0.3';
    scene.fog.color.setHex(0x020204);
    scene.fog.density = 0.055;
    heartbeat.reset();
    heartbeat.setArea(1);
    syncWeaponStatus();
    if (showMainMenu) {
        gameStarted = false;
        startScreen.style.display = 'flex';
        return;
    }
    startScreen.style.display = 'none';
    enterGame();
}

window.addEventListener('click', () => {
    if (!isDead && (!gameStarted || !player.isLocked) && !startingGame) {
        enterGame();
    }
});

let previousTime = performance.now();
let frameRequested = false;
function handleAnimationFrame() {
    frameRequested = false;
    renderFrame();
}

function animate() {
    if (!gameStarted || frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(handleAnimationFrame);
}

function ensureMacroRendering() {
    if (!gameStarted) {
        gameStarted = true;
        startScreen.style.display = 'none';
        previousTime = performance.now();
    }
    animate();
}

function renderFrame() {
    if (!gameStarted) return;
    const time = performance.now();
    const delta = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;

    const macro34 = window.AnatomyMacro34;
    if (macro34 && macro34.isActive) {
        renderer.render(scene, camera);
        animate();
        return;
    }

    if (isDead) {
        heartbeat.updateMonster(0, delta, false);
        renderer.render(scene, camera);
        syncWeaponStatus();
        animate();
        return;
    }

    if (ambientJumpscareActive) {
        renderer.render(scene, camera);
        animate();
        return;
    }

    if (player.isLocked && !player.uiPaused) {
        ambientJumpscareTimer -= delta;
        if (ambientJumpscareTimer <= 0) {
            triggerAmbientJumpscare();
            renderer.render(scene, camera);
            animate();
            return;
        }
    }

    let audioAnxiety = panicLevel;
    if (player.isLocked) {
        updatePlayer(player, delta);
        if (player.movementDelta.lengthSq() > 0.00002) {
            idleStillElapsed = 0;
            idleGlassBreakChecked = false;
        } else if (!player.uiPaused) {
            idleStillElapsed += delta;
            if (idleStillElapsed >= 4 && !idleGlassBreakChecked) {
                idleGlassBreakChecked = true;
                tryPlayGlassBreak();
            }
        }
        heartbeat?.updatePlayerSteps(
            player.movementDelta.lengthSq() > 0.000002,
            player.isSprinting
        );
        updatePinoScare(delta);
        if (!macroareaThreeEntered && macroareaThreeUnlocked
            && player.camera.position.z <= areaThreeStartZ) {
            enterMacroareaThree();
        }
        if (macroareaThreeEntered && !macroareaFourEntered) {
            updatePsychiatryDoctors(delta);
            psychiatryScareTimer -= delta;
            if (psychiatryScareTimer <= 0) {
                heartbeat?.playPinoScream();
                player.triggerCameraShake(0.04, 0.65);
                showSubtitle('Un urlo attraversa il reparto vuoto.', 2.5);
                psychiatryScareTimer = THREE.MathUtils.randFloat(38, 64);
            }
        }
        if (!macroareaFourEntered && macroareaFourDoorBroken
            && player.camera.position.z <= areaFourStartZ) {
            enterMacroareaFour();
        }
        startFinalDottoreEncounter();
        if (!introShown && player.movementDelta.lengthSq() > 0.0001
            && player.camera.position.z > mainDoorZ) {
            introShown = true;
            showSubtitle(
                "Dove... dove mi trovo? L'aria sa di ruggine e disinfettante stantio... Questo posto... sembra un vecchio ospedale psichiatrico. Devo trovare una via d'uscita prima che sia troppo tardi.",
                12
            );
        }
        let distanceToEnemy = Infinity;
        let enemyChasing = false;
        if (macroareaTwoEntered && !macroareaThreeEntered) {
            player.updateFirstPersonWeapons(delta);
            const playerMoving = player.movementDelta.lengthSq() > 0.00002;
            const doctorViewDirection = camera.getWorldDirection(new THREE.Vector3());
            const movementDirection = player.movementDelta.clone().normalize();
            const movementAlignment = doctorViewDirection.x * movementDirection.x
                + doctorViewDirection.z * movementDirection.z;
            const movingBackward = playerMoving && movementAlignment < -0.35;
            const towardDoctor = new THREE.Vector3()
                .subVectors(dottoreGroup.position, player.camera.position);
            towardDoctor.y = 0;
            towardDoctor.normalize();
            const lookingAtDoctor = doctorViewDirection.x * towardDoctor.x
                + doctorViewDirection.z * towardDoctor.z > 0.45;
            const doctorState = updateDottore(
                player.camera.position,
                delta,
                doctorNoisyTimer > 0
                    || player.isSprinting
                    || playerMoving,
                { playerMoving, movingBackward, lookingAtDoctor }
            );
            distanceToEnemy = doctorState.distance;
            enemyChasing = doctorState.chasing;
            if (doctorState.attacked) triggerGameOver('doctor-attack');
            heartbeat.updateDoctor(
                distanceToEnemy,
                delta,
                dottoreGroup.visible && !doctorState.stunned,
                doctorState.chasing
            );
            doctorNoisyTimer = Math.max(0, doctorNoisyTimer - delta);
            doctorAngularTimer -= delta;
            if (doctorAngularTimer <= 0 && !doctorFinalEncounterStarted) {
                triggerDoctorAngularJumpscare();
                doctorAngularTimer = THREE.MathUtils.randFloat(35, 60);
            }
            const areaProgress = THREE.MathUtils.clamp(
                (areaTwoStartZ - player.camera.position.z) / (areaTwoStartZ - areaTwoEndZ),
                0,
                1
            );
            const burnoutNeon = neonLights[Math.floor(neonLights.length / 2)];
            for (const neon of neonLights) {
                if (neon.permanentlyOff) continue;
                if (neon === burnoutNeon
                    && areaProgress > 0.3
                    && neon.burnoutCountdown === null
                    && neon.nextFlicker <= 0) {
                    neon.burnoutCountdown = THREE.MathUtils.randFloat(1.8, 3);
                    neon.burnoutNextFlicker = 0;
                    neon.flickerRemaining = 0;
                }
                if (neon.burnoutCountdown !== null) {
                    neon.burnoutCountdown = Math.max(0, neon.burnoutCountdown - delta);
                    neon.burnoutNextFlicker -= delta;
                    if (neon.burnoutNextFlicker <= 0) {
                        neon.burnoutNextFlicker = THREE.MathUtils.randFloat(0.06, 0.22);
                        const flashOn = Math.random() > 0.48;
                        neon.light.intensity = flashOn ? THREE.MathUtils.randFloat(0.08, 0.8) : 0.005;
                        neon.tube.material.color.setHex(flashOn ? 0xd8f3ff : 0x101619);
                    }
                    if (neon.burnoutCountdown === 0) {
                        neon.permanentlyOff = true;
                        neon.light.intensity = 0;
                        neon.tube.material.color.setHex(0x101619);
                        heartbeat.playNeonBurst();
                    }
                    continue;
                }
                if (neon.flickerRemaining > 0) {
                    neon.flickerRemaining = Math.max(0, neon.flickerRemaining - delta);
                    if (neon.flickerRemaining > 0) continue;
                    neon.light.intensity = neon.baseIntensity;
                    neon.tube.material.color.setHex(0xd8f3ff);
                }
                neon.nextFlicker -= delta;
                if (neon.nextFlicker <= 0) {
                    const flickerChance = 0.34 + areaProgress * 0.54;
                    const minInterval = THREE.MathUtils.lerp(2.2, 0.35, areaProgress);
                    const maxInterval = THREE.MathUtils.lerp(8, 1.8, areaProgress);
                    neon.nextFlicker = THREE.MathUtils.randFloat(minInterval, maxInterval);
                    if (Math.random() < flickerChance) {
                        const blackout = Math.random() < 0.28 + areaProgress * 0.6;
                        neon.flickerRemaining = THREE.MathUtils.randFloat(
                            0.08,
                            0.2 + areaProgress * 0.65
                        );
                        neon.light.intensity = blackout
                            ? 0.005
                            : THREE.MathUtils.randFloat(0.05, 0.2);
                        neon.tube.material.color.setHex(blackout ? 0x101619 : 0x8ca2aa);
                        if (blackout) heartbeat.playNeonBuzz();
                    } else {
                        neon.light.intensity = neon.baseIntensity
                            * THREE.MathUtils.randFloat(0.88, 1.12);
                        neon.tube.material.color.setHex(0xd8f3ff);
                    }
                }
            }
            if (reloadRemaining > 0) {
                reloadRemaining = Math.max(0, reloadRemaining - delta);
                if (reloadRemaining === 0) {
                    const loaded = Math.min(2 - shotgunLoaded, shotgunAmmo);
                    shotgunLoaded += loaded;
                    shotgunAmmo -= loaded;
                    syncWeaponStatus();
                }
            }
            if (panicLevel > 70) {
                falseJumpscareTimer -= delta;
                if (falseJumpscareTimer <= 0) {
                    playDoctorFalseJumpscare();
                    falseJumpscareTimer = THREE.MathUtils.randFloat(12, 22);
                }
            }
        } else if (!macroareaTwoEntered) {
            apparitionTimer -= delta;
            if (apparitionTimer <= 0 && !isInservienteChasing() && !panicGameOverPending) {
                const appeared = triggerPeripheralApparition(
                    player.camera.position,
                    camera,
                    Math.random() < 0.5 ? -1 : 1
                );
                apparitionTimer = THREE.MathUtils.randFloat(60, 120);
                if (appeared) {
                    heartbeat.playPeripheralFootsteps();
                    apparitionPanic = 1;
                    showSubtitle('Un movimento ti sfiora nel buio...', 1.6);
                }
            }
            updateInserviente(player.camera.position, delta, camera, player.movementDelta);
            if (isInservienteChasing() && eyesClosed) {
                const eyesClosedDuration = (performance.now() - eyesClosedStartedAt) / 1000;
                if (eyesClosedDuration >= 2 && !inservienteGroup.visible) {
                    revealInserviente(player.camera.position, camera, 2.8);
                    showSubtitle('Riapri gli occhi... è proprio davanti a te.');
                }
            }

            if (isInservienteChasing() && !inservienteGroup.visible) {
                const stopped = player.velocity.lengthSq() < 0.01
                    && player.movementDelta.lengthSq() < 0.00002;
                if (stopped && isInservienteLookedAt(camera, 0.88)) {
                    lookBackTime += delta;
                    if (lookBackTime > 1) {
                        revealInserviente();
                        lookBackTime = 0;
                        gazeTime = 0;
                        showSubtitle('Non avresti dovuto voltarti.');
                    }
                } else {
                    lookBackTime = 0;
                }
            }

            distanceToEnemy = player.camera.position.distanceTo(inservienteGroup.position);
            const contactDistance = Math.hypot(
                player.camera.position.x - inservienteGroup.position.x,
                player.camera.position.z - inservienteGroup.position.z
            );
            enemyChasing = isInservienteChasing();
            if (enemyChasing && !eyesClosed && isInservienteInView(camera, 0.94)) {
                gazeTime += delta;
            } else {
                gazeTime = 0;
            }

            if (!isDead && enemyChasing && inservienteGroup.visible
                && (contactDistance < 1.15 || gazeTime > 1)) {
                triggerGameOver('monster-caught');
            }
        }

        if (subtitleRemaining > 0) {
            subtitleRemaining -= delta;
            if (subtitleRemaining <= 0) tensionSubtitle.classList.remove('visible');
        }
        if (performance.now() - lastSpacePressAt > 2200) spaceSpamCount = 0;
        if (enemyChasing) {
             tensionElapsed += delta;
            const tensionBand = distanceToEnemy < 6 ? 3
                : distanceToEnemy < 12 ? 2
                    : distanceToEnemy < 22 ? 1 : 0;
            if (tensionBand > previousTensionBand && tensionBand > 0) {
                const lines = tensionBand >= 3
                    ? ['Sento il tuo respiro...', 'Non guardare indietro.']
                    : tensionBand === 2
                        ? ['Ti sto cercando...', 'Sento i tuoi passi nel buio.']
                        : ['Non guardare indietro...', 'I passi si avvicinano.'];
                showSubtitle(lines[Math.floor(Math.random() * lines.length)]);
                tensionElapsed = 0;
                previousTensionBand = tensionBand;
            } else if (tensionElapsed >= tensionInterval) {
                showSubtitle(distanceToEnemy < 14
                    ? 'Sento il tuo respiro...'
                    : 'I passi non si fermano mai.');
                tensionElapsed = 0;
                tensionInterval = THREE.MathUtils.randFloat(10, 18);
            }
        }

        const hit = getInteractionTarget();
        const hitType = hit?.object.userData.interactionType;
        if (noteOverlay.classList.contains('visible')
            || inventoryOverlay.classList.contains('visible')) {
            interactionPrompt.style.display = 'none';
        } else if (hitType === 'keypad') {
            interactionPrompt.textContent = '[E] Vai alla Macroarea 3';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'psychiatryDrawer') {
            interactionPrompt.textContent = '[E] Apri il cassetto';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'asl') {
            interactionPrompt.textContent = '[E] Raccogli il tesserino ASL';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'macroareaFourDoor') {
            interactionPrompt.textContent = macroareaFourDoorBroken
                ? 'Porta abbattuta'
                : '[E] Esamina la porta finale';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'key') {
            interactionPrompt.textContent = '[E] Raccogli la chiave';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'battery') {
            interactionPrompt.textContent = '[E] Raccogli la batteria';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'radio') {
            interactionPrompt.textContent = '[E] Ascolta la radio';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'door') {
            interactionPrompt.textContent = doorOpen
                ? 'La porta è aperta'
                : '[E] Apri la porta';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'sideDoor') {
            let sideDoor = null;
            for (const door of sideDoors) {
                if (door.panel === hit.object) {
                    sideDoor = door;
                    break;
                }
            }
            if (sideDoor?.pivot.userData.isOpen && sideDoor.keyIndex !== null) {
                interactionPrompt.textContent = 'Porta aperta';
            } else if (sideDoor?.pivot.userData.isOpen) {
                interactionPrompt.textContent = '[E] Chiudi la porta';
            } else if (sideDoor?.keyIndex !== null) {
                interactionPrompt.textContent = keysAvailable.has(sideDoor.keyIndex)
                    ? `[E] Apri con la chiave ${sideDoor.keyIndex + 1}`
                    : `Serve la chiave ${sideDoor.keyIndex + 1}`;
            } else {
                interactionPrompt.textContent = '[E] Apri la porta ed esplora';
            }
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'letter') {
            let letter = null;
            for (const entry of letters) {
                if (entry.object === hit.object) {
                    letter = entry;
                    break;
                }
            }
            interactionPrompt.textContent = letter?.collected ? 'Lettera già letta' : '[E] Leggi la lettera';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'drawer') {
            interactionPrompt.textContent = '[E] Apri il cassetto';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'exitDoor') {
            interactionPrompt.textContent = exitDoorOpen
                ? 'Uscita aperta'
                : lettersReadCount === 2 && keysAvailable.size === 2
                    ? '[E] Entra nel reparto di isolamento'
                    : `Uscita bloccata · chiavi ${keysAvailable.size}/2 · lettere ${lettersReadCount}/2`;
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'transitionDoor') {
            interactionPrompt.textContent = macroareaTwoEntered
                ? 'Reparti operativi'
                : exitDoorOpen ? '[E] Entra nei reparti operativi' : 'Porta chiusa';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'axeDrawer') {
            interactionPrompt.textContent = '[E] Apri il cassetto';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'axe') {
            interactionPrompt.textContent = '[E] Raccogli l’ascia';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'shotgun') {
            interactionPrompt.textContent = '[E] Raccogli il fucile a pompa';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'ammo') {
            interactionPrompt.textContent = '[E] Raccogli le munizioni';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'antibiotics') {
            interactionPrompt.textContent = '[E] Assumi gli antibiotici';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'blueButton') {
            interactionPrompt.textContent = blueButtonPressed ? 'Pulsante blu attivo' : '[E] Premi il pulsante blu';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'yellowButton') {
            interactionPrompt.textContent = yellowButtonPressed
                ? 'Pulsante giallo attivo'
                : '[E] Premi il pulsante giallo fluorescente';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'cabinetDrawer') {
            interactionPrompt.textContent = '[E] Esplora l’armadietto';
            interactionPrompt.style.display = 'block';
        } else if (hitType === 'woodDoor') {
            interactionPrompt.textContent = woodDoorBroken ? 'Porta abbattuta' : 'Usa l’ascia per sfondare la porta';
            interactionPrompt.style.display = 'block';
        } else {
            interactionPrompt.style.display = 'none';
        }

        if (bloodEffectRemaining > 0) {
            bloodEffectRemaining -= delta;
            if (bloodEffectRemaining <= 0) bloodSpitOverlay.classList.remove('active');
        }

        if (isDead) {
            panicLevel = 100;
        } else if (eyesClosed) {
            panicLevel = Math.max(0, panicLevel - 18 * delta);
        } else if (!player.flashlightOn) {
            panicLevel = Math.min(100, panicLevel + 3 * delta);
        } else if (enemyChasing && distanceToEnemy < 12) {
            panicLevel = Math.min(100, panicLevel + (12 - distanceToEnemy) * 0.2 * delta);
        }
        if (spaceSpamCount >= 5) {
            panicLevel = Math.max(panicLevel, Math.min(95, (spaceSpamCount - 4) * 12));
        }
        if (apparitionPanic > 0) {
            panicLevel = Math.min(100, panicLevel + 12 * delta);
            apparitionPanic = Math.max(0, apparitionPanic - delta);
        }
        panicFill.style.width = `${panicLevel}%`;
        panicValue.textContent = `${Math.round(panicLevel)}%`;
        staminaFill.style.width = `${(player.stamina / player.maxStamina) * 100}%`;
        staminaValue.textContent = `${Math.ceil(player.stamina)}%`;
        staminaFill.classList.toggle('low', player.stamina <= 25);
        batteryStatus.textContent = `TORCIA ${Math.floor(player.flashlightBattery)}% · PILE ${batteryCount}`;
        batteryStatus.classList.toggle('low', player.flashlightBattery <= 20);
        anxietyVignette.style.opacity = String(
            (0.25 + panicLevel / 100 * 0.5) * (0.8 + 0.2 * Math.sin(time / 350))
        );
        const eyesClosedAnxiety = eyesClosed
            ? Math.max(panicLevel, 35 + Math.min((performance.now() - eyesClosedStartedAt) / 2000, 1) * 45)
            : panicLevel;
        audioAnxiety = eyesClosedAnxiety;
    } else {
        interactionPrompt.style.display = 'none';
    }

    const highPanic = panicLevel >= 80 && !isDead;
    distortionOverlay.classList.toggle('active', highPanic);
    document.body.classList.toggle('panic-high', highPanic);
    if (highPanic) {
        hallucinationTimer -= delta;
        if (hallucinationTimer <= 0) {
            hallucinationRemaining = 0.38;
            hallucinationTimer = THREE.MathUtils.randFloat(3, 7);
        }
        if (hallucinationRemaining > 0) {
            hallucinationRemaining -= delta;
            hallucinationOverlay.classList.toggle('active', hallucinationRemaining > 0);
        }
    } else {
        hallucinationTimer = 0;
        hallucinationRemaining = 0;
        hallucinationOverlay.classList.remove('active');
    }

    heartbeat.updateHeartbeat(audioAnxiety);
    heartbeat.updateMonster(
        player.camera.position.distanceTo(inservienteGroup.position),
        delta,
        !macroareaTwoEntered && isInservienteChasing(),
        !macroareaTwoEntered && inservienteGroup.visible
    );
    renderer.render(scene, camera);
    animate();
}

renderer.render(scene, camera);
syncWeaponStatus();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.setSize(window.innerWidth, window.innerHeight);
});

/* =============================================================================
 *  ANATOMY — MACROAREA 3 (Labirinto / Survival) + MACROAREA 4 (Stealth / Zeus)
 *            + EPILOGO con TITOLI DI CODA
 *
 *  DA INCOLLARE IN FONDO a src/main.js (modulo ES).
 *  e le variabili di modulo `scene`, `camera`, `renderer` già create.
 *  Se hanno nomi diversi:  AnatomyMacro34.init({ scene, camera, renderer })
 *
 *  Avvio:   AnatomyMacro34.startMacro3()   // dalla fine della Macroarea 2
 *           AnatomyMacro34.startMacro4()   // (parte da sola a fine Macroarea 3)
 *           AnatomyMacro34.startEpilogue() // (parte da sola a fine Macroarea 4)
 *           oppure  window.dispatchEvent(new CustomEvent('anatomy:start', { detail: 3 }))
 *           oppure  URL  ?macro=3  |  ?macro=4  |  ?macro=epilogo
 *
 *  Comandi: E interagisci · 1 pompa · 2 ascia · Click sinistro attacca/spara
 *           H antibiotici · N appunti · F torcia (solo se creata da questo blocco)
 *
 *  Tutto il codice sta in una IIFE: non entra in conflitto con i nomi del tuo file.
 * ========================================================================== */
(function AnatomyMacroareas34() {
  'use strict';

  /* ===========================================================================
   *  0. CONFIGURAZIONE
   * ========================================================================= */
  const CONFIG = {
    autoStartFromUrl: true,
    isolateLevels: true,        // nasconde il resto della scena mentre le macroaree 3/4 sono attive
    playerFootsteps: true,      // metti false se il tuo gioco gestisce già i passi del giocatore
    requirePointerLock: true,   // il click spara/colpisce solo se il mouse è bloccato nel gioco
    useMuriModel: true,         // prova a usare il modello "muri"; se manca usa muri procedurali
    masterVolume: 1,

    // Cartelle in cui cercare i file (provate in ordine, la prima che funziona viene ricordata)
    assetBases: {
      models: [`${BASE_URL}models/`],
      audio: [`${BASE_URL}audio/`]
    },
    models: {
      dottore: ['dottore.obj'],
      mostro: ['mostro.glb'],
      zeus: ['giove.obj', 'zeus.obj'],
      pompa: ['pompa.glb'],
      ascia: ['ascia.glb'],
      rack: ['rack.glb'],
      amo: ['ammo.glb'],
      antibiotici: ['antibiotici.glb'],
      lettere: ['lettera.glb'],
      muri: ['wall.glb'],
      armadietto: ['armadietto.glb']
    },
    sounds: {
      pioggia: ['rain.mp3'],
      horror: ['horror_ambient.mp3'],
      background: ['backround_hospital.mp3'],
      footsteps: ['steps3.mp3'],
      footstepsHospital: ['footsteps_hospital.mp3'],
      scream: ['scream.mp3'],
      urlo: ['urlo.mp3'],
      pinoScream: ['pino_scream.mp3'],
      shotgun: ['shotgun_fire.mp3'],
      scoppio: ['scoppio.mp3'],
      damage: ['blood_hit.mp3']
    },

    layout: {
      tile: 3,
      wallHeight: 3.4,
      mazeCellsX: 9,
      mazeCellsZ: 9,
      mazeSeed: 20260401,
      origin3: { x: 4000, z: 0 },   // i livelli vengono costruiti lontano dal resto del gioco
      origin4: { x: 8000, z: 0 }
    },

    player: {
      eyeHeight: 1.65,
      radius: 0.38,
      maxHealth: 100,
      runNoiseSpeed: 4.4,
      shellsMax: 24,
      shellsPerBox: 4,
      antibioticHeal: 40,
      healRate: 14
    },

    doctor: {
      hp: 120,
      radius: 0.5,
      patrolSpeed: 1.5,
      searchSpeed: 1.9,
      chaseSpeed: 3.4,
      turnSpeed: 6,
      sightRange: 17,
      fov: 110,
      senseRange: 3.2,
      attackRange: 1.55,
      attackDamage: 22,
      attackWindup: 0.5,
      attackRecover: 1.0,
      staggerThreshold: 18,
      staggerTime: 1.5,
      downTime: 22,
      searchTime: 7,
      loseTime: 5.5,
      hearShot: 45,
      lockerFindDist: 2.5,
      modelYaw: 0
    },

    weapons: {
      pompa: { pellets: 8, spread: 0.07, pelletDamage: 9, range: 30, cooldown: 0.95 },
      ascia: { damage: 28, reach: 2.6, arc: 65, cooldown: 0.8 }
    },

    credits: {
      line1: 'Progetto “Anatomy”',
      line2: 'Sviluppato da Samuele Ian Puppulin',
      full: 'Progetto "Anatomy" - Sviluppato da Samuele Ian Puppulin',
      restartOnKey: true
    }
  };

  const hooks = { teleportPlayer: null, onStageChange: null, onPlayerHealth: null };

  /* ===========================================================================
   *  1. UTILITÀ
   * ========================================================================= */
  const V3 = THREE.Vector3;
  const TAU = Math.PI * 2;
  const REV = parseInt(THREE.REVISION, 10) || 160;
  const PHYS = REV >= 155;
  const LI = { point: PHYS ? 15 : 1.1, spot: PHYS ? 75 : 1.8, small: PHYS ? 5 : 0.5, muzzle: PHYS ? 60 : 3 };
  const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const horiz = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rng) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = list[i];
      list[i] = list[j];
      list[j] = t;
    }
    return list;
  }

  function angleDiff(from, to) {
    let d = (to - from) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }

  function tween(ms, fn) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => {
        const k = clamp((performance.now() - t0) / ms, 0, 1);
        fn(k);
        if (k < 1) requestAnimationFrame(tick);
        else resolve();
      };
      tick();
    });
  }

  const reported = new Set();
  function reportOnce(tag, err) {
    const key = tag + String(err && err.message);
    if (reported.has(key)) return;
    reported.add(key);
    console.error('[Anatomy] ' + tag, err);
  }

  /* ===========================================================================
   *  2. CONTESTO (scene / camera / renderer del tuo gioco)
   * ========================================================================= */
  const ctx = { scene: null, camera: null, renderer: null, installed: false };

  function detectContext() {
    try { if (!ctx.scene && typeof scene !== 'undefined') ctx.scene = scene; } catch (e) { /* variabile non ancora inizializzata */ }
    try { if (!ctx.camera && typeof camera !== 'undefined') ctx.camera = camera; } catch (e) { /* idem */ }
    try { if (!ctx.renderer && typeof renderer !== 'undefined') ctx.renderer = renderer; } catch (e) { /* idem */ }
    return !!(ctx.scene && ctx.camera && ctx.renderer);
  }

  /* ===========================================================================
   *  3. MATERIALI E MODELLI DI RIPIEGO (se un .glb manca il gioco funziona lo stesso)
   * ========================================================================= */
  const M = {
    std(color, rough, metal, extra) {
      return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough === undefined ? 0.8 : rough, metalness: metal || 0 }, extra || {}));
    }
  };

  function mesh(geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  const Fallbacks = {
    dottore() {
      const g = new THREE.Group();
      const coat = M.std(0xdcd8cc, 0.9), skin = M.std(0xa09488, 0.8), dark = M.std(0x161616, 0.7), red = new THREE.MeshBasicMaterial({ color: 0xaa1111 });
      g.add(mesh(new THREE.CylinderGeometry(0.3, 0.42, 1.2, 12), coat, 0, 1.2, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), dark, -0.16, 0.4, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), dark, 0.16, 0.4, 0));
      g.add(mesh(new THREE.SphereGeometry(0.19, 14, 12), skin, 0, 1.95, 0));
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.9, 0.14), coat, -0.46, 1.35, 0.12));
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.9, 0.14), coat, 0.46, 1.35, 0.12));
      g.add(mesh(new THREE.SphereGeometry(0.03, 6, 6), red, -0.07, 1.98, 0.17));
      g.add(mesh(new THREE.SphereGeometry(0.03, 6, 6), red, 0.07, 1.98, 0.17));
      return g;
    },
    mostro() {
      const g = new THREE.Group();
      const body = M.std(0x0c0c0c, 0.6), pale = M.std(0x8d8a82, 0.7), eye = new THREE.MeshBasicMaterial({ color: 0xff2200 });
      g.add(mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.7, 10), body, 0, 1.4, 0));
      g.add(mesh(new THREE.SphereGeometry(0.24, 12, 10), pale, 0, 2.5, 0.05));
      g.add(mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), body, -0.55, 1.5, 0.3));
      g.add(mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), body, 0.55, 1.5, 0.3));
      g.add(mesh(new THREE.SphereGeometry(0.045, 6, 6), eye, -0.09, 2.53, 0.26));
      g.add(mesh(new THREE.SphereGeometry(0.045, 6, 6), eye, 0.09, 2.53, 0.26));
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 8), body, -0.15, 0.45, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 8), body, 0.15, 0.45, 0));
      return g;
    },
    zeus() {
      const g = new THREE.Group();
      const stone = M.std(0x9a9a94, 0.95), bolt = new THREE.MeshBasicMaterial({ color: 0xcfe3ff });
      g.add(mesh(new THREE.BoxGeometry(1.4, 0.7, 1.4), stone, 0, 0.35, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.4, 0.55, 1.5, 12), stone, 0, 1.45, 0));
      g.add(mesh(new THREE.SphereGeometry(0.3, 14, 12), stone, 0, 2.45, 0));
      g.add(mesh(new THREE.ConeGeometry(0.22, 0.5, 10), stone, 0, 2.1, 0.12));
      const arm = mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), stone, 0.62, 2.2, 0);
      arm.rotation.z = -0.5;
      g.add(arm);
      g.add(mesh(new THREE.ConeGeometry(0.1, 0.9, 6), bolt, 0.95, 2.95, 0));
      return g;
    },
    pompa() {
      const g = new THREE.Group();
      const steel = M.std(0x2a2c2e, 0.4, 0.8), wood = M.std(0x5a3a22, 0.7);
      const barrel = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 10), steel, 0, 0, -0.3);
      barrel.rotation.x = Math.PI / 2;
      const tube = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 10), steel, 0, -0.045, -0.2);
      tube.rotation.x = Math.PI / 2;
      g.add(barrel, tube, mesh(new THREE.BoxGeometry(0.05, 0.08, 0.35), wood, 0, -0.03, 0.28), mesh(new THREE.BoxGeometry(0.06, 0.1, 0.18), wood, 0, -0.08, 0.5));
      return g;
    },
    ascia() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.85, 8), M.std(0x5a3a22, 0.8), 0, 0, 0));
      g.add(mesh(new THREE.BoxGeometry(0.03, 0.17, 0.22), M.std(0x8a8d90, 0.4, 0.8), 0, 0.34, -0.1));
      return g;
    },
    rack() {
      const g = new THREE.Group();
      const wood = M.std(0x4a3320, 0.85), steel = M.std(0x2b2d2f, 0.5, 0.7);
      g.add(mesh(new THREE.BoxGeometry(0.1, 1.7, 0.1), wood, -0.8, 0.85, 0), mesh(new THREE.BoxGeometry(0.1, 1.7, 0.1), wood, 0.8, 0.85, 0));
      g.add(mesh(new THREE.BoxGeometry(1.7, 0.08, 0.1), wood, 0, 1.4, 0), mesh(new THREE.BoxGeometry(1.7, 0.08, 0.1), wood, 0, 0.8, 0));
      g.add(mesh(new THREE.BoxGeometry(1.2, 0.05, 0.06), steel, -0.1, 1.5, 0.08), mesh(new THREE.BoxGeometry(0.06, 0.7, 0.05), wood, 0.45, 0.95, 0.08));
      return g;
    },
    amo() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.BoxGeometry(0.22, 0.1, 0.13), M.std(0x8b1d16, 0.7), 0, 0.05, 0));
      for (let k = 0; k < 4; k++) g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.09, 8), M.std(0xb08a3a, 0.4, 0.7), -0.07 + k * 0.047, 0.14, 0));
      return g;
    },
    antibiotici() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 12), M.std(0xe8e4d8, 0.4), 0, 0.07, 0));
      g.add(mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.035, 12), M.std(0xd9762b, 0.5), 0, 0.16, 0));
      g.add(mesh(new THREE.BoxGeometry(0.095, 0.05, 0.002), M.std(0xaa2222, 0.6), 0, 0.07, 0.046));
      return g;
    },
    lettere() {
      const g = new THREE.Group();
      const paper = mesh(new THREE.BoxGeometry(0.3, 0.012, 0.21), M.std(0xd9cfae, 0.95), 0, 0.01, 0);
      paper.rotation.y = 0.4;
      g.add(paper);
      return g;
    },
    armadietto() {
      const g = new THREE.Group();
      const body = M.std(0x56625c, 0.55, 0.5), dark = M.std(0x0f1210, 0.8);
      g.add(mesh(new THREE.BoxGeometry(0.9, 2.0, 0.65), body, 0, 1.0, 0));
      g.add(mesh(new THREE.BoxGeometry(0.02, 1.9, 0.02), dark, 0, 1.0, 0.33));
      for (let k = 0; k < 4; k++) g.add(mesh(new THREE.BoxGeometry(0.5, 0.03, 0.02), dark, -0.2, 1.55 + k * 0.07, 0.331));
      g.add(mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), M.std(0xaaaaaa, 0.3, 0.9), 0.3, 1.0, 0.35));
      return g;
    }
  };

  function normalizeObject(obj, fit) {
    const f = fit || {};
    const wrap = new THREE.Group();
    wrap.add(obj);
    wrap.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(wrap);
    const size = box.getSize(new V3());
    if (f.box) {
      obj.scale.set(f.box[0] / (size.x || 1), f.box[1] / (size.y || 1), f.box[2] / (size.z || 1));
    } else {
      let s = 1;
      if (f.height) s = f.height / (size.y || 1);
      else if (f.maxDim) s = f.maxDim / (Math.max(size.x, size.y, size.z) || 1);
      obj.scale.multiplyScalar(s);
    }
    wrap.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(wrap);
    const c = box.getCenter(new V3());
    obj.position.x -= c.x;
    obj.position.z -= c.z;
    obj.position.y -= f.center ? c.y : box.min.y;
    return wrap;
  }

  /* ===========================================================================
   *  4. CARICAMENTO ASSET (modelli + audio) con percorsi alternativi
   * ========================================================================= */
  const BASE_CACHE = { models: null, audio: null };

  function orderedBases(type) {
    const list = CONFIG.assetBases[type].slice();
    const pref = BASE_CACHE[type];
    if (pref && list.indexOf(pref) > 0) {
      list.splice(list.indexOf(pref), 1);
      list.unshift(pref);
    }
    return list;
  }

  const Assets = {
    raw: {},
    gltf: null,
    obj: null,
    skel: null,

    async loaderFor(kind) {
      if (kind === 'gltf') {
        if (this.gltf) return this.gltf;
        this.gltf = new GLTFLoader();
        return this.gltf;
      }
      if (this.obj) return this.obj;
      this.obj = new OBJLoader();
      return this.obj;
    },

    async fetchModel(key) {
      const names = [].concat(CONFIG.models[key] || []);
      for (const base of orderedBases('models')) {
        for (const name of names) {
          const isObj = /\.obj$/i.test(name);
          try {
            const loader = await this.loaderFor(isObj ? 'obj' : 'gltf');
            if (!loader) continue;
            const result = await new Promise((res, rej) => loader.load(base + encodeURI(name), res, undefined, rej));
            BASE_CACHE.models = base;
            if (isObj) return { scene: result, animations: [], isObj: true };
            return { scene: result.scene, animations: result.animations || [], isObj: false };
          } catch (e) { /* prova il candidato successivo */ }
        }
      }
      console.warn('[Anatomy] modello "' + key + '" non trovato: uso la versione procedurale.');
      return null;
    },

    async cloneScene(src) {
      let skinned = false;
      src.traverse((n) => { if (n.isSkinnedMesh) skinned = true; });
      if (!skinned) return src.clone(true);
      if (!this.skel) {
        try {
          const mod = await import('three/examples/jsm/utils/SkeletonUtils.js');
          this.skel = mod.clone || (mod.SkeletonUtils && mod.SkeletonUtils.clone) || null;
        } catch (e) { reportOnce('SkeletonUtils non disponibile', e); }
      }
      return this.skel ? this.skel(src) : src.clone(true);
    },

    /** Restituisce un Group normalizzato (modello reale oppure ripiego procedurale), o null se non esiste né l'uno né l'altro. */
    async make(key, fit) {
      if (!this.raw[key]) this.raw[key] = this.fetchModel(key);
      const raw = await this.raw[key];
      let obj = null;
      let anims = [];
      if (raw) {
        obj = await this.cloneScene(raw.scene);
        anims = raw.animations;
        if (raw.isObj) obj.traverse((n) => { if (n.isMesh) n.material = M.std(0x8d8f8a, 0.85, 0.05); });
      } else if (Fallbacks[key]) {
        obj = Fallbacks[key]();
      }
      if (!obj) return null;
      const wrap = normalizeObject(obj, fit || {});
      wrap.userData.animations = anims;
      wrap.userData.fallback = !raw;
      return wrap;
    }
  };

  function loadAudioBuffer(loader, url) {
    return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
  }

  /* ===========================================================================
   *  5. AUDIO  (effetti, loop d'ambiente a strati, loop posizionali)
   * ========================================================================= */
  const Snd = {
    listener: null, loader: null, buffers: {}, loading: {}, layers: {}, active: new Set(), enabled: true,

    init() {
      if (this.listener) return;
      let l = ctx.camera.children.find((c) => c.isAudioListener);
      if (!l) {
        l = new THREE.AudioListener();
        ctx.camera.add(l);
      }
      this.listener = l;
      this.loader = new THREE.AudioLoader();
    },

    resume() {
      try { if (this.listener && this.listener.context.state === 'suspended') this.listener.context.resume(); } catch (e) { /* ignora */ }
    },

    buffer(key) {
      if (this.buffers[key]) return Promise.resolve(this.buffers[key]);
      if (this.loading[key]) return this.loading[key];
      const names = [].concat(CONFIG.sounds[key] || []);
      const p = (async () => {
        for (const base of orderedBases('audio')) {
          for (const name of names) {
            try {
              const buf = await loadAudioBuffer(this.loader, base + encodeURI(name));
              this.buffers[key] = buf;
              BASE_CACHE.audio = base;
              return buf;
            } catch (e) { /* prossimo candidato */ }
          }
        }
        console.warn('[Anatomy] audio "' + key + '" non trovato.');
        return null;
      })();
      this.loading[key] = p;
      return p;
    },

    preload(keys) { return Promise.all(keys.map((k) => this.buffer(k))); },

    play(key, o) {
      const opt = o || {};
      const handle = { audio: null, cancelled: false, stop() { this.cancelled = true; if (this.audio) { try { this.audio.stop(); } catch (e) { /* ignora */ } } } };
      this.buffer(key).then((buf) => {
        if (!buf || handle.cancelled || !this.enabled) return;
        const a = opt.parent ? new THREE.PositionalAudio(this.listener) : new THREE.Audio(this.listener);
        a.setBuffer(buf);
        if (opt.parent) {
          a.setRefDistance(opt.refDistance || 4);
          a.setRolloffFactor(opt.rolloff || 1.6);
          a.setMaxDistance(opt.maxDistance || 60);
          opt.parent.add(a);
        }
        a.setLoop(!!opt.loop);
        a.setVolume((opt.volume === undefined ? 1 : opt.volume) * CONFIG.masterVolume);
        a.setPlaybackRate(opt.rate || 1);
        const self = this;
        a.onEnded = function () {
          THREE.Audio.prototype.onEnded.call(this);
          self.active.delete(a);
          if (opt.parent) opt.parent.remove(a);
        };
        this.active.add(a);
        handle.audio = a;
        a.play(opt.delay || 0);
      }).catch((e) => reportOnce('audio ' + key, e));
      return handle;
    },

    /** Loop non posizionale con volume animato. `id` identifica lo strato, `soundKey` il file. */
    layer(id, volume, fade, soundKey) {
      let L = this.layers[id];
      if (!L) {
        L = this.layers[id] = { audio: null, target: 0, fade: 1, rate: 1 };
        this.buffer(soundKey || id).then((buf) => {
          if (!buf || L.audio || this.layers[id] !== L) return;
          const a = new THREE.Audio(this.listener);
          a.setBuffer(buf);
          a.setLoop(true);
          a.setVolume(0);
          a.setPlaybackRate(L.rate);
          a.play();
          L.audio = a;
          this.applyLayer(L);
        });
      }
      if (L.target === volume && L.audio) return;
      L.target = volume;
      L.fade = fade === undefined ? 1 : fade;
      this.applyLayer(L);
    },

    applyLayer(L) {
      if (!L.audio) return;
      const g = L.audio.gain.gain;
      const t = this.listener.context.currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(L.target * CONFIG.masterVolume, t + Math.max(0.02, L.fade));
    },

    setLayerRate(id, rate) {
      const L = this.layers[id];
      if (!L) return;
      L.rate = rate;
      if (L.audio) L.audio.setPlaybackRate(rate);
    },

    /** Loop posizionale agganciato a un oggetto 3D (passi del dottore). */
    loop3d(key, parent, o) {
      const opt = o || {};
      const h = { audio: null, vol: 0, rate: 1, dead: false };
      this.buffer(key).then((buf) => {
        if (!buf || h.dead) return;
        const a = new THREE.PositionalAudio(this.listener);
        a.setBuffer(buf);
        a.setLoop(true);
        a.setRefDistance(opt.refDistance || 3);
        a.setRolloffFactor(opt.rolloff || 2);
        a.setMaxDistance(opt.maxDistance || 40);
        a.setVolume(h.vol * CONFIG.masterVolume);
        a.setPlaybackRate(h.rate);
        parent.add(a);
        a.play();
        h.audio = a;
        this.active.add(a);
      });
      h.set = (v, r) => {
        h.vol = v;
        if (r) h.rate = r;
        if (h.audio) {
          h.audio.setVolume(v * CONFIG.masterVolume);
          h.audio.setPlaybackRate(h.rate);
        }
      };
      h.stop = () => {
        h.dead = true;
        if (h.audio) {
          try { h.audio.stop(); } catch (e) { /* ignora */ }
          parent.remove(h.audio);
          this.active.delete(h.audio);
        }
      };
      return h;
    },

    fadeOutAll(seconds) {
      Object.keys(this.layers).forEach((id) => this.layer(id, 0, seconds));
      const t = this.listener.context.currentTime;
      this.active.forEach((a) => {
        try {
          a.gain.gain.cancelScheduledValues(t);
          a.gain.gain.setValueAtTime(a.gain.gain.value, t);
          a.gain.gain.linearRampToValueAtTime(0, t + seconds);
        } catch (e) { /* ignora */ }
      });
      setTimeout(() => this.stopAll(), seconds * 1000 + 150);
    },

    stopAll() {
      Array.from(this.active).forEach((a) => {
        try { a.stop(); } catch (e) { /* ignora */ }
        if (a.parent) a.parent.remove(a);
      });
      this.active.clear();
      Object.keys(this.layers).forEach((id) => {
        const L = this.layers[id];
        if (L.audio) { try { L.audio.stop(); } catch (e) { /* ignora */ } }
      });
      this.layers = {};
    }
  };

  /* ===========================================================================
   *  6. INTERFACCIA (HUD, pannelli, overlay, titoli di coda)
   * ========================================================================= */
  const CSS = `
#a34-root{position:fixed;inset:0;pointer-events:none;z-index:9000;font-family:Georgia,'Times New Roman',serif;color:#d9d2c3;user-select:none}
#a34-root *{box-sizing:border-box}
#a34-root .a34-hud{position:absolute;inset:0;opacity:0;transition:opacity .6s}
#a34-root .a34-hud.on{opacity:1}
#a34-root .a34-objective{position:absolute;top:22px;left:50%;transform:translateX(-50%);font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#b9b1a0;text-shadow:0 0 8px #000;text-align:center;max-width:70vw}
#a34-root .a34-inv{position:absolute;top:22px;right:26px;font:12px/1.8 'Courier New',monospace;color:#b9b1a0;text-align:right;text-shadow:0 0 6px #000;white-space:pre-line}
#a34-root .a34-vitals{position:absolute;left:28px;bottom:28px;width:250px}
#a34-root .a34-label{font-size:11px;letter-spacing:.3em;color:#9b3b32;margin-bottom:6px}
#a34-root .a34-bar{height:8px;border:1px solid #5a2b27;background:rgba(0,0,0,.55)}
#a34-root .a34-bar-fill{height:100%;width:100%;background:linear-gradient(90deg,#6e1f1a,#b8372b);transition:width .25s}
#a34-root .a34-weapon{margin-top:10px;font:12px 'Courier New',monospace;color:#c9c0ad;white-space:pre-line}
#a34-root .a34-prompt{position:absolute;bottom:17%;left:50%;transform:translateX(-50%);font-size:15px;letter-spacing:.14em;color:#efe6d2;text-shadow:0 0 10px #000;opacity:0;transition:opacity .15s;white-space:nowrap}
#a34-root .a34-prompt.on{opacity:1}
#a34-root .a34-sub{position:absolute;bottom:9%;left:50%;transform:translateX(-50%);width:min(760px,86vw);text-align:center;font-size:17px;font-style:italic;color:#e6dcc6;text-shadow:0 0 12px #000,0 0 3px #000;opacity:0;transition:opacity .5s}
#a34-root .a34-sub.on{opacity:1}
#a34-root .a34-toast{position:absolute;bottom:23%;left:50%;transform:translateX(-50%);font:13px 'Courier New',monospace;letter-spacing:.1em;color:#d7caa5;text-shadow:0 0 8px #000;opacity:0;transition:opacity .3s;white-space:nowrap}
#a34-root .a34-toast.on{opacity:1}
#a34-root .a34-ov{position:absolute;inset:0;opacity:0}
#a34-root .a34-dmg{background:radial-gradient(ellipse at center,rgba(120,0,0,.25) 30%,rgba(190,10,10,.9) 100%)}
#a34-root .a34-heal{background:radial-gradient(ellipse at center,rgba(120,255,190,.08) 30%,rgba(90,230,170,.5) 100%)}
#a34-root .a34-flash{background:#fff}
#a34-root .a34-lowhp{background:radial-gradient(ellipse at center,rgba(0,0,0,0) 45%,rgba(100,0,0,.75) 100%);display:none}
#a34-root .a34-lowhp.on{display:block;animation:a34pulse 1.1s ease-in-out infinite}
@keyframes a34pulse{0%,100%{opacity:.3}50%{opacity:.95}}
#a34-root .a34-hide{background:radial-gradient(ellipse at center,rgba(0,0,0,.3) 20%,rgba(0,0,0,.96) 90%),repeating-linear-gradient(0deg,rgba(0,0,0,.93) 0 14px,rgba(0,0,0,0) 14px 24px);transition:opacity .35s}
#a34-root .a34-hide.on{opacity:1}
#a34-root .a34-fade{background:#000;transition:opacity 1s linear}
#a34-root .a34-death{background:#040000;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity 1.2s}
#a34-root .a34-death-t{font-size:clamp(34px,6vw,80px);letter-spacing:.35em;color:#8d1a14}
#a34-root .a34-death-s{margin-top:18px;font-size:15px;font-style:italic;color:#7d6f66}
#a34-root .a34-panel{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.62);pointer-events:auto}
#a34-root .a34-panel.on{display:flex}
#a34-root .a34-paper{width:min(560px,90vw);max-height:84vh;overflow:auto;padding:34px 38px;background:linear-gradient(135deg,#d8ccaa,#c4b78f);color:#2b2418;box-shadow:0 0 60px #000,inset 0 0 60px rgba(90,60,20,.35);transform:rotate(-.6deg)}
#a34-root .a34-paper-title{font-size:13px;letter-spacing:.22em;text-transform:uppercase;border-bottom:1px solid rgba(43,36,24,.4);padding-bottom:10px;margin-bottom:16px}
#a34-root .a34-paper-body{font-size:17px;line-height:1.6;font-style:italic;white-space:pre-line}
#a34-root .a34-paper-foot{margin-top:18px;font:11px 'Courier New',monospace;letter-spacing:.12em;opacity:.7;text-align:center}
#a34-root .a34-pad{width:min(380px,92vw);padding:26px;background:#101312;border:1px solid #3b4440;box-shadow:0 0 60px #000;text-align:center;color:#c8d0cb}
#a34-root .a34-pad-title{font-size:12px;letter-spacing:.3em;color:#8fa098;margin-bottom:16px}
#a34-root .a34-pad-display{font:34px 'Courier New',monospace;letter-spacing:.3em;padding:10px;background:#050706;border:1px solid #2c3531;color:#9bf0c0;margin-bottom:8px}
#a34-root .a34-pad-msg{min-height:20px;font:12px 'Courier New',monospace;color:#d9806f;margin-bottom:10px}
#a34-root .a34-pad-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
#a34-root button{font:16px 'Courier New',monospace;padding:12px 6px;background:#1a1f1d;color:#d3dcd7;border:1px solid #3b4440;cursor:pointer}
#a34-root button:hover{background:#26302c}
#a34-root .a34-zeus-text{font-size:14px;font-style:italic;margin-bottom:14px;color:#aeb8b2}
#a34-root .a34-zeus-slots{display:flex;gap:10px;justify-content:center;margin-bottom:12px}
#a34-root .a34-zeus-slots span{display:inline-block;min-width:96px;padding:12px 6px;border:1px dashed #4b5750;font:13px 'Courier New',monospace;letter-spacing:.12em;color:#9bf0c0}
#a34-root .a34-zeus-syms,#a34-root .a34-zeus-row{display:flex;gap:8px;justify-content:center;margin-bottom:10px}
#a34-root .a34-credits{background:#000;display:flex;align-items:center;justify-content:center;transition:opacity 2.5s ease;pointer-events:none}
#a34-root .a34-credits.on{opacity:1}
#a34-root .a34-cr-inner{text-align:center;padding:0 6vw}
#a34-root .a34-cr-line{width:0;height:1px;margin:0 auto;background:linear-gradient(90deg,transparent,#8d7d5b,transparent);transition:width 3s ease .8s}
#a34-root .a34-credits.on .a34-cr-line{width:min(520px,70vw)}
#a34-root .a34-cr-title{margin:34px 0 14px;font-size:clamp(26px,4.6vw,62px);letter-spacing:.32em;text-transform:uppercase;font-weight:400;color:#efe7d4;opacity:0;transition:opacity 3s ease 1.2s}
#a34-root .a34-cr-sub{margin:0 0 34px;font-size:clamp(15px,2.1vw,28px);letter-spacing:.26em;font-style:italic;color:#b8ab8c;opacity:0;transition:opacity 3s ease 2.4s}
#a34-root .a34-credits.on .a34-cr-title,#a34-root .a34-credits.on .a34-cr-sub{opacity:1}
#a34-root .a34-cr-hint{margin-top:46px;font:11px 'Courier New',monospace;letter-spacing:.3em;color:#5f594c;opacity:0;transition:opacity 2s ease}
#a34-root .a34-cr-hint.on{opacity:1}
`;

  const UI = {
    root: null, cache: {}, panelOpen: null, subTimer: 0, toastTimer: 0, lastPrompt: '', creditsReady: false,

    q(k) { return this.cache[k] || (this.cache[k] = this.root.querySelector('[data-k="' + k + '"]')); },

    init() {
      if (this.root) return;
      const style = document.createElement('style');
      style.id = 'a34-style';
      style.textContent = CSS;
      document.head.appendChild(style);
      const root = document.createElement('div');
      root.id = 'a34-root';
      const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => '<button data-act="kp:' + d + '">' + d + '</button>').join('');
      root.innerHTML = `
<div class="a34-hud" data-k="hud">
  <div class="a34-objective" data-k="objective"></div>
  <div class="a34-inv" data-k="inv"></div>
  <div class="a34-vitals">
    <div class="a34-label">SALUTE</div>
    <div class="a34-bar"><div class="a34-bar-fill" data-k="hp"></div></div>
    <div class="a34-weapon" data-k="weapon"></div>
  </div>
  <div class="a34-prompt" data-k="prompt"></div>
  <div class="a34-toast" data-k="toast"></div>
  <div class="a34-sub" data-k="sub"></div>
</div>
<div class="a34-ov a34-lowhp" data-k="lowhp"></div>
<div class="a34-ov a34-heal" data-k="heal"></div>
<div class="a34-ov a34-dmg" data-k="dmg"></div>
<div class="a34-ov a34-flash" data-k="flash"></div>
<div class="a34-ov a34-hide" data-k="hide"></div>
<div class="a34-panel" data-k="panel-paper">
  <div class="a34-paper">
    <div class="a34-paper-title" data-k="paper-title"></div>
    <div class="a34-paper-body" data-k="paper-body"></div>
    <div class="a34-paper-foot">[E] oppure [Esc] per chiudere</div>
  </div>
</div>
<div class="a34-panel" data-k="panel-keypad">
  <div class="a34-pad">
    <div class="a34-pad-title">SERRATURA A CODICE</div>
    <div class="a34-pad-display" data-k="kp-display">_ _ _ _</div>
    <div class="a34-pad-msg" data-k="kp-msg"></div>
    <div class="a34-pad-grid">${digits}<button data-act="kp:del">&#9003;</button><button data-act="kp:0">0</button><button data-act="kp:ok">OK</button></div>
    <div class="a34-paper-foot">[0-9] cifre · [Invio] conferma · [Esc] chiudi</div>
  </div>
</div>
<div class="a34-panel" data-k="panel-zeus">
  <div class="a34-pad" style="width:min(520px,94vw)">
    <div class="a34-pad-title">LA STATUA DI GIOVE</div>
    <div class="a34-zeus-text">Tre simboli incisi sul basamento. Vanno premuti nell’ordine corretto.</div>
    <div class="a34-zeus-slots" data-k="zs-slots"></div>
    <div class="a34-zeus-syms">
      <button data-act="zs:aquila">1 · AQUILA</button><button data-act="zs:folgore">2 · FOLGORE</button><button data-act="zs:quercia">3 · QUERCIA</button>
    </div>
    <div class="a34-pad-msg" data-k="zs-msg"></div>
    <div class="a34-zeus-row"><button data-act="zs:reset">AZZERA</button><button data-act="zs:ok">CONFERMA</button></div>
    <div class="a34-paper-foot">[Invio] conferma · [Backspace] azzera · [Esc] chiudi</div>
  </div>
</div>
<div class="a34-ov a34-fade" data-k="fade"></div>
<div class="a34-ov a34-death" data-k="death"><div class="a34-death-t">SEI MORTO</div><div class="a34-death-s">Il buio si richiude su di te…</div></div>
<div class="a34-ov a34-credits" data-k="credits" aria-label="${CONFIG.credits.full.replace(/"/g, '&quot;')}">
  <div class="a34-cr-inner">
    <div class="a34-cr-line"></div>
    <div class="a34-cr-title">${CONFIG.credits.line1}</div>
    <div class="a34-cr-sub">${CONFIG.credits.line2}</div>
    <div class="a34-cr-line"></div>
    <div class="a34-cr-hint" data-k="cr-hint">PREMI UN TASTO PER RICOMINCIARE</div>
  </div>
</div>`;
      document.body.appendChild(root);
      this.root = root;
      root.addEventListener('click', (e) => {
        const el = e.target.closest ? e.target.closest('[data-act]') : null;
        if (!el) return;
        const act = el.getAttribute('data-act');
        if (act.indexOf('kp:') === 0) {
          const v = act.slice(3);
          if (v === 'del') Keypad.del();
          else if (v === 'ok') Keypad.ok();
          else Keypad.press(v);
        } else if (act.indexOf('zs:') === 0) {
          const v = act.slice(3);
          if (v === 'reset') ZeusPanel.reset();
          else if (v === 'ok') ZeusPanel.ok();
          else ZeusPanel.add(v);
        }
      });
    },

    showHud(on) { this.q('hud').classList.toggle('on', !!on); },

    objective(text) { this.q('objective').textContent = text || ''; },

    prompt(text) {
      if (text === this.lastPrompt) return;
      this.lastPrompt = text;
      const e = this.q('prompt');
      if (text) { e.textContent = text; e.classList.add('on'); } else e.classList.remove('on');
    },

    say(text, ms) {
      const e = this.q('sub');
      e.textContent = text;
      e.classList.add('on');
      clearTimeout(this.subTimer);
      this.subTimer = setTimeout(() => e.classList.remove('on'), ms || 4600);
    },

    async sayLines(lines, gap) {
      for (const line of lines) {
        this.say(line, (gap || 4200) + 200);
        await wait(gap || 4200);
      }
    },

    toast(text) {
      const e = this.q('toast');
      e.textContent = text;
      e.classList.add('on');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => e.classList.remove('on'), 2600);
    },

    pulse(key, opacity, ms) {
      const el = this.q(key);
      el.style.transition = 'none';
      el.style.opacity = String(opacity);
      void el.offsetWidth;
      el.style.transition = 'opacity ' + ms + 'ms ease-out';
      el.style.opacity = '0';
    },

    damageFlash(k) { this.pulse('dmg', clamp(k, 0.3, 1), 700); },
    healFlash() { this.pulse('heal', 0.9, 1400); },
    lightning(k) { this.pulse('flash', k === undefined ? 0.85 : k, 650); },

    fade(toBlack, seconds) {
      const e = this.q('fade');
      e.style.transition = 'opacity ' + seconds + 's linear';
      e.style.opacity = toBlack ? '1' : '0';
      return wait(seconds * 1000);
    },

    hideSlats(on) { this.q('hide').classList.toggle('on', !!on); },

    death(on) { this.q('death').style.opacity = on ? '1' : '0'; },

    refresh() {
      if (!this.root) return;
      const pct = clamp(Player.health / Player.maxHealth, 0, 1) * 100;
      this.q('hp').style.width = pct + '%';
      this.q('lowhp').classList.toggle('on', pct <= 30 && !Player.dead);
      let w = 'MANI NUDE';
      if (Player.weapon === 'pompa') w = 'POMPA · ' + Player.shells + ' cartucce';
      else if (Player.weapon === 'ascia') w = 'ASCIA';
      const keys = [];
      if (Player.haveShotgun) keys.push('[1] pompa');
      if (Player.haveAxe) keys.push('[2] ascia');
      this.q('weapon').textContent = w + (keys.length ? '\n' + keys.join('  ') : '');
      const L = Flow.level;
      const stageLetters = L ? (L.spawns.letters || []).length : 0;
      const read = Player.letters.filter((l) => l.stage === Flow.stage).length;
      let inv = 'ANTIBIOTICI ×' + Player.antibiotics + ' [H]\nLETTERE ' + read + '/' + stageLetters + ' [N]';
      if (Flow.stage === 'macro3') inv += '\nCODICE ' + Player.codeKnown.map((d) => (d === null ? '_' : d)).join(' ');
      this.q('inv').textContent = inv;
    },

    openPanel(name) {
      this.closePanel(true);
      this.panelOpen = name;
      this.q('panel-' + name).classList.add('on');
      try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) { /* ignora */ }
    },

    closePanel(silent) {
      if (!this.panelOpen) return;
      this.q('panel-' + this.panelOpen).classList.remove('on');
      this.panelOpen = null;
      if (!silent) {
        try { if (ctx.renderer && ctx.renderer.domElement.requestPointerLock) ctx.renderer.domElement.requestPointerLock(); } catch (e) { /* serve un gesto utente */ }
      }
    },

    showPaper(title, body) {
      this.q('paper-title').textContent = title;
      this.q('paper-body').textContent = body;
      this.openPanel('paper');
    },

    showCredits() {
      const c = this.q('credits');
      c.style.opacity = '1';
      c.classList.add('on');
      setTimeout(() => { this.q('cr-hint').classList.add('on'); this.creditsReady = true; }, 9000);
    }
  };

  const Keypad = {
    entry: '', onSubmit: null,
    open(onSubmit) { this.entry = ''; this.onSubmit = onSubmit; UI.q('kp-msg').textContent = ''; this.render(); UI.openPanel('keypad'); },
    press(d) { if (this.entry.length < 4) { this.entry += d; this.render(); } },
    del() { this.entry = this.entry.slice(0, -1); this.render(); },
    ok() {
      if (this.entry.length < 4) return;
      const e = this.entry;
      this.entry = '';
      this.render();
      if (this.onSubmit) this.onSubmit(e);
    },
    render() { UI.q('kp-display').textContent = (this.entry + '____').slice(0, 4).split('').join(' '); },
    message(t) { UI.q('kp-msg').textContent = t; }
  };

  const SYMBOLS = { aquila: 'AQUILA', folgore: 'FOLGORE', quercia: 'QUERCIA' };
  const ZeusPanel = {
    seq: [], onSubmit: null,
    open(onSubmit) { this.seq = []; this.onSubmit = onSubmit; UI.q('zs-msg').textContent = ''; this.render(); UI.openPanel('zeus'); },
    add(sym) { if (this.seq.length < 3 && this.seq.indexOf(sym) < 0) { this.seq.push(sym); this.render(); } },
    reset() { this.seq = []; this.render(); },
    ok() { if (this.seq.length === 3 && this.onSubmit) { const s = this.seq.slice(); this.seq = []; this.render(); this.onSubmit(s); } },
    render() {
      const slots = UI.q('zs-slots');
      slots.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const span = document.createElement('span');
        span.textContent = this.seq[i] ? SYMBOLS[this.seq[i]] : '—';
        slots.appendChild(span);
      }
    },
    message(t) { UI.q('zs-msg').textContent = t; }
  };

  /* ===========================================================================
   *  7. STATO DEL GIOCATORE
   * ========================================================================= */
  const Player = {
    health: 100, maxHealth: 100, shells: 0, antibiotics: 0,
    haveShotgun: false, haveAxe: false, weapon: null,
    letters: [], codeKnown: [null, null, null, null],
    hidden: null, forced: null, dead: false, healLeft: 0,
    speed: 0, noise: 0, lastPos: new V3(), stepVol: 0,

    resetForStage(restart) {
      this.maxHealth = CONFIG.player.maxHealth;
      this.health = restart ? this.maxHealth : Math.max(this.health, 55);
      this.hidden = null;
      this.forced = null;
      this.dead = false;
      this.healLeft = 0;
      this.speed = 0;
      this.noise = 0;
      UI.hideSlats(false);
    },

    damage(n) {
      if (this.dead) return;
      this.health = Math.max(0, this.health - n);
      Snd.play('damage', { volume: 0.95 });
      UI.damageFlash(n / 40);
      Flow.shake(0.7);
      UI.refresh();
      if (typeof hooks.onPlayerHealth === 'function') hooks.onPlayerHealth(this.health);
      if (this.health <= 0) Flow.onDeath();
    },

    useAntibiotic() {
      if (this.dead) return;
      if (this.antibiotics <= 0) { UI.toast('Non hai antibiotici.'); return; }
      if (this.health >= this.maxHealth && this.healLeft <= 0) { UI.toast('Stai già bene.'); return; }
      this.antibiotics -= 1;
      this.healLeft += CONFIG.player.antibioticHeal;
      UI.healFlash();
      UI.toast('Antibiotici assunti');
      Snd.play('scoppio', { volume: 0.12, rate: 0.35 });
      UI.refresh();
    },

    update(dt) {
      const cam = ctx.camera;
      const p = cam.position;
      const L = Flow.level;
      if (this.forced) {
        const f = this.forced;
        const dx = f.target.x - p.x, dz = f.target.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.05) {
          const s = Math.min(d, f.speed * dt);
          p.x += (dx / d) * s;
          p.z += (dz / d) * s;
        }
        this.speed = d > 0.05 ? f.speed : 0;
        this.noise = 0;
        this.lastPos.copy(p);
        this.updateSteps();
        return;
      }
      if (this.hidden) {
        const sp = this.hidden.spot;
        p.set(sp.x, CONFIG.player.eyeHeight - 0.1, sp.z);
        this.speed = 0;
        this.noise = 0;
      } else {
        if (L) L.resolveCircle(p, CONFIG.player.radius);
        const d = horiz(p, this.lastPos);
        this.speed = d < 2.5 ? lerp(this.speed, d / Math.max(dt, 0.001), 0.35) : 0;
        if (this.speed > CONFIG.player.runNoiseSpeed) this.noise = 13;
        else if (this.speed > 0.6) this.noise = 5.5;
        else this.noise = 0;
      }
      this.lastPos.copy(p);
      if (this.healLeft > 0 && !this.dead) {
        const h = Math.min(this.healLeft, CONFIG.player.healRate * dt);
        this.healLeft -= h;
        this.health = Math.min(this.maxHealth, this.health + h);
        UI.refresh();
      }
      this.updateSteps();
    },

    updateSteps() {
      if (!CONFIG.playerFootsteps) return;
      const maze = Flow.stage === 'macro3';
      const moving = this.speed > 0.8 && !this.hidden && !this.dead;
      const vol = moving ? clamp(0.25 + this.speed * 0.07, 0.25, 0.65) : 0;
      Snd.layer('pfoot3', maze ? vol : 0, 0.15, 'footsteps');
      Snd.layer('pfoot4', maze ? 0 : vol, 0.15, 'footstepsHospital');
      const rate = clamp(this.speed / 3.2, 0.7, 1.5);
      const cur = Snd.layers.pfoot3;
      if (!cur || Math.abs(cur.rate - rate) > 0.04) {
        Snd.setLayerRate('pfoot3', rate);
        Snd.setLayerRate('pfoot4', rate);
      }
    }
  };

  /* ===========================================================================
   *  8. TORCIA
   * ========================================================================= */
  const Flash = {
    light: null, own: false, on: true,
    ensure() {
      const cam = ctx.camera;
      const existing = cam.children.find((c) => c.isSpotLight);
      if (existing) { this.light = existing; this.own = false; return; }
      if (this.light) return;
      const s = new THREE.SpotLight(0xfff1d2, LI.spot, 26, 0.5, 0.55, PHYS ? 2 : 1.4);
      s.position.set(0.1, -0.05, 0);
      s.target.position.set(0, 0, -5);
      cam.add(s);
      cam.add(s.target);
      this.light = s;
      this.own = true;
    },
    toggle() {
      if (!this.own || !this.light) return;
      this.on = !this.on;
      this.light.visible = this.on;
      UI.toast(this.on ? 'Torcia accesa' : 'Torcia spenta');
    }
  };

  /* ===========================================================================
   *  9. TEXTURE PROCEDURALI
   * ========================================================================= */
  const TEX = {
    mazeWall: { base: '#4b4c45', noise: 2600, rgb: '10,10,8', stains: 9, streaks: 14, grid: 0 },
    mazeFloor: { base: '#2b2a26', noise: 2200, rgb: '0,0,0', stains: 6, streaks: 0, grid: 128, gridColor: 'rgba(0,0,0,.5)' },
    mazeCeil: { base: '#1d1d1b', noise: 1500, rgb: '0,0,0', stains: 8, streaks: 0, grid: 0 },
    wardWall: { base: '#7c8a85', noise: 1800, rgb: '255,255,255', stains: 7, streaks: 10, grid: 64, gridColor: 'rgba(40,50,48,.55)' },
    wardFloor: { base: '#3b4442', noise: 1800, rgb: '255,255,255', stains: 5, streaks: 0, grid: 128, gridColor: 'rgba(15,20,19,.7)' },
    wardCeil: { base: '#59615f', noise: 900, rgb: '255,255,255', stains: 5, streaks: 0, grid: 64, gridColor: 'rgba(20,24,24,.5)' }
  };

  function makeTexture(kind) {
    const spec = TEX[kind];
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const r = mulberry32(kind.length * 977 + kind.charCodeAt(0));
    g.fillStyle = spec.base;
    g.fillRect(0, 0, 256, 256);
    for (let n = 0; n < spec.noise; n++) {
      g.fillStyle = 'rgba(' + spec.rgb + ',' + (r() * 0.12).toFixed(3) + ')';
      g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3);
    }
    if (spec.grid) {
      g.strokeStyle = spec.gridColor;
      g.lineWidth = 2;
      for (let k = 0; k <= 256; k += spec.grid) {
        g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 256); g.stroke();
        g.beginPath(); g.moveTo(0, k); g.lineTo(256, k); g.stroke();
      }
    }
    for (let s = 0; s < spec.stains; s++) {
      const x = r() * 256, y = r() * 256, rad = 20 + r() * 50;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(18,12,6,' + (0.12 + r() * 0.2).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(18,12,6,0)');
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let s = 0; s < spec.streaks; s++) {
      const x = r() * 256, y = r() * 120, len = 40 + r() * 120;
      const gr = g.createLinearGradient(0, y, 0, y + len);
      gr.addColorStop(0, 'rgba(0,0,0,0.2)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x, y, 2 + r() * 4, len);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }

  let glowTex = null;
  function glowTexture() {
    if (glowTex) return glowTex;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,240,200,0.9)');
    gr.addColorStop(0.4, 'rgba(255,220,150,0.25)');
    gr.addColorStop(1, 'rgba(255,200,120,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    glowTex = new THREE.CanvasTexture(c);
    return glowTex;
  }

  const STYLES = {
    maze: { wallTex: 'mazeWall', floorTex: 'mazeFloor', ceilTex: 'mazeCeil', bg: 0x020203, fog: 0x040405, density: 0.075, hemiSky: 0x2a2d34, hemiGround: 0x0b0b0a, hemi: 0.55, light: 0xffd7a0, lights: 6, rain: false },
    ward: { wallTex: 'wardWall', floorTex: 'wardFloor', ceilTex: 'wardCeil', bg: 0x020306, fog: 0x03050a, density: 0.06, hemiSky: 0x2d3846, hemiGround: 0x0a0c10, hemi: 0.6, light: 0xcfe4ff, lights: 7, rain: true }
  };

  /* ===========================================================================
   *  10. LIVELLO: griglia, collisioni, visibilità, pathfinding, costruzione
   * ========================================================================= */
  class Level {
    constructor(id, grid, origin, style) {
      this.id = id;
      this.grid = grid;
      this.rows = grid.length;
      this.cols = grid[0].length;
      this.tile = CONFIG.layout.tile;
      this.wallH = CONFIG.layout.wallHeight;
      this.origin = origin.clone();
      this.style = style;
      this.root = new THREE.Group();
      this.root.name = 'a34-' + id;
      this.root.userData.a34 = true;
      this.blockers = [];
      this.pathBlock = new Set();
      this.interactables = [];
      this.lights = [];
      this.pickups = [];
      this.lockers = [];
      this.disposables = [];
      this.spawns = {};
      this.door = null;
      this.doorOpen = false;
      this.doorTile = null;
      this.time = 0;
      this.blackout = 0;
      this.flashBoost = 0;
      this.nextThunder = 14 + Math.random() * 10;
      this.hemi = null;
      for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) if (grid[j][i] === 'E') this.doorTile = [i, j];
    }

    ch(i, j) { return (j < 0 || j >= this.rows || i < 0 || i >= this.cols) ? '#' : this.grid[j][i]; }
    isWall(i, j) { return this.ch(i, j) === '#'; }
    blocked(i, j) { const c = this.ch(i, j); return c === '#' || (c === 'E' && !this.doorOpen); }
    passBlocked(i, j) { return this.blocked(i, j) || this.pathBlock.has(j * this.cols + i); }
    tileOf(x, z) { return [Math.floor((x - this.origin.x) / this.tile), Math.floor((z - this.origin.z) / this.tile)]; }
    center(i, j, y) { return new V3(this.origin.x + (i + 0.5) * this.tile, y || 0, this.origin.z + (j + 0.5) * this.tile); }
    wallAt(x, z) { const t = this.tileOf(x, z); return this.blocked(t[0], t[1]); }

    pushOutRect(p, r, x0, x1, z0, z1) {
      const nx = clamp(p.x, x0, x1), nz = clamp(p.z, z0, z1);
      const dx = p.x - nx, dz = p.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) return;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        p.x = nx + (dx / d) * r;
        p.z = nz + (dz / d) * r;
      } else {
        const l = p.x - x0, rr = x1 - p.x, t = p.z - z0, b = z1 - p.z;
        const m = Math.min(l, rr, t, b);
        if (m === l) p.x = x0 - r;
        else if (m === rr) p.x = x1 + r;
        else if (m === t) p.z = z0 - r;
        else p.z = z1 + r;
      }
    }

    resolveCircle(p, r) {
      const t = this.tileOf(p.x, p.z);
      for (let pass = 0; pass < 2; pass++) {
        for (let j = t[1] - 1; j <= t[1] + 1; j++) {
          for (let i = t[0] - 1; i <= t[0] + 1; i++) {
            if (!this.blocked(i, j)) continue;
            const x0 = this.origin.x + i * this.tile, z0 = this.origin.z + j * this.tile;
            this.pushOutRect(p, r, x0, x0 + this.tile, z0, z0 + this.tile);
          }
        }
        for (const b of this.blockers) {
          if (b.active && !b.active()) continue;
          this.pushOutRect(p, r, b.x0, b.x1, b.z0, b.z1);
        }
      }
      return p;
    }

    hasLOS(a, b) {
      const dx = b.x - a.x, dz = b.z - a.z;
      const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.5));
      for (let k = 1; k < n; k++) {
        const t = k / n;
        if (this.wallAt(a.x + dx * t, a.z + dz * t)) return false;
      }
      return true;
    }

    raycastWall(origin, dir, maxD) {
      const step = 0.25;
      for (let d = step; d < maxD; d += step) {
        const x = origin.x + dir.x * d, y = origin.y + dir.y * d, z = origin.z + dir.z * d;
        if (y < 0 || y > this.wallH || this.wallAt(x, z)) return d;
      }
      return maxD;
    }

    findPath(from, to) {
      const s = this.tileOf(from.x, from.z), t = this.tileOf(to.x, to.z);
      if (this.passBlocked(t[0], t[1]) || this.passBlocked(s[0], s[1])) return [];
      if (s[0] === t[0] && s[1] === t[1]) return [this.center(t[0], t[1])];
      const cols = this.cols, rows = this.rows;
      const prev = new Int32Array(cols * rows).fill(-2);
      const start = s[1] * cols + s[0], tgt = t[1] * cols + t[0];
      const queue = [start];
      prev[start] = -1;
      let head = 0, found = false;
      while (head < queue.length) {
        const cur = queue[head++];
        if (cur === tgt) { found = true; break; }
        const ci = cur % cols, cj = (cur / cols) | 0;
        for (const d of DIRS4) {
          const ni = ci + d[0], nj = cj + d[1];
          if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
          const n = nj * cols + ni;
          if (prev[n] !== -2 || this.passBlocked(ni, nj)) continue;
          prev[n] = cur;
          queue.push(n);
        }
      }
      if (!found) return [];
      const out = [];
      for (let c = tgt; c !== -1; c = prev[c]) out.push(this.center(c % cols, (c / cols) | 0));
      out.reverse();
      out.shift();
      return out;
    }

    randomFloorTile() {
      for (let k = 0; k < 200; k++) {
        const i = 1 + Math.floor(Math.random() * (this.cols - 2));
        const j = 1 + Math.floor(Math.random() * (this.rows - 2));
        if (!this.passBlocked(i, j)) return [i, j];
      }
      return [1, 1];
    }

    openNeighbors(i, j) {
      let n = 0;
      for (const d of DIRS4) if (!this.isWall(i + d[0], j + d[1])) n++;
      return n;
    }

    wallSide(i, j) {
      const order = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const d of order) if (this.isWall(i + d[0], j + d[1])) return d;
      return null;
    }

    openSide(i, j) {
      for (const d of DIRS4) if (!this.isWall(i + d[0], j + d[1])) return d;
      return [1, 0];
    }

    /* ---------------- struttura: pavimento, soffitto, muri, luci ---------------- */
    async buildStructure() {
      const T = this.tile, H = this.wallH, st = this.style;
      const W = this.cols * T, D = this.rows * T;
      const wallTex = makeTexture(st.wallTex), floorTex = makeTexture(st.floorTex), ceilTex = makeTexture(st.ceilTex);
      floorTex.repeat.set(this.cols, this.rows);
      ceilTex.repeat.set(this.cols, this.rows);
      this.disposables.push(wallTex, floorTex, ceilTex);

      const floorGeo = new THREE.PlaneGeometry(W, D);
      const floor = new THREE.Mesh(floorGeo, M.std(0xffffff, 0.85, 0.04, { map: floorTex }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(this.origin.x + W / 2, 0, this.origin.z + D / 2);
      const ceil = new THREE.Mesh(floorGeo, M.std(0xffffff, 0.95, 0, { map: ceilTex }));
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set(this.origin.x + W / 2, H, this.origin.z + D / 2);
      this.root.add(floor, ceil);
      this.disposables.push(floorGeo);

      const walls = [];
      const around = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
      for (let j = 0; j < this.rows; j++) {
        for (let i = 0; i < this.cols; i++) {
          if (this.grid[j][i] !== '#') continue;
          let visible = false;
          for (const d of around) {
            const ni = i + d[0], nj = j + d[1];
            if (ni >= 0 && nj >= 0 && ni < this.cols && nj < this.rows && this.grid[nj][ni] !== '#') { visible = true; break; }
          }
          if (visible) walls.push([i, j]);
        }
      }

      let proto = null;
      if (CONFIG.useMuriModel) {
        proto = await Assets.make('muri', { box: [T, H, T] });
        if (proto && proto.userData.fallback) proto = null;
      }
      if (proto) {
        for (const w of walls) {
          const c = this.center(w[0], w[1]);
          const clone = proto.clone(true);
          clone.position.copy(c);
          this.root.add(clone);
        }
      } else {
        const geo = new THREE.BoxGeometry(T, H, T);
        const mat = M.std(0xffffff, 0.92, 0.02, { map: wallTex });
        const im = new THREE.InstancedMesh(geo, mat, walls.length);
        const m4 = new THREE.Matrix4(), col = new THREE.Color();
        walls.forEach((w, n) => {
          const c = this.center(w[0], w[1], H / 2);
          m4.makeTranslation(c.x, c.y, c.z);
          im.setMatrixAt(n, m4);
          const v = 0.78 + ((w[0] * 7 + w[1] * 13) % 5) * 0.06;
          col.setRGB(v, v, v);
          im.setColorAt(n, col);
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.frustumCulled = false;
        this.root.add(im);
        this.disposables.push(geo, mat);
      }

      this.hemi = new THREE.HemisphereLight(st.hemiSky, st.hemiGround, st.hemi);
      this.root.add(this.hemi);
    }

    addCeilingLights(tiles) {
      const H = this.wallH;
      const geo = new THREE.BoxGeometry(0.9, 0.05, 0.28);
      const mat = new THREE.MeshBasicMaterial({ color: this.style.light });
      this.disposables.push(geo, mat);
      for (const t of tiles) {
        const p = this.center(t[0], t[1], H - 0.08);
        const fx = new THREE.Mesh(geo, mat);
        fx.position.copy(p);
        this.root.add(fx);
        const pl = new THREE.PointLight(this.style.light, LI.point, 13, 2);
        pl.position.set(p.x, H - 0.5, p.z);
        this.root.add(pl);
        this.lights.push({ light: pl, base: LI.point, phase: Math.random() * 10, drop: 0 });
      }
    }

    pickLightTiles(max) {
      const spots = [];
      const cand = [];
      for (let j = 1; j < this.rows - 1; j++) for (let i = 1; i < this.cols - 1; i++) if (!this.isWall(i, j) && this.ch(i, j) !== 'E') cand.push([i, j, this.openNeighbors(i, j)]);
      cand.sort((a, b) => b[2] - a[2] || ((a[0] * 31 + a[1] * 17) % 11) - ((b[0] * 31 + b[1] * 17) % 11));
      for (const c of cand) {
        if (spots.length >= max) break;
        if (spots.every((s) => Math.abs(s[0] - c[0]) + Math.abs(s[1] - c[1]) >= 6)) spots.push([c[0], c[1]]);
      }
      return spots;
    }

    addInteractable(item) { this.interactables.push(item); return item; }

    /* ---------------- armadietti ---------------- */
    addLocker(i, j) {
      const T = this.tile;
      const side = this.wallSide(i, j) || [0, -1];
      const c = this.center(i, j);
      const pos = new V3(c.x + side[0] * (T / 2 - 0.38), 0, c.z + side[1] * (T / 2 - 0.38));
      const fwd = new V3(-side[0], 0, -side[1]);
      const grp = new THREE.Group();
      grp.position.copy(pos);
      grp.rotation.y = Math.atan2(fwd.x, fwd.z);
      this.root.add(grp);
      Assets.make('armadietto', { height: 2.0 }).then((m) => { if (m) grp.add(m); });
      const locker = { tile: [i, j], grp, pos, fwd, spot: pos.clone(), out: pos.clone().addScaledVector(fwd, 1.35), item: null };
      locker.item = this.addInteractable({
        pos: pos.clone().addScaledVector(fwd, 0.6), r: 2.0,
        label: () => (Player.hidden === locker ? 'Uscire dall’armadietto' : 'Nasconditi nell’armadietto'),
        use: () => Flow.toggleHide(locker)
      });
      this.blockers.push({ x0: pos.x - 0.5, x1: pos.x + 0.5, z0: pos.z - 0.5, z1: pos.z + 0.5, active: () => Player.hidden !== locker });
      this.lockers.push(locker);
      return locker;
    }

    /* ---------------- oggetti raccoglibili ---------------- */
    addPickup(kind, i, j, data) {
      const c = this.center(i, j);
      c.x += (((i * 37 + j * 11) % 7) - 3) * 0.2;
      c.z += (((i * 13 + j * 29) % 7) - 3) * 0.2;
      const grp = new THREE.Group();
      grp.position.set(c.x, 0.1, c.z);
      this.root.add(grp);
      const size = { amo: 0.28, antibiotici: 0.24, lettere: 0.36 }[kind];
      Assets.make(kind, { maxDim: size }).then((m) => { if (m) grp.add(m); });
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: kind === 'lettere' ? 0xffe9b0 : (kind === 'amo' ? 0xffb070 : 0xa8ffd0), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      spr.scale.set(1.1, 1.1, 1.1);
      spr.position.y = 0.35;
      grp.add(spr);
      const labels = { amo: 'Raccogli cartucce per il pompa', antibiotici: 'Raccogli antibiotici', lettere: 'Leggi la lettera' };
      const p = { kind, grp, data: data || {}, taken: false, phase: Math.random() * 6 };
      p.item = this.addInteractable({
        pos: new V3(c.x, 0, c.z), r: 2.1,
        enabled: () => !p.taken,
        label: () => labels[kind],
        use: () => Flow.collect(p)
      });
      this.pickups.push(p);
      return p;
    }

    /* ---------------- rack armi ---------------- */
    addRack(i, j) {
      const T = this.tile;
      const side = this.wallSide(i, j) || [-1, 0];
      const c = this.center(i, j);
      const pos = new V3(c.x + side[0] * (T / 2 - 0.2), 0, c.z + side[1] * (T / 2 - 0.2));
      const grp = new THREE.Group();
      grp.position.copy(pos);
      grp.rotation.y = Math.atan2(-side[0], -side[1]);
      this.root.add(grp);
      Assets.make('rack', { box: [1.7, 1.7, 0.45] }).then((m) => { if (m) grp.add(m); });
      const rack = { used: false, pos };
      this.addInteractable({
        pos: new V3(pos.x - side[0] * 0.9, 0, pos.z - side[1] * 0.9), r: 2.6,
        label: () => (rack.used ? null : 'Prendi l’ascia e il pompa dal rack'),
        enabled: () => !rack.used,
        use: () => Flow.useRack(rack)
      });
      this.rack = rack;
      return rack;
    }

    /* ---------------- porta di uscita ---------------- */
    addExitDoor(mode) {
      const T = this.tile, H = this.wallH;
      const dt = this.doorTile;
      const c = this.center(dt[0], dt[1]);
      const side = this.openSide(dt[0], dt[1]);
      const alongX = side[0] !== 0;
      const slabGeo = new THREE.BoxGeometry(alongX ? 0.3 : T, H, alongX ? T : 0.3);
      const slab = new THREE.Mesh(slabGeo, M.std(0x2b2f31, 0.45, 0.75));
      const slabPos = new V3(c.x + side[0] * (T / 2 - 0.2), H / 2, c.z + side[1] * (T / 2 - 0.2));
      slab.position.copy(slabPos);
      this.root.add(slab);
      const ledMat = new THREE.MeshBasicMaterial({ color: 0xcc1a10 });
      const pad = mesh(new THREE.BoxGeometry(alongX ? 0.12 : 0.4, 0.5, alongX ? 0.4 : 0.12), M.std(0x0c0d0d, 0.5, 0.6), slabPos.x + side[0] * 0.2 + (alongX ? 0 : 0.9), 1.3, slabPos.z + side[1] * 0.2 + (alongX ? 0.9 : 0));
      const led = mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), ledMat, pad.position.x + side[0] * 0.08, 1.45, pad.position.z + side[1] * 0.08);
      this.root.add(pad, led);
      const outward = new V3(-side[0], 0, -side[1]);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? T : T, H), new THREE.MeshBasicMaterial({ color: 0xf4f8ff, side: THREE.DoubleSide }));
      glow.position.set(c.x + outward.x * (T / 2 - 0.02), H / 2, c.z + outward.z * (T / 2 - 0.02));
      glow.rotation.y = alongX ? Math.PI / 2 : 0;
      glow.visible = false;
      this.root.add(glow);
      const glowLight = new THREE.PointLight(0xe8f0ff, 0, 18, 2);
      glowLight.position.set(c.x + outward.x * 0.8, 2.0, c.z + outward.z * 0.8);
      this.root.add(glowLight);
      this.door = { slab, slabPos, led, ledMat, glow, glowLight, opening: false, progress: 0, side, outward, center: c, mode };
      this.addInteractable({
        pos: new V3(slabPos.x + side[0] * 1.0, 0, slabPos.z + side[1] * 1.0), r: 2.8,
        enabled: () => !this.door.opening && !this.doorOpen,
        label: () => (mode === 'code' ? 'Inserisci il codice' : 'Esamina la porta'),
        use: () => Flow.useDoor()
      });
    }

    openDoor() {
      if (!this.door || this.door.opening) return;
      this.door.opening = true;
      this.door.ledMat.color.set(0x22cc55);
      Snd.play('scoppio', { volume: 0.75, rate: 0.5 });
      Snd.play('scoppio', { volume: 0.4, rate: 0.8, delay: 0.25 });
    }

    /* ---------------- statua di Zeus ---------------- */
    addZeus(i, j) {
      const c = this.center(i, j);
      const grp = new THREE.Group();
      grp.position.copy(c);
      grp.rotation.y = -Math.PI / 2;
      this.root.add(grp);
      Assets.make('zeus', { height: 3.0 }).then((m) => { if (m) grp.add(m); });
      const bolt = new THREE.PointLight(0x8fb8ff, 0, 16, 2);
      bolt.position.set(c.x, 2.8, c.z);
      this.root.add(bolt);
      this.blockers.push({ x0: c.x - 0.85, x1: c.x + 0.85, z0: c.z - 0.85, z1: c.z + 0.85 });
      this.pathBlock.add(j * this.cols + i);
      const z = { pos: c, bolt, solved: false };
      this.addInteractable({
        pos: c.clone(), r: 3.2,
        enabled: () => !z.solved,
        label: () => 'Esamina la statua di Giove',
        use: () => Flow.useZeus(z)
      });
      this.zeus = z;
      return z;
    }

    /* ---------------- aggiornamento per frame ---------------- */
    update(dt) {
      this.time += dt;
      this.blackout = Math.max(0, this.blackout - dt);
      this.flashBoost = Math.max(0, this.flashBoost - dt * 5);
      for (const l of this.lights) {
        l.drop = Math.max(0, l.drop - dt);
        if (l.drop <= 0 && Math.random() < 0.0025) l.drop = 0.06 + Math.random() * 0.25;
        let f = 0.9 + 0.1 * Math.sin(this.time * 7 + l.phase) + (Math.random() - 0.5) * 0.05;
        if (l.drop > 0) f *= 0.08;
        l.light.intensity = this.blackout > 0 ? 0 : l.base * f * (1 + this.flashBoost * 0.8);
      }
      if (this.hemi) this.hemi.intensity = this.blackout > 0 ? 0.08 : this.style.hemi + this.flashBoost * 1.4;
      for (const p of this.pickups) {
        if (p.taken) continue;
        p.grp.rotation.y += dt * 0.8;
        p.grp.position.y = 0.1 + Math.sin(this.time * 2 + p.phase) * 0.03;
      }
      if (this.door && this.door.opening && this.door.progress < 1) {
        this.door.progress = Math.min(1, this.door.progress + dt / 1.9);
        this.door.slab.position.y = this.door.slabPos.y + this.door.progress * (this.wallH * 0.98);
        if (this.door.progress > 0.7 && !this.doorOpen) {
          this.doorOpen = true;
          this.door.glow.visible = true;
          this.door.glowLight.intensity = PHYS ? 40 : 1.4;
        }
      }
      if (this.style.rain) {
        this.nextThunder -= dt;
        if (this.nextThunder <= 0) {
          this.nextThunder = 16 + Math.random() * 20;
          this.thunderStrike(0.35);
        }
      }
    }

    thunderStrike(strength) {
      UI.lightning(strength);
      this.flashBoost = 1;
      Snd.play('scoppio', { volume: 0.5, rate: 0.42, delay: 0.3 + Math.random() * 1.2 });
    }

    dispose() {
      this.disposables.forEach((d) => { try { if (d.dispose) d.dispose(); } catch (e) { /* ignora */ } });
      this.interactables.length = 0;
    }
  }

  /* ===========================================================================
   *  11. GENERAZIONE DEL LABIRINTO (Macroarea 3) E MAPPA DEL REPARTO (Macroarea 4)
   * ========================================================================= */
  function bfsDist(grid, si, sj) {
    const H = grid.length, W = grid[0].length;
    const dist = new Int32Array(W * H).fill(-1);
    const q = [sj * W + si];
    dist[q[0]] = 0;
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      const ci = cur % W, cj = (cur / W) | 0;
      for (const d of DIRS4) {
        const ni = ci + d[0], nj = cj + d[1];
        if (ni < 0 || nj < 0 || ni >= W || nj >= H || grid[nj][ni] === '#') continue;
        const n = nj * W + ni;
        if (dist[n] !== -1) continue;
        dist[n] = dist[cur] + 1;
        q.push(n);
      }
    }
    return dist;
  }

  function generateMaze(cw, ch, rng) {
    const W = cw * 2 + 1, H = ch * 2 + 1;
    const g = Array.from({ length: H }, () => Array(W).fill('#'));
    const stack = [[1, 1]];
    g[1][1] = '.';
    const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];
    while (stack.length) {
      const cur = stack[stack.length - 1];
      const opts = dirs.map((d) => [cur[0] + d[0], cur[1] + d[1], d[0], d[1]]).filter((o) => o[0] > 0 && o[1] > 0 && o[0] < W - 1 && o[1] < H - 1 && g[o[1]][o[0]] === '#');
      if (!opts.length) { stack.pop(); continue; }
      const o = opts[Math.floor(rng() * opts.length)];
      g[cur[1] + o[3] / 2][cur[0] + o[2] / 2] = '.';
      g[o[1]][o[0]] = '.';
      stack.push([o[0], o[1]]);
    }
    const openCount = (x, y) => DIRS4.reduce((n, d) => n + (g[y + d[1]][x + d[0]] !== '#' ? 1 : 0), 0);
    // intrecci: elimina molti vicoli ciechi per creare anelli (più backtracking, meno trappole obbligate)
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (g[y][x] !== '.' || openCount(x, y) !== 1 || rng() > 0.5) continue;
        const cand = [];
        for (const d of DIRS4) {
          const wx = x + d[0], wy = y + d[1], bx = x + d[0] * 2, by = y + d[1] * 2;
          if (wx > 0 && wy > 0 && wx < W - 1 && wy < H - 1 && bx > 0 && by > 0 && bx < W - 1 && by < H - 1 && g[wy][wx] === '#' && g[by][bx] === '.') cand.push([wx, wy]);
        }
        if (cand.length) { const c = cand[Math.floor(rng() * cand.length)]; g[c[1]][c[0]] = '.'; }
      }
    }
    // piccole sale
    for (let k = 0; k < 3; k++) {
      const x = 1 + 2 * Math.floor(rng() * (cw - 2)), y = 1 + 2 * Math.floor(rng() * (ch - 2));
      if (x < 3 && y < 3) continue;
      for (let yy = y; yy <= y + 2; yy++) for (let xx = x; xx <= x + 2; xx++) g[yy][xx] = '.';
    }
    return g;
  }

  function planMaze(grid, rng) {
    const H = grid.length, W = grid[0].length;
    const dist = bfsDist(grid, 1, 1);
    let best = null;
    for (let j = 1; j < H - 1; j++) {
      for (let i = 1; i < W - 1; i++) {
        const d = dist[j * W + i];
        if (grid[j][i] !== '.' || d < 0) continue;
        const border = [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]].find((p) => p[0] === 0 || p[1] === 0 || p[0] === W - 1 || p[1] === H - 1);
        if (border && (!best || d > best.d)) best = { i, j, d, door: border };
      }
    }
    grid[best.door[1]][best.door[0]] = 'E';
    const floors = [], deadEnds = [];
    let maxD = 0;
    for (let j = 1; j < H - 1; j++) {
      for (let i = 1; i < W - 1; i++) {
        const d = dist[j * W + i];
        if (grid[j][i] !== '.' || d < 0) continue;
        const c = { i, j, d };
        floors.push(c);
        maxD = Math.max(maxD, d);
        if (DIRS4.reduce((n, dd) => n + (grid[j + dd[1]][i + dd[0]] !== '#' ? 1 : 0), 0) === 1) deadEnds.push(c);
      }
    }
    const used = [{ i: 1, j: 1 }, { i: best.i, j: best.j }];
    const farEnough = (c, sep) => used.every((u) => Math.abs(u.i - c.i) + Math.abs(u.j - c.j) >= sep);
    function pick(list, n, sep) {
      const out = [];
      const pool = shuffle(list.slice(), rng);
      for (let s = sep; s >= 2 && out.length < n; s--) {
        for (const c of pool) {
          if (out.length >= n) break;
          if (out.indexOf(c) >= 0 || !farEnough(c, s)) continue;
          out.push(c);
          used.push(c);
        }
      }
      return out;
    }
    const code = [0, 0, 0, 0].map(() => Math.floor(rng() * 10));
    const lettersPool = deadEnds.filter((c) => c.d >= 10);
    const lettersTiles = pick(lettersPool.length >= 4 ? lettersPool : floors.filter((c) => c.d >= 10), 4, 9);
    const lockerTiles = pick(deadEnds.filter((c) => c.d >= 6).concat(floors.filter((c) => c.d >= 8)), 5, 7);
    const amoTiles = pick(floors.filter((c) => c.d >= 4), 6, 5);
    const medTiles = pick(floors.filter((c) => c.d >= 5), 4, 6);
    const doctorTile = floors.slice().sort((a, b) => Math.abs(a.d - maxD * 0.5) - Math.abs(b.d - maxD * 0.5)).find((c) => farEnough(c, 4)) || floors[floors.length >> 1];
    return { code, start: { i: 1, j: 1 }, door: best, letters: lettersTiles, lockers: lockerTiles, amo: amoTiles, meds: medTiles, doctor: doctorTile };
  }

  function wardPlan() {
    const rows = [
      '#########################',
      '#.....#.....#.....#######',
      '#.....#.....#.....#######',
      '#.....#.....#.....#######',
      '#.....#.....#.....#.....#',
      '#.....#.....#.....#.....#',
      '#.....#.....#.....#.....#',
      '###.#####.#####.###.....#',
      '#' + '.'.repeat(23) + 'E',
      '###.#####.#####.###.....#',
      '#.....#.....#.....#.....#',
      '#.....#.....#.....#.....#',
      '#.....#.....#.....#.....#',
      '#.....#.....#.....#######',
      '#.....#.....#.....#######',
      '#.....#.....#.....#######',
      '#########################'
    ];
    const grid = rows.map((r) => r.split(''));
    return {
      grid,
      start: { i: 2, j: 3 },
      lockers: [{ i: 1, j: 6 }, { i: 11, j: 1 }, { i: 13, j: 14 }, { i: 17, j: 5 }, { i: 23, j: 11 }],
      letters: [{ i: 9, j: 3 }, { i: 3, j: 12 }, { i: 15, j: 13 }],
      amo: [{ i: 8, j: 2 }, { i: 8, j: 11 }, { i: 21, j: 11 }, { i: 4, j: 5 }],
      meds: [{ i: 5, j: 2 }, { i: 11, j: 12 }, { i: 15, j: 3 }],
      doctor: { i: 10, j: 14 },
      zeus: { i: 21, j: 8 },
      lights: [[3, 3], [9, 3], [15, 3], [9, 8], [3, 12], [15, 12], [21, 8]]
    };
  }

  /* ===========================================================================
   *  12. TESTI (lettere e monologhi)
   * ========================================================================= */
  function mazeLetters(code) {
    return [
      { title: 'Registro di reparto — 3 novembre', body: 'Il Primario ha voluto cambiare la serratura del seminterrato. Ho spezzato il codice in quattro lettere e le ho nascoste dove nessuno ha più il coraggio di guardare.\n\nLa PRIMA cifra è il ' + code[0] + '.\n\nSe stai leggendo, corri: lui cammina ancora per questi corridoi.', idx: 0, digit: code[0] },
      { title: 'Infermiera Rossi — turno di notte', body: 'Ho sentito di nuovo i suoi passi sul linoleum. Non dorme, non mangia, non parla. Ho trovato l’appunto del dottore e l’ho copiato su questo foglio.\n\nLa SECONDA cifra della porta è il ' + code[1] + '.\n\nNon dirlo a nessuno. Nemmeno a lui.', idx: 1, digit: code[1] },
      { title: 'Pagina strappata — cartella 117', body: '…il paziente 117 ripete numeri nel sonno. Il dottore li trascrive con una cura che mi gela il sangue.\n\nLa TERZA cifra è il ' + code[2] + '.\n\nDicono che l’uscita si apra soltanto a chi ha visto tutto il reparto.', idx: 2, digit: code[2] },
      { title: 'Ultimo biglietto', body: 'Se hai trovato le altre, ti manca solo l’ultima.\n\nLa QUARTA cifra è il ' + code[3] + '.\n\nDopo la porta troverai ancora il reparto. Io non ci sono arrivato. Spero che tu sia più fortunato.', idx: 3, digit: code[3] }
    ];
  }

  const WARD_LETTERS = [
    { title: 'Appunti del Dott. Ferrante — «Il rito» (I)', body: 'Giove vigila sull’atrio da quando l’ospedale era ancora un convento. Tre sono i suoi segni, e un solo ordine li tiene insieme.\n\nHo imparato questo: l’AQUILA viene sempre prima del FOLGORE. Zeus guarda, e soltanto dopo punisce.', idx: 0 },
    { title: 'Diario di una paziente — pagina 9', body: 'Dalla finestra vedevo la statua sotto la pioggia. Ho provato a spostare i simboli, una notte. La QUERCIA non è mai la prima: è radice, è memoria, non può aprire nulla.\n\nIl giorno dopo il dottore sapeva già cosa avevo fatto.', idx: 1 },
    { title: 'Biglietto sotto la statua', body: 'Chi mette il FOLGORE per ultimo ha già perso. Il fulmine è il centro del rito: non apre e non chiude.\n\nMemorizza i tre simboli. Poi vai: ho sentito la porta dell’atrio fremere.', idx: 2 }
  ];
  const WARD_SOLUTION = ['aquila', 'folgore', 'quercia'];

  /* ===========================================================================
   *  13. IL DOTTORE (IA: pattuglia / indagine / inseguimento / ricerca / attacco)
   * ========================================================================= */
  class Doctor {
    constructor(level, tile) {
      this.level = level;
      const c = level.center(tile[0], tile[1]);
      this.pos = new V3(c.x, 0, c.z);
      this.yaw = Math.random() * TAU;
      this.root = new THREE.Group();
      this.root.rotation.order = 'YXZ';
      this.root.position.copy(this.pos);
      level.root.add(this.root);
      this.hp = CONFIG.doctor.hp;
      this.state = 'patrol';
      this.timer = 0;
      this.wait = 1;
      this.path = [];
      this.target = null;
      this.lastKnown = null;
      this.lostTime = 0;
      this.repath = 0;
      this.searchRepath = 0;
      this.attackT = 0;
      this.attackHit = false;
      this.knock = new V3();
      this.tilt = 0;
      this.moving = false;
      this.alertCd = 0;
      this.stuckT = 0;
      this.stuckPos = this.pos.clone();
      this.mixer = null;
      this.clips = {};
      this.curClip = null;
      this.curAction = null;
      this.footVol = -1;
      this.footRate = 1;
      this.dist = 99;
      Assets.make('dottore', { height: 2.05 }).then((m) => {
        if (!m || this.disposed) return;
        m.rotation.y = CONFIG.doctor.modelYaw;
        this.root.add(m);
        this.setupAnim(m);
      });
      this.foot = Snd.loop3d('footstepsHospital', this.root, { refDistance: 3, rolloff: 2, maxDistance: 38 });
    }

    setupAnim(model) {
      const clips = model.userData.animations || [];
      if (!clips.length) return;
      this.mixer = new THREE.AnimationMixer(model);
      const find = (re) => clips.find((c) => re.test(c.name)) || null;
      const walk = find(/walk|move|patrol/i) || clips[0];
      this.clips = { idle: find(/idle|stand|breath/i), walk, run: find(/run|chase|sprint/i) || walk, attack: find(/attack|hit|strike|swing|punch/i) };
      this.play('idle');
    }

    play(name, scale) {
      if (!this.mixer) return;
      const clip = this.clips[name] || this.clips.walk;
      if (!clip) return;
      if (this.curClip === clip) { if (this.curAction) this.curAction.timeScale = scale || 1; return; }
      const next = this.mixer.clipAction(clip).reset();
      next.timeScale = scale || 1;
      if (name === 'attack') { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = false; }
      next.fadeIn(0.2).play();
      if (this.curAction) this.curAction.fadeOut(0.2);
      this.curAction = next;
      this.curClip = clip;
    }

    isChasing() { return this.state === 'chase' || this.state === 'attack'; }

    /* ---------------- percezione ---------------- */
    perceive(dt) {
      const pp = ctx.camera.position;
      const dx = pp.x - this.pos.x, dz = pp.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      this.dist = dist;
      const out = { sees: false, heard: false };
      if (Player.hidden || Player.dead || dist < 0.001) return out;
      const los = this.level.hasLOS(this.pos, pp);
      if (dist < CONFIG.doctor.sightRange && los) {
        const dot = (dx / dist) * Math.sin(this.yaw) + (dz / dist) * Math.cos(this.yaw);
        const half = (CONFIG.doctor.fov / 2) * Math.PI / 180;
        const chasing = this.isChasing();
        if (dist < CONFIG.doctor.senseRange || dot > Math.cos(half) || (chasing && dist < 9)) out.sees = true;
      }
      const radius = Player.noise * (los ? 1 : 0.55);
      if (Player.noise > 0 && dist < radius) out.heard = true;
      return out;
    }

    hearNoise(p, radius) {
      if (this.state === 'down' || this.state === 'attack' || this.state === 'stagger') return;
      const d = horiz(p, this.pos);
      if (d > radius) return;
      if (this.state === 'chase') { this.lastKnown = p.clone(); return; }
      if (d < radius * 0.3 && !Player.hidden) { this.lastKnown = p.clone(); this.startChase(); return; }
      this.investigate(p);
    }

    /* ---------------- transizioni di stato ---------------- */
    startChase() {
      if (this.state === 'chase') return;
      this.state = 'chase';
      this.path = [];
      this.lostTime = 0;
      this.repath = 0;
      if (this.alertCd <= 0) {
        Snd.play('urlo', { volume: 0.95, parent: this.root, refDistance: 8, rolloff: 1, maxDistance: 80 });
        this.alertCd = 9;
      }
    }

    investigate(p) {
      if (this.isChasing()) return;
      this.state = 'investigate';
      this.target = p.clone();
      this.path = this.level.findPath(this.pos, this.target);
    }

    beginSearch(at) {
      this.state = 'search';
      this.timer = CONFIG.doctor.searchTime;
      this.lastKnown = (at || this.lastKnown || this.pos).clone();
      this.path = [];
      this.searchRepath = 0;
    }

    onPlayerHide() {
      if (this.state === 'chase' || this.state === 'attack' || this.state === 'stagger') this.beginSearch(this.lastKnown || ctx.camera.position);
    }

    /* ---------------- danni ---------------- */
    rayHit(origin, dir) {
      const ray = new THREE.Ray(origin, dir);
      const tmp = new V3();
      let best = Infinity;
      const shapes = this.state === 'down' ? [[0.45, 0.9]] : [[1.0, 0.72], [1.72, 0.32]];
      for (const s of shapes) {
        if (ray.intersectSphere(new THREE.Sphere(new V3(this.pos.x, s[0], this.pos.z), s[1]), tmp)) best = Math.min(best, tmp.distanceTo(origin));
      }
      return best === Infinity ? null : best;
    }

    hurt(amount) {
      if (this.state === 'down' || this.disposed) return;
      this.hp -= amount;
      Snd.play('damage', { volume: 0.55, rate: 0.75, parent: this.root });
      this.lastKnown = ctx.camera.position.clone();
      if (this.hp <= 0) { this.goDown(); return; }
      if (amount >= CONFIG.doctor.staggerThreshold) {
        this.state = 'stagger';
        this.timer = CONFIG.doctor.staggerTime;
        this.path = [];
        const away = new V3(this.pos.x - ctx.camera.position.x, 0, this.pos.z - ctx.camera.position.z).normalize();
        this.knock.copy(away).multiplyScalar(3.2);
      } else if (this.state === 'patrol' || this.state === 'investigate' || this.state === 'search') {
        this.startChase();
      }
    }

    goDown() {
      this.state = 'down';
      this.timer = CONFIG.doctor.downTime;
      this.path = [];
      this.moving = false;
      UI.toast('Il dottore è a terra… ma non resterà giù a lungo.');
    }

    startAttack() {
      this.state = 'attack';
      this.attackT = 0;
      this.attackHit = false;
      this.path = [];
      this.play('attack');
    }

    /* ---------------- movimento ---------------- */
    steerTo(target, speed, dt) {
      const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) return d;
      const want = Math.atan2(dx, dz);
      const maxTurn = CONFIG.doctor.turnSpeed * dt;
      this.yaw += clamp(angleDiff(this.yaw, want), -maxTurn, maxTurn);
      const step = Math.min(d, speed * dt);
      this.pos.x += (dx / d) * step;
      this.pos.z += (dz / d) * step;
      this.level.resolveCircle(this.pos, CONFIG.doctor.radius);
      return d - step;
    }

    followPath(speed, dt) {
      while (this.path.length && horiz(this.path[0], this.pos) < 0.4) this.path.shift();
      if (!this.path.length) return true;
      this.steerTo(this.path[0], speed, dt);
      return false;
    }

    pickWaypoint() {
      for (let k = 0; k < 8; k++) {
        const t = this.level.randomFloorTile();
        const path = this.level.findPath(this.pos, this.level.center(t[0], t[1]));
        if (path.length >= 5) { this.path = path; return; }
      }
      this.path = [];
    }

    /* ---------------- aggiornamento ---------------- */
    update(dt) {
      if (this.disposed) return;
      if (this.mixer) this.mixer.update(dt);
      this.alertCd = Math.max(0, this.alertCd - dt);
      const pp = ctx.camera.position;
      const per = this.perceive(dt);
      this.moving = false;

      switch (this.state) {
        case 'patrol': this.updatePatrol(dt, per); break;
        case 'investigate': this.updateInvestigate(dt, per); break;
        case 'search': this.updateSearch(dt, per); break;
        case 'chase': this.updateChase(dt, per); break;
        case 'attack': this.updateAttack(dt); break;
        case 'stagger': this.updateStagger(dt); break;
        case 'down': this.updateDown(dt); break;
        default: break;
      }

      if (this.moving && this.state !== 'down') {
        this.stuckT += dt;
        if (this.stuckT > 0.8) {
          if (horiz(this.pos, this.stuckPos) < 0.15) { this.path = []; this.repath = 0; }
          this.stuckPos.copy(this.pos);
          this.stuckT = 0;
        }
      }

      this.tilt = lerp(this.tilt, this.state === 'down' ? Math.PI / 2 : 0, clamp(dt * 4, 0, 1));
      this.root.position.set(this.pos.x, this.tilt * 0.2, this.pos.z);
      this.root.rotation.set(-this.tilt, this.yaw, 0);
      this.updateAudioAnim(pp);
    }

    updatePatrol(dt, per) {
      if (per.sees) { this.lastKnown = ctx.camera.position.clone(); this.startChase(); return; }
      if (per.heard) { this.investigate(ctx.camera.position.clone()); return; }
      if (this.wait > 0) {
        this.wait -= dt;
        this.yaw += Math.sin(performance.now() / 700) * dt * 0.9;
        return;
      }
      if (!this.path.length) {
        this.pickWaypoint();
        if (!this.path.length) { this.wait = 1; return; }
      }
      this.moving = true;
      if (this.followPath(CONFIG.doctor.patrolSpeed, dt)) { this.wait = 1.5 + Math.random() * 2.5; this.moving = false; }
    }

    updateInvestigate(dt, per) {
      if (per.sees) { this.lastKnown = ctx.camera.position.clone(); this.startChase(); return; }
      if (per.heard) { this.target = ctx.camera.position.clone(); this.path = this.level.findPath(this.pos, this.target); }
      if (!this.path.length) { this.beginSearch(this.target); return; }
      this.moving = true;
      if (this.followPath(CONFIG.doctor.searchSpeed, dt)) { this.moving = false; this.beginSearch(this.target); }
    }

    updateSearch(dt, per) {
      if (per.sees) { this.lastKnown = ctx.camera.position.clone(); this.startChase(); return; }
      if (per.heard) { this.investigate(ctx.camera.position.clone()); return; }
      this.timer -= dt;
      if (Player.hidden && this.dist < CONFIG.doctor.lockerFindDist) { Flow.dragFromLocker(this); return; }
      this.searchRepath -= dt;
      if ((!this.path.length || this.searchRepath <= 0) && this.lastKnown) {
        const lt = this.level.tileOf(this.lastKnown.x, this.lastKnown.z);
        for (let k = 0; k < 6; k++) {
          const i = lt[0] + Math.floor(Math.random() * 7) - 3, j = lt[1] + Math.floor(Math.random() * 7) - 3;
          if (this.level.passBlocked(i, j)) continue;
          const p = this.level.findPath(this.pos, this.level.center(i, j));
          if (p.length) { this.path = p; break; }
        }
        this.searchRepath = 2.4;
      }
      if (this.path.length) { this.moving = true; this.followPath(CONFIG.doctor.searchSpeed, dt); }
      if (this.timer <= 0) { this.state = 'patrol'; this.path = []; this.wait = 1; }
    }

    updateChase(dt, per) {
      const pp = ctx.camera.position;
      this.moving = true;
      if (per.sees) { this.lastKnown = pp.clone(); this.lostTime = 0; } else this.lostTime += dt;
      if (per.sees && this.dist <= CONFIG.doctor.attackRange) { this.startAttack(); return; }
      if (per.sees && this.dist < 7 && this.level.hasLOS(this.pos, pp)) {
        this.path = [];
        this.steerTo(pp, CONFIG.doctor.chaseSpeed, dt);
      } else {
        this.repath -= dt;
        if (this.repath <= 0 || !this.path.length) {
          this.path = this.level.findPath(this.pos, this.lastKnown || pp);
          this.repath = 0.4;
        }
        const done = this.followPath(CONFIG.doctor.chaseSpeed, dt);
        if (done && !per.sees) { this.beginSearch(this.lastKnown); return; }
      }
      if (this.lostTime > CONFIG.doctor.loseTime) this.beginSearch(this.lastKnown);
    }

    updateAttack(dt) {
      const pp = ctx.camera.position;
      this.attackT += dt;
      const want = yawTo(this.pos, pp);
      this.yaw += clamp(angleDiff(this.yaw, want), -8 * dt, 8 * dt);
      if (!this.attackHit && this.attackT >= CONFIG.doctor.attackWindup) {
        this.attackHit = true;
        if (!Player.hidden && this.dist <= CONFIG.doctor.attackRange + 0.7) Player.damage(CONFIG.doctor.attackDamage);
      }
      if (this.attackT >= CONFIG.doctor.attackWindup + CONFIG.doctor.attackRecover) {
        this.state = 'chase';
        this.lastKnown = pp.clone();
        this.lostTime = 0;
      }
    }

    updateStagger(dt) {
      this.timer -= dt;
      this.pos.x += this.knock.x * dt;
      this.pos.z += this.knock.z * dt;
      this.knock.multiplyScalar(Math.exp(-6 * dt));
      this.level.resolveCircle(this.pos, CONFIG.doctor.radius);
      if (this.timer <= 0) { this.state = 'chase'; this.lastKnown = ctx.camera.position.clone(); this.lostTime = 0; this.path = []; }
    }

    updateDown(dt) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.hp = CONFIG.doctor.hp * 0.7;
        this.beginSearch(ctx.camera.position);
        UI.toast('Il dottore si rialza…');
      }
    }

    updateAudioAnim(pp) {
      let vol = 0, rate = 1;
      if (this.moving) {
        if (this.state === 'chase') { vol = 1; rate = 1.3; } else if (this.state === 'patrol') { vol = 0.75; rate = 0.95; } else { vol = 0.85; rate = 1.05; }
      }
      if (Math.abs(vol - this.footVol) > 0.01 || Math.abs(rate - this.footRate) > 0.01) {
        this.foot.set(vol, rate);
        this.footVol = vol;
        this.footRate = rate;
      }
      if (this.mixer) {
        if (this.state === 'attack') this.play('attack');
        else if (!this.moving) this.play('idle');
        else if (this.state === 'chase') this.play('run', 1);
        else this.play('walk', 1);
      }
    }

    dispose() {
      this.disposed = true;
      if (this.foot) this.foot.stop();
      if (this.root.parent) this.root.parent.remove(this.root);
    }
  }

  /* ===========================================================================
   *  14. ARMI (pompa + ascia) con viewmodel agganciato alla camera
   * ========================================================================= */
  const Weapons = {
    vm: null, models: { pompa: null, ascia: null }, muzzle: null, kick: 0, swing: -1, swingHit: false,
    cool: 0, raise: 1, bobT: 0, flashT: 0, ready: false,
    base: { pompa: [0.24, -0.25, -0.55], ascia: [0.3, -0.3, -0.62] },

    init() {
      if (this.vm) return;
      const cam = ctx.camera;
      cam.near = Math.min(cam.near, 0.05);
      cam.updateProjectionMatrix();
      if (!cam.parent) ctx.scene.add(cam);
      this.vm = new THREE.Group();
      this.vm.name = 'a34-viewmodel';
      cam.add(this.vm);
      this.muzzle = new THREE.PointLight(0xffb870, 0, 14, 2);
      this.muzzle.position.set(0.2, -0.1, -1.1);
      cam.add(this.muzzle);
      const fill = new THREE.PointLight(0xffffff, LI.small, 3, 2);
      fill.position.set(0.1, 0.1, -0.2);
      this.vm.add(fill);
      Promise.all([Assets.make('pompa', { maxDim: 0.95, center: true }), Assets.make('ascia', { maxDim: 0.85, center: true })]).then((r) => {
        this.models.pompa = this.prepare(r[0], true);
        this.models.ascia = this.prepare(r[1], false);
        this.vm.add(this.models.pompa, this.models.ascia);
        this.models.pompa.visible = this.models.ascia.visible = false;
        this.ready = true;
        this.equip(Player.weapon, true);
      });
    },

    prepare(model, longAxisToZ) {
      const holder = new THREE.Group();
      if (!model) return holder;
      if (longAxisToZ && !model.userData.fallback) {
        const size = new THREE.Box3().setFromObject(model).getSize(new V3());
        if (size.x > size.z && size.x > size.y) model.rotation.y = Math.PI / 2;
      }
      model.traverse((n) => { if (n.isMesh) n.frustumCulled = false; });
      holder.add(model);
      return holder;
    },

    equip(name, silent) {
      if (name === 'pompa' && !Player.haveShotgun) { if (!silent) UI.toast('Non hai il pompa.'); return; }
      if (name === 'ascia' && !Player.haveAxe) { if (!silent) UI.toast('Non hai l’ascia.'); return; }
      Player.weapon = name || null;
      this.raise = 0;
      if (this.ready) {
        this.models.pompa.visible = name === 'pompa';
        this.models.ascia.visible = name === 'ascia';
      }
      UI.refresh();
    },

    primary() {
      if (Player.dead || Player.hidden || Player.forced || UI.panelOpen || !Flow.active) return;
      if (Player.weapon === 'pompa') this.fire();
      else if (Player.weapon === 'ascia') this.attackAxe();
    },

    fire() {
      if (this.cool > 0) return;
      const W = CONFIG.weapons.pompa;
      if (Player.shells <= 0) { UI.toast('Il pompa è scarico.'); this.cool = 0.4; return; }
      Player.shells -= 1;
      UI.refresh();
      this.cool = W.cooldown;
      this.kick = 1;
      this.flashT = 0.07;
      Snd.play('shotgun', { volume: 0.95 });
      Snd.play('scoppio', { volume: 0.55, rate: 1.15, delay: 0.02 });
      Flow.shake(0.35);
      const L = Flow.level, cam = ctx.camera;
      const origin = cam.getWorldPosition(new V3());
      const fwd = cam.getWorldDirection(new V3());
      const right = new V3().crossVectors(fwd, cam.up).normalize();
      const up = new V3().crossVectors(right, fwd).normalize();
      const doc = Flow.doctor;
      let total = 0;
      if (doc && L) {
        for (let k = 0; k < W.pellets; k++) {
          const dir = fwd.clone().addScaledVector(right, (Math.random() - 0.5) * W.spread * 2).addScaledVector(up, (Math.random() - 0.5) * W.spread * 2).normalize();
          const d = doc.rayHit(origin, dir);
          if (d === null || d > W.range) continue;
          if (d > L.raycastWall(origin, dir, W.range)) continue;
          total += W.pelletDamage * (1 - clamp((d - 5) / 15, 0, 0.8));
        }
        if (total > 0) doc.hurt(total);
        doc.hearNoise(origin, CONFIG.doctor.hearShot);
      }
    },

    attackAxe() {
      if (this.cool > 0) return;
      this.cool = CONFIG.weapons.ascia.cooldown;
      this.swing = 0;
      this.swingHit = false;
    },

    resolveAxeHit() {
      const A = CONFIG.weapons.ascia, doc = Flow.doctor, L = Flow.level, cam = ctx.camera;
      if (!doc || !L || doc.state === 'down') { if (doc) doc.hearNoise(cam.position, 10); return; }
      const fwd = cam.getWorldDirection(new V3());
      const dx = doc.pos.x - cam.position.x, dz = doc.pos.z - cam.position.z;
      const d = Math.hypot(dx, dz);
      if (d > A.reach) { doc.hearNoise(cam.position, 14); return; }
      const fh = Math.hypot(fwd.x, fwd.z) || 1;
      const dot = (dx / d) * (fwd.x / fh) + (dz / d) * (fwd.z / fh);
      if (dot < Math.cos((A.arc * Math.PI) / 180) || !L.hasLOS(cam.position, doc.pos)) { doc.hearNoise(cam.position, 14); return; }
      doc.hurt(A.damage);
      Flow.shake(0.4);
    },

    update(dt) {
      if (!this.ready) return;
      this.cool = Math.max(0, this.cool - dt);
      this.raise = Math.min(1, this.raise + dt * 3.2);
      this.kick = Math.max(0, this.kick - dt * 5);
      this.flashT = Math.max(0, this.flashT - dt);
      this.muzzle.intensity = this.flashT > 0 ? LI.muzzle : 0;
      this.bobT += dt * (2 + Player.speed * 1.6);
      const name = Player.weapon;
      this.vm.visible = !!name && !Player.hidden && !Player.dead;
      if (!name) return;
      const b = this.base[name];
      const bob = Math.min(1, Player.speed / 3.5);
      let px = b[0] + Math.sin(this.bobT) * 0.008 * bob;
      let py = b[1] + Math.abs(Math.cos(this.bobT)) * 0.01 * bob - (1 - this.raise) * 0.45;
      let pz = b[2] + this.kick * 0.12;
      let rx = this.kick * 0.28, ry = 0, rz = 0;
      if (name === 'ascia') { rx = -0.3; rz = 0.15; }
      if (this.swing >= 0) {
        this.swing += dt / 0.42;
        const k = clamp(this.swing, 0, 1);
        const arc = Math.sin(k * Math.PI);
        rx = -0.3 + (k < 0.5 ? -k * 1.4 : -0.7 + (k - 0.5) * 3.0) ;
        px -= arc * 0.22;
        py -= arc * 0.05;
        pz -= arc * 0.18;
        rz = 0.15 - arc * 0.5;
        if (!this.swingHit && k >= 0.45) { this.swingHit = true; this.resolveAxeHit(); }
        if (this.swing >= 1) this.swing = -1;
      }
      this.vm.position.set(px, py, pz);
      this.vm.rotation.set(rx, ry, rz);
    }
  };

  /* ===========================================================================
   *  15. INTERAZIONI
   * ========================================================================= */
  const Interact = {
    current: null,
    update() {
      const L = Flow.level;
      if (!L || Player.dead || UI.panelOpen || Player.forced) { this.current = null; UI.prompt(''); return; }
      if (Player.hidden) {
        this.current = Player.hidden.item;
        UI.prompt('[E] Uscire dall’armadietto');
        return;
      }
      const cam = ctx.camera, cp = cam.position, fwd = cam.getWorldDirection(new V3());
      const fh = Math.hypot(fwd.x, fwd.z) || 1;
      let best = null, bestScore = -Infinity;
      for (const it of L.interactables) {
        if (it.enabled && !it.enabled()) continue;
        const dx = it.pos.x - cp.x, dz = it.pos.z - cp.z;
        const d = Math.hypot(dx, dz);
        if (d > it.r) continue;
        const dot = d < 0.01 ? 1 : (dx / d) * (fwd.x / fh) + (dz / d) * (fwd.z / fh);
        if (d > 1.0 && dot < 0.3) continue;
        const score = 1 / (d + 0.3) + dot * 0.6;
        if (score > bestScore) { bestScore = score; best = it; }
      }
      this.current = best;
      const label = best ? best.label() : null;
      UI.prompt(label ? '[E] ' + label : '');
    },
    use() { if (this.current) this.current.use(); }
  };

  /* ===========================================================================
   *  16. FLUSSO DI GIOCO: stage, enigmi, stealth, morte, jump scare
   * ========================================================================= */
  const Flow = {
    stage: 'idle', level: null, doctor: null, active: false, busy: false, chasing: false, dying: false,
    shakeMag: 0, baseFov: 0, rolled: false, baseHorror: 0.18, baseBg: 0.38, plan: null, code: null,
    scare: false, scareDone: false, epilogue: false, zeusSolved: false, hidden: [],

    shake(mag) { this.shakeMag = Math.max(this.shakeMag, mag); },

    isolate() {
      if (!CONFIG.isolateLevels) return;
      for (const child of ctx.scene.children) {
        if (child === ctx.camera || (child.userData && child.userData.a34)) continue;
        if (child.getObjectById && child.getObjectById(ctx.camera.id)) continue;
        if (child.visible) { child.visible = false; this.hidden.push(child); }
      }
    },

    restoreWorld() {
      this.hidden.forEach((o) => { o.visible = true; });
      this.hidden = [];
    },

    teardown() {
      this.active = false;
      if (this.doctor) { this.doctor.dispose(); this.doctor = null; }
      if (this.level) {
        ctx.scene.remove(this.level.root);
        this.level.dispose();
        this.level = null;
      }
      if (Snd.layers.pfoot3) Snd.layer('pfoot3', 0, 0.1, 'footsteps');
      if (Snd.layers.pfoot4) Snd.layer('pfoot4', 0, 0.1, 'footstepsHospital');
      UI.prompt('');
    },

    async start(stage, opts) {
      const o = opts || {};
      if (!detectContext()) {
        console.error('[Anatomy] scene/camera/renderer non trovati: usa AnatomyMacro34.init({ scene, camera, renderer }).');
        return false;
      }
      if (this.busy) return false;
      this.busy = true;
      try {
        UI.closePanel(true);
        await UI.fade(true, o.quick ? 0.05 : 0.9);
        this.teardown();
        this.stage = stage;
        this.chasing = false;
        this.scare = this.scareDone = this.epilogue = false;
        UI.death(false);
        UI.showHud(false);
        Flash.ensure();
        Weapons.init();
        const built = stage === 'macro3' ? await this.buildMacro3(o.restart) : await this.buildMacro4(o.restart);
        this.level = built.level;
        this.doctor = built.doctor;
        ctx.scene.add(this.level.root);
        this.isolate();
        const st = this.level.style;
        ctx.scene.fog = new THREE.FogExp2(st.fog, st.density);
        ctx.scene.background = new THREE.Color(st.bg);
        Player.resetForStage(!!o.restart);
        teleportPlayer(built.spawn, built.spawnYaw);
        this.baseFov = ctx.camera.fov;
        if (stage === 'macro3') {
          this.baseBg = 0.38; this.baseHorror = 0.18;
          Snd.layer('background', this.baseBg, 3);
          Snd.layer('horror', this.baseHorror, 4);
          Snd.layer('pioggia', 0, 2);
        } else {
          this.baseBg = 0; this.baseHorror = 0.3;
          Snd.layer('background', 0, 3);
          Snd.layer('pioggia', 0.55, 4);
          Snd.layer('horror', this.baseHorror, 4);
        }
        this.active = true;
        UI.showHud(true);
        UI.refresh();
        if (typeof hooks.onStageChange === 'function') hooks.onStageChange(stage);
        await wait(250);
        UI.fade(false, 1.6);
        this.busy = false;
        if (!o.restart) this.intro(stage);
        else UI.say('Riprovo. Devo andare avanti.');
        return true;
      } catch (err) {
        this.busy = false;
        this.active = false;
        this.epilogue = false;
        reportOnce('avvio stage ' + stage, err);
        this.restoreWorld();
        UI.showHud(false);
        UI.fade(false, 0.5);
        return false;
      }
    },

    intro(stage) {
      if (stage === 'macro3') {
        UI.objective('Trova l’uscita del labirinto');
        UI.sayLines(['Il silenzio, qui sotto, ha un peso.', 'Nel rack all’ingresso c’è qualcosa che può servire.', 'Il dottore pattuglia questi corridoi. Se senti i suoi passi, nasconditi.'], 4300);
      } else {
        UI.objective('Trova le lettere e decifra l’enigma di Giove');
        UI.sayLines(['Il reparto. Fuori piove, e il tuono scuote i vetri.', 'Giove vigila sull’atrio. Le lettere devono spiegare i suoi simboli.'], 4300);
      }
    },

    /* ----------------------- MACROAREA 3 ----------------------- */
    async buildMacro3(restart) {
      const L = CONFIG.layout;
      const rng = mulberry32(L.mazeSeed);
      const grid = generateMaze(L.mazeCellsX, L.mazeCellsZ, rng);
      const plan = planMaze(grid, rng);
      this.code = plan.code;
      Player.codeKnown = [null, null, null, null];
      Player.letters = Player.letters.filter((l) => l.stage !== 'macro3');
      const level = new Level('macro3', grid, new V3(L.origin3.x, 0, L.origin3.z), STYLES.maze);
      await level.buildStructure();
      level.addCeilingLights(level.pickLightTiles(STYLES.maze.lights));
      level.addRack(plan.start.i, plan.start.j);
      plan.lockers.forEach((t) => level.addLocker(t.i, t.j));
      const texts = mazeLetters(plan.code);
      level.spawns.letters = plan.letters.slice(0, 4).map((t, n) => level.addPickup('lettere', t.i, t.j, Object.assign({ stage: 'macro3' }, texts[n])));
      plan.amo.forEach((t) => level.addPickup('amo', t.i, t.j));
      plan.meds.forEach((t) => level.addPickup('antibiotici', t.i, t.j));
      level.addExitDoor('code');
      const doctor = new Doctor(level, [plan.doctor.i, plan.doctor.j]);
      const open = level.openSide(plan.start.i, plan.start.j);
      return { level, doctor, spawn: level.center(plan.start.i, plan.start.j), spawnYaw: Math.atan2(open[0], open[1]) };
    },

    /* ----------------------- MACROAREA 4 ----------------------- */
    async buildMacro4(restart) {
      const L = CONFIG.layout;
      const plan = wardPlan();
      Player.letters = Player.letters.filter((l) => l.stage !== 'macro4');
      this.zeusSolved = false;
      const level = new Level('macro4', plan.grid, new V3(L.origin4.x, 0, L.origin4.z), STYLES.ward);
      await level.buildStructure();
      level.addCeilingLights(plan.lights);
      plan.lockers.forEach((t) => level.addLocker(t.i, t.j));
      level.spawns.letters = plan.letters.map((t, n) => level.addPickup('lettere', t.i, t.j, Object.assign({ stage: 'macro4' }, WARD_LETTERS[n])));
      plan.amo.forEach((t) => level.addPickup('amo', t.i, t.j));
      plan.meds.forEach((t) => level.addPickup('antibiotici', t.i, t.j));
      level.addZeus(plan.zeus.i, plan.zeus.j);
      level.addExitDoor('zeus');
      const doctor = new Doctor(level, [plan.doctor.i, plan.doctor.j]);
      return { level, doctor, spawn: level.center(plan.start.i, plan.start.j), spawnYaw: Math.PI / 2 };
    },

    /* ----------------------- interazioni ----------------------- */
    useRack(rack) {
      if (rack.used) return;
      rack.used = true;
      Player.haveAxe = true;
      Player.haveShotgun = true;
      Weapons.equip('ascia', true);
      UI.toast('Ascia equipaggiata · Pompa preso (tasto 1) — servono cartucce');
      UI.say('Un’ascia e un pompa. Mi servono le cartucce.');
      UI.refresh();
    },

    collect(p) {
      if (p.taken) return;
      const L = this.level;
      if (p.kind === 'amo') {
        if (Player.shells >= CONFIG.player.shellsMax) { UI.toast('Non puoi portare altre cartucce.'); return; }
        Player.shells = Math.min(CONFIG.player.shellsMax, Player.shells + CONFIG.player.shellsPerBox);
        UI.toast('+' + CONFIG.player.shellsPerBox + ' cartucce');
        Snd.play('scoppio', { volume: 0.1, rate: 2.2 });
      } else if (p.kind === 'antibiotici') {
        Player.antibiotics += 1;
        UI.toast('Antibiotici raccolti · [H] per usarli');
        Snd.play('scoppio', { volume: 0.08, rate: 2.6 });
      } else if (p.kind === 'lettere') {
        const d = p.data;
        Player.letters.push({ stage: d.stage, title: d.title, body: d.body });
        if (d.stage === 'macro3') Player.codeKnown[d.idx] = d.digit;
        UI.showPaper(d.title, d.body);
        if (d.stage === 'macro4' && Player.letters.filter((l) => l.stage === 'macro4').length === 3) {
          setTimeout(() => UI.say('Tre indizi. Ora la statua dovrebbe avere un senso.'), 600);
        }
      }
      p.taken = true;
      if (p.grp.parent) p.grp.parent.remove(p.grp);
      if (L) p.item.enabled = () => false;
      UI.refresh();
    },

    useDoor() {
      const L = this.level;
      if (!L || !L.door) return;
      if (L.door.mode === 'code') {
        Keypad.open((entry) => {
          if (entry === this.code.join('')) {
            UI.closePanel();
            L.openDoor();
            UI.objective('Attraversa la porta');
            UI.say('Il meccanismo scatta. La porta si apre.');
          } else {
            Keypad.message('CODICE ERRATO');
            Snd.play('scoppio', { volume: 0.35, rate: 1.7 });
            if (this.doctor) this.doctor.hearNoise(L.door.center, 40);
          }
        });
      } else if (!this.zeusSolved) {
        UI.say('La porta è bloccata da un meccanismo. Viene dall’atrio, dalla statua…');
      }
    },

    useZeus(z) {
      const read = Player.letters.filter((l) => l.stage === 'macro4').length;
      if (read < 3) {
        UI.say('Tre simboli incisi sul basamento… Non so in che ordine vadano. Forse lo spiegano le lettere (' + read + '/3).');
        return;
      }
      ZeusPanel.open((seq) => {
        const ok = seq.every((s, n) => s === WARD_SOLUTION[n]);
        if (ok) this.solveZeus(z);
        else {
          ZeusPanel.message('Un boato scuote la sala. Ordine errato.');
          this.level.thunderStrike(0.9);
          Flow.shake(0.8);
          if (this.doctor) this.doctor.hearNoise(z.pos, 70);
        }
      });
    },

    async solveZeus(z) {
      const L = this.level;
      z.solved = true;
      this.zeusSolved = true;
      UI.closePanel();
      UI.objective('Raggiungi l’uscita');
      z.bolt.intensity = PHYS ? 60 : 2;
      L.thunderStrike(1);
      Flow.shake(1);
      Snd.play('scoppio', { volume: 0.7, rate: 0.35 });
      await wait(1100);
      L.openDoor();
      UI.say('Gli occhi di Giove si accendono. In fondo all’atrio, la porta si apre.');
    },

    toggleHide(locker) {
      if (Player.hidden === locker) { this.exitHide(locker); return; }
      const doc = this.doctor;
      if (doc && doc.isChasing() && doc.dist < CONFIG.doctor.lockerFindDist) { UI.toast('Troppo vicino: non fai in tempo a nasconderti!'); return; }
      Player.hidden = locker;
      ctx.camera.rotation.set(0, Math.atan2(locker.fwd.x, locker.fwd.z) + Math.PI, 0, 'YXZ');
      UI.hideSlats(true);
      UI.toast('Sei nascosto — resta in silenzio');
      if (doc) doc.onPlayerHide();
    },

    exitHide(locker) {
      Player.hidden = null;
      UI.hideSlats(false);
      ctx.camera.position.set(locker.out.x, CONFIG.player.eyeHeight, locker.out.z);
      Player.lastPos.copy(ctx.camera.position);
    },

    dragFromLocker(doc) {
      const locker = Player.hidden;
      if (!locker) return;
      this.exitHide(locker);
      UI.say('Ti ha trovato!');
      Snd.play('urlo', { volume: 0.9 });
      Player.damage(CONFIG.doctor.attackDamage + 10);
      doc.lastKnown = ctx.camera.position.clone();
      doc.state = 'chase';
      doc.lostTime = 0;
    },

    /* ----------------------- aggiornamento per frame ----------------------- */
    update(dt) {
      const L = this.level;
      if (!L) return;
      const p = ctx.camera.position;

      const chasing = !!(this.doctor && this.doctor.isChasing());
      if (chasing !== this.chasing) {
        this.chasing = chasing;
        Snd.layer('horror', chasing ? 0.95 : this.baseHorror, chasing ? 0.8 : 4);
        if (this.baseBg > 0) Snd.layer('background', chasing ? this.baseBg * 0.35 : this.baseBg, 1.5);
      }

      if (this.shakeMag > 0.002) {
        this.shakeMag *= Math.exp(-4 * dt);
        ctx.camera.rotation.z = (Math.random() - 0.5) * 0.07 * this.shakeMag;
        ctx.camera.fov = this.baseFov + this.shakeMag * 3;
        ctx.camera.updateProjectionMatrix();
        this.rolled = true;
      } else if (this.rolled) {
        this.rolled = false;
        ctx.camera.rotation.z = 0;
        ctx.camera.fov = this.baseFov;
        ctx.camera.updateProjectionMatrix();
      }

      if (this.busy || this.epilogue || Player.dead) return;
      const t = L.tileOf(p.x, p.z);
      if (this.stage === 'macro3') {
        const doorDistance = horiz(p, L.door.center);
        if (L.doorOpen && doorDistance <= L.tile * 0.58) this.start('macro4');
      } else if (this.stage === 'macro4' && L.doorOpen) {
        const di = L.doorTile[0];
        if (!this.scare && t[0] >= di - 2) this.runScare();
        if (this.scareDone && t[0] >= di) {
          this.epilogue = true;
          Epilogue.run().catch((err) => reportOnce('epilogo finale', err));
        }
      }
    },

    /* ----------------------- jump scare finale ----------------------- */
    async runScare() {
      this.scare = true;
      const L = this.level;
      if (!L) return;
      if (this.doctor) { this.doctor.dispose(); this.doctor = null; }
      Snd.layer('horror', 1, 0.3);
      UI.objective('');
      L.blackout = 1.6;
      let m;
      try {
        m = await Assets.make('mostro', { height: 2.4 });
      } catch (err) {
        reportOnce('creazione mostro finale', err);
      }
      if (!m || this.level !== L) {
        L.blackout = 0;
        this.scareDone = true;
        return;
      }
      const holder = new THREE.Group();
      holder.add(m);
      const door = L.door.center.clone();
      holder.position.copy(door);
      L.root.add(holder);
      await wait(550);
      Snd.play('pinoScream', { volume: 1 });
      Snd.play('scream', { volume: 0.85, delay: 0.08 });
      const cam = ctx.camera;
      const from = door.clone();
      await tween(520, (k) => {
        const e = k * k;
        const to = new V3(cam.position.x, 0, cam.position.z);
        const dir = new V3(from.x - to.x, 0, from.z - to.z).normalize();
        const end = to.clone().addScaledVector(dir, 0.75);
        holder.position.set(lerp(from.x, end.x, e), 0, lerp(from.z, end.z, e));
        holder.rotation.y = yawTo(holder.position, cam.position);
        holder.scale.setScalar(1 + e * 0.18);
      });
      UI.pulse('flash', 1, 450);
      UI.damageFlash(1);
      Flow.shake(1.8);
      await wait(180);
      L.root.remove(holder);
      L.blackout = 0;
      UI.say('…era solo il buio. Esci. Ora.', 3200);
      UI.objective('Esci');
      this.baseHorror = 0.5;
      Snd.layer('horror', 0.5, 2);
      this.scareDone = true;
    },

    /* ----------------------- morte ----------------------- */
    onDeath() {
      if (this.dying) return;
      this.dying = true;
      Player.dead = true;
      UI.closePanel(true);
      UI.hideSlats(false);
      UI.prompt('');
      Snd.fadeOutAll(1.4);
      UI.death(true);
      setTimeout(async () => {
        this.busy = false;
        await this.start(this.stage, { restart: true, quick: true });
        this.dying = false;
      }, 4200);
    }
  };

  function teleportPlayer(pos, yaw) {
    const cam = ctx.camera;
    if (typeof hooks.teleportPlayer === 'function') {
      hooks.teleportPlayer(pos.clone(), yaw);
      Player.lastPos.copy(cam.position);
      return;
    }
    cam.position.set(pos.x, CONFIG.player.eyeHeight, pos.z);
    cam.rotation.set(0, yaw + Math.PI, 0, 'YXZ');
    Player.lastPos.copy(cam.position);
  }

  /* ===========================================================================
   *  17. EPILOGO: porta di fuga → dissolvenza in nero → titoli di coda
   * ========================================================================= */
  const Epilogue = {
    running: false,
    async run() {
      if (this.running) return false;
      this.running = true;
      Flow.epilogue = true;
      try {
        const L = Flow.level;
        if (Flow.doctor) { Flow.doctor.dispose(); Flow.doctor = null; }
        UI.closePanel(true);
        UI.prompt('');
        UI.objective('');
        UI.say('La luce… finalmente.', 3000);
        if (L && L.door) {
          const t = L.door.center.clone().addScaledVector(L.door.outward, 1.6);
          Player.forced = { target: t, speed: 1.15 };
        }
        await wait(1600);
        UI.showHud(false);
        Snd.fadeOutAll(3.2);
        await UI.fade(true, 3.4);
        await wait(400);
        Snd.stopAll();
        Flow.teardown();
        Player.forced = null;
        UI.showCredits();
        return true;
      } catch (err) {
        Flow.epilogue = false;
        Player.forced = null;
        Flow.restoreWorld();
        UI.showHud(Flow.active);
        UI.fade(false, 0.4);
        throw err;
      } finally {
        this.running = false;
      }
    }
  };

  /* ===========================================================================
   *  18. INPUT
   * ========================================================================= */
  function handlePanelKey(e) {
    const panel = UI.panelOpen;
    if (e.code === 'Escape') { UI.closePanel(); return; }
    if (panel === 'paper') { if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') UI.closePanel(); return; }
    if (panel === 'keypad') {
      const m = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
      if (m) Keypad.press(m[1]);
      else if (e.code === 'Backspace') Keypad.del();
      else if (e.code === 'Enter' || e.code === 'NumpadEnter') Keypad.ok();
      return;
    }
    if (panel === 'zeus') {
      if (e.code === 'Digit1' || e.code === 'Numpad1') ZeusPanel.add('aquila');
      else if (e.code === 'Digit2' || e.code === 'Numpad2') ZeusPanel.add('folgore');
      else if (e.code === 'Digit3' || e.code === 'Numpad3') ZeusPanel.add('quercia');
      else if (e.code === 'Backspace') ZeusPanel.reset();
      else if (e.code === 'Enter' || e.code === 'NumpadEnter') ZeusPanel.ok();
    }
  }

  function onKeyDown(e) {
    if (UI.creditsReady) {
      if (CONFIG.credits.restartOnKey) location.reload();
      return;
    }
    if (!Flow.active) return;
    Snd.resume();
    if (UI.panelOpen) {
      handlePanelKey(e);
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (e.repeat || Player.dead || Player.forced) return;
    switch (e.code) {
      case 'KeyE': Interact.use(); break;
      case 'Digit1': Weapons.equip('pompa'); break;
      case 'Digit2': Weapons.equip('ascia'); break;
      case 'KeyH': Player.useAntibiotic(); break;
      case 'KeyN': Notes.open(); break;
      case 'KeyF': Flash.toggle(); break;
      default: break;
    }
  }

  function onMouseDown(e) {
    if (!Flow.active || e.button !== 0) return;
    Snd.resume();
    if (UI.panelOpen) return;
    if (CONFIG.requirePointerLock && !document.pointerLockElement) return;
    Weapons.primary();
  }

  const Notes = {
    open() {
      if (!Player.letters.length) { UI.toast('Non hai ancora raccolto lettere.'); return; }
      const body = Player.letters.map((l) => '— ' + l.title + ' —\n' + l.body).join('\n\n');
      UI.showPaper('Appunti raccolti', body);
    }
  };

  /* ===========================================================================
   *  19. LOOP, INSTALLAZIONE E API PUBBLICA
   * ========================================================================= */
  let lastT = 0;
  function frame() {
    const now = performance.now();
    let dt = (now - lastT) / 1000;
    lastT = now;
    if (!(dt > 0)) dt = 0.016;
    dt = Math.min(dt, 0.1);
    if (!Flow.active) return;
    try {
      Player.update(dt);
      if (Flow.level) Flow.level.update(dt);
      if (Flow.doctor) Flow.doctor.update(dt);
      Weapons.update(dt);
      Interact.update();
      Flow.update(dt);
    } catch (err) {
      reportOnce('errore nel frame', err);
    }
  }

  function installLoop() {
    const r = ctx.renderer;
    if (r.__a34Wrapped) return;
    const original = r.render.bind(r);
    let armed = true;
    r.render = function (s, c) {
      if (armed) { armed = false; frame(); }
      return original(s, c);
    };
    r.__a34Wrapped = true;
    const tick = () => { armed = true; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  function install() {
    if (ctx.installed) return;
    UI.init();
    Snd.init();
    installLoop();
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('mousedown', onMouseDown, true);
    Snd.preload(['shotgun', 'scoppio', 'damage', 'urlo', 'footstepsHospital', 'footsteps', 'background', 'horror']);
    ctx.installed = true;
  }

  function whenReady() {
    return new Promise((resolve) => {
      const attempt = () => {
        if (detectContext() && document.body) { install(); resolve(true); return true; }
        return false;
      };
      if (attempt()) return;
      let tries = 0;
      const iv = setInterval(() => {
        if (attempt() || ++tries > 300) { clearInterval(iv); if (tries > 300) resolve(false); }
      }, 200);
    });
  }

  const API = {
    version: '1.0.0',
    config: CONFIG,
    hooks,
    init(c) {
      if (c) { if (c.scene) ctx.scene = c.scene; if (c.camera) ctx.camera = c.camera; if (c.renderer) ctx.renderer = c.renderer; }
      return whenReady();
    },
    async startMacro3() {
      if (await whenReady()) {
        ensureMacroRendering();
        player.rechargeFlashlight(100);
        return Flow.start('macro3');
      }
      return false;
    },
    async startMacro4() {
      if (await whenReady()) {
        ensureMacroRendering();
        return Flow.start('macro4');
      }
      return false;
    },
    async startEpilogue() {
      if (await whenReady()) {
        ensureMacroRendering();
        return Epilogue.run();
      }
      return false;
    },
    restoreWorld() { Flow.restoreWorld(); },
    get isActive() { return Flow.active || Flow.busy || Flow.epilogue; },
    getRenderDiagnostics() {
      let totalLights = 0;
      let enabledLights = 0;
      if (Flow.level) {
        Flow.level.root.traverse((object) => {
          if (!object.isLight) return;
          totalLights += 1;
          if (object.visible && object.intensity > 0) enabledLights += 1;
        });
      }
      return {
        stage: Flow.stage,
        active: this.isActive,
        cameraAttached: Boolean(ctx.scene && ctx.camera && ctx.camera.parent === ctx.scene),
        cameraPosition: ctx.camera
          ? { x: ctx.camera.position.x, y: ctx.camera.position.y, z: ctx.camera.position.z }
          : null,
        canvasSize: ctx.renderer
          ? { width: ctx.renderer.domElement.width, height: ctx.renderer.domElement.height }
          : null,
        levelAttached: Boolean(Flow.level && Flow.level.root.parent === ctx.scene),
        totalLights,
        enabledLights,
        renderedFrames: ctx.renderer ? ctx.renderer.info.render.frame : 0,
        doorOpen: Boolean(Flow.level && Flow.level.doorOpen),
        zeusSolved: Flow.zeusSolved,
        scareStarted: Flow.scare,
        scareCompleted: Flow.scareDone,
        creditsVisible: Boolean(UI.root && UI.q('credits').classList.contains('on')),
        creditsReady: UI.creditsReady
      };
    },
    get state() { return { stage: Flow.stage, health: Player.health, shells: Player.shells, antibiotics: Player.antibiotics, letters: Player.letters.length }; }
  };
  window.AnatomyMacro34 = API;

  window.addEventListener('anatomy:start', (e) => {
    const d = String(e.detail === undefined ? '' : e.detail).toLowerCase();
    if (d === '3' || d === 'macro3') API.startMacro3();
    else if (d === '4' || d === 'macro4') API.startMacro4();
    else if (d === 'epilogo' || d === 'epilogue') API.startEpilogue();
  });

  whenReady().then((ok) => {
    if (!ok || !CONFIG.autoStartFromUrl) return;
    const m = (new URLSearchParams(location.search).get('macro') || '').toLowerCase();
    if (m === '3') API.startMacro3();
    else if (m === '4') API.startMacro4();
    else if (m === 'epilogo' || m === 'epilogue') API.startEpilogue();
  });
})();

/* ============================================================================
 * ANATOMY — INTEGRAZIONE MACROAREA 2 → MACROAREA 3 → MACROAREA 4 → EPILOGO
 * ----------------------------------------------------------------------------
 * Da incollare in src/main.js SUBITO DOPO la definizione di AnatomyMacro34.
 *
 * ISTRUZIONI D'USO:
 *   1) Dopo aver creato scene, camera e renderer:
 *        AnatomyIntegrations.init({
 *          scene,
 *          camera,
 *          renderer,
 *          container: document.body,
 *          domElement: renderer.domElement
 *        });
 *
 *   2) Quando il dottore (dottore.glb) viene sconfitto in Macroarea 2:
 *        AnatomyIntegrations.onDoctorDefeated();
 *
 *   3) Quando la Macroarea 4 è completata (statua giove_zeus.glb + stealth
 *      armadietto), chiama:
 *        AnatomyIntegrations.onMacro4Completed();
 *      In alternativa puoi chiamare direttamente
 *      AnatomyMacro34.startEpilogue(): il wrapper mostrerà comunque i crediti.
 *
 *   4) Se vuoi agganciare oggetti già presenti nella tua scena (porta,
 *      anomalia, uscita) invece dei placeholder generati:
 *        AnatomyIntegrations.setMacro3ExitObject(mesh);
 *        AnatomyIntegrations.setMacro4ExitObject(mesh);
 *        AnatomyIntegrations.setBloodWallObject(mesh);
 *        AnatomyIntegrations.setKeypadObject(mesh);
 * ========================================================================== */



/* ---------------------------------------------------------------------------
 * 0) CONFIGURAZIONE — modifica solo questi valori per allinearti alla scena
 * ------------------------------------------------------------------------ */
const ANATOMY_CONFIG = {
  keypadCode: '1525',
  bloodCodeText: '15 25',
  totalLetters: 3,
  letterGlyphs: ['A', 'N', 'Y'],

  /* Scritta di sangue sul muro destro della Macroarea 2. */
  bloodWall: {
    position: new THREE.Vector3(8.05, 2.2, 0),
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
    size: new THREE.Vector2(3.2, 1.6)
  },

  /* Keypad 3D accanto alla porta della Macroarea 2. */
  keypadPanel: {
    position: new THREE.Vector3(8.02, 1.4, 2.4),
    rotation: new THREE.Euler(0, -Math.PI / 2, 0),
    size: new THREE.Vector2(0.42, 0.58)
  },

  /* Posizioni delle 3 lettere raccoglibili nel labirinto della Macroarea 3. */
  letterPositions: [
    new THREE.Vector3(-12, 1.4, -8),
    new THREE.Vector3(6, 1.4, 10),
    new THREE.Vector3(14, 1.4, -3)
  ],

  /* Porta / anomalia di fine Macroarea 3. */
  macro3Exit: {
    position: new THREE.Vector3(0, 2.0, -18),
    rotation: new THREE.Euler(0, 0, 0)
  },

  /* Uscita finale della Macroarea 4. */
  macro4Exit: {
    position: new THREE.Vector3(0, 2.0, 0),
    rotation: new THREE.Euler(0, 0, 0)
  },

  interactionDistance: 4.5
};

/* ---------------------------------------------------------------------------
 * 1) BUS EVENTI INTERNO
 * ------------------------------------------------------------------------ */
const AnatomyBus = (() => {
  const registry = new Map();
  return {
    on(eventName, callback) {
      if (!registry.has(eventName)) registry.set(eventName, new Set());
      registry.get(eventName).add(callback);
      return () => registry.get(eventName).delete(callback);
    },
    off(eventName, callback) {
      if (!registry.has(eventName)) return;
      registry.get(eventName).delete(callback);
    },
    emit(eventName, payload) {
      if (!registry.has(eventName)) return;
      for (const callback of Array.from(registry.get(eventName))) {
        try {
          callback(payload);
        } catch (error) {
          console.error(`[AnatomyBus] errore nell'handler di "${eventName}"`, error);
        }
      }
    }
  };
})();

/* ---------------------------------------------------------------------------
 * 2) AUDIO PROCEDURALE (nessun file esterno richiesto)
 * ------------------------------------------------------------------------ */
const AnatomyAudio = (() => {
  let audioContext = null;

  function getContext() {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function playTone(options) {
    const settings = Object.assign(
      {
        frequency: 440,
        endFrequency: null,
        duration: 0.15,
        type: 'sine',
        volume: 0.1,
        attack: 0.005,
        release: 0.08,
        detune: 0
      },
      options || {}
    );

    const context = getContext();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const now = context.currentTime;

    oscillator.type = settings.type;
    oscillator.frequency.setValueAtTime(settings.frequency, now);
    oscillator.detune.setValueAtTime(settings.detune, now);

    if (settings.endFrequency !== null) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, settings.endFrequency),
        now + settings.attack + settings.duration
      );
    }

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(
      settings.volume,
      now + settings.attack
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      now + settings.attack + settings.duration + settings.release
    );

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + settings.attack + settings.duration + settings.release + 0.02);
  }

  function playNoise(options) {
    const settings = Object.assign(
      { duration: 0.35, volume: 0.12, lowpass: 1200, highpass: 120 },
      options || {}
    );

    const context = getContext();
    if (!context) return;

    const sampleRate = context.sampleRate;
    const buffer = context.createBuffer(1, Math.floor(sampleRate * settings.duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index++) {
      data[index] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = settings.lowpass;

    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = settings.highpass;

    const gainNode = context.createGain();
    const now = context.currentTime;
    gainNode.gain.setValueAtTime(settings.volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + settings.duration);

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(context.destination);

    source.start(now);
    source.stop(now + settings.duration);
  }

  return {
    playKeypress() {
      playTone({ frequency: 880, duration: 0.06, type: 'square', volume: 0.05 });
    },
    playKeypadError() {
      playTone({ frequency: 180, endFrequency: 90, duration: 0.35, type: 'sawtooth', volume: 0.09 });
    },
    playKeypadSuccess() {
      playTone({ frequency: 523.25, duration: 0.12, type: 'sine', volume: 0.1 });
      setTimeout(() => playTone({ frequency: 783.99, duration: 0.18, type: 'sine', volume: 0.1 }), 120);
      setTimeout(() => playTone({ frequency: 1046.5, duration: 0.3, type: 'sine', volume: 0.09 }), 260);
    },
    playLetterPickup() {
      playTone({ frequency: 660, endFrequency: 990, duration: 0.22, type: 'triangle', volume: 0.11 });
      playNoise({ duration: 0.18, volume: 0.05, lowpass: 3000 });
    },
    playDoorLocked() {
      playTone({ frequency: 140, endFrequency: 70, duration: 0.5, type: 'sawtooth', volume: 0.1 });
      playNoise({ duration: 0.4, volume: 0.08, lowpass: 500 });
    },
    playReset() {
      playTone({ frequency: 1400, endFrequency: 60, duration: 1.1, type: 'sawtooth', volume: 0.12 });
      playTone({ frequency: 220, endFrequency: 55, duration: 1.3, type: 'square', volume: 0.09, detune: -30 });
      playNoise({ duration: 1.2, volume: 0.16, lowpass: 6000, highpass: 200 });
    },
    playEpilogue() {
      playTone({ frequency: 55, duration: 3.2, type: 'sine', volume: 0.09, attack: 0.6, release: 2.0 });
      playTone({ frequency: 82.41, duration: 3.0, type: 'sine', volume: 0.06, attack: 0.8, release: 2.0 });
    }
  };
})();

/* ---------------------------------------------------------------------------
 * 3) HELPER: TEXTURE GENERATE VIA CANVAS
 * ------------------------------------------------------------------------ */
function createCanvasTexture(width, height, drawCallback) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  drawCallback(context, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  if ('encoding' in texture && THREE.sRGBEncoding !== undefined) {
    texture.encoding = THREE.sRGBEncoding;
  }
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function createBloodCodeTexture(text) {
  return createCanvasTexture(1024, 512, (context, width, height) => {
    context.clearRect(0, 0, width, height);

    const fontFamily = '"Creepster", "Times New Roman", "Georgia", serif';
    const fontSize = 250;

    context.font = `bold ${fontSize}px ${fontFamily}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    /* Alone scuro */
    context.shadowColor = 'rgba(90, 0, 0, 0.95)';
    context.shadowBlur = 60;

    /* Gocce di sangue */
    context.strokeStyle = 'rgba(80, 2, 2, 0.85)';
    context.lineCap = 'round';
    for (let index = 0; index < 26; index++) {
      const startX = 160 + Math.random() * (width - 320);
      const startY = height * 0.52 + Math.random() * 40;
      const length = 30 + Math.random() * 150;
      context.lineWidth = 2 + Math.random() * 6;
      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(startX + (Math.random() * 8 - 4), startY + length);
      context.stroke();

      context.beginPath();
      context.arc(startX, startY + length, 3 + Math.random() * 4, 0, Math.PI * 2);
      context.fillStyle = 'rgba(70, 1, 1, 0.9)';
      context.fill();
    }

    /* Testo principale */
    const gradient = context.createLinearGradient(0, height * 0.2, 0, height * 0.9);
    gradient.addColorStop(0.0, '#8a0404');
    gradient.addColorStop(0.5, '#5c0101');
    gradient.addColorStop(1.0, '#2e0000');
    context.fillStyle = gradient;
    context.fillText(text, width / 2, height / 2);

    /* Contorno irregolare */
    context.shadowBlur = 0;
    context.lineWidth = 4;
    context.strokeStyle = 'rgba(30, 0, 0, 0.75)';
    context.strokeText(text, width / 2, height / 2);
  });
}

function createLetterTexture(glyph) {
  return createCanvasTexture(512, 512, (context, width, height) => {
    context.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    const glowGradient = context.createRadialGradient(centerX, centerY, 20, centerX, centerY, 240);
    glowGradient.addColorStop(0.0, 'rgba(180, 240, 255, 0.55)');
    glowGradient.addColorStop(0.4, 'rgba(90, 180, 220, 0.22)');
    glowGradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    context.fillStyle = glowGradient;
    context.fillRect(0, 0, width, height);

    context.font = 'bold 320px "Georgia", "Times New Roman", serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    context.shadowColor = 'rgba(160, 240, 255, 0.95)';
    context.shadowBlur = 45;
    context.fillStyle = '#eafcff';
    context.fillText(glyph, centerX, centerY);

    context.shadowBlur = 12;
    context.lineWidth = 3;
    context.strokeStyle = 'rgba(90, 200, 255, 0.85)';
    context.strokeText(glyph, centerX, centerY);
  });
}

function createKeypadFaceTexture() {
  return createCanvasTexture(512, 700, (context, width, height) => {
    context.fillStyle = '#111417';
    context.fillRect(0, 0, width, height);

    context.strokeStyle = '#2c3439';
    context.lineWidth = 14;
    context.strokeRect(7, 7, width - 14, height - 14);

    /* Display */
    context.fillStyle = '#050807';
    context.fillRect(60, 40, width - 120, 130);
    context.strokeStyle = '#26302e';
    context.lineWidth = 6;
    context.strokeRect(60, 40, width - 120, 130);
    context.font = 'bold 84px "Courier New", monospace';
    context.fillStyle = 'rgba(120, 255, 200, 0.35)';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('----', width / 2, 108);

    /* Tasti */
    const columns = 3;
    const rows = 4;
    const keyWidth = 110;
    const keyHeight = 92;
    const gapX = 22;
    const gapY = 18;
    const gridWidth = columns * keyWidth + (columns - 1) * gapX;
    const startX = (width - gridWidth) / 2;
    const startY = 220;

    const labels = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['C', '0', 'OK']
    ];

    context.font = 'bold 52px "Courier New", monospace';
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const x = startX + column * (keyWidth + gapX);
        const y = startY + row * (keyHeight + gapY);

        context.fillStyle = '#1c2226';
        context.fillRect(x, y, keyWidth, keyHeight);
        context.strokeStyle = '#333d43';
        context.lineWidth = 5;
        context.strokeRect(x, y, keyWidth, keyHeight);

        context.fillStyle = labels[row][column] === 'OK' ? '#8ce8b8' : '#c7d2d8';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(labels[row][column], x + keyWidth / 2, y + keyHeight / 2 + 2);
      }
    }

    /* LED */
    context.beginPath();
    context.arc(width - 60, 40, 10, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 60, 60, 0.85)';
    context.fill();
  });
}

/* ---------------------------------------------------------------------------
 * 4) HELPER: UTILITÀ VARIE
 * ------------------------------------------------------------------------ */
function getMacro34() {
  if (typeof AnatomyMacro34 !== 'undefined' && AnatomyMacro34) return AnatomyMacro34;
  if (typeof window !== 'undefined' && window.AnatomyMacro34) return window.AnatomyMacro34;
  return null;
}

function disposeObject3D(root) {
  if (!root) return;
  root.traverse((child) => {
    if (child.geometry && typeof child.geometry.dispose === 'function') {
      child.geometry.dispose();
    }
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (material.map && typeof material.map.dispose === 'function') {
          material.map.dispose();
        }
        if (typeof material.dispose === 'function') {
          material.dispose();
        }
      }
    }
  });
  if (root.parent) root.parent.remove(root);
}

function removeChildren(group) {
  if (!group) return;
  for (let index = group.children.length - 1; index >= 0; index--) {
    const child = group.children[index];
    group.remove(child);
    disposeObject3D(child);
  }
}

/* ---------------------------------------------------------------------------
 * 5) GESTORE INTERAZIONI RAYCAST
 * ------------------------------------------------------------------------ */
class AnatomyInteractionManager {
  constructor() {
    this.items = [];
    this.scene = null;
    this.camera = null;
    this.domElement = null;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.active = false;
    this.blocked = false;
    this.boundPointerDown = this.onPointerDown.bind(this);
  }

  attach(dependencies) {
    this.scene = dependencies.scene || null;
    this.camera = dependencies.camera || null;
    this.domElement = dependencies.domElement || window;

    if (!this.active) {
      this.domElement.addEventListener('pointerdown', this.boundPointerDown);
      this.active = true;
    }
  }

  setBlocked(blocked) {
    this.blocked = blocked === true;
  }

  add(descriptor) {
    const item = {
      object: descriptor.object,
      onInteract: descriptor.onInteract || (() => {}),
      maxDistance: descriptor.maxDistance !== undefined ? descriptor.maxDistance : ANATOMY_CONFIG.interactionDistance,
      enabled: descriptor.enabled !== false,
      name: descriptor.name || 'interactable'
    };
    this.items.push(item);
    return item;
  }

  remove(item) {
    const index = this.items.indexOf(item);
    if (index !== -1) this.items.splice(index, 1);
  }

  clear() {
    this.items.length = 0;
  }

  updatePointerFromEvent(event) {
    const pointerLocked = document.pointerLockElement !== null;
    if (pointerLocked) {
      this.pointer.set(0, 0);
      return;
    }

    const element = this.domElement;
    const rect =
      element && typeof element.getBoundingClientRect === 'function'
        ? element.getBoundingClientRect()
        : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;

    this.pointer.x = ((event.clientX - rect.left) / width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / height) * 2 + 1;
  }

  onPointerDown(event) {
    if (this.blocked) return;
    if (!this.camera) return;

    const target = event.target;
    if (target && target.closest && target.closest('#anatomy-keypad-overlay')) return;

    this.updatePointerFromEvent(event);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const candidates = this.items.filter((item) => item.enabled && item.object && item.object.visible);
    if (candidates.length === 0) return;

    const objects = candidates.map((item) => item.object);
    const intersections = this.raycaster.intersectObjects(objects, true);

    if (intersections.length === 0) return;

    for (const intersection of intersections) {
      let node = intersection.object;
      let matchedItem = null;

      while (node && !matchedItem) {
        matchedItem = candidates.find((item) => {
          let current = item.object;
          if (current === node) return true;
          let parent = node;
          while (parent) {
            if (parent === current) return true;
            parent = parent.parent;
          }
          return false;
        });
        node = node.parent;
      }

      if (!matchedItem) continue;

      const distance = intersection.distance;
      if (distance > matchedItem.maxDistance) {
        AnatomyBus.emit('anatomy:too-far', matchedItem);
        continue;
      }

      try {
        matchedItem.onInteract(matchedItem);
      } catch (error) {
        console.error('[AnatomyIntegrations] errore durante l\'interazione', error);
      }
      return;
    }
  }
}

/* ---------------------------------------------------------------------------
 * 6) UI DEL KEYPAD (DOM overlay)
 * ------------------------------------------------------------------------ */
class AnatomyKeypadUI {
  constructor(options) {
    this.onSubmit = options.onSubmit || (() => {});
    this.onClose = options.onClose || (() => {});
    this.requiredCode = options.requiredCode || '1525';
    this.overlay = null;
    this.display = null;
    this.entry = '';
    this.isOpen = false;
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.build();
  }

  build() {
    const overlay = document.createElement('div');
    overlay.id = 'anatomy-keypad-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'none';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.background = 'rgba(0, 0, 0, 0.82)';
    overlay.style.zIndex = '9998';
    overlay.style.fontFamily = '"Courier New", monospace';
    overlay.style.userSelect = 'none';

    const panel = document.createElement('div');
    panel.style.width = '320px';
    panel.style.padding = '22px';
    panel.style.background = 'linear-gradient(180deg, #14181b 0%, #0a0d0f 100%)';
    panel.style.border = '2px solid #2d353a';
    panel.style.borderRadius = '10px';
    panel.style.boxShadow = '0 0 60px rgba(0, 0, 0, 0.9), inset 0 0 30px rgba(0, 0, 0, 0.7)';

    const header = document.createElement('div');
    header.textContent = 'SERRATURA ELETTRONICA';
    header.style.color = '#7a8a91';
    header.style.fontSize = '12px';
    header.style.letterSpacing = '3px';
    header.style.textAlign = 'center';
    header.style.marginBottom = '14px';

    const display = document.createElement('div');
    display.style.height = '64px';
    display.style.background = '#040705';
    display.style.border = '1px solid #233029';
    display.style.borderRadius = '6px';
    display.style.display = 'flex';
    display.style.alignItems = 'center';
    display.style.justifyContent = 'center';
    display.style.fontSize = '38px';
    display.style.letterSpacing = '10px';
    display.style.color = '#7dffc4';
    display.style.textShadow = '0 0 14px rgba(90, 255, 190, 0.6)';
    display.textContent = '----';

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    grid.style.gap = '10px';
    grid.style.marginTop = '18px';

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];
    for (const key of keys) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = key;
      button.dataset.key = key;
      button.style.height = '56px';
      button.style.fontSize = '22px';
      button.style.fontFamily = '"Courier New", monospace';
      button.style.fontWeight = 'bold';
      button.style.color = key === 'OK' ? '#8ce8b8' : '#c7d2d8';
      button.style.background = '#1a2024';
      button.style.border = '1px solid #333d43';
      button.style.borderRadius = '6px';
      button.style.cursor = 'pointer';
      button.style.transition = 'background 120ms ease, transform 80ms ease';
      button.addEventListener('pointerenter', () => {
        button.style.background = '#232b30';
      });
      button.addEventListener('pointerleave', () => {
        button.style.background = '#1a2024';
      });
      button.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
        button.style.transform = 'scale(0.94)';
      });
      button.addEventListener('pointerup', (event) => {
        event.stopPropagation();
        button.style.transform = 'scale(1)';
        this.pressKey(key);
      });
      grid.appendChild(button);
    }

    const hint = document.createElement('div');
    hint.textContent = 'ESC per chiudere';
    hint.style.marginTop = '16px';
    hint.style.textAlign = 'center';
    hint.style.fontSize = '11px';
    hint.style.letterSpacing = '2px';
    hint.style.color = '#4a565c';

    panel.appendChild(header);
    panel.appendChild(display);
    panel.appendChild(grid);
    panel.appendChild(hint);
    overlay.appendChild(panel);

    (document.body || document.documentElement).appendChild(overlay);

    this.overlay = overlay;
    this.display = display;
  }

  updateDisplay() {
    const filled = this.entry.padEnd(4, '-').slice(0, 4);
    this.display.textContent = filled;

    if (this.entry.length > this.requiredCode.length) {
      this.display.style.color = '#ff7676';
    } else {
      this.display.style.color = '#7dffc4';
    }
  }

  pressKey(key) {
    if (!this.isOpen) return;
    AnatomyAudio.playKeypress();

    if (key === 'C') {
      this.entry = '';
      this.updateDisplay();
      return;
    }

    if (key === 'OK') {
      this.submit();
      return;
    }

    if (this.entry.length >= 4) return;
    this.entry += key;
    this.updateDisplay();

    if (this.entry.length === this.requiredCode.length) {
      window.setTimeout(() => this.submit(), 160);
    }
  }

  submit() {
    if (!this.isOpen) return;

    if (this.entry === this.requiredCode) {
      AnatomyAudio.playKeypadSuccess();
      this.display.style.color = '#8ce8b8';
      this.display.style.textShadow = '0 0 24px rgba(120, 255, 190, 0.95)';
      const accepted = this.entry;
      this.close();
      this.onSubmit(accepted);
      return;
    }

    AnatomyAudio.playKeypadError();
    this.display.style.color = '#ff5252';
    this.display.style.textShadow = '0 0 20px rgba(255, 60, 60, 0.9)';

    const overlay = this.overlay;
    if (overlay) {
      overlay.animate(
        [
          { transform: 'translateX(-10px)' },
          { transform: 'translateX(10px)' },
          { transform: 'translateX(-6px)' },
          { transform: 'translateX(6px)' },
          { transform: 'translateX(0)' }
        ],
        { duration: 280, iterations: 1 }
      );
    }

    window.setTimeout(() => {
      this.entry = '';
      this.updateDisplay();
      this.display.style.color = '#7dffc4';
      this.display.style.textShadow = '0 0 14px rgba(90, 255, 190, 0.6)';
    }, 420);
  }

  handleKeyDown(event) {
    if (!this.isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      this.onClose();
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      this.entry = this.entry.slice(0, -1);
      this.updateDisplay();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.submit();
      return;
    }

    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      this.pressKey(event.key);
    }
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.entry = '';
    this.updateDisplay();
    this.display.style.color = '#7dffc4';
    this.display.style.textShadow = '0 0 14px rgba(90, 255, 190, 0.6)';

    const wasLocked = document.pointerLockElement !== null;
    this.pointerWasLocked = wasLocked;
    if (wasLocked && document.exitPointerLock) {
      document.exitPointerLock();
    }

    this.overlay.style.display = 'flex';
    window.addEventListener('keydown', this.boundKeyDown);
    AnatomyAudio.playKeypress();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.overlay.style.display = 'none';
    window.removeEventListener('keydown', this.boundKeyDown);

    if (this.pointerWasLocked) {
      const canvas = document.querySelector('canvas');
      if (canvas && canvas.requestPointerLock) {
        const promise = canvas.requestPointerLock();
        if (promise && typeof promise.catch === 'function') promise.catch(() => {});
      }
      this.pointerWasLocked = false;
    }
  }
}

/* ---------------------------------------------------------------------------
 * 7) CLASSE PRINCIPALE DI INTEGRAZIONE
 * ------------------------------------------------------------------------ */
class AnatomyMacroIntegration {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.container = null;
    this.domElement = null;

    this.interactions = new AnatomyInteractionManager();
    this.keypadUI = null;

    this.bloodWallMesh = null;
    this.keypadMesh = null;
    this.macro3ExitMesh = null;
    this.macro4ExitMesh = null;

    this.macro3Group = new THREE.Group();
    this.macro3Group.name = 'AnatomyMacro3Content';

    this.macro4Group = new THREE.Group();
    this.macro4Group.name = 'AnatomyMacro4Content';

    this.letters = [];
    this.collectedLetters = 0;

    this.bloodWallInteractable = null;
    this.keypadInteractable = null;
    this.macro3ExitInteractable = null;
    this.macro4ExitInteractable = null;

    this.hudElement = null;
    this.toastElement = null;
    this.fadeOverlay = null;
    this.creditsOverlay = null;
    this.resetOverlay = null;

    this.state = {
      initialized: false,
      macro2Completed: false,
      keypadUnlocked: false,
      macro3Active: false,
      lettersCompleted: false,
      macro3ExitTriggered: false,
      macro4Active: false,
      epilogueStarted: false,
      epilogueVisualStarted: false
    };

    this.clock = new THREE.Clock();
    this.animationFrameId = null;
    this.elapsedTime = 0;
  }

  /* ----------------------------------------------------------------------
   * INIZIALIZZAZIONE
   * ------------------------------------------------------------------- */
  init(dependencies) {
    if (this.state.initialized) return;
    const deps = dependencies || {};

    this.scene = deps.scene || null;
    this.camera = deps.camera || null;
    this.renderer = deps.renderer || null;
    this.container = deps.container || document.body;
    this.domElement = deps.domElement || (this.renderer ? this.renderer.domElement : document.body);

    if (!this.scene || !this.camera) {
      console.warn('[AnatomyIntegrations] init chiamato senza scene o camera: le interazioni non funzioneranno.');
    }

    this.interactions.attach({
      scene: this.scene,
      camera: this.camera,
      domElement: this.domElement
    });

    if (this.scene) {
      this.scene.add(this.macro3Group);
      this.scene.add(this.macro4Group);
    }

    this.setupDOM();
    this.wrapMacro34Methods();
    this.startAnimationLoop();

    this.state.initialized = true;
    AnatomyBus.emit('anatomy:initialized', this);
  }

  /* ----------------------------------------------------------------------
   * DOM: HUD, toast, fade, crediti, effetto reset
   * ------------------------------------------------------------------- */
  setupDOM() {
    const host = this.container || document.body;

    /* HUD lettere */
    const hud = document.createElement('div');
    hud.id = 'anatomy-letters-hud';
    hud.style.position = 'fixed';
    hud.style.top = '22px';
    hud.style.right = '26px';
    hud.style.zIndex = '9100';
    hud.style.fontFamily = '"Courier New", monospace';
    hud.style.fontSize = '15px';
    hud.style.letterSpacing = '4px';
    hud.style.color = '#cfd8dc';
    hud.style.textShadow = '0 0 12px rgba(120, 220, 255, 0.45)';
    hud.style.opacity = '0';
    hud.style.transition = 'opacity 400ms ease';
    hud.style.pointerEvents = 'none';
    hud.textContent = 'LETTERE 0 / 3';
    host.appendChild(hud);
    this.hudElement = hud;

    /* Toast */
    const toast = document.createElement('div');
    toast.id = 'anatomy-toast';
    toast.style.position = 'fixed';
    toast.style.left = '50%';
    toast.style.bottom = '12%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.zIndex = '9100';
    toast.style.fontFamily = '"Courier New", monospace';
    toast.style.fontSize = '16px';
    toast.style.letterSpacing = '2px';
    toast.style.color = '#e6f4f7';
    toast.style.background = 'rgba(6, 10, 12, 0.78)';
    toast.style.border = '1px solid rgba(120, 200, 220, 0.25)';
    toast.style.padding = '12px 22px';
    toast.style.borderRadius = '4px';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 300ms ease';
    toast.style.pointerEvents = 'none';
    toast.style.textAlign = 'center';
    toast.style.maxWidth = '70vw';
    host.appendChild(toast);
    this.toastElement = toast;

    /* Fade nero */
    const fade = document.createElement('div');
    fade.id = 'anatomy-fade-overlay';
    fade.style.position = 'fixed';
    fade.style.inset = '0';
    fade.style.background = '#000000';
    fade.style.opacity = '0';
    fade.style.zIndex = '9990';
    fade.style.pointerEvents = 'none';
    fade.style.transition = 'opacity 1800ms ease';
    host.appendChild(fade);
    this.fadeOverlay = fade;

    /* Overlay crediti */
    const credits = document.createElement('div');
    credits.id = 'anatomy-credits-overlay';
    credits.style.position = 'fixed';
    credits.style.inset = '0';
    credits.style.zIndex = '9995';
    credits.style.display = 'flex';
    credits.style.flexDirection = 'column';
    credits.style.alignItems = 'center';
    credits.style.justifyContent = 'center';
    credits.style.background = '#000000';
    credits.style.opacity = '0';
    credits.style.pointerEvents = 'none';
    credits.style.transition = 'opacity 2200ms ease';
    credits.style.fontFamily = '"Courier New", monospace';
    credits.style.color = '#d8e6ea';
    credits.style.textAlign = 'center';

    const title = document.createElement('div');
    title.textContent = 'ANATOMY';
    title.style.fontSize = '64px';
    title.style.letterSpacing = '26px';
    title.style.color = '#f2f7f8';
    title.style.textShadow = '0 0 40px rgba(180, 40, 40, 0.55)';
    title.style.marginBottom = '28px';

    const separator = document.createElement('div');
    separator.style.width = '220px';
    separator.style.height = '1px';
    separator.style.background = 'rgba(180, 200, 210, 0.35)';
    separator.style.marginBottom = '28px';

    const author = document.createElement('div');
    author.textContent = 'Sviluppato da Samuele Ian Puppulin';
    author.style.fontSize = '18px';
    author.style.letterSpacing = '5px';
    author.style.color = '#b7c6cc';

    const footer = document.createElement('div');
    footer.textContent = 'Grazie per aver giocato.';
    footer.style.marginTop = '46px';
    footer.style.fontSize = '13px';
    footer.style.letterSpacing = '4px';
    footer.style.color = '#5f7178';

    credits.appendChild(title);
    credits.appendChild(separator);
    credits.appendChild(author);
    credits.appendChild(footer);
    host.appendChild(credits);
    this.creditsOverlay = credits;

    /* Overlay effetto reset */
    const reset = document.createElement('div');
    reset.id = 'anatomy-reset-overlay';
    reset.style.position = 'fixed';
    reset.style.inset = '0';
    reset.style.zIndex = '9988';
    reset.style.pointerEvents = 'none';
    reset.style.opacity = '0';
    reset.style.background =
      'repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 4px)';
    reset.style.mixBlendMode = 'screen';
    host.appendChild(reset);
    this.resetOverlay = reset;
  }

  /* ----------------------------------------------------------------------
   * TOAST
   * ------------------------------------------------------------------- */
  showToast(message, duration) {
    if (!this.toastElement) return;
    const millis = duration || 2200;
    this.toastElement.textContent = message;
    this.toastElement.style.opacity = '1';

    if (this.toastTimeoutId) window.clearTimeout(this.toastTimeoutId);
    this.toastTimeoutId = window.setTimeout(() => {
      this.toastElement.style.opacity = '0';
    }, millis);
  }

  /* ----------------------------------------------------------------------
   * WRAP DEI METODI DI AnatomyMacro34
   * ------------------------------------------------------------------- */
  wrapMacro34Methods() {
    const macro = getMacro34();
    if (!macro) {
      console.warn('[AnatomyIntegrations] AnatomyMacro34 non trovato: nessun wrap eseguito.');
      return;
    }

    this.wrapMethod(macro, 'startMacro3', () => {
      this.state.macro3Active = true;
      this.setupMacro3Content();
    });

    this.wrapMethod(macro, 'startMacro4', () => {
      this.state.macro4Active = true;
      this.cleanupMacro3Content();
      this.setupMacro4Content();
    });

    this.wrapMethod(macro, 'startEpilogue', () => {
      this.playEpilogueSequence();
    });
  }

  wrapMethod(target, methodName, afterCallback) {
    if (!target || typeof target[methodName] !== 'function') {
      console.warn(`[AnatomyIntegrations] metodo ${methodName} non presente su AnatomyMacro34.`);
      return false;
    }

    if (target[methodName].__anatomyWrapped === true) return true;

    const original = target[methodName].bind(target);

    const wrapped = function (...args) {
      let result;
      try {
        result = original(...args);
      } catch (error) {
        console.error(`[AnatomyIntegrations] errore in AnatomyMacro34.${methodName}`, error);
        throw error;
      }

      if (result && typeof result.then === 'function') {
        result.then((completed) => {
          if (completed !== false) return afterCallback(...args);
        }).catch((error) => {
          console.error(`[AnatomyIntegrations] errore asincrono in AnatomyMacro34.${methodName}`, error);
        });
      } else {
        try {
          afterCallback(...args);
        } catch (error) {
          console.error(`[AnatomyIntegrations] errore nel post-${methodName}`, error);
        }
      }

      return result;
    };

    wrapped.__anatomyWrapped = true;
    target[methodName] = wrapped;
    return true;
  }

  /* ----------------------------------------------------------------------
   * MACROAREA 2 — SCONFITTA DEL DOTTOR
   * ------------------------------------------------------------------- */
  onDoctorDefeated() {
    if (this.state.macro2Completed) return;
    this.state.macro2Completed = true;

    this.setupMacro2Content();
    this.showToast('Il dottore è caduto. Qualcosa è comparso sul muro.', 3200);
    AnatomyBus.emit('anatomy:macro2-completed');
  }

  setupMacro2Content() {
    if (!this.scene) return;
    if (this.bloodWallMesh && this.keypadMesh) return;

    /* Scritta di sangue */
    if (!this.bloodWallMesh) {
      const texture = createBloodCodeTexture(ANATOMY_CONFIG.bloodCodeText);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        opacity: 0
      });

      const geometry = new THREE.PlaneGeometry(
        ANATOMY_CONFIG.bloodWall.size.x,
        ANATOMY_CONFIG.bloodWall.size.y
      );

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(ANATOMY_CONFIG.bloodWall.position);
      mesh.rotation.copy(ANATOMY_CONFIG.bloodWall.rotation);
      mesh.name = 'AnatomyBloodCode';
      mesh.renderOrder = 2;
      this.scene.add(mesh);
      this.bloodWallMesh = mesh;

      /* Fade-in della scritta */
      const startTime = performance.now();
      const fadeDuration = 1600;
      const fadeIn = () => {
        const progress = Math.min(1, (performance.now() - startTime) / fadeDuration);
        material.opacity = progress;
        if (progress < 1) {
          requestAnimationFrame(fadeIn);
        }
      };
      requestAnimationFrame(fadeIn);
    }

    /* Keypad 3D */
    if (!this.keypadMesh) {
      const keypadTexture = createKeypadFaceTexture();
      const keypadMaterial = new THREE.MeshStandardMaterial({
        map: keypadTexture,
        emissive: new THREE.Color(0x0b3d2a),
        emissiveMap: keypadTexture,
        emissiveIntensity: 0.9,
        roughness: 0.65,
        metalness: 0.35
      });

      const keypadGeometry = new THREE.PlaneGeometry(
        ANATOMY_CONFIG.keypadPanel.size.x,
        ANATOMY_CONFIG.keypadPanel.size.y
      );

      const keypad = new THREE.Mesh(keypadGeometry, keypadMaterial);
      keypad.position.copy(ANATOMY_CONFIG.keypadPanel.position);
      keypad.rotation.copy(ANATOMY_CONFIG.keypadPanel.rotation);
      keypad.name = 'AnatomyKeypad';
      keypad.visible = false;
      this.scene.add(keypad);
      this.keypadMesh = keypad;
    }

    this.keypadInteractable = this.interactions.add({
      object: this.keypadMesh,
      name: 'keypad',
      maxDistance: ANATOMY_CONFIG.interactionDistance,
      enabled: false,
      onInteract: () => this.openKeypad()
    });

    this.bloodWallInteractable = this.interactions.add({
      object: this.bloodWallMesh,
      name: 'blood-code',
      maxDistance: ANATOMY_CONFIG.interactionDistance,
      enabled: true,
      onInteract: () => {
        this.showToast('Sul muro: 15 25', 2400);
      }
    });

    /* Il keypad diventa utilizzabile poco dopo la comparsa della scritta */
    window.setTimeout(() => {
      if (this.keypadMesh) {
        this.keypadMesh.visible = true;
      }
      if (this.keypadInteractable) {
        this.keypadInteractable.enabled = true;
      }
    }, 1500);
  }

  setBloodWallObject(object3D) {
    if (this.bloodWallInteractable) {
      this.interactions.remove(this.bloodWallInteractable);
      this.bloodWallInteractable = null;
    }
    if (this.bloodWallMesh && this.bloodWallMesh.parent) {
      this.bloodWallMesh.parent.remove(this.bloodWallMesh);
    }
    this.bloodWallMesh = object3D;

    if (object3D) {
      this.bloodWallInteractable = this.interactions.add({
        object: object3D,
        name: 'blood-code',
        maxDistance: ANATOMY_CONFIG.interactionDistance,
        enabled: true,
        onInteract: () => this.showToast('Sul muro: 15 25', 2400)
      });
    }
  }

  setKeypadObject(object3D) {
    if (this.keypadInteractable) {
      this.interactions.remove(this.keypadInteractable);
      this.keypadInteractable = null;
    }
    if (this.keypadMesh && this.keypadMesh.parent) {
      this.keypadMesh.parent.remove(this.keypadMesh);
    }
    this.keypadMesh = object3D;

    if (object3D) {
      this.keypadInteractable = this.interactions.add({
        object: object3D,
        name: 'keypad',
        maxDistance: ANATOMY_CONFIG.interactionDistance,
        enabled: true,
        onInteract: () => this.openKeypad()
      });
    }
  }

  /* ----------------------------------------------------------------------
   * KEYPAD — APERTURA E VERIFICA CODICE
   * ------------------------------------------------------------------- */
  openKeypad() {
    this.interactions.setBlocked(false);
    this.state.keypadUnlocked = true;
    this.runMacroTransition('startMacro3', () => {
      this.state.macro3Active = true;
      this.setupMacro3Content();
    });
  }

  async runMacroTransition(methodName, fallback) {
    const macro = getMacro34();
    try {
      if (macro && typeof macro[methodName] === 'function') {
      const completed = await macro[methodName]();
      if (completed !== false) return;
      }
    } catch (error) {
      console.error(`[AnatomyIntegrations] errore in ${methodName}`, error);
    }

    try {
      fallback();
    } catch (error) {
      console.error(`[AnatomyIntegrations] errore nel fallback di ${methodName}`, error);
    }
  }

  /* ----------------------------------------------------------------------
   * MACROAREA 3 — LETTERE E USCITA
   * ------------------------------------------------------------------- */
  setupMacro3Content() {
    if (!this.scene) return;

    this.cleanupMacro3Content();

    this.collectedLetters = 0;
    this.state.lettersCompleted = false;
    this.state.macro3ExitTriggered = false;

    /* Lettere */
    for (let index = 0; index < ANATOMY_CONFIG.totalLetters; index++) {
      const glyph = ANATOMY_CONFIG.letterGlyphs[index] || String(index + 1);
      const position = ANATOMY_CONFIG.letterPositions[index] || new THREE.Vector3(index * 3, 1.4, 0);
      const letterEntry = this.createLetter(index, glyph, position);
      this.letters.push(letterEntry);
      this.macro3Group.add(letterEntry.group);
    }

    /* Uscita / anomalia */
    this.createMacro3Exit();

    /* HUD */
    if (this.hudElement) {
      this.hudElement.style.opacity = '1';
      this.updateLetterHUD();
    }

    this.showToast('Trova le tre lettere. Solo allora il sigillo si spezzerà.', 3600);
    AnatomyBus.emit('anatomy:macro3-started');
  }

  createLetter(index, glyph, position) {
    const group = new THREE.Group();
    group.position.copy(position);
    group.name = `AnatomyLetter_${index}`;

    const texture = createLetterTexture(glyph);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0.95
    });

    const geometry = new THREE.PlaneGeometry(1.1, 1.1);
    const plane = new THREE.Mesh(geometry, material);
    plane.name = `AnatomyLetterPlane_${index}`;
    group.add(plane);

    /* Bagliore volumetrico approssimato con uno sprite aggiuntivo */
    const haloTexture = createCanvasTexture(256, 256, (context, width, height) => {
      const gradient = context.createRadialGradient(width / 2, height / 2, 8, width / 2, height / 2, width / 2);
      gradient.addColorStop(0.0, 'rgba(140, 230, 255, 0.55)');
      gradient.addColorStop(0.35, 'rgba(80, 170, 220, 0.22)');
      gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    });

    const haloMaterial = new THREE.SpriteMaterial({
      map: haloTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.75
    });

    const halo = new THREE.Sprite(haloMaterial);
    halo.scale.set(2.2, 2.2, 1);
    group.add(halo);

    const baseY = position.y;
    const phase = Math.random() * Math.PI * 2;

    const entry = {
      index,
      glyph,
      group,
      plane,
      halo,
      material,
      haloMaterial,
      baseY,
      phase,
      collected: false
    };

    const interactable = this.interactions.add({
      object: group,
      name: `letter-${index}`,
      maxDistance: ANATOMY_CONFIG.interactionDistance,
      enabled: true,
      onInteract: () => this.collectLetter(entry)
    });

    entry.interactable = interactable;
    return entry;
  }

  collectLetter(entry) {
    if (!entry || entry.collected) return;
    entry.collected = true;

    this.collectedLetters = Math.min(
      ANATOMY_CONFIG.totalLetters,
      this.collectedLetters + 1
    );

    if (entry.interactable) {
      entry.interactable.enabled = false;
      this.interactions.remove(entry.interactable);
    }

    AnatomyAudio.playLetterPickup();

    /* Animazione di raccolta: la lettera si dissolve verso l'alto */
    const startTime = performance.now();
    const duration = 520;
    const startScale = entry.group.scale.x;
    const startY = entry.group.position.y;

    const animatePickup = () => {
      const progress = Math.min(1, (performance.now() - startTime) / duration);
      entry.group.scale.setScalar(startScale * (1 + progress * 0.6));
      entry.group.position.y = startY + progress * 0.9;
      if (entry.material) entry.material.opacity = 1 - progress;
      if (entry.haloMaterial) entry.haloMaterial.opacity = 0.75 * (1 - progress);

      if (progress < 1) {
        requestAnimationFrame(animatePickup);
      } else {
        entry.group.visible = false;
        if (entry.group.parent) entry.group.parent.remove(entry.group);
        disposeObject3D(entry.group);
      }
    };
    requestAnimationFrame(animatePickup);

    this.updateLetterHUD();

    if (this.collectedLetters >= ANATOMY_CONFIG.totalLetters) {
      this.state.lettersCompleted = true;
      this.onAllLettersCollected();
    } else {
      this.showToast(`Lettera ${this.collectedLetters} / ${ANATOMY_CONFIG.totalLetters}`, 1500);
    }

    AnatomyBus.emit('anatomy:letter-collected', {
      index: entry.index,
      glyph: entry.glyph,
      total: this.collectedLetters
    });
  }

  onAllLettersCollected() {
    this.showToast('SIGILLO COMPLETO. La soglia è aperta.', 3200);

    if (this.macro3ExitMesh) {
      const material = this.macro3ExitMesh.material;
      if (material && material.emissive) {
        material.emissive.setHex(0x2fbf7a);
        material.emissiveIntensity = 1.4;
      }
      if (material && material.color) {
        material.color.setHex(0x1f8a58);
      }
    }

    AnatomyBus.emit('anatomy:letters-completed');
  }

  updateLetterHUD() {
    if (!this.hudElement) return;
    this.hudElement.textContent = `LETTERE ${this.collectedLetters} / ${ANATOMY_CONFIG.totalLetters}`;
  }

  createMacro3Exit() {
    const geometry = new THREE.PlaneGeometry(2.6, 3.6);

    const material = new THREE.MeshStandardMaterial({
      color: 0x141a1d,
      emissive: new THREE.Color(0x1b2b30),
      emissiveIntensity: 0.8,
      roughness: 0.4,
      metalness: 0.6,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(ANATOMY_CONFIG.macro3Exit.position);
    mesh.rotation.copy(ANATOMY_CONFIG.macro3Exit.rotation);
    mesh.name = 'AnatomyMacro3Exit';
    this.macro3Group.add(mesh);
    this.macro3ExitMesh = mesh;

    this.macro3ExitInteractable = this.interactions.add({
      object: mesh,
      name: 'macro3-exit',
      maxDistance: ANATOMY_CONFIG.interactionDistance + 1.5,
      enabled: true,
      onInteract: () => this.handleMacro3ExitInteract()
    });
  }

  setMacro3ExitObject(object3D) {
    if (this.macro3ExitInteractable) {
      this.interactions.remove(this.macro3ExitInteractable);
      this.macro3ExitInteractable = null;
    }
    if (this.macro3ExitMesh && this.macro3ExitMesh.parent) {
      this.macro3ExitMesh.parent.remove(this.macro3ExitMesh);
    }
    this.macro3ExitMesh = object3D;

    if (object3D) {
      this.macro3ExitInteractable = this.interactions.add({
        object: object3D,
        name: 'macro3-exit',
        maxDistance: ANATOMY_CONFIG.interactionDistance + 1.5,
        enabled: true,
        onInteract: () => this.handleMacro3ExitInteract()
      });
    }
  }

  handleMacro3ExitInteract() {
    if (this.state.macro3ExitTriggered) return;

    if (!this.state.lettersCompleted) {
      AnatomyAudio.playDoorLocked();
      this.showToast('Il sigillo è incompleto. Tre lettere ti mancano.', 2600);
      AnatomyBus.emit('anatomy:macro3-exit-locked');
      return;
    }

    this.state.macro3ExitTriggered = true;

    if (this.macro3ExitInteractable) {
      this.macro3ExitInteractable.enabled = false;
    }

    this.playResetEffect(() => {
      this.runMacroTransition('startMacro4', () => {
        this.state.macro4Active = true;
        this.cleanupMacro3Content();
        this.setupMacro4Content();
      });
    });
  }

  cleanupMacro3Content() {
    for (const entry of this.letters) {
      if (entry.interactable) this.interactions.remove(entry.interactable);
      if (entry.group && entry.group.parent) entry.group.parent.remove(entry.group);
      disposeObject3D(entry.group);
    }
    this.letters.length = 0;

    if (this.macro3ExitInteractable) {
      this.interactions.remove(this.macro3ExitInteractable);
      this.macro3ExitInteractable = null;
    }

    removeChildren(this.macro3Group);
    this.macro3ExitMesh = null;

    if (this.hudElement) {
      this.hudElement.style.opacity = '0';
    }
  }

  /* ----------------------------------------------------------------------
   * EFFETTO RESET VISIVO + SONORO
   * ------------------------------------------------------------------- */
  playResetEffect(onComplete) {
    AnatomyAudio.playReset();

    const overlay = this.resetOverlay;
    let shakeFrame = 0;
    const shakeContainer = this.renderer ? this.renderer.domElement : null;

    if (overlay) {
      overlay.style.transition = 'none';
      overlay.style.opacity = '1';

      const startTime = performance.now();
      const duration = 1200;

      const animateOverlay = () => {
        const progress = Math.min(1, (performance.now() - startTime) / duration);
        const flicker = Math.random() * 0.6 + 0.4;
        overlay.style.opacity = String((1 - progress) * flicker);
        overlay.style.transform = `translate(${(Math.random() - 0.5) * 24}px, ${(Math.random() - 0.5) * 24}px)`;

        if (shakeContainer) {
          shakeFrame++;
          const intensity = (1 - progress) * 10;
          shakeContainer.style.transform = `translate(${(Math.random() - 0.5) * intensity}px, ${(Math.random() - 0.5) * intensity}px)`;
        }

        if (progress < 1) {
          requestAnimationFrame(animateOverlay);
        } else {
          overlay.style.opacity = '0';
          overlay.style.transform = 'translate(0, 0)';
          if (shakeContainer) {
            shakeContainer.style.transform = 'translate(0, 0)';
          }
          if (typeof onComplete === 'function') onComplete();
        }
      };

      requestAnimationFrame(animateOverlay);
    } else {
      window.setTimeout(() => {
        if (typeof onComplete === 'function') onComplete();
      }, 900);
    }

    AnatomyBus.emit('anatomy:reset-effect');
  }

  /* ----------------------------------------------------------------------
   * MACROAREA 4 — USCITA FINALE
   * ------------------------------------------------------------------- */
  setupMacro4Content() {
    if (!this.scene) return;

    this.cleanupMacro4Content();

    const geometry = new THREE.PlaneGeometry(2.4, 3.4);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1216,
      emissive: new THREE.Color(0x3a0a12),
      emissiveIntensity: 0.9,
      roughness: 0.5,
      metalness: 0.4,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(ANATOMY_CONFIG.macro4Exit.position);
    mesh.rotation.copy(ANATOMY_CONFIG.macro4Exit.rotation);
    mesh.name = 'AnatomyMacro4Exit';
    this.macro4Group.add(mesh);
    this.macro4ExitMesh = mesh;

    this.macro4ExitInteractable = this.interactions.add({
      object: mesh,
      name: 'macro4-exit',
      maxDistance: ANATOMY_CONFIG.interactionDistance + 1.5,
      enabled: true,
      onInteract: () => this.onMacro4Completed()
    });

    this.showToast('L\'uscita è davanti a te.', 2400);
    AnatomyBus.emit('anatomy:macro4-started');
  }

  setMacro4ExitObject(object3D) {
    if (this.macro4ExitInteractable) {
      this.interactions.remove(this.macro4ExitInteractable);
      this.macro4ExitInteractable = null;
    }
    if (this.macro4ExitMesh && this.macro4ExitMesh.parent) {
      this.macro4ExitMesh.parent.remove(this.macro4ExitMesh);
    }
    this.macro4ExitMesh = object3D;

    if (object3D) {
      this.macro4ExitInteractable = this.interactions.add({
        object: object3D,
        name: 'macro4-exit',
        maxDistance: ANATOMY_CONFIG.interactionDistance + 1.5,
        enabled: true,
        onInteract: () => this.onMacro4Completed()
      });
    }
  }

  cleanupMacro4Content() {
    if (this.macro4ExitInteractable) {
      this.interactions.remove(this.macro4ExitInteractable);
      this.macro4ExitInteractable = null;
    }
    removeChildren(this.macro4Group);
    this.macro4ExitMesh = null;
  }

  /* ----------------------------------------------------------------------
   * MACROAREA 4 COMPLETATA → EPILOGO
   * ------------------------------------------------------------------- */
  onMacro4Completed() {
    if (this.state.epilogueStarted) return;
    this.state.epilogueStarted = true;

    if (this.macro4ExitInteractable) {
      this.macro4ExitInteractable.enabled = false;
      this.interactions.remove(this.macro4ExitInteractable);
    }

    AnatomyBus.emit('anatomy:macro4-completed');

    this.runMacroTransition('startEpilogue', () => {
      this.playEpilogueSequence();
    });
  }

  playEpilogueSequence() {
    if (this.state.epilogueVisualStarted) return;
    this.state.epilogueVisualStarted = true;
    this.state.epilogueStarted = true;

    AnatomyAudio.playEpilogue();
    this.interactions.setBlocked(true);

    if (this.hudElement) this.hudElement.style.opacity = '0';
    if (this.toastElement) this.toastElement.style.opacity = '0';

    if (this.fadeOverlay) {
      this.fadeOverlay.style.pointerEvents = 'auto';
      this.fadeOverlay.style.opacity = '1';
    }

    window.setTimeout(() => {
      if (this.creditsOverlay) {
        this.creditsOverlay.style.pointerEvents = 'auto';
        this.creditsOverlay.style.opacity = '1';
      }
      AnatomyBus.emit('anatomy:credits-shown');
    }, 2000);

    AnatomyBus.emit('anatomy:epilogue-started');
  }

  /* ----------------------------------------------------------------------
   * LOOP DI ANIMAZIONE
   * ------------------------------------------------------------------- */
  startAnimationLoop() {
    if (this.animationFrameId !== null) return;

    this.clock.start();
    const tick = () => {
      this.animationFrameId = requestAnimationFrame(tick);
      const delta = Math.min(this.clock.getDelta(), 0.1);
      this.elapsedTime += delta;
      this.update(delta);
    };
    tick();
  }

  update(delta) {
    for (const entry of this.letters) {
      if (!entry || entry.collected || !entry.group || !entry.group.visible) continue;

      const bob = Math.sin(this.elapsedTime * 1.6 + entry.phase) * 0.18;
      entry.group.position.y = entry.baseY + bob;
      entry.group.rotation.y += delta * 0.9;

      if (entry.haloMaterial) {
        entry.haloMaterial.opacity = 0.55 + Math.sin(this.elapsedTime * 2.4 + entry.phase) * 0.2;
      }
    }

    if (this.macro3ExitMesh && this.macro3ExitMesh.material && this.macro3ExitMesh.material.emissiveIntensity !== undefined) {
      const pulse = this.state.lettersCompleted
        ? 1.2 + Math.sin(this.elapsedTime * 3.4) * 0.5
        : 0.7 + Math.sin(this.elapsedTime * 1.4) * 0.15;
      this.macro3ExitMesh.material.emissiveIntensity = pulse;
    }

    if (this.macro4ExitMesh && this.macro4ExitMesh.material && this.macro4ExitMesh.material.emissiveIntensity !== undefined) {
      this.macro4ExitMesh.material.emissiveIntensity = 0.9 + Math.sin(this.elapsedTime * 2.0) * 0.35;
    }

    if (this.keypadMesh && this.keypadMesh.material) {
      this.keypadMesh.material.emissiveIntensity = 0.7 + Math.sin(this.elapsedTime * 1.8) * 0.25;
    }
  }

  /* ----------------------------------------------------------------------
   * UTILITÀ PUBBLICHE
   * ------------------------------------------------------------------- */
  isKeypadOpen() {
    return this.keypadUI ? this.keypadUI.isOpen : false;
  }

  forceCloseKeypad() {
    if (this.keypadUI) {
      this.keypadUI.close();
      this.interactions.setBlocked(false);
    }
  }

  getState() {
    return Object.assign({}, this.state, {
      collectedLetters: this.collectedLetters
    });
  }

  dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.cleanupMacro3Content();
    this.cleanupMacro4Content();
    this.interactions.clear();

    const domElements = [
      this.hudElement,
      this.toastElement,
      this.fadeOverlay,
      this.creditsOverlay,
      this.resetOverlay,
      this.keypadUI ? this.keypadUI.overlay : null
    ];

    for (const element of domElements) {
      if (element && element.parentNode) element.parentNode.removeChild(element);
    }

    if (this.bloodWallMesh) disposeObject3D(this.bloodWallMesh);
    if (this.keypadMesh) disposeObject3D(this.keypadMesh);

    this.state.initialized = false;
  }
}

/* ---------------------------------------------------------------------------
 * 8) ISTANZA ESPOSTA
 * ------------------------------------------------------------------------ */
const AnatomyIntegrations = new AnatomyMacroIntegration();

if (typeof window !== 'undefined') {
  window.AnatomyIntegrations = AnatomyIntegrations;
  window.AnatomyBus = AnatomyBus;
  window.AnatomyAudio = AnatomyAudio;
  window.ANATOMY_CONFIG = ANATOMY_CONFIG;
  }