import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight']);
const DOUBLE_TAP_WINDOW_MS = 320;
const previousPosition = new THREE.Vector3();

export function createPlayer(scene, camera) {
    camera.position.set(0, 1.6, 0);
    camera.rotation.order = 'YXZ';
    scene.add(camera);

    const flashlightModelAnchor = new THREE.Group();
    flashlightModelAnchor.position.set(0.36, -0.3, -0.48);
    camera.add(flashlightModelAnchor);
    const axeModelAnchor = new THREE.Group();
    axeModelAnchor.position.set(-0.4, -0.3, -0.58);
    axeModelAnchor.visible = false;
    camera.add(axeModelAnchor);
    const shotgunModelAnchor = new THREE.Group();
    shotgunModelAnchor.position.set(-0.14, -0.3, -0.56);
    shotgunModelAnchor.visible = false;
    camera.add(shotgunModelAnchor);

    const flashlight = new THREE.SpotLight(0xfff0dd, 4.5, 18, Math.PI / 5, 0.4, 1);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(512, 512);
    flashlight.shadow.bias = -0.0003;
    flashlight.shadow.normalBias = 0.025;
    flashlight.shadow.camera.near = 0.2;
    flashlight.shadow.camera.far = 22;
    flashlight.position.set(0.3, -0.23, -0.28);
    camera.add(flashlight);
    flashlight.target.position.set(0.2, -0.18, -1);
    camera.add(flashlight.target);
    const muzzleFlash = new THREE.PointLight(0xffbd72, 0, 3, 2);
    muzzleFlash.position.set(0, -0.18, -0.95);
    camera.add(muzzleFlash);

    const flashlightUrl = new URL('../models/torcia.glb', import.meta.url).href;
    new GLTFLoader().load(
        flashlightUrl,
        (gltf) => {
            const model = gltf.scene;
            model.traverse((object) => {
                if (!object.isMesh) return;
                object.frustumCulled = true;
                object.castShadow = false;
                object.receiveShadow = false;
            });
            const bounds = new THREE.Box3().setFromObject(model);
            const size = bounds.getSize(new THREE.Vector3());
            const largestDimension = Math.max(size.x, size.y, size.z);
            if (largestDimension <= 0) {
                console.error(`Il modello della torcia non ha dimensioni valide: ${flashlightUrl}`);
                return;
            }

            model.scale.setScalar(0.34 / largestDimension);
            model.rotation.x = -Math.PI / 2;
            const scaledBounds = new THREE.Box3().setFromObject(model);
            const center = scaledBounds.getCenter(new THREE.Vector3());
            model.position.set(-center.x, -center.y, -center.z);
            flashlightModelAnchor.add(model);
        },
        undefined,
        (error) => console.error(`Impossibile caricare il modello della torcia (${flashlightUrl}):`, error)
    );

    const pressedKeys = new Set();
    const velocity = new THREE.Vector2();
    const movementDelta = new THREE.Vector3();
    let locked = false;
    let uiPaused = false;
    let flashlightOn = true;
    let flashlightUpgraded = false;
    let yaw = 0;
    let pitch = 0;
    let targetYaw = 0;
    let targetPitch = 0;
    let lastForwardPressAt = -Infinity;
    let batteryCharge = 100;
    let weapon = 'axe';
    let secondaryWeaponVisible = false;
    let hasAxe = false;
    let hasShotgun = false;
    let axeSwing = 0;
    let shotgunRecoil = 0;
    let shotgunCameraRecoilRemaining = 0;
    let shotgunCameraRecoilOffset = 0;
    let reloadAnimation = 0;
    let muzzleFlashRemaining = 0;
    let cameraShakeRemaining = 0;
    let cameraShakeIntensity = 0;
    let headBobPhase = 0;
    let headBobOffset = 0;

    function loadHandModel(file, anchor, targetSize, rotation = new THREE.Euler()) {
        const url = new URL(`../models/${file}`, import.meta.url).href;
        new GLTFLoader().load(
            url,
            (gltf) => {
                const model = gltf.scene;
                const bounds = new THREE.Box3().setFromObject(model);
                const size = bounds.getSize(new THREE.Vector3());
                const largestDimension = Math.max(size.x, size.y, size.z);
                if (largestDimension <= 0) {
                    console.error(`Il modello dell’arma non ha dimensioni valide: ${url}`);
                    return;
                }
                model.scale.setScalar(targetSize / largestDimension);
                model.rotation.copy(rotation);
                const scaledBounds = new THREE.Box3().setFromObject(model);
                const center = scaledBounds.getCenter(new THREE.Vector3());
                model.position.set(-center.x, -center.y, -center.z);
                model.traverse((object) => {
                    if (!object.isMesh) return;
                    object.frustumCulled = true;
                    object.castShadow = false;
                    object.receiveShadow = false;
                });
                anchor.add(model);
            },
            undefined,
            (error) => console.error(`Impossibile caricare il modello dell’arma (${url}):`, error)
        );
    }

    loadHandModel('ascia.glb', axeModelAnchor, 0.72, new THREE.Euler(-Math.PI / 2, 0, 0));
    loadHandModel('pompa.glb', shotgunModelAnchor, 0.82, new THREE.Euler(0, Math.PI / 2, 0));

    function applyFlashlightSettings() {
        flashlight.intensity = flashlightOn && batteryCharge > 0
            ? (flashlightUpgraded ? 8 : 4.5)
            : 0;
        flashlight.distance = flashlightUpgraded ? 32 : 18;
        flashlight.angle = flashlightUpgraded ? Math.PI / 3.2 : Math.PI / 5;
    }

    function cycleWeapon() {
        if (!hasAxe && !hasShotgun) return 'flashlight';
        if (hasAxe && hasShotgun && secondaryWeaponVisible) {
            weapon = weapon === 'axe' ? 'shotgun' : 'axe';
            axeModelAnchor.visible = weapon === 'axe';
            shotgunModelAnchor.visible = weapon === 'shotgun';
            return weapon;
        }
        secondaryWeaponVisible = !secondaryWeaponVisible;
        if (secondaryWeaponVisible) weapon = hasShotgun ? 'shotgun' : 'axe';
        axeModelAnchor.visible = secondaryWeaponVisible && weapon === 'axe';
        shotgunModelAnchor.visible = secondaryWeaponVisible && weapon === 'shotgun';
        return secondaryWeaponVisible ? weapon : 'flashlight';
    }

    function onPointerLockChange() {
        locked = document.pointerLockElement === document.body;
        pressedKeys.clear();
        lastForwardPressAt = -Infinity;
    }

    function onMouseMove(event) {
        if (!locked || uiPaused) return;
        targetYaw -= event.movementX * 0.002;
        targetPitch = THREE.MathUtils.clamp(
            targetPitch - event.movementY * 0.002,
            -Math.PI / 2,
            Math.PI / 2
        );
    }

    function onKeyDown(event) {
        if (uiPaused) return;
        if (MOVE_KEYS.has(event.code)) pressedKeys.add(event.code);
        if (event.code === 'KeyW' && !event.repeat && locked) {
            const now = performance.now();
            if (now - lastForwardPressAt <= DOUBLE_TAP_WINDOW_MS) {
                if (pressedKeys.has('SprintToggle')) pressedKeys.delete('SprintToggle');
                else pressedKeys.add('SprintToggle');
            }
            lastForwardPressAt = now;
        }
        if (event.code === 'KeyF' && !event.repeat) {
            flashlightOn = batteryCharge > 0 && !flashlightOn;
            applyFlashlightSettings();
        }
        if (event.code === 'KeyG' && !event.repeat) cycleWeapon();
    }

    function onKeyUp(event) {
        pressedKeys.delete(event.code);
    }

    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => pressedKeys.clear());

    return {
        camera,
        flashlight,
        keys: pressedKeys,
        velocity,
        movementDelta,
        flickerFrame: 0,
        updateLook(frameDelta) {
            const rotationBlend = 1 - Math.exp(-18 * frameDelta);
            const yawDifference = THREE.MathUtils.euclideanModulo(
                targetYaw - yaw + Math.PI,
                Math.PI * 2
            ) - Math.PI;
            yaw += yawDifference * rotationBlend;
            pitch += (targetPitch - pitch) * rotationBlend;
            camera.rotation.set(pitch + shotgunCameraRecoilOffset, yaw, 0, 'YXZ');
        },
        setLookRotation(rotation) {
            yaw = rotation.y;
            pitch = rotation.x;
            targetYaw = yaw;
            targetPitch = pitch;
            camera.rotation.copy(rotation);
        },
        updateHeadBob(moving, sprinting, frameDelta) {
            if (moving) headBobPhase += frameDelta * (sprinting ? 15 : 10);
            const bobAmount = moving ? (sprinting ? 0.075 : 0.035) : 0;
            const targetBobOffset = moving ? Math.sin(headBobPhase) * bobAmount : 0;
            headBobOffset += (targetBobOffset - headBobOffset)
                * (1 - Math.exp(-12 * frameDelta));
            camera.position.y = 1.6 + headBobOffset;
        },
        get isLocked() {
            return locked;
        },
        get flashlightOn() {
            return flashlightOn;
        },
        get flashlightUpgraded() {
            return flashlightUpgraded;
        },
        get flashlightBattery() {
            return batteryCharge;
        },
        get currentWeapon() {
            return secondaryWeaponVisible ? weapon : 'flashlight';
        },
        get equippedSecondaryWeapon() {
            return weapon;
        },
        get secondaryWeaponVisible() {
            return secondaryWeaponVisible;
        },
        get hasAxe() {
            return hasAxe;
        },
        get hasShotgun() {
            return hasShotgun;
        },
        toggleWeapon() {
            return cycleWeapon();
        },
        setWeaponOwned(kind, owned) {
            if (kind === 'axe') hasAxe = Boolean(owned);
            else if (kind === 'shotgun') hasShotgun = Boolean(owned);
            else throw new Error(`Arma non supportata: ${kind}`);
            if (owned) {
                weapon = kind;
                secondaryWeaponVisible = true;
            }
            if (!owned && weapon === kind) {
                weapon = hasAxe ? 'axe' : hasShotgun ? 'shotgun' : 'axe';
                secondaryWeaponVisible = hasAxe || hasShotgun;
            }
            flashlightModelAnchor.visible = true;
            axeModelAnchor.visible = secondaryWeaponVisible && weapon === 'axe';
            shotgunModelAnchor.visible = secondaryWeaponVisible && weapon === 'shotgun';
        },
        animateAxeAttack() {
            axeSwing = 0.001;
        },
        animateShotgunFire() {
            shotgunRecoil = 0.001;
            shotgunCameraRecoilRemaining = 0.18;
            muzzleFlashRemaining = 0.1;
            muzzleFlash.intensity = 8;
        },
        animateReload() {
            reloadAnimation = 0.001;
        },
        triggerCameraShake(intensity = 0.035, duration = 0.4) {
            cameraShakeIntensity = Math.max(cameraShakeIntensity, intensity);
            cameraShakeRemaining = Math.max(cameraShakeRemaining, duration);
        },
        updateFirstPersonWeapons(delta) {
            const frameDelta = Math.min(delta, 0.05);
            if (muzzleFlashRemaining > 0) {
                muzzleFlashRemaining = Math.max(0, muzzleFlashRemaining - frameDelta);
                if (muzzleFlashRemaining === 0) muzzleFlash.intensity = 0;
            }
            if (axeSwing > 0) {
                axeSwing += frameDelta / 0.28;
                const progress = Math.min(axeSwing, 1);
                axeModelAnchor.rotation.x = -0.9 + progress * 1.55;
                if (progress >= 1) {
                    axeSwing = 0;
                    axeModelAnchor.rotation.x = 0;
                }
            }
            if (shotgunRecoil > 0) {
                shotgunRecoil += frameDelta / 0.24;
                const recoil = Math.sin(Math.min(shotgunRecoil, 1) * Math.PI);
                shotgunModelAnchor.position.y = -0.3 + recoil * 0.08;
                shotgunModelAnchor.position.z = -0.56 + recoil * 0.12;
                if (shotgunRecoil >= 1) {
                    shotgunRecoil = 0;
                    shotgunModelAnchor.position.set(-0.14, -0.3, -0.56);
                }
            }
            if (shotgunCameraRecoilRemaining > 0) {
                shotgunCameraRecoilRemaining = Math.max(0, shotgunCameraRecoilRemaining - frameDelta);
                const progress = 1 - shotgunCameraRecoilRemaining / 0.18;
                shotgunCameraRecoilOffset = Math.sin(progress * Math.PI) * 0.065;
            } else {
                shotgunCameraRecoilOffset = 0;
            }
            camera.rotation.set(pitch + shotgunCameraRecoilOffset, yaw, 0, 'YXZ');
            if (reloadAnimation > 0) {
                reloadAnimation += frameDelta / 1.15;
                shotgunModelAnchor.rotation.x = Math.sin(Math.min(reloadAnimation, 1) * Math.PI) * 0.5;
                if (reloadAnimation >= 1) {
                    reloadAnimation = 0;
                    muzzleFlashRemaining = 0;
                    muzzleFlash.intensity = 0;
                    shotgunModelAnchor.rotation.x = 0;
                }
            }
            if (cameraShakeRemaining > 0) {
                cameraShakeRemaining = Math.max(0, cameraShakeRemaining - frameDelta);
                const envelope = cameraShakeRemaining / 0.4;
                camera.rotation.set(
                    pitch + shotgunCameraRecoilOffset
                        + (Math.random() - 0.5) * cameraShakeIntensity * envelope,
                    yaw + (Math.random() - 0.5) * cameraShakeIntensity * envelope,
                    (Math.random() - 0.5) * cameraShakeIntensity * envelope,
                    'YXZ'
                );
                if (cameraShakeRemaining === 0) {
                    cameraShakeIntensity = 0;
                    camera.rotation.set(pitch + shotgunCameraRecoilOffset, yaw, 0, 'YXZ');
                }
            }
        },
        setFlashlightOn(enabled) {
            flashlightOn = Boolean(enabled) && batteryCharge > 0;
            applyFlashlightSettings();
        },
        consumeFlashlightBattery(amount) {
            if (!Number.isFinite(amount) || amount < 0) {
                throw new RangeError('Il consumo della batteria deve essere un numero non negativo.');
            }
            batteryCharge = Math.max(0, batteryCharge - amount);
            return batteryCharge;
        },
        setUiPaused(paused) {
            uiPaused = Boolean(paused);
            this.uiPaused = uiPaused;
            if (uiPaused) {
                targetYaw = yaw;
                targetPitch = pitch;
                pressedKeys.clear();
                velocity.set(0, 0);
            }
        },
        stamina: 100,
        maxStamina: 100,
        isSprinting: false,
        flickerTime: 0,
        uiPaused: false,
        sprintLockedOut: false,
        explorationRooms: [],
        corridorEndZ: -315,
        isInMacroareaTwo: false,
        isInMacroareaThree: false,
        areaTwoStartZ: -312,
        areaThreeStartZ: -500,
        areaThreeEndZ: -710,
        psychiatryLane: null,
        transitionDoorZ: -315,
        woodDoorZ: -388,
        upgradeFlashlight() {
            if (flashlightUpgraded) return false;
            flashlightUpgraded = true;
            applyFlashlightSettings();
            return true;
        },
        rechargeFlashlight(amount = 40) {
            if (!Number.isFinite(amount) || amount <= 0) {
                throw new RangeError('La carica della batteria deve essere un numero positivo.');
            }
            const previousCharge = batteryCharge;
            batteryCharge = Math.min(100, batteryCharge + amount);
            if (batteryCharge > 0 && !flashlightOn) flashlightOn = true;
            applyFlashlightSettings();
            return batteryCharge - previousCharge;
        },
        async lock() {
            if (document.pointerLockElement !== document.body) {
                try {
                    await document.body.requestPointerLock();
                } catch (error) {
                    console.error('Impossibile attivare il puntatore bloccato:', error);
                    throw error;
                }
            }
        },
        unlock() {
            if (document.pointerLockElement === document.body) {
                document.exitPointerLock();
            }
        },
        reset() {
            camera.position.set(0, 1.6, 0);
            yaw = 0;
            pitch = 0;
            targetYaw = 0;
            targetPitch = 0;
            camera.rotation.set(0, 0, 0, 'YXZ');
            pressedKeys.clear();
            velocity.set(0, 0);
            movementDelta.set(0, 0, 0);
            this.stamina = this.maxStamina;
            this.isSprinting = false;
            this.setUiPaused(false);
            this.sprintLockedOut = false;
            this.isInMacroareaTwo = false;
            this.isInMacroareaThree = false;
            this.psychiatryLane = null;
            lastForwardPressAt = -Infinity;
            batteryCharge = 100;
            hasAxe = false;
            hasShotgun = false;
            weapon = 'axe';
            secondaryWeaponVisible = false;
            flashlightModelAnchor.visible = true;
            axeModelAnchor.visible = false;
            shotgunModelAnchor.visible = false;
            axeSwing = 0;
            shotgunRecoil = 0;
            shotgunCameraRecoilRemaining = 0;
            shotgunCameraRecoilOffset = 0;
            reloadAnimation = 0;
            shotgunModelAnchor.position.set(-0.14, -0.3, -0.56);
            cameraShakeRemaining = 0;
            cameraShakeIntensity = 0;
            headBobPhase = 0;
            headBobOffset = 0;
            camera.position.y = 1.6;
            this.flickerTime = 0;
            this.movementDisabled = false;
            flashlightOn = true;
            flashlightUpgraded = false;
            applyFlashlightSettings();
        },
        dispose() {
            document.removeEventListener('pointerlockchange', onPointerLockChange);
            document.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        }
    };
}

