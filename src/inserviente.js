import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let inservienteGroup;
let peripheralApparitionGroup;
let chaseActive = false;
let apparitionRemaining = 0;
const enemyDirection = new THREE.Vector3();
const cameraDirection = new THREE.Vector3();
const apparitionRight = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);
const followTarget = new THREE.Vector3();
const gazeOrigin = new THREE.Vector3();
const gazeTarget = new THREE.Vector3();
const gazeDirection = new THREE.Vector3();
const gazeRaycaster = new THREE.Raycaster();
const inservienteHeight = 2.2;
const hiddenFollowDistance = 8;

export function createInserviente(scene) {
    inservienteGroup = new THREE.Group();
    inservienteGroup.name = 'inservienteGroup';
    inservienteGroup.position.set(0, 0, -25);
    inservienteGroup.visible = false;

    scene.add(inservienteGroup);
    peripheralApparitionGroup = new THREE.Group();
    peripheralApparitionGroup.name = 'inservientePeripheralApparition';
    peripheralApparitionGroup.visible = false;
    scene.add(peripheralApparitionGroup);

    const loader = new GLTFLoader();
    const modelUrl = new URL('../models/mostro.glb', import.meta.url).href;
    loader.load(
        modelUrl,
        (gltf) => {
            const model = gltf.scene;
            model.name = 'inservienteModel';
            model.traverse((object) => {
                if (object.isMesh) {
                    object.frustumCulled = true;
                    object.castShadow = false;
                }
            });

            const originalBounds = new THREE.Box3().setFromObject(model);
            const originalSize = originalBounds.getSize(new THREE.Vector3());
            if (originalSize.y <= 0) {
                console.error(`Il modello dell’Inserviente non ha un’altezza valida: ${modelUrl}`);
                return;
            }

            model.scale.multiplyScalar(inservienteHeight / originalSize.y);
            const bounds = new THREE.Box3().setFromObject(model);
            const center = bounds.getCenter(new THREE.Vector3());
            model.position.set(-center.x, -bounds.min.y, -center.z);
            inservienteGroup.add(model);
            const apparitionModel = model.clone(true);
            apparitionModel.traverse((object) => {
                if (object.isMesh) object.frustumCulled = true;
            });
            peripheralApparitionGroup.add(apparitionModel);
        },
        undefined,
        (error) => console.error(`Impossibile caricare il modello dell’Inserviente (${modelUrl}):`, error)
    );

    return inservienteGroup;
}

export function triggerPeripheralApparition(playerPos, camera, side) {
    if (!inservienteGroup || !peripheralApparitionGroup) {
        throw new Error('Crea l’Inserviente con createInserviente(scene) prima di avviare un’apparizione.');
    }
    if (side !== -1 && side !== 1) {
        throw new RangeError('Il lato dell’apparizione deve essere -1 o 1.');
    }
    if (chaseActive || inservienteGroup.visible || apparitionRemaining > 0) return false;

    camera.getWorldDirection(cameraDirection);
    apparitionRight.crossVectors(cameraDirection, worldUp).normalize();
    peripheralApparitionGroup.position.copy(playerPos)
        .addScaledVector(apparitionRight, side * 2.3)
        .addScaledVector(cameraDirection, 2.4);
    peripheralApparitionGroup.position.y = 0;
    const dx = playerPos.x - peripheralApparitionGroup.position.x;
    const dz = playerPos.z - peripheralApparitionGroup.position.z;
    peripheralApparitionGroup.rotation.y = Math.atan2(dx, dz);
    peripheralApparitionGroup.visible = true;
    apparitionRemaining = 1;
    return true;
}

export function startInservienteChase(playerPos) {
    if (!inservienteGroup) {
        throw new Error('Crea l’Inserviente con createInserviente(scene) prima di avviare l’inseguimento.');
    }
    if (chaseActive) return;

    chaseActive = true;
    inservienteGroup.position.set(playerPos.x, 0, playerPos.z + 11);
    inservienteGroup.visible = false;
}

export function revealInserviente(playerPos, camera, distance = 3) {
    if (!inservienteGroup) {
        throw new Error('Crea l’Inserviente con createInserviente(scene) prima di rivelarlo.');
    }
    if (!chaseActive) return;

    if (playerPos && camera) {
        camera.getWorldDirection(cameraDirection);
        const horizontalLength = Math.hypot(cameraDirection.x, cameraDirection.z) || 1;
        inservienteGroup.position.set(
            THREE.MathUtils.clamp(
                playerPos.x + cameraDirection.x / horizontalLength * distance,
                -4.8,
                4.8
            ),
            0,
            playerPos.z + cameraDirection.z / horizontalLength * distance
        );
    }
    inservienteGroup.visible = true;
}

