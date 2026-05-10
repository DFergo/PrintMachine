// Industrial Printer 3D - Fixed Version
// Canvas now fills the container properly

document.addEventListener('DOMContentLoaded', function() {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = initApp;
    document.head.appendChild(script);
});

let scene, camera, renderer, controls;
let printerParts = {};
let state = { printing: false, paused: false, speed: 100, partsDetached: new Set() };
let printPosition = 0;
const animationSpeed = 0.02;

const PART_CONFIGS = {
    printHead: { color: 0x3498db, size: { x: 60, y: 40, z: 30 }, pos: { x: 0, y: 120, z: 0 }, detach: { x: 0, y: 200, z: 0 }, animate: true },
    carriage: { color: 0x95a5a6, size: { x: 80, y: 60, z: 50 }, pos: { x: 0, y: 80, z: 0 }, detach: { x: 0, y: 220, z: 0 }, animate: true },
    nozzleGroup: { color: 0xe74c3c, size: { x: 40, y: 20, z: 40 }, pos: { x: 0, y: 150, z: 0 }, detach: { x: 0, y: 250, z: 0 }, animate: false },
    conveyor: { color: 0x2c3e50, size: { x: 300, y: 10, z: 150 }, pos: { x: 0, y: 20, z: 0 }, detach: { x: 0, y: 100, z: 0 }, animate: true },
    heatingElement: { color: 0xf39c12, size: { x: 100, y: 100, z: 40 }, pos: { x: 100, y: 80, z: 0 }, detach: { x: 250, y: 80, z: 0 }, animate: true },
    sensor: { color: 0x9b59b6, size: { x: 20, y: 30, z: 20 }, pos: { x: -80, y: 30, z: 0 }, detach: { x: -80, y: 120, z: 0 }, animate: false },
    motor: { color: 0x1abc9c, size: { x: 50, y: 70, z: 50 }, pos: { x: -100, y: 60, z: 0 }, detach: { x: -200, y: 60, z: 0 }, animate: false }
};

function initApp() {
    const controlsScript = document.createElement('script');
    controlsScript.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
    controlsScript.onload = initScene;
    document.head.appendChild(controlsScript);
}

function initScene() {
    document.getElementById('loading').style.display = 'none';
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    const canvas = document.getElementById('canvas');
    const container = document.getElementById('canvas-container');
    
    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(300, 300, 300);
    
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    
    setupLights();
    createPrinter();
    setupUI();
    animate();
    
    window.addEventListener('resize', onResize);
    onResize();
}

function setupLights() {
    scene.add(new THREE.AmbientLight(0x404040, 1));
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(100, 200, 100);
    dir.castShadow = true;
    scene.add(dir);
    scene.add(new THREE.PointLight(0x3498db, 0.5, 300));
    scene.add(new THREE.PointLight(0xe74c3c, 0.5, 300));
}

function createPrinter() {
    const baseGeo = new THREE.BoxGeometry(400, 20, 200);
    const baseMat = new THREE.MeshPhongMaterial({ color: 0x2c3e50 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 10;
    base.castShadow = true;
    scene.add(base);
    
    Object.entries(PART_CONFIGS).forEach(([name, cfg]) => {
        const geo = new THREE.BoxGeometry(cfg.size.x, cfg.size.y, cfg.size.z);
        const mat = new THREE.MeshPhongMaterial({ color: cfg.color, shininess: 100 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cfg.pos.x, cfg.pos.y, cfg.pos.z);
        mesh.castShadow = true;
        mesh.userData = { name, orig: cfg.pos, detach: cfg.detach, anim: cfg.animate };
        
        const wf = new THREE.LineSegments(
            new THREE.WireframeGeometry(geo),
            new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.2, transparent: true })
        );
        mesh.add(wf);
        
        mesh.addEventListener('click', () => togglePart(name));
        scene.add(mesh);
        printerParts[name] = mesh;
    });
    
    const colGeo = new THREE.BoxGeometry(20, 200, 20);
    const colMat = new THREE.MeshPhongMaterial({ color: 0x7f8c8d });
    [[-180,-80],[-180,80],[180,-80],[180,80]].forEach(([x,z]) => {
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(x, 100, z);
        col.castShadow = true;
        scene.add(col);
    });
    
    const panel = new THREE.Mesh(
        new THREE.BoxGeometry(60, 80, 10),
        new THREE.MeshPhongMaterial({ color: 0x34495e })
    );
    panel.position.set(-220, 100, 0);
    scene.add(panel);
    
    const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(40, 50),
        new THREE.MeshBasicMaterial({ color: 0x27ae60 })
    );
    screen.position.set(-220, 105, 5);
    screen.rotation.y = Math.PI;
    scene.add(screen);
}