export function updatePlayer(player, delta) {
    const frameDelta = Math.min(delta, 0.05);
    previousPosition.copy(player.camera.position);
    player.movementDelta.set(0, 0, 0);

    player.updateLook(frameDelta);

    if (player.isLocked && !player.movementDisabled && !player.uiPaused) {
        const moveX = Number(player.keys.has('KeyD')) - Number(player.keys.has('KeyA'));
        const moveZ = Number(player.keys.has('KeyW')) - Number(player.keys.has('KeyS'));
        const inputLength = Math.hypot(moveX, moveZ) || 1;
        if (player.sprintLockedOut && player.stamina >= 35) player.sprintLockedOut = false;
        const sprintRequested = (player.keys.has('ShiftLeft')
            || player.keys.has('ShiftRight')
            || player.keys.has('SprintToggle'))
            && (moveX !== 0 || moveZ !== 0)
            && !player.sprintLockedOut
            && player.stamina > 0;
        player.isSprinting = sprintRequested;
        player.stamina = THREE.MathUtils.clamp(
            player.stamina + (sprintRequested ? -28 : 18) * frameDelta,
            0,
            player.maxStamina
        );
        if (player.stamina === 0) {
            player.isSprinting = false;
            player.sprintLockedOut = true;
        }

        player.velocity.x -= player.velocity.x * 9 * frameDelta;
        player.velocity.y -= player.velocity.y * 9 * frameDelta;
        if (moveX || moveZ) {
            const movementSpeed = player.isSprinting ? 21 : 12;
            player.velocity.x -= moveX / inputLength * movementSpeed * frameDelta;
            player.velocity.y -= moveZ / inputLength * movementSpeed * frameDelta;
        }

        const localRight = -player.velocity.x * frameDelta;
        const localForward = -player.velocity.y * frameDelta;
        player.camera.position.x += localRight * Math.cos(player.camera.rotation.y)
            - localForward * Math.sin(player.camera.rotation.y);
        player.camera.position.z += -localRight * Math.sin(player.camera.rotation.y)
            - localForward * Math.cos(player.camera.rotation.y);

        const requestedX = player.camera.position.x;
        const requestedZ = player.camera.position.z;
        const hallwayLimit = 4.8;
        let room = null;
        for (const candidate of player.explorationRooms) {
            if (candidate.isOpen()
                && Math.abs(requestedZ - candidate.z) <= 3.5
                && requestedX * candidate.side > hallwayLimit) {
                room = candidate;
                break;
            }
        }
        const xLimit = room ? 14 : hallwayLimit;
        player.camera.position.x = THREE.MathUtils.clamp(requestedX, -xLimit, xLimit);
        if (player.isInMacroareaThree) {
            const branchStartZ = player.areaThreeStartZ - 14;
            const branchEndZ = player.areaThreeEndZ + 14;
            const chooseLane = (x) => x < -2 ? -1 : x > 2 ? 1 : 0;
            if (previousPosition.z >= branchStartZ && requestedZ < branchStartZ) {
                player.psychiatryLane = chooseLane(player.camera.position.x);
            } else if (previousPosition.z <= branchStartZ && requestedZ > branchStartZ) {
                player.psychiatryLane = null;
            } else if (previousPosition.z <= branchEndZ && requestedZ > branchEndZ) {
                player.psychiatryLane = chooseLane(player.camera.position.x);
            } else if (requestedZ <= branchEndZ) {
                player.psychiatryLane = null;
            }
            if (player.psychiatryLane !== null) {
                const laneBounds = player.psychiatryLane < 0 ? [-4.8, -2.02]
                    : player.psychiatryLane > 0 ? [2.02, 4.8]
                        : [-1.78, 1.78];
                player.camera.position.x = THREE.MathUtils.clamp(
                    player.camera.position.x,
                    laneBounds[0],
                    laneBounds[1]
                );
            }
        }
        const upperZLimit = player.isInMacroareaTwo ? player.areaTwoStartZ : 0.5;
        player.camera.position.z = THREE.MathUtils.clamp(requestedZ, player.corridorEndZ, upperZLimit);
        const crossedMainDoor = (
            previousPosition.z > player.mainDoorZ
            && player.camera.position.z <= player.mainDoorZ
        ) || (
            previousPosition.z < player.mainDoorZ
            && player.camera.position.z >= player.mainDoorZ
        );
        if (typeof player.canCrossMainDoor === 'function'
            && crossedMainDoor
            && (!player.canCrossMainDoor() || Math.abs(player.camera.position.x) > 1.45)) {
            player.camera.position.z = previousPosition.z > player.mainDoorZ
                ? player.mainDoorZ + 0.08
                : player.mainDoorZ - 0.08;
        }
        const crossedWoodDoor = (
            previousPosition.z > player.woodDoorZ
            && player.camera.position.z <= player.woodDoorZ
        ) || (
            previousPosition.z < player.woodDoorZ
            && player.camera.position.z >= player.woodDoorZ
        );
        if (crossedWoodDoor && typeof player.canCrossWoodDoor === 'function'
            && !player.canCrossWoodDoor()) {
            player.camera.position.z = previousPosition.z > player.woodDoorZ
                ? player.woodDoorZ + 0.08
                : player.woodDoorZ - 0.08;
        }

        if (player.camera.position.x !== requestedX) {
            player.velocity.x = 0;
        }
        if (player.camera.position.z !== requestedZ) {
            player.velocity.y = 0;
        }
        const crossedTransitionDoor = (
            previousPosition.z > player.transitionDoorZ
            && player.camera.position.z <= player.transitionDoorZ
        ) || (
            previousPosition.z < player.transitionDoorZ
            && player.camera.position.z >= player.transitionDoorZ
        );
        if (crossedTransitionDoor && typeof player.onTransitionDoorCross === 'function') {
            player.onTransitionDoorCross();
        }
        player.movementDelta.subVectors(player.camera.position, previousPosition);
        player.movementDelta.y = 0;
    } else {
        player.velocity.set(0, 0);
        player.isSprinting = false;
    }

    const moving = player.movementDelta.lengthSq() > 0.000002;
    player.updateHeadBob(moving, player.isSprinting, frameDelta);

    if (!player.movementDisabled && player.flashlightOn) {
        player.flickerTime += frameDelta;
        const batteryCharge = player.consumeFlashlightBattery(frameDelta * 0.18);
        if (batteryCharge === 0) {
            player.setFlashlightOn(false);
        } else if (++player.flickerFrame % 4 === 0) {
            const baseIntensity = player.flashlightUpgraded ? 7 : 3.5;
            const lowBatteryFlicker = batteryCharge < 20
                ? Math.random() * (20 - batteryCharge) * 0.16
                : 0;
            player.flashlight.intensity = Math.max(
                0,
                baseIntensity + Math.sin(player.flickerTime * 19) * 0.35 - lowBatteryFlicker
            );
        }
    }
}