export function updateInserviente(playerPos, delta = 1 / 60, camera, movementDelta) {
    if (!inservienteGroup) {
        throw new Error('Crea l’Inserviente con createInserviente(scene) prima di aggiornarlo.');
    }
    const frameDelta = Math.min(delta, 0.05);
    if (apparitionRemaining > 0) {
        apparitionRemaining = Math.max(0, apparitionRemaining - frameDelta);
        if (apparitionRemaining === 0) peripheralApparitionGroup.visible = false;
    }
    if (!chaseActive) return;

    let isLookingAtEnemy = false;
    if (camera) {
        camera.getWorldDirection(cameraDirection);
        enemyDirection.set(
            inservienteGroup.position.x - playerPos.x,
            0,
            inservienteGroup.position.z - playerPos.z
        ).normalize();
        isLookingAtEnemy = cameraDirection.x * enemyDirection.x
            + cameraDirection.z * enemyDirection.z > 0.45;
    }

    if (inservienteGroup.visible && isLookingAtEnemy) {
        return;
    }

    followTarget.copy(playerPos);
    if (camera && inservienteGroup.visible) {
        camera.getWorldDirection(cameraDirection);
        const horizontalLength = Math.hypot(cameraDirection.x, cameraDirection.z) || 1;
        followTarget.x -= cameraDirection.x / horizontalLength * 1.4;
        followTarget.z -= cameraDirection.z / horizontalLength * 1.4;
    } else {
        followTarget.z += hiddenFollowDistance;
    }
    const dxToTarget = followTarget.x - inservienteGroup.position.x;
    const dzToTarget = followTarget.z - inservienteGroup.position.z;
    const targetDistance = Math.hypot(dxToTarget, dzToTarget);
    const followSpeed = inservienteGroup.visible ? 2.1 : 2.6;
    const step = Math.min(targetDistance, followSpeed * frameDelta);
    if (targetDistance > 0) {
        inservienteGroup.position.x += dxToTarget / targetDistance * step;
        inservienteGroup.position.z += dzToTarget / targetDistance * step;
    }

    const dx = playerPos.x - inservienteGroup.position.x;
    const dz = playerPos.z - inservienteGroup.position.z;
    inservienteGroup.rotation.y = Math.atan2(dx, dz);
}

export function resetInserviente(position = { x: 0, y: 0, z: -25 }) {
    if (!inservienteGroup) {
        throw new Error('Crea l’Inserviente con createInserviente(scene) prima di reimpostarlo.');
    }

    inservienteGroup.position.set(position.x, position.y, position.z);
    inservienteGroup.rotation.set(0, 0, 0);
    inservienteGroup.visible = false;
    chaseActive = false;
    apparitionRemaining = 0;
    peripheralApparitionGroup.visible = false;
}

export function isInservienteChasing() {
    return chaseActive;
}

export function getInservientePosition() {
    if (!inservienteGroup) {
        throw new Error('Crea l’Inserviente con createInserviente(scene) prima di leggerne la posizione.');
    }

    return inservienteGroup.position;
}

export function isInservienteInView(camera, minimumAlignment = 0.7) {
    if (!inservienteGroup) {
        throw new Error('Crea l’Inserviente con createInserviente(scene) prima di verificarne la visuale.');
    }
    if (!isInservienteLookedAt(camera, minimumAlignment) || !inservienteGroup.visible) return false;

    camera.updateMatrixWorld(true);
    inservienteGroup.updateMatrixWorld(true);
    inservienteGroup.localToWorld(gazeTarget.set(0, 1.2, 0));
    camera.getWorldPosition(gazeOrigin);
    gazeDirection.subVectors(gazeTarget, gazeOrigin);
    const distanceToEnemy = gazeDirection.length();
    gazeDirection.normalize();
    gazeRaycaster.set(gazeOrigin, gazeDirection);
    gazeRaycaster.far = distanceToEnemy + 0.5;
    const firstHit = gazeRaycaster.intersectObject(inservienteGroup.parent, true)[0];
    let hitRoot = firstHit?.object;
    while (hitRoot && hitRoot !== inservienteGroup) hitRoot = hitRoot.parent;
    return hitRoot === inservienteGroup;
}

export function isInservienteLookedAt(camera, minimumAlignment = 0.88) {
    if (!inservienteGroup) {
        throw new Error('Crea l’Inserviente con createInserviente(scene) prima di verificarne lo sguardo.');
    }
    if (!chaseActive) return false;

    camera.updateMatrixWorld(true);
    inservienteGroup.updateMatrixWorld(true);
    inservienteGroup.localToWorld(gazeTarget.set(0, 1.2, 0));
    camera.getWorldPosition(gazeOrigin);
    gazeDirection.subVectors(gazeTarget, gazeOrigin).normalize();
    camera.getWorldDirection(cameraDirection);
    return cameraDirection.dot(gazeDirection) >= minimumAlignment;
}