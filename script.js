// Configuração da Cena, Câmera e Renderizador
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Cor do céu
scene.fog = new THREE.FogExp2(0x87ceeb, 0.015); // Névoa distante

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Iluminação
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
sunLight.position.set(50, 100, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

// Tipos de Blocos e Materiais
const blockTypes = {
    1: { name: 'grass', color: 0x557A46 },
    2: { name: 'dirt', color: 0x8B5A2B },
    3: { name: 'stone', color: 0x7A7A7A },
    4: { name: 'wood', color: 0xA0522D }
};

let selectedBlockType = 1;
const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const blocks = [];

// Gerador de Terreno Procedural Simples
const worldSize = 30;
function generateWorld() {
    for (let x = -worldSize / 2; x < worldSize / 2; x++) {
        for (let z = -worldSize / 2; z < worldSize / 2; z++) {
            // Gera uma variação de altura baseada em seno/cosseno
            const height = Math.floor(Math.sin(x * 0.2) * Math.cos(z * 0.2) * 3) + 3;

            for (let y = 0; y <= height; y++) {
                let type = 3; // Pedra na base
                if (y === height) type = 1; // Grama no topo
                else if (y > height - 2) type = 2; // Terra no meio

                createBlock(x, y, z, type);
            }
        }
    }
}

function createBlock(x, y, z, type) {
    const material = new THREE.MeshStandardMaterial({ color: blockTypes[type].color });
    const mesh = new THREE.Mesh(blockGeometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: type };
    
    scene.add(mesh);
    blocks.push(mesh);
    return mesh;
}

generateWorld();

// Controles do Jogador
const controls = new THREE.PointerLockControls(camera, document.body);
const instructions = document.getElementById('instructions');

instructions.addEventListener('click', () => {
    controls.lock();
});

controls.addEventListener('lock', () => {
    instructions.style.display = 'none';
});

controls.addEventListener('unlock', () => {
    instructions.style.display = 'flex';
});

scene.add(controls.getObject());
camera.position.set(0, 8, 0);

// Controles de Movimentação e Física
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let prevTime = performance.now();

document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space':
            if (canJump === true) velocity.y += 12;
            canJump = false;
            break;
        case 'Digit1': selectSlot(1); break;
        case 'Digit2': selectSlot(2); break;
        case 'Digit3': selectSlot(3); break;
        case 'Digit4': selectSlot(4); break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
    }
});

function selectSlot(slotNumber) {
    selectedBlockType = slotNumber;
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('active'));
    document.querySelector(`[data-slot="${slotNumber}"]`).classList.add('active');
}

// Raycaster para Quebrar e Colocar Blocos
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0);

window.addEventListener('mousedown', (event) => {
    if (!controls.isLocked) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(blocks);

    if (intersects.length > 0) {
        const intersect = intersects[0];

        // Botão Esquerdo: Quebrar Bloco
        if (event.button === 0) {
            scene.remove(intersect.object);
            blocks.splice(blocks.indexOf(intersect.object), 1);
        }
        // Botão Direito: Colocar Bloco
        else if (event.button === 2) {
            const position = new THREE.Vector3();
            position.addVectors(intersect.object.position, intersect.face.normal);
            createBlock(position.x, position.y, position.z, selectedBlockType);
        }
    }
});

// Prevenir menu de contexto com o botão direito
window.addEventListener('contextmenu', event => event.preventDefault());

// Loop de Animação e Atualização
function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    if (controls.isLocked === true) {
        const delta = (time - prevTime) / 1000;

        // Desaceleração
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 30.0 * delta; // Gravidade

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 40.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 40.0 * delta;

        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        controls.getObject().position.y += (velocity.y * delta);

        // Colisão simples com a altura da superfície
        if (controls.getObject().position.y < 5) {
            velocity.y = 0;
            controls.getObject().position.y = 5;
            canJump = true;
        }
    }

    prevTime = time;
    renderer.render(scene, camera);
}

// Redimensionamento da Tela
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
