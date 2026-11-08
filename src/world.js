import * as THREE from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const TEXTURE_SIZE = 1024;
const mannequinCloth = createMannequinClothMaterial();
const mannequinSkin = createMannequinSkinMaterial();
const mannequinRope = createMannequinRopeMaterial();

function createMannequinClothMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.fillStyle = '#272522';
    context.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1800; i++) {
        const shade = 20 + Math.random() * 45;
        context.fillStyle = `rgba(${shade}, ${shade}, ${shade - 2}, ${Math.random() * 0.32})`;
        context.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 4, 1 + Math.random() * 2);
    }
    for (let i = 0; i < 12; i++) {
        context.strokeStyle = `rgba(82, 65, 50, ${0.18 + Math.random() * 0.2})`;
        context.lineWidth = 1 + Math.random() * 2;
        context.beginPath();
        context.moveTo(Math.random() * 128, Math.random() * 128);
        context.lineTo(Math.random() * 128, Math.random() * 128);
        context.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ color: 0xaaa69d, map: texture, roughness: 1 });
}

function createMannequinSkinMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.fillStyle = '#aaa294';
    context.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 800; i++) {
        const shade = 65 + Math.random() * 45;
        context.fillStyle = `rgba(${shade}, ${shade - 3}, ${shade - 9}, ${Math.random() * 0.16})`;
        context.beginPath();
        context.arc(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 8, 0, Math.PI * 2);
        context.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    return new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
}

function createMannequinRopeMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.fillStyle = '#534432';
    context.fillRect(0, 0, 64, 128);
    for (let x = -64; x < 128; x += 5) {
        context.strokeStyle = `rgba(${90 + Math.random() * 55}, ${65 + Math.random() * 35}, 35, 0.55)`;
        context.lineWidth = 1 + Math.random() * 2;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + 64, 128);
        context.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
}

function createBloodStainTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const context = canvas.getContext('2d');
    for (let i = 0; i < 18; i++) {
        const x = 35 + Math.random() * 186;
        const y = 25 + Math.random() * 130;
        const radius = 8 + Math.random() * 26;
        context.fillStyle = `rgba(${65 + Math.random() * 70}, 0, 3, ${0.35 + Math.random() * 0.5})`;
        context.beginPath();
        context.ellipse(x, y, radius, radius * (0.45 + Math.random()), Math.random(), 0, Math.PI * 2);
        context.fill();
        if (Math.random() > 0.25) {
            const width = 2 + Math.random() * 9;
            const length = 35 + Math.random() * 175;
            context.fillRect(x - width / 2, y, width, length);
            context.beginPath();
            context.arc(x, y + length, width / 2, 0, Math.PI * 2);
            context.fill();
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    return texture;
}

function createHangingMannequin() {
    const figure = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), mannequinSkin);
    head.position.y = 2.12;
    head.castShadow = true;
    head.userData.performanceShadow = true;
    figure.add(head);

    const clothingParts = [];
    const addLimb = (start, end, radius) => {
        const from = new THREE.Vector3(...start);
        const to = new THREE.Vector3(...end);
        const direction = new THREE.Vector3().subVectors(to, from);
        const geometry = new THREE.CylinderGeometry(radius * 0.72, radius, direction.length(), 6);
        const transform = new THREE.Matrix4().compose(
            from.add(to).multiplyScalar(0.5),
            new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
            new THREE.Vector3(1, 1, 1)
        );
        geometry.applyMatrix4(transform);
        clothingParts.push(geometry);
    };
    const torso = new THREE.CylinderGeometry(0.18, 0.28, 0.76, 6);
    torso.translate(0, 1.55, 0);
    clothingParts.push(torso);
    addLimb([-0.13, 1.82, 0], [-0.34, 1.15, 0], 0.09);
    addLimb([0.13, 1.82, 0], [0.34, 1.15, 0], 0.09);
    addLimb([-0.1, 1.2, 0], [-0.12, 0.38, 0], 0.11);
    addLimb([0.1, 1.2, 0], [0.12, 0.38, 0], 0.11);
    const clothingGeometry = BufferGeometryUtils.mergeBufferGeometries(clothingParts);
    for (const part of clothingParts) part.dispose();
    const clothing = new THREE.Mesh(clothingGeometry, mannequinCloth);
    clothing.castShadow = false;
    figure.add(clothing);

    const ropeParts = [
        new THREE.CylinderGeometry(0.018, 0.018, 0.76, 5),
        new THREE.TorusGeometry(0.15, 0.018, 5, 10)
    ];
    ropeParts[0].translate(0, 2.64, 0);
    ropeParts[1].rotateX(Math.PI / 2);
    ropeParts[1].translate(0, 2.31, 0);
    const ropeGeometry = BufferGeometryUtils.mergeBufferGeometries(ropeParts);
    for (const part of ropeParts) part.dispose();
    const noose = new THREE.Mesh(ropeGeometry, mannequinRope);
    noose.castShadow = false;
    figure.add(noose);
    return figure;
}

export function createDoorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    const wood = context.createLinearGradient(0, 0, canvas.width, 0);
    wood.addColorStop(0, '#171514');
    wood.addColorStop(0.12, '#38251e');
    wood.addColorStop(0.5, '#241a17');
    wood.addColorStop(0.88, '#3b2920');
    wood.addColorStop(1, '#161413');
    context.fillStyle = wood;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 220; i++) {
        const x = Math.random() * canvas.width;
        context.beginPath();
        context.moveTo(x, 0);
        context.bezierCurveTo(
            x - 14 + Math.random() * 28, 180,
            x - 18 + Math.random() * 36, 520,
            x - 10 + Math.random() * 20, canvas.height
        );
        context.strokeStyle = `rgba(${Math.random() > 0.5 ? '108, 72, 47' : '4, 4, 4'}, ${0.08 + Math.random() * 0.2})`;
        context.lineWidth = 1 + Math.random() * 5;
        context.stroke();
    }

    context.fillStyle = '#101214';
    context.fillRect(35, 24, 698, 464);
    const inset = context.createLinearGradient(40, 30, 725, 480);
    inset.addColorStop(0, '#63412d');
    inset.addColorStop(0.45, '#39281f');
    inset.addColorStop(1, '#1a1716');
    context.fillStyle = inset;
    context.fillRect(45, 35, 678, 442);
    context.strokeStyle = '#80634b';
    context.lineWidth = 7;
    context.strokeRect(52, 42, 664, 428);
    context.strokeStyle = 'rgba(5, 6, 7, 0.8)';
    context.lineWidth = 3;
    context.strokeRect(62, 52, 644, 408);

    for (let leaf = 0; leaf < 2; leaf++) {
        const leafX = 65 + leaf * 322;
        const leafCenter = leafX + 161;
        context.fillStyle = '#171513';
        context.fillRect(leafX, 52, 322, 408);
        context.strokeStyle = '#74563e';
        context.lineWidth = 4;
        context.strokeRect(leafX + 9, 60, 304, 392);

        const glass = context.createLinearGradient(0, 70, 0, 220);
        glass.addColorStop(0, '#aaa99f');
        glass.addColorStop(0.42, '#6d7473');
        glass.addColorStop(1, '#393f40');
        context.fillStyle = glass;
        context.fillRect(leafCenter - 51, 72, 102, 142);
        context.fillStyle = 'rgba(238, 231, 206, 0.26)';
        for (let y = 76; y < 212; y += 7) {
            context.fillRect(leafCenter - 46, y, 92, 2);
        }
        context.strokeStyle = '#141719';
        context.lineWidth = 10;
        context.strokeRect(leafCenter - 59, 64, 118, 158);
        context.strokeStyle = '#a58b69';
        context.lineWidth = 3;
        context.strokeRect(leafCenter - 52, 71, 104, 144);

        context.fillStyle = '#141719';
        context.fillRect(leafX + 34, 244, 254, 179);
        const panel = context.createLinearGradient(leafX + 40, 248, leafX + 280, 418);
        panel.addColorStop(0, '#483126');
        panel.addColorStop(1, '#241b18');
        context.fillStyle = panel;
        context.fillRect(leafX + 42, 250, 238, 167);
        context.strokeStyle = '#87664c';
        context.lineWidth = 4;
        context.strokeRect(leafX + 52, 260, 218, 147);

        const handleX = leaf === 0 ? leafX + 282 : leafX + 40;
        context.fillStyle = '#a9a397';
        context.fillRect(handleX - 5, 278, 10, 58);
        context.beginPath();
        context.arc(handleX, 307, 10, 0, Math.PI * 2);
        context.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    return texture;
}

function createHospitalWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    const tileLine = 248;

    const plaster = context.createLinearGradient(0, 0, 0, tileLine);
    plaster.addColorStop(0, '#59554b');
    plaster.addColorStop(0.6, '#777263');
    plaster.addColorStop(1, '#5e5a4d');
    context.fillStyle = plaster;
    context.fillRect(0, 0, TEXTURE_SIZE, tileLine);

    for (let i = 0; i < 11500; i++) {
        const shade = Math.floor(30 + Math.random() * 85);
        context.fillStyle = `rgba(${shade}, ${shade - 3}, ${shade - 10}, ${Math.random() * 0.12})`;
        context.fillRect(Math.random() * TEXTURE_SIZE, Math.random() * tileLine, 1 + Math.random() * 4, 1 + Math.random() * 3);
    }

    for (let i = 0; i < 22; i++) {
        let x = Math.random() * TEXTURE_SIZE;
        let y = Math.random() * tileLine;
        context.beginPath();
        context.moveTo(x, y);
        for (let segment = 0; segment < 5; segment++) {
            x += -22 + Math.random() * 44;
            y = Math.min(tileLine, y + 12 + Math.random() * 38);
            context.lineTo(x, y);
        }
        context.strokeStyle = `rgba(22, 21, 18, ${0.3 + Math.random() * 0.4})`;
        context.lineWidth = 1 + Math.random() * 2;
        context.stroke();
    }

    context.fillStyle = '#b1a77e';
    context.fillRect(0, tileLine, TEXTURE_SIZE, 512 - tileLine);
    for (let y = tileLine + 2; y < 512; y += 50) {
        context.fillStyle = '#594f3e';
        context.fillRect(0, y, TEXTURE_SIZE, 5);
        for (let x = (Math.floor(y / 50) % 2) * 52; x < TEXTURE_SIZE; x += 104) {
            context.fillRect(x, y - 47, 4, 48);
        }
    }
    for (let i = 0; i < 14000; i++) {
        const shade = Math.floor(35 + Math.random() * 110);
        context.fillStyle = `rgba(${shade}, ${shade - 8}, ${shade - 22}, ${Math.random() * 0.09})`;
        context.fillRect(Math.random() * TEXTURE_SIZE, tileLine + Math.random() * (512 - tileLine), 1 + Math.random() * 3, 1 + Math.random() * 3);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 1);
    texture.encoding = THREE.sRGBEncoding;
    return texture;
}

function createWallSurfaceMap() {
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    context.fillStyle = '#dedede';
    context.fillRect(0, 0, TEXTURE_SIZE, 512);

    for (let y = 248; y < 512; y += 50) {
        context.fillStyle = '#656565';
        context.fillRect(0, y, TEXTURE_SIZE, 4);
        for (let x = (Math.floor(y / 50) % 2) * 52; x < TEXTURE_SIZE; x += 104) {
            context.fillRect(x, y - 46, 4, 46);
        }
    }
    for (let i = 0; i < 24; i++) {
        let x = Math.random() * TEXTURE_SIZE;
        let y = Math.random() * 245;
        context.beginPath();
        context.moveTo(x, y);
        for (let segment = 0; segment < 5; segment++) {
            x += -20 + Math.random() * 40;
            y = Math.min(247, y + 14 + Math.random() * 30);
            context.lineTo(x, y);
        }
        context.strokeStyle = '#656565';
        context.lineWidth = 2;
        context.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 1);
    return texture;
}

function createFloorMaps() {
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = 512;
    colorCanvas.height = 512;
    const colorContext = colorCanvas.getContext('2d');
    colorContext.fillStyle = '#282c2b';
    colorContext.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8000; i++) {
        const value = 28 + Math.random() * 45;
        colorContext.fillStyle = `rgba(${value}, ${value + 4}, ${value + 2}, ${Math.random() * 0.12})`;
        colorContext.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 5, 1 + Math.random() * 2);
    }
    for (let y = 0; y < 512; y += 128) {
        colorContext.fillStyle = 'rgba(6, 8, 8, 0.22)';
        colorContext.fillRect(0, y, 512, 2);
    }

    const roughnessCanvas = document.createElement('canvas');
    roughnessCanvas.width = 512;
    roughnessCanvas.height = 512;
    const roughnessContext = roughnessCanvas.getContext('2d');
    roughnessContext.fillStyle = '#777';
    roughnessContext.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 12000; i++) {
        const value = 80 + Math.random() * 150;
        roughnessContext.fillStyle = `rgba(${value}, ${value}, ${value}, 0.18)`;
        roughnessContext.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 4, 1 + Math.random() * 2);
    }

    const colorMap = new THREE.CanvasTexture(colorCanvas);
    colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;
    colorMap.repeat.set(2, 10);
    colorMap.encoding = THREE.sRGBEncoding;
    const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
    roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.copy(colorMap.repeat);
    const bumpMap = new THREE.CanvasTexture(roughnessCanvas);
    bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
    bumpMap.repeat.copy(colorMap.repeat);
    return { colorMap, roughnessMap, bumpMap };
}

function createClinicTileMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    context.fillStyle = '#adb3b3';
    context.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 64) {
        for (let x = 0; x < 256; x += 64) {
            context.fillStyle = ((x + y) / 64) % 2 ? '#d8dddd' : '#eef0ee';
            context.fillRect(x + 2, y + 2, 60, 60);
        }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(8, 1);
    map.encoding = THREE.sRGBEncoding;
    return new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map,
        roughness: 0.72,
        side: THREE.DoubleSide
    });
}

export function createHospitalWorld(scene) {
    const room = new THREE.Group();
    const wallMap = createHospitalWallTexture();
    const wallSurfaceMap = createWallSurfaceMap();
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallMap,
        roughness: 0.88,
        roughnessMap: wallSurfaceMap,
        bumpMap: wallSurfaceMap,
        bumpScale: 0.035,
        side: THREE.DoubleSide
    });
    const { colorMap, roughnessMap, bumpMap } = createFloorMaps();
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: colorMap,
        roughness: 0.32,
        roughnessMap,
        bumpMap,
        bumpScale: 0.018,
        metalness: 0.12
    });

    const corridorLength = 320;
    const corridorCenterZ = -157.5;
    const firstAreaEndZ = corridorCenterZ - corridorLength / 2;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, corridorLength), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = corridorCenterZ;
    room.add(floor);

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(12, corridorLength), wallMaterial);
    ceiling.position.set(0, 3.2, corridorCenterZ);
    ceiling.rotation.x = Math.PI / 2;
    room.add(ceiling);

    const bloodTexture = createBloodStainTexture();
    const bloodMaterial = new THREE.MeshBasicMaterial({
        map: bloodTexture,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const bloodStains = [
        { side: -1, z: -34 }, { side: 1, z: -58 },
        { side: -1, z: -128 }, { side: 1, z: -212 },
        { side: -1, z: -238 }, { side: 1, z: -298 }
    ];
    const stainClusters = [
        bloodStains.slice(0, 2),
        bloodStains.slice(2, 3),
        bloodStains.slice(3, 5),
        bloodStains.slice(5)
    ];
    for (const cluster of stainClusters) {
        const centerZ = cluster.reduce((sum, stain) => sum + stain.z, 0) / cluster.length;
        const geometry = new THREE.PlaneGeometry(1.25, 1.65);
        const boundRadius = Math.max(...cluster.map((stain) =>
            Math.hypot(6.2, 1.48, stain.z - centerZ) + 1
        ));
        geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), boundRadius);
        const bloodDecals = new THREE.InstancedMesh(geometry, bloodMaterial, cluster.length);
        bloodDecals.position.z = centerZ;
        const decalTransform = new THREE.Object3D();
        for (let index = 0; index < cluster.length; index++) {
            const stain = cluster[index];
            decalTransform.position.set(stain.side * 5.965, 1.48, stain.z - centerZ);
            decalTransform.rotation.set(0, stain.side * Math.PI / 2, 0);
            decalTransform.updateMatrix();
            bloodDecals.setMatrixAt(index, decalTransform.matrix);
        }
        bloodDecals.instanceMatrix.needsUpdate = true;
        bloodDecals.frustumCulled = true;
        bloodDecals.castShadow = false;
        room.add(bloodDecals);
    }

    const sideDoorPositions = [
        { side: -1, z: -80, keyIndex: null },
        { side: 1, z: -175, keyIndex: 0 },
        { side: -1, z: -270, keyIndex: 1 }
    ];
    const letterPlacements = [];
    for (const side of [-1, 1]) {
        const openings = sideDoorPositions
            .filter((door) => door.side === side)
            .map((door) => door.z)
            .sort((a, b) => b - a);
        let segmentStart = 2.5;
        for (const openingZ of openings) {
            const segmentEnd = openingZ + 1.4;
            const segmentLength = segmentStart - segmentEnd;
            const wall = new THREE.Mesh(new THREE.PlaneGeometry(segmentLength, 3.2), wallMaterial);
            wall.position.set(side * 6, 1.6, (segmentStart + segmentEnd) / 2);
            wall.rotation.y = side * Math.PI / 2;
            room.add(wall);
            segmentStart = openingZ - 1.4;
        }
        const segmentLength = segmentStart + corridorLength - 2.5;
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(segmentLength, 3.2), wallMaterial);
        wall.position.set(side * 6, 1.6, (segmentStart - corridorLength + 2.5) / 2);
        wall.rotation.y = side * Math.PI / 2;
        room.add(wall);
    }

    const ambientLight = new THREE.AmbientLight(0x16151a, 0.32);
    scene.add(ambientLight);
    scene.add(room);

    const radioTargets = [];
    const radioCasing = new THREE.MeshStandardMaterial({
        color: 0x282721,
        metalness: 0.42,
        roughness: 0.8
    });
    const radioSpeaker = new THREE.MeshStandardMaterial({ color: 0x101112, roughness: 1 });
    for (const radio of [
        { side: 1, z: -108 },
        { side: -1, z: -242 }
    ]) {
        const device = new THREE.Group();
        device.position.set(radio.side * 5.72, 1.55, radio.z);
        device.rotation.y = radio.side < 0 ? Math.PI / 2 : -Math.PI / 2;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.18), radioCasing);
        const speaker = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.24, 0.02), radioSpeaker);
        speaker.position.z = 0.1;
        const dial = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mannequinRope);
        dial.position.set(0.12, -0.2, 0.11);
        device.add(body, speaker, dial);
        const target = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.9, 0.8),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
        );
        target.position.z = 0.18;
        target.userData.interactionType = 'radio';
        device.add(target);
        scene.add(device);
        radioTargets.push(target);
    }

    for (let z = -5; z >= firstAreaEndZ + 12; z -= 12) {
        const fixture = new THREE.Group();
        fixture.position.set(0, 3.08, z);
        const casing = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.12, 0.34),
            new THREE.MeshStandardMaterial({ color: 0x383a39, metalness: 0.55, roughness: 0.45 })
        );
        const tube = new THREE.Mesh(
            new THREE.BoxGeometry(1.28, 0.035, 0.22),
            new THREE.MeshBasicMaterial({ color: 0xc6c5a8 })
        );
        tube.position.y = -0.075;
        fixture.add(casing, tube);
        scene.add(fixture);
        const light = new THREE.PointLight(0xaaa98e, 0.48, 10, 2);
        light.position.set(0, 2.9, z);
        scene.add(light);
    }

    const doorPivot = new THREE.Group();
    doorPivot.position.set(-1.7, 0, -10);
    const invisibleBarrierMaterial = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        colorWrite: false,
        depthWrite: false
    });
    for (const side of [-1, 1]) {
        const barrier = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 3.2, 2.8),
            invisibleBarrierMaterial
        );
        barrier.position.set(side * 1.58, 1.6, -10);
        barrier.frustumCulled = true;
        barrier.castShadow = false;
        scene.add(barrier);
    }
    const doorFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0x252523,
        metalness: 0.62,
        roughness: 0.42
    });
    const frameSideGeometry = new THREE.BoxGeometry(0.16, 2.72, 0.24);
    const leftJamb = new THREE.Mesh(frameSideGeometry, doorFrameMaterial);
    leftJamb.position.set(0.04, 1.36, 0);
    const rightJamb = new THREE.Mesh(frameSideGeometry, doorFrameMaterial);
    rightJamb.position.set(3.36, 1.36, 0);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.48, 0.16, 0.24), doorFrameMaterial);
    lintel.position.set(1.7, 2.72, 0);
    scene.add(leftJamb, rightJamb, lintel);

    const doorTexture = createDoorTexture();
    const doorFaceMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: doorTexture,
        roughness: 0.68,
        metalness: 0.08
    });
    const doorPanel = new THREE.Mesh(
        new THREE.BoxGeometry(3.3, 2.55, 0.14),
        [
            doorFrameMaterial,
            doorFrameMaterial,
            doorFrameMaterial,
            doorFrameMaterial,
            doorFaceMaterial,
            doorFaceMaterial
        ]
    );
    doorPanel.position.set(1.65, 1.28, 0);
    doorPanel.userData.interactionType = 'door';
    doorPivot.add(doorPanel);

    const glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xc2c7c0,
        roughness: 0.22,
        metalness: 0.12,
        transmission: 0.22,
        transparent: true,
        opacity: 0.8
    });
    const metalMaterial = new THREE.MeshStandardMaterial({
        color: 0xb6b7b0,
        metalness: 0.9,
        roughness: 0.18
    });
    for (const centerX of [0.84, 2.46]) {
        const glassFrame = new THREE.Mesh(
            new THREE.BoxGeometry(0.56, 0.7, 0.035),
            doorFrameMaterial
        );
        glassFrame.position.set(centerX, 2.08, 0.085);
        doorPivot.add(glassFrame);
        const glassPane = new THREE.Mesh(
            new THREE.BoxGeometry(0.46, 0.6, 0.02),
            glassMaterial
        );
        glassPane.position.set(centerX, 2.08, 0.11);
        doorPivot.add(glassPane);

        const handlePlate = new THREE.Mesh(
            new THREE.BoxGeometry(0.11, 0.36, 0.035),
            doorFrameMaterial
        );
        handlePlate.position.set(centerX, 1.12, 0.1);
        doorPivot.add(handlePlate);
        const handle = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 16, 12),
            metalMaterial
        );
        handle.position.set(centerX, 1.12, 0.15);
        doorPivot.add(handle);
    }

    scene.add(doorPivot);

    const sideDoors = sideDoorPositions.map(({ side, z, keyIndex }) => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 5.92, 0, z + 1.2);
        pivot.userData.isOpen = false;
        pivot.userData.keyIndex = keyIndex;
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 2.5, 2.4),
            doorFaceMaterial
        );
        panel.position.z = -1.2;
        panel.userData.interactionType = 'sideDoor';
        panel.userData.door = pivot;
        pivot.add(panel);
        const frameMaterial = doorFrameMaterial;
        for (const offset of [0, -2.4]) {
            const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.65, 0.16), frameMaterial);
            jamb.position.set(side * 5.92 + side * 0.04, 1.325, z + 1.2 + offset);
            scene.add(jamb);
        }
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 2.56), frameMaterial);
        lintel.position.set(side * 5.92 + side * 0.04, 2.55, z);
        scene.add(lintel);
        scene.add(pivot);

        const sideRoom = new THREE.Group();
        const roomCenterX = side * 10;
        const roomZ = z;
        const roomWall = new THREE.MeshStandardMaterial({
            color: 0x37332d,
            map: wallMap,
            roughness: 0.95,
            side: THREE.DoubleSide
        });
        const tableMaterial = new THREE.MeshStandardMaterial({
            color: 0x392b22,
            roughness: 0.9
        });
        const tabletop = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.1, 1.2),
            tableMaterial
        );
        tabletop.position.set(roomCenterX, 0.82, roomZ);
        sideRoom.add(tabletop);
        for (const xOffset of [-0.78, 0.78]) {
            for (const zOffset of [-0.48, 0.48]) {
                const leg = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 0.78, 0.1),
                    tableMaterial
                );
                leg.position.set(roomCenterX + xOffset, 0.39, roomZ + zOffset);
                sideRoom.add(leg);
            }
        }
        letterPlacements.push(new THREE.Vector3(roomCenterX, 0.88, roomZ));
        const hangingFigure = createHangingMannequin();
        hangingFigure.position.set(side * 11.25, 0.02, roomZ + 1.7);
        hangingFigure.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
        sideRoom.add(hangingFigure);

        const roomFloor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), floorMaterial);
        roomFloor.rotation.x = -Math.PI / 2;
        roomFloor.position.set(roomCenterX, 0.02, roomZ);
        sideRoom.add(roomFloor);
        const roomCeiling = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), roomWall);
        roomCeiling.position.set(roomCenterX, 3.15, roomZ);
        roomCeiling.rotation.x = Math.PI / 2;
        sideRoom.add(roomCeiling);
        const outerWall = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.2), roomWall);
        outerWall.position.set(side * 14, 1.6, roomZ);
        outerWall.rotation.y = side * Math.PI / 2;
        sideRoom.add(outerWall);
        for (const roomEnd of [-4, 4]) {
            const endWall = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.2), roomWall);
            endWall.position.set(roomCenterX, 1.6, roomZ + roomEnd);
            sideRoom.add(endWall);
        }
        scene.add(sideRoom);

        return {
            pivot,
            panel,
            side,
            z,
            keyIndex,
            isOpen: () => pivot.userData.isOpen
        };
    });

    for (const hanging of [
        { x: -4.35, z: -42 }, { x: 4.35, z: -132 },
        { x: -4.35, z: -224 }, { x: 4.35, z: -304 }
    ]) {
        const figure = createHangingMannequin();
        figure.position.set(hanging.x, 0.02, hanging.z);
        figure.rotation.y = hanging.x < 0 ? Math.PI / 2 : -Math.PI / 2;
        room.add(figure);
    }

    const exitDoorZ = firstAreaEndZ + 8;
    const exitDoor = new THREE.Group();
    exitDoor.position.set(0, 1.5, exitDoorZ);
    const exitPanel = new THREE.Mesh(
        new THREE.BoxGeometry(11.8, 3, 0.2),
        doorFaceMaterial
    );
    exitPanel.userData.interactionType = 'exitDoor';
    exitDoor.add(exitPanel);
    for (const x of [-5.95, 5.95]) {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 0.24), doorFrameMaterial);
        jamb.position.set(x, 0, 0);
        exitDoor.add(jamb);
    }
    const exitLintel = new THREE.Mesh(new THREE.BoxGeometry(12.1, 0.2, 0.24), doorFrameMaterial);
    exitLintel.position.y = 1.6;
    exitDoor.add(exitLintel);
    scene.add(exitDoor);

    const transitionDoorZ = exitDoorZ - 3;
    const secondAreaStartZ = transitionDoorZ - 0.2;
    const secondAreaEndZ = firstAreaEndZ - 160;
    const secondAreaLength = secondAreaStartZ - secondAreaEndZ;
    const secondAreaCenterZ = (secondAreaStartZ + secondAreaEndZ) / 2;
    const secondArea = new THREE.Group();
    const clinicWallMaterial = createClinicTileMaterial();
    const clinicFloorMaterial = createClinicTileMaterial();
    clinicFloorMaterial.map.repeat.set(2, 28);
    const clinicCeilingMaterial = new THREE.MeshStandardMaterial({
        color: 0xcfd4d6,
        roughness: 0.9,
        side: THREE.DoubleSide
    });
    const secondAreaFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(12, secondAreaLength),
        clinicFloorMaterial
    );
    secondAreaFloor.rotation.x = -Math.PI / 2;
    secondAreaFloor.position.z = secondAreaCenterZ;
    secondArea.add(secondAreaFloor);
    const secondAreaCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(12, secondAreaLength),
        clinicCeilingMaterial
    );
    secondAreaCeiling.position.set(0, 3.2, secondAreaCenterZ);
    secondAreaCeiling.rotation.x = Math.PI / 2;
    secondArea.add(secondAreaCeiling);
    for (const side of [-1, 1]) {
        const wall = new THREE.Mesh(
            new THREE.PlaneGeometry(secondAreaLength, 3.2),
            clinicWallMaterial
        );
        wall.position.set(side * 6, 1.6, secondAreaCenterZ);
        wall.rotation.y = side * Math.PI / 2;
        secondArea.add(wall);
    }
    for (const side of [-1, 1]) {
        const endWall = new THREE.Mesh(
            new THREE.PlaneGeometry(4.2, 3.2),
            clinicWallMaterial
        );
        endWall.position.set(side * 3.9, 1.6, secondAreaEndZ);
        secondArea.add(endWall);
    }
    scene.add(secondArea);
    const areaThreeStartZ = secondAreaEndZ - 2;
    const areaThreeEndZ = secondAreaEndZ - 210;
    const areaThreeLength = areaThreeStartZ - areaThreeEndZ;
    const areaThreeCenterZ = (areaThreeStartZ + areaThreeEndZ) / 2;
    const areaThree = new THREE.Group();
    const glitchCanvas = document.createElement('canvas');
    glitchCanvas.width = 256;
    glitchCanvas.height = 256;
    const glitchContext = glitchCanvas.getContext('2d');
    const glitchColors = ['#ff35a5', '#24e0ff', '#ffe83d', '#8a4dff', '#38ff92'];
    for (let y = 0; y < 256; y += 16) {
        glitchContext.fillStyle = glitchColors[Math.floor(Math.random() * glitchColors.length)];
        glitchContext.fillRect(0, y, 256, 7 + Math.random() * 7);
    }
    const glitchTexture = new THREE.CanvasTexture(glitchCanvas);
    glitchTexture.wrapS = glitchTexture.wrapT = THREE.RepeatWrapping;
    glitchTexture.repeat.set(5, 8);
    glitchTexture.encoding = THREE.sRGBEncoding;
    const psychColor = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: glitchTexture,
        emissive: 0x4c1450,
        emissiveIntensity: 0.12,
        roughness: 0.74,
        side: THREE.DoubleSide
    });
    const psychFloor = new THREE.Mesh(new THREE.PlaneGeometry(12, areaThreeLength), psychColor);
    psychFloor.rotation.x = -Math.PI / 2;
    psychFloor.position.z = areaThreeCenterZ;
    areaThree.add(psychFloor);
    const psychCeiling = new THREE.Mesh(new THREE.PlaneGeometry(12, areaThreeLength), clinicCeilingMaterial);
    psychCeiling.position.set(0, 3.2, areaThreeCenterZ);
    psychCeiling.rotation.x = Math.PI / 2;
    areaThree.add(psychCeiling);
    for (const side of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(areaThreeLength, 3.2), psychColor);
        wall.position.set(side * 6, 1.6, areaThreeCenterZ);
        wall.rotation.y = side * Math.PI / 2;
        areaThree.add(wall);
    }
    const areaThreePartitionLength = areaThreeLength - 28;
    const areaThreePartitionCenterZ = (areaThreeStartZ - 14 + areaThreeEndZ + 14) / 2;
    for (const x of [-1.9, 1.9]) {
        const divider = new THREE.Mesh(
            new THREE.PlaneGeometry(areaThreePartitionLength, 3.2),
            psychColor
        );
        divider.position.set(x, 1.6, areaThreePartitionCenterZ);
        divider.rotation.y = Math.PI / 2;
        areaThree.add(divider);
    }
    const psychLightColors = [0xff3bbf, 0x32dcff, 0xffe13b, 0x9c52ff];
    for (let index = 0, z = areaThreeStartZ - 8; z > areaThreeEndZ; index++, z -= 16) {
        const blackout = index % 5 === 2 || index % 5 === 3;
        const light = new THREE.PointLight(
            psychLightColors[index % psychLightColors.length],
            blackout ? 0 : 2,
            16,
            1.7
        );
        light.position.set(0, 2.5, z);
        areaThree.add(light);
    }
    scene.add(areaThree);
    const areaFourStartZ = areaThreeEndZ - 2;
    const areaFourEndZ = areaFourStartZ - 48;
    const areaFourCenterZ = (areaFourStartZ + areaFourEndZ) / 2;
    const areaFour = new THREE.Group();
    const areaFourFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(12, areaFourStartZ - areaFourEndZ),
        clinicFloorMaterial
    );
    areaFourFloor.rotation.x = -Math.PI / 2;
    areaFourFloor.position.z = areaFourCenterZ;
    areaFour.add(areaFourFloor);
    const areaFourCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(12, areaFourStartZ - areaFourEndZ),
        psychColor
    );
    areaFourCeiling.position.set(0, 3.2, areaFourCenterZ);
    areaFourCeiling.rotation.x = Math.PI / 2;
    areaFour.add(areaFourCeiling);
    for (const side of [-1, 1]) {
        const wall = new THREE.Mesh(
            new THREE.PlaneGeometry(areaFourStartZ - areaFourEndZ, 3.2),
            psychColor
        );
        wall.position.set(side * 6, 1.6, areaFourCenterZ);
        wall.rotation.y = side * Math.PI / 2;
        areaFour.add(wall);
    }
    scene.add(areaFour);
    const neonLights = [];
    for (let z = secondAreaStartZ - 4; z >= secondAreaEndZ + 12; z -= 12) {
        const fixture = new THREE.Group();
        fixture.position.set(0, 3.02, z);
        const casing = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.12, 0.42),
            new THREE.MeshStandardMaterial({ color: 0x858c8d, metalness: 0.55, roughness: 0.42 })
        );
        const tube = new THREE.Mesh(
            new THREE.BoxGeometry(1.56, 0.035, 0.26),
            new THREE.MeshBasicMaterial({ color: 0xd8f3ff })
        );
        tube.position.y = -0.075;
        fixture.add(casing, tube);
        scene.add(fixture);
        const light = new THREE.PointLight(0xbadfff, 0.7, 13, 1.8);
        light.position.set(0, 2.82, z);
        scene.add(light);
        neonLights.push({
            light,
            tube,
            baseIntensity: 0.7,
            nextFlicker: Math.random() * 5,
            flickerRemaining: 0,
            burnoutCountdown: null,
            burnoutNextFlicker: 0,
            permanentlyOff: false
        });
    }

    const transitionDoor = new THREE.Group();
    transitionDoor.position.set(0, 1.35, transitionDoorZ);
    const transitionPanel = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 2.7, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x111416, roughness: 0.98 })
    );
    transitionPanel.userData.interactionType = 'transitionDoor';
    transitionDoor.add(transitionPanel);
    scene.add(transitionDoor);
    const areaThreeGate = new THREE.Mesh(
        new THREE.BoxGeometry(11.8, 3, 0.22),
        new THREE.MeshStandardMaterial({
            color: 0x242125,
            emissive: 0x241228,
            emissiveIntensity: 0.35,
            roughness: 0.86
        })
    );
    areaThreeGate.position.set(0, 1.5, areaThreeStartZ);
    scene.add(areaThreeGate);
    const transitionWallsMaterial = new THREE.MeshStandardMaterial({
        color: 0x090b0d,
        roughness: 1,
        side: THREE.DoubleSide
    });
    for (const side of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(3, 3.2), transitionWallsMaterial);
        wall.position.set(side * 5.95, 1.6, exitDoorZ - 1.5);
        wall.rotation.y = side * Math.PI / 2;
        scene.add(wall);
    }
    const transitionCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 3),
        transitionWallsMaterial
    );
    transitionCeiling.position.set(0, 3.15, exitDoorZ - 1.5);
    transitionCeiling.rotation.x = Math.PI / 2;
    scene.add(transitionCeiling);

    const areaTwoTargets = [];
    const loader = new GLTFLoader();
    const axeDrawerDisplay = new THREE.Group();
    axeDrawerDisplay.visible = false;
    scene.add(axeDrawerDisplay);
    const modelSpecs = [
        { file: 'stanzasicurezza.glb', position: [3.9, 0, -402], size: 4.8 },
        { file: 'rack.glb', position: [3.75, 0, -403], size: 2.3 },
        { file: 'armadietto.glb', position: [-3.9, 0, -350], size: 2.2 },
        { file: 'armadietto.glb', position: [3.9, 0, -375], size: 2.2 },
        { file: 'armadietto.glb', position: [-3.9, 0, -440], size: 2.2 },
        { file: 'pompa.glb', position: [3.5, 1.25, -401], size: 0.9 },
        { file: 'ascia.glb', position: [-3.4, 0.9, -350], size: 0.72 },
        { file: 'ammo.glb', position: [1.5, 0.24, -427], size: 0.55 },
        { file: 'ammo.glb', position: [-1.8, 0.24, -456], size: 0.55 }
    ];
    for (const spec of modelSpecs) {
        const url = new URL(`../models/${spec.file}`, import.meta.url).href;
        loader.load(url, (gltf) => {
            const model = gltf.scene;
            const bounds = new THREE.Box3().setFromObject(model);
            const size = bounds.getSize(new THREE.Vector3());
            const largestDimension = Math.max(size.x, size.y, size.z);
            if (largestDimension <= 0 || size.y <= 0) {
                console.error(`Il modello non ha dimensioni valide: ${url}`);
                return;
            }
            model.scale.setScalar(spec.size / largestDimension);
            const scaledBounds = new THREE.Box3().setFromObject(model);
            model.position.set(
                spec.position[0] - scaledBounds.getCenter(new THREE.Vector3()).x,
                spec.position[1] - scaledBounds.min.y,
                spec.position[2] - scaledBounds.getCenter(new THREE.Vector3()).z
            );
            model.traverse((object) => {
                if (!object.isMesh) return;
                object.frustumCulled = true;
                object.castShadow = false;
                object.receiveShadow = true;
            });
            if (spec.file === 'ascia.glb') axeDrawerDisplay.add(model);
            else scene.add(model);
        }, undefined, (error) => console.error(`Impossibile caricare il modello (${url}):`, error));
    }

    const makeAreaTarget = (type, position, size) => {
        const target = new THREE.Mesh(
            new THREE.BoxGeometry(...size),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
        );
        target.position.set(...position);
        target.userData.interactionType = type;
        scene.add(target);
        areaTwoTargets.push(target);
        return target;
    };
    const axeDrawerTarget = makeAreaTarget('axeDrawer', [-3.35, 1, -350], [0.85, 0.7, 0.8]);
    const axeTarget = makeAreaTarget('axe', [-3.4, 1.15, -350], [0.7, 0.5, 0.7]);
    axeTarget.visible = false;
    const shotgunTarget = makeAreaTarget('shotgun', [3.5, 1.25, -401], [0.9, 0.8, 0.9]);
    const ammoTargets = [
        makeAreaTarget('ammo', [1.5, 0.35, -427], [0.9, 0.7, 0.9]),
        makeAreaTarget('ammo', [-1.8, 0.35, -456], [0.9, 0.7, 0.9])
    ];
    const keypadDoor = new THREE.Group();
    keypadDoor.name = 'macroareaTwoKeypadDoor';
    keypadDoor.position.set(0, 1.45, secondAreaEndZ + 0.18);
    const keypadDoorPanel = new THREE.Mesh(
        new THREE.BoxGeometry(3.35, 2.9, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x382117, roughness: 0.94 })
    );
    keypadDoor.add(keypadDoorPanel);
    for (const side of [-1, 1]) {
        const jamb = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 3.1, 0.38),
            new THREE.MeshStandardMaterial({ color: 0x67402a, roughness: 0.9 })
        );
        jamb.position.x = side * 1.78;
        keypadDoor.add(jamb);
    }
    for (let y = -1.1; y <= 1.1; y += 0.36) {
        const plank = new THREE.Mesh(
            new THREE.BoxGeometry(3.2, 0.035, 0.32),
            new THREE.MeshBasicMaterial({ color: y % 0.72 < 0.1 ? 0x80502d : 0x59351f })
        );
        plank.position.y = y;
        keypadDoor.add(plank);
    }
    scene.add(keypadDoor);
    const keypadPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.68, 0.08),
        new THREE.MeshStandardMaterial({
            color: 0x1b262a,
            emissive: 0x063a3e,
            emissiveIntensity: 0.65
        })
    );
    keypadPanel.position.set(2.25, 1.5, secondAreaEndZ + 0.42);
    scene.add(keypadPanel);
    for (const y of [-0.18, 0, 0.18]) {
        for (const x of [-0.12, 0, 0.12]) {
            const key = new THREE.Mesh(
                new THREE.BoxGeometry(0.045, 0.045, 0.02),
                new THREE.MeshBasicMaterial({ color: 0x7df9e7 })
            );
            key.position.set(2.25 + x, 1.5 + y, secondAreaEndZ + 0.365);
            scene.add(key);
        }
    }
    const keypadTarget = makeAreaTarget(
        'keypad',
        [2.25, 1.5, secondAreaEndZ + 0.42],
        [0.7, 0.9, 0.45]
    );
    const psychiatryDrawerTargets = [
        { x: -4, offset: 34, cache: 'ammo' },
        { x: -4, offset: 62, cache: 'ammo' },
        { x: -4, offset: 92, cache: 'letter1' },
        { x: 4, offset: 48, cache: 'letter2' },
        { x: 4, offset: 82, cache: 'empty' }
    ].map(({ x, offset, cache }) => {
        const z = areaThreeStartZ - offset;
        const drawer = new THREE.Mesh(
            new THREE.BoxGeometry(0.72, 0.62, 0.46),
            new THREE.MeshStandardMaterial({ color: 0x343a3c, metalness: 0.55, roughness: 0.62 })
        );
        drawer.position.set(x, 0.62, z);
        scene.add(drawer);
        const target = makeAreaTarget('psychiatryDrawer', [x, 0.72, z], [0.95, 0.9, 0.85]);
        target.userData.cache = cache;
        return { drawer, target, cache, opened: false };
    });
    for (const [index, x] of [-4, 4].entries()) {
        const z = areaThreeStartZ - (index === 0 ? 118 : 136);
        const radio = new THREE.Mesh(
            new THREE.BoxGeometry(0.38, 0.48, 0.22),
            new THREE.MeshStandardMaterial({ color: 0x171b1d, emissive: 0x182327, emissiveIntensity: 0.35 })
        );
        radio.position.set(x, 1.35, z);
        scene.add(radio);
        radioTargets.push(makeAreaTarget('radio', [x, 1.35, z], [0.7, 0.8, 0.7]));
    }
    for (const offset of [32, 76, 124, 168]) {
        ammoTargets.push(makeAreaTarget(
            'ammo',
            [0, 0.3, areaThreeStartZ - offset],
            [0.8, 0.6, 0.8]
        ));
    }
    const macroareaFourDoor = new THREE.Group();
    macroareaFourDoor.position.set(0, 1.4, areaThreeEndZ - 1.5);
    const macroareaFourDoorPanel = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 2.8, 0.34),
        new THREE.MeshStandardMaterial({ color: 0x302018, roughness: 0.92 })
    );
    macroareaFourDoor.add(macroareaFourDoorPanel);
    scene.add(macroareaFourDoor);
    const macroareaFourDoorTarget = makeAreaTarget(
        'macroareaFourDoor',
        [0, 1.4, areaThreeEndZ - 1.5],
        [4.5, 3, 0.7]
    );
    const aslPickup = new THREE.Group();
    aslPickup.visible = false;
    const aslBadge = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.24, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xe1c869, emissive: 0x66551b, metalness: 0.6, roughness: 0.3 })
    );
    aslPickup.add(aslBadge);
    scene.add(aslPickup);
    const aslTarget = makeAreaTarget('asl', [0, 0.5, areaThreeStartZ - 170], [0.7, 0.7, 0.7]);
    aslTarget.visible = false;
    const cabinetDrawerTargets = [
        makeAreaTarget('cabinetDrawer', [-3.7, 1.1, -375], [0.9, 0.8, 0.8]),
        makeAreaTarget('cabinetDrawer', [-3.7, 1.1, -440], [0.9, 0.8, 0.8])
    ];
    const antibioticTargets = [
        [-1.8, -38], [2.4, -121], [1.5, -224], [-2.4, -296],
        [-1.4, -366], [2.2, -398], [-2.1, -431], [1.1, -461]
    ].map(([x, z]) => {
        const pickup = new THREE.Group();
        pickup.position.set(x, 0, z);
        scene.add(pickup);
        const target = makeAreaTarget('antibiotics', [x, 0.18, z], [0.55, 0.55, 0.55]);
        return { target, pickup };
    });
    const antibioticsUrl = new URL('../models/antibiotici.glb', import.meta.url).href;
    loader.load(antibioticsUrl, (gltf) => {
        const template = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(template);
        const size = bounds.getSize(new THREE.Vector3());
        if (size.y <= 0) {
            console.error(`Il modello degli antibiotici non ha dimensioni valide: ${antibioticsUrl}`);
            return;
        }
        template.scale.setScalar(0.48 / size.y);
        const scaledBounds = new THREE.Box3().setFromObject(template);
        const center = scaledBounds.getCenter(new THREE.Vector3());
        template.position.set(-center.x, -scaledBounds.min.y, -center.z);
        template.traverse((object) => {
            if (!object.isMesh) return;
            object.frustumCulled = true;
            object.castShadow = false;
            object.receiveShadow = true;
        });
        for (const { pickup } of antibioticTargets) {
            pickup.add(template.clone(true));
        }
    }, undefined, (error) => {
        console.error(`Impossibile caricare il modello degli antibiotici (${antibioticsUrl}):`, error);
    });
    const blueButton = new THREE.MeshStandardMaterial({
        color: 0x137fff,
        emissive: 0x075dff,
        emissiveIntensity: 2.2,
        roughness: 0.25
    });
    const yellowButton = new THREE.MeshStandardMaterial({
        color: 0xf6ff00,
        emissive: 0xc4ff00,
        emissiveIntensity: 3.2,
        roughness: 0.2
    });
    const buttonTargets = [
        { color: blueButton, type: 'blueButton', side: -1, z: -414 },
        { color: yellowButton, type: 'yellowButton', side: 1, z: -438 }
    ].map(({ color, type, side, z }) => {
        const button = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.12), color);
        button.position.set(side * 5.55, 1.35, z);
        button.userData.interactionType = type;
        scene.add(button);
        const target = makeAreaTarget(type, [side * 5.48, 1.35, z], [0.7, 0.75, 0.7]);
        return { button, target, type };
    });
    const pinoGroup = new THREE.Group();
    pinoGroup.visible = false;
    scene.add(pinoGroup);
    const pinoUrl = new URL('../models/pino.glb', import.meta.url).href;
    loader.load(pinoUrl, (gltf) => {
        const template = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(template);
        const size = bounds.getSize(new THREE.Vector3());
        const largestDimension = Math.max(size.x, size.y, size.z);
        if (largestDimension <= 0) {
            console.error(`Il modello di Pino non ha dimensioni valide: ${pinoUrl}`);
            return;
        }
        template.scale.setScalar(2.1 / size.y);
        const scaledBounds = new THREE.Box3().setFromObject(template);
        template.position.set(
            -scaledBounds.getCenter(new THREE.Vector3()).x,
            -scaledBounds.min.y,
            -scaledBounds.getCenter(new THREE.Vector3()).z
        );
        template.traverse((object) => {
            if (!object.isMesh) return;
            object.frustumCulled = true;
            object.castShadow = false;
            object.receiveShadow = true;
        });
        pinoGroup.add(template.clone(true));
        pinoGroup.userData.modelLoaded = true;
    }, undefined, (error) => console.error(`Impossibile caricare Pino (${pinoUrl}):`, error));

    const woodDoorZ = -388;
    const woodDoor = new THREE.Group();
    woodDoor.position.set(0, 0, woodDoorZ);
    const woodDoorPanel = new THREE.Mesh(
        new THREE.BoxGeometry(10.8, 2.9, 0.35),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    woodDoorPanel.userData.interactionType = 'woodDoor';
    woodDoor.add(woodDoorPanel);
    scene.add(woodDoor);
    const woodWallUrl = new URL('../models/wall.glb', import.meta.url).href;
    loader.load(woodWallUrl, (gltf) => {
        const model = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const largestDimension = Math.max(size.x, size.y, size.z);
        if (largestDimension <= 0) {
            console.error(`Il modello del muro non ha dimensioni valide: ${woodWallUrl}`);
            return;
        }
        model.scale.setScalar(11 / Math.max(size.x, size.y, size.z));
        const scaledBounds = new THREE.Box3().setFromObject(model);
        model.position.set(
            -scaledBounds.getCenter(new THREE.Vector3()).x,
            -scaledBounds.min.y,
            -scaledBounds.getCenter(new THREE.Vector3()).z
        );
        model.traverse((object) => {
            if (!object.isMesh) return;
            object.frustumCulled = true;
            object.castShadow = false;
            object.receiveShadow = true;
        });
        woodDoor.userData.model = model;
        if (!woodDoor.userData.broken) woodDoor.add(model);
    }, undefined, (error) => console.error(`Impossibile caricare il muro (${woodWallUrl}):`, error));

    return {
        room,
        doorPivot,
        doorPanel,
        sideDoors,
        radioTargets,
        explorationRooms: sideDoors.map(({ side, z, isOpen }) => ({ side, z, isOpen })),
        letterPlacements,
        exitDoor,
        exitPanel,
        exitDoorZ,
        transitionDoor,
        transitionPanel,
        transitionDoorZ,
        areaTwoStartZ: secondAreaStartZ,
        areaTwoEndZ: secondAreaEndZ,
        areaTwoTargets,
        axeDrawerTarget,
        axeTarget,
        axeDrawerDisplay,
        shotgunTarget,
        ammoTargets,
        antibioticTargets,
        buttonTargets,
        pinoGroup,
        areaThreeGate,
        areaThreeStartZ,
        areaThreeEndZ,
        areaFourStartZ,
        areaFourEndZ,
        cabinetDrawerTargets,
        keypadDoor,
        keypadTarget,
        psychiatryDrawerTargets,
        macroareaFourDoor,
        macroareaFourDoorTarget,
        aslPickup,
        aslTarget,
        woodDoor,
        woodDoorPanel,
        woodDoorZ,
        neonLights,
        mainDoorZ: doorPivot.position.z,
        corridorEndZ: exitDoorZ + 0.5,
        secondAreaEndZ
    };
}