function setupUI() {
    document.getElementById('printBtn').onclick = () => { state.printing = true; state.paused = false; updateStatus(); };
    document.getElementById('pauseBtn').onclick = () => { state.paused = !state.paused; updateStatus(); };
    document.getElementById('stopBtn').onclick = () => { state.printing = false; state.paused = false; printPosition = 0; updateStatus(); updatePrintAnim(); };
    document.getElementById('speedSlider').oninput = (e) => { state.speed = parseInt(e.target.value); document.getElementById('speedValue').textContent = state.speed; };
    document.getElementById('dismountAllBtn').onclick = () => { state.partsDetached.clear(); Object.keys(PART_CONFIGS).forEach(p => state.partsDetached.add(p)); updatePartList(); };
    document.getElementById('mountAllBtn').onclick = () => { state.partsDetached.clear(); updatePartList(); };
    document.getElementById('isoViewBtn').onclick = () => setView(0);
    document.getElementById('frontViewBtn').onclick = () => setView(1);
    document.getElementById('topViewBtn').onclick = () => setView(2);
    document.querySelectorAll('.part-list li').forEach(li => li.onclick = () => togglePart(li.dataset.part));
}

function togglePart(name) {
    if (state.partsDetached.has(name)) {
        state.partsDetached.delete(name);
    } else {
        state.partsDetached.add(name);
    }
    updatePartList();
}

function updatePartList() {
    document.querySelectorAll('.part-list li').forEach(li => {
        li.classList.toggle('detached', state.partsDetached.has(li.dataset.part));
    });
}

function updateStatus() {
    const status = document.getElementById('status');
    const printBtn = document.getElementById('printBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    document.getElementById('speedValue').textContent = state.speed;
    
    if (state.printing && !state.paused) {
        status.textContent = 'Estado: Imprimiendo';
        printBtn.classList.add('active');
        pauseBtn.classList.remove('active');
    } else if (state.paused) {
        status.textContent = 'Estado: Pausado';
        pauseBtn.classList.add('active');
    } else {
        status.textContent = 'Estado: Parada';
        printBtn.classList.remove('active');
        pauseBtn.classList.remove('active');
    }
}

function setView(view) {
    const views = [{x:300,y:300,z:300}, {x:0,y:0,z:400}, {x:0,y:400,z:0}];
    camera.position.set(views[view].x, views[view].y, views[view].z);
    controls.update();
}

function updatePrintAnim() {
    if (!state.printing || state.paused) return;
    
    const speed = state.speed / 500;
    printPosition += speed;
    if (printPosition > 400) printPosition = 0;
    
    Object.entries(printerParts).forEach(([name, part]) => {
        if (!part.userData.anim) return;
        
        const orig = part.userData.orig;
        let y = orig.y;
        
        if (name === 'printHead' || name === 'carriage') {
            y += Math.sin(printPosition * 0.05) * 8;
        } else if (name === 'conveyor') {
            y += Math.cos(printPosition * 0.02) * 5;
        }
        
        part.position.y += (y - part.position.y) * 0.1;
    });
}

function updateAssembly() {
    Object.entries(printerParts).forEach(([name, part]) => {
        const target = state.partsDetached.has(name) ? part.userData.detach : part.userData.orig;
        part.position.x += (target.x - part.position.x) * animationSpeed;
        part.position.y += (target.y - part.position.y) * animationSpeed;
        part.position.z += (target.z - part.position.z) * animationSpeed;
    });
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    updateAssembly();
    updatePrintAnim();
    renderer.render(scene, camera);
}

function onResize() {
    const canvas = document.getElementById('canvas');
    const container = document.getElementById('canvas-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
}
