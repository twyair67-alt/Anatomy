import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const group = new THREE.Group();
const waypoints = [
    new THREE.Vector3(0, 0, -355),
    new THREE.Vector3(3.2, 0, -390),
    new THREE.Vector3(-3.2, 0, -425),
    new THREE.Vector3(0, 0, -460)
];
let waypointIndex = 0;
let health = 4;
let staggerRemaining = 0;
let attackCooldown = 0;
let dead = false;
let stationaryThreatTime = 0;
let finalEncounter = false;

function createFallbackDoctor() {
    const fallback = new THREE.Group();
    const coat = new THREE.MeshStandardMaterial({ color: 0xb5b6ae, roughness: 0.92 });
    const skin = new THREE.MeshStandardMaterial({ color: 0x8d8278, roughness: 1 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 1.25, 8), coat);
    torso.position.y = 1.05;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), skin);
    head.position.y = 1.82;
    fallback.add(torso, head);
    return fallback;
}

export function createDottore(scene) {
    group.name = 'dottore';
    group.position.copy(waypoints[0]);
    const hitbox = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, depthWrite: false })
    );
    hitbox.scale.y = 1.55;
    hitbox.position.y = 1.05;
    hitbox.name = 'dottoreHitbox';
    group.add(hitbox);
    scene.add(group);
    const modelUrl = new URL('../models/dottore.obj', import.meta.url).href;
    new OBJLoader().load(
        modelUrl,
        (model) => {
            const bounds = new THREE.Box3().setFromObject(model);
            const size = bounds.getSize(new THREE.Vector3());
            if (size.y <= 0) {
                console.error(`Il modello del Dottore non ha un’altezza valida: ${modelUrl}`);
                group.add(createFallbackDoctor());
                return;
            }
            model.scale.multiplyScalar(2.1 / size.y);
            const scaledBounds = new THREE.Box3().setFromObject(model);
            const center = scaledBounds.getCenter(new THREE.Vector3());
            model.position.set(-center.x, -scaledBounds.min.y, -center.z);
            model.traverse((object) => {
                if (!object.isMesh) return;
                object.frustumCulled = true;
                object.castShadow = false;
                object.receiveShadow = true;
            });
            group.add(model);
            group.userData.modelLoaded = true;
        },
        undefined,
        (error) => {
            console.error(`Impossibile caricare il modello del Dottore (${modelUrl}):`, error);
            group.add(createFallbackDoctor());
        }
    );
    return group;
}

export function updateDottore(
    playerPosition,
    delta,
    noisy = false,
    { playerMoving = false, movingBackward = false, lookingAtDoctor = true } = {}
) {
    if (dead) return { chasing: false, attacked: false, distance: Infinity, stunned: false };
    const frameDelta = Math.min(delta, 0.05);
    attackCooldown = Math.max(0, attackCooldown - frameDelta);
    staggerRemaining = Math.max(0, staggerRemaining - frameDelta);
    const stunned = staggerRemaining > 0;
    const distance = Math.hypot(
        playerPosition.x - group.position.x,
        playerPosition.z - group.position.z
    );
    const approaching = distance < 38 || noisy;

    if (!stunned) {
        const target = finalEncounter || approaching ? playerPosition : waypoints[waypointIndex];
        const dx = target.x - group.position.x;
        const dz = target.z - group.position.z;
        const targetDistance = Math.hypot(dx, dz);
        if (!finalEncounter && !approaching && targetDistance < 1) {
            waypointIndex = (waypointIndex + 1) % waypoints.length;
        } else if (targetDistance > 0.05) {
            const speed = finalEncounter ? 2.7 : approaching ? 0.85 : 1.05;
            const step = Math.min(targetDistance, speed * frameDelta);
            group.position.x += dx / targetDistance * step;
            group.position.z += dz / targetDistance * step;
            group.rotation.y = Math.atan2(dx, dz);
        }
    }

    const attackDistance = Math.hypot(
        playerPosition.x - group.position.x,
        playerPosition.z - group.position.z
    );
    if (stunned || playerMoving) stationaryThreatTime = 0;
    else stationaryThreatTime += frameDelta;
    const turnedBackTowardDoctor = playerMoving && movingBackward && lookingAtDoctor;
    const attacked = !stunned && attackCooldown === 0 && (
        finalEncounter && attackDistance < 1.6
        || !finalEncounter && (
            turnedBackTowardDoctor && attackDistance < 2.5
            || attackDistance < 1.6 && stationaryThreatTime >= 4.5
        )
    );
    if (attacked) attackCooldown = 1.2;
    return { chasing: finalEncounter && !stunned, attacked, distance: attackDistance, stunned };
}

export function damageDottore(amount = 1, stunDuration = 1.5) {
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new RangeError('Il danno al Dottore deve essere un numero positivo.');
    }
    if (!Number.isFinite(stunDuration) || stunDuration < 0) {
        throw new RangeError('La durata dello stordimento deve essere un numero non negativo.');
    }
    if (dead) return { health, dead };
    health = Math.max(0, health - amount);
    staggerRemaining = stunDuration;
    dead = health === 0;
    group.visible = !dead;
    return { health, dead };
}

export function stunDottore(duration = 1.5) {
    if (!Number.isFinite(duration) || duration < 0) {
        throw new RangeError('La durata dello stordimento deve essere un numero non negativo.');
    }
    if (!dead) staggerRemaining = duration;
}

export function startDottoreFinalEncounter(position) {
    health = 2;
    staggerRemaining = 0;
    attackCooldown = 0;
    dead = false;
    stationaryThreatTime = 0;
    finalEncounter = true;
    group.position.copy(position);
    group.rotation.set(0, 0, 0);
    group.visible = true;
}

export function isDottoreFinalEncounter() {
    return finalEncounter && !dead;
}

export function getDottoreGroup() {
    return group;
}

export function resetDottore() {
    health = 4;
    staggerRemaining = 0;
    attackCooldown = 0;
    dead = false;
    stationaryThreatTime = 0;
    finalEncounter = false;
    waypointIndex = 0;
    group.position.copy(waypoints[0]);
    group.rotation.set(0, 0, 0);
    group.visible = true;
}
