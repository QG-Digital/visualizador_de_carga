// --- NOVO: LÓGICA DO EFEITO DE PARTÍCULAS ---
const particleCanvas = document.getElementById('particle-canvas');
const ctx = particleCanvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function handlePointerMove(e) {
    let x, y;
    if (e.touches) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
    } else {
        x = e.clientX;
        y = e.clientY;
    }

    // Cria 2 partículas para um efeito mais suave
    for (let i = 0; i < 2; i++) {
        particles.push({
            x: x,
            y: y,
            size: Math.random() * 4 + 1, // Tamanho entre 1 e 5
            speedX: Math.random() * 3 - 1.5, // Movimento aleatório em X
            speedY: Math.random() * 3 - 1.5, // Movimento aleatório em Y
            color: 'rgba(59, 130, 246, 0.5)', // Cor azul de destaque
            life: 50 // Duração da partícula
        });
    }
}

document.addEventListener('mousemove', handlePointerMove);
document.addEventListener('touchmove', handlePointerMove);

function animateParticles() {
    ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.size *= 0.96; // Diminui de tamanho
        p.life--;

        if (p.life <= 0 || p.size < 0.5) {
            particles.splice(i, 1);
            i--;
        } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
    }
    requestAnimationFrame(animateParticles);
}
animateParticles();


// --- LÓGICA PRINCIPAL DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {

    // --- VARIÁVEIS GLOBAIS E CONSTANTES ---
    const COLOR_PALETTE = [
        "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#f59e0b",
        "#6366f1", "#ec4899", "#22d3ee", "#f97316", "#14b8a6"
    ];

    // --- REFERÊNCIAS AOS ELEMENTOS DO DOM ---
    const truckLengthInput = document.getElementById('truck-length');
    const truckWidthInput = document.getElementById('truck-width');
    const truckHeightInput = document.getElementById('truck-height');
    const truckWeightInput = document.getElementById('truck-weight');
    
    const truck2LengthInput = document.getElementById('truck2-length');
    const truck2WidthInput = document.getElementById('truck2-width');
    const truck2HeightInput = document.getElementById('truck2-height');
    const truck2WeightInput = document.getElementById('truck2-weight');
    
    const packagesListDiv = document.getElementById('packages-list');
    const addPackageBtn = document.getElementById('add-package-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const statusBar = document.getElementById('status-bar');
    const packageTemplate = document.getElementById('package-template');
    const vizContainer = document.getElementById('visualization-container');
    
    // Controles de modo
    const weightModeToggle = document.getElementById('weight-mode-toggle');
    const bitremModeToggle = document.getElementById('bitrem-mode-toggle');
    const truckDimensionsTitle = document.getElementById('truck-dimensions-title');
    const mainTruckTitle = document.getElementById('main-truck-title');
    const truckSecondSection = document.getElementById('truck-second');
    const bitremHint = document.getElementById('bitrem-hint');

    // --- CONFIGURAÇÃO DA CENA 3D (THREE.JS) ---
    let scene, camera, renderer, controls;
    let truckWireframe, truck2Wireframe;
    let isBitremMode = false;
    let isWeightMode = false;
    
    function initThreeJS() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf8fafc);

        camera = new THREE.PerspectiveCamera(50, vizContainer.clientWidth / vizContainer.clientHeight, 0.1, 10000);
        camera.position.set(600, 600, 800);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(vizContainer.clientWidth, vizContainer.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        vizContainer.appendChild(renderer.domElement);
        
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 200;
        controls.maxDistance = 5000;
        controls.maxPolarAngle = Math.PI / 2;

        // Iluminação aprimorada
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(300, 500, 400);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 2000;
        directionalLight.shadow.camera.left = -1000;
        directionalLight.shadow.camera.right = 1000;
        directionalLight.shadow.camera.top = 1000;
        directionalLight.shadow.camera.bottom = -1000;
        scene.add(directionalLight);
        
        // Luz de preenchimento
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-200, 300, -300);
        scene.add(fillLight);
        
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();
        
        window.addEventListener('resize', () => {
            if (!vizContainer || !renderer) return; // Checagem de segurança
            camera.aspect = vizContainer.clientWidth / vizContainer.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(vizContainer.clientWidth, vizContainer.clientHeight);
        }, false);
    }

    // --- CONTROLES DE MODO ---
    
    function toggleWeightMode() {
        isWeightMode = weightModeToggle.checked;
        const weightFields = document.querySelectorAll('.weight-field');
        
        weightFields.forEach(field => {
            if (isWeightMode) {
                field.classList.add('show');
                field.classList.remove('hide');
            } else {
                field.classList.add('hide');
                field.classList.remove('show');
            }
        });
        
        updatePackageWidgets();
    }
    
    function toggleBitremMode() {
        isBitremMode = bitremModeToggle.checked;
        
        if (isBitremMode) {
            truckDimensionsTitle.textContent = 'Dimensões dos Compartimentos (cm)';
            mainTruckTitle.textContent = 'Primeiro Compartimento';
            truckSecondSection.style.display = 'block';
            bitremHint.style.display = 'block';
        } else {
            truckDimensionsTitle.textContent = 'Dimensões do Caminhão (cm)';
            mainTruckTitle.textContent = 'Caminhão';
            truckSecondSection.style.display = 'none';
            bitremHint.style.display = 'none';
        }
        
        if (isBitremMode) {
            truckSecondSection.style.animation = 'fadeInUp 0.5s ease-out';
        }
    }

    // --- LÓGICA DA INTERFACE ---

    function addPackageWidget(data = { length: 100, width: 50, height: 50, quantity: 10, weight: 1 }) {
        if (packagesListDiv.children.length >= COLOR_PALETTE.length) {
            showStatus(`Limite de ${COLOR_PALETTE.length} tipos de pacotes atingido!`, 'warning');
            return;
        }
        
        const clone = packageTemplate.content.cloneNode(true);
        const packageDiv = clone.querySelector('.package-config');
        
        packageDiv.querySelector('.pkg-length').value = data.length;
        packageDiv.querySelector('.pkg-width').value = data.width;
        packageDiv.querySelector('.pkg-height').value = data.height;
        packageDiv.querySelector('.pkg-quantity').value = data.quantity;
        packageDiv.querySelector('.pkg-weight').value = data.weight;
        
        packagesListDiv.appendChild(clone);
        updatePackageWidgets();

        packageDiv.querySelector('.remove-btn').addEventListener('click', () => {
            if (packagesListDiv.children.length <= 1) {
                showStatus("Deve haver pelo menos um tipo de pacote!", 'warning');
                return;
            }
            packageDiv.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                packageDiv.remove();
                updatePackageWidgets();
            }, 300);
        });
        
        if (isWeightMode) {
            const weightFields = packageDiv.querySelectorAll('.weight-field');
            weightFields.forEach(field => {
                 field.classList.add('show');
                 field.classList.remove('hide');
            });
        }
    }
    
    function updatePackageWidgets() {
        const packageWidgets = packagesListDiv.querySelectorAll('.package-config');
        packageWidgets.forEach((widget, index) => {
            const packageId = index + 1;
            widget.querySelector('.package-title').textContent = `Tipo ${packageId}`;
            
            const inputs = ['length', 'width', 'height', 'quantity', 'weight'];
            inputs.forEach(type => {
                const label = widget.querySelector(`label[for^="pkg-${type}"]`);
                const input = widget.querySelector(`.pkg-${type}`);
                if (label && input) {
                    label.setAttribute('for', `pkg-${type}-${packageId}`);
                    input.id = `pkg-${type}-${packageId}`;
                }
            });
            
            widget.style.borderLeftColor = COLOR_PALETTE[index % COLOR_PALETTE.length];
        });
    }

    // --- COLETA E VALIDAÇÃO DE DADOS ---

    function getTruckData() {
        const trucks = [];
        
        const truck1 = {
            comprimento: parseFloat(truckLengthInput.value),
            largura: parseFloat(truckWidthInput.value),
            altura: parseFloat(truckHeightInput.value),
            pesoMaximo: isWeightMode ? parseFloat(truckWeightInput.value) : Infinity
        };
        
        if (isNaN(truck1.comprimento) || truck1.comprimento <= 0 ||
            isNaN(truck1.largura) || truck1.largura <= 0 ||
            isNaN(truck1.altura) || truck1.altura <= 0 ||
            (isWeightMode && (isNaN(truck1.pesoMaximo) || truck1.pesoMaximo <= 0))) {
            throw new Error("Dimensões do primeiro compartimento inválidas.");
        }
        trucks.push(truck1);
        
        if (isBitremMode) {
            const truck2 = {
                comprimento: parseFloat(truck2LengthInput.value),
                largura: parseFloat(truck2WidthInput.value),
                altura: parseFloat(truck2HeightInput.value),
                pesoMaximo: isWeightMode ? parseFloat(truck2WeightInput.value) : Infinity
            };
             if (isNaN(truck2.comprimento) || truck2.comprimento <= 0 ||
                 isNaN(truck2.largura) || truck2.largura <= 0 ||
                 isNaN(truck2.altura) || truck2.altura <= 0 ||
                 (isWeightMode && (isNaN(truck2.pesoMaximo) || truck2.pesoMaximo <= 0))) {
                 throw new Error("Dimensões do segundo compartimento inválidas.");
             }
            trucks.push(truck2);
        }
        return trucks;
    }
    
    function getPackagesData() {
        const packages = [];
        const packageWidgets = packagesListDiv.querySelectorAll('.package-config');
        
        packageWidgets.forEach((widget, index) => {
            const data = {
                comprimento: parseFloat(widget.querySelector('.pkg-length').value),
                largura: parseFloat(widget.querySelector('.pkg-width').value),
                altura: parseFloat(widget.querySelector('.pkg-height').value),
                quantidade: parseInt(widget.querySelector('.pkg-quantity').value),
                peso: isWeightMode ? parseFloat(widget.querySelector('.pkg-weight').value) : 1,
                nome: `Tipo ${index + 1}`
            };

            if (isNaN(data.comprimento) || data.comprimento <= 0 ||
                isNaN(data.largura) || data.largura <= 0 ||
                isNaN(data.altura) || data.altura <= 0 ||
                isNaN(data.quantidade) || data.quantidade <= 0 ||
                (isWeightMode && (isNaN(data.peso) || data.peso <= 0))) {
                throw new Error(`Dados inválidos para o ${data.nome}.`);
            }
            packages.push(data);
        });
        return packages;
    }
    
    // --- ALGORITMO DE EMPACOTAMENTO APRIMORADO ---
    
    function calculatePositions(trucks, packages) {
        const results = [];
        let allStatusMsgs = [];
        const EPSILON = 0.001; // Pequena tolerância para erros de ponto flutuante

        // ... (código de expansão e ordenação de pacotes) ...
        let allItems = [];
        packages.forEach((pkg, pkgIndex) => {
            for(let i = 0; i < pkg.quantidade; i++) {
                allItems.push({
                    length: pkg.comprimento, width: pkg.largura, height: pkg.altura,
                    weight: pkg.peso, volume: pkg.comprimento * pkg.largura * pkg.altura,
                    color: COLOR_PALETTE[pkgIndex % COLOR_PALETTE.length], name: pkg.nome,
                    originalIndex: pkgIndex
                });
            }
        });
        allItems.sort((a, b) => b.volume - a.volume);

        // Distribui itens entre caminhões (se bi-trem)
        const itemsPerTruck = Array.from({ length: trucks.length }, () => []);
        if (isBitremMode) {
             allItems.forEach((item, i) => itemsPerTruck[i % trucks.length].push(item));
        } else {
            itemsPerTruck[0] = allItems;
        }

        trucks.forEach((truck, truckIndex) => {
            const itemsToPack = itemsPerTruck[truckIndex];
            const positions = [];
            const statusMsgs = new Map();
            let currentWeight = 0;
            
            packages.forEach(p => statusMsgs.set(p.nome, { placed: 0, total: 0 }));
            itemsToPack.forEach(item => statusMsgs.get(item.name).total++);
            
            const gridSize = 5;
            const gridX = Math.ceil(truck.comprimento / gridSize);
            const gridY = Math.ceil(truck.largura / gridSize);
            const gridZ = Math.ceil(truck.altura / gridSize);
            const occupancy = Array.from({ length: gridX }, () => Array.from({ length: gridY }, () => Array(gridZ).fill(false)));
            
            for (const item of itemsToPack) {
                let placed = false;
                
                // CORREÇÃO: Usa a tolerância EPSILON na checagem de peso
                if (isWeightMode && (currentWeight + item.weight) > truck.pesoMaximo + EPSILON) {
                    continue;
                }

                // ... (lógica de posicionamento) ...
                const cellsX = Math.ceil(item.length / gridSize), cellsY = Math.ceil(item.width / gridSize), cellsZ = Math.ceil(item.height / gridSize);
                for (let z = 0; z <= gridZ - cellsZ && !placed; z++) {
                for (let y = 0; y <= gridY - cellsY && !placed; y++) {
                for (let x = 0; x <= gridX - cellsX && !placed; x++) {
                    const realX = x * gridSize, realY = y * gridSize, realZ = z * gridSize;
                    if (realX + item.length > truck.comprimento || realY + item.width > truck.largura || realZ + item.height > truck.altura) continue;
                    let isSpaceFree = true;
                    for (let i = x; i < x + cellsX && isSpaceFree; i++) for (let j = y; j < y + cellsY && isSpaceFree; j++) for (let k = z; k < z + cellsZ && isSpaceFree; k++) if (occupancy[i][j][k]) isSpaceFree = false;
                    if (isSpaceFree) {
                        for (let i = x; i < x + cellsX; i++) for (let j = y; j < y + cellsY; j++) for (let k = z; k < z + cellsZ; k++) occupancy[i][j][k] = true;
                        positions.push({ x: realX, y: realY, z: realZ, length: item.length, width: item.width, height: item.height, color: item.color, truckIndex: truckIndex });
                        statusMsgs.get(item.name).placed++;
                        currentWeight += item.weight;
                        placed = true;
                    }
                }}}
            }
            
            // CORREÇÃO: Usa a tolerância EPSILON para determinar se o peso foi excedido
            let weightExceeded = isWeightMode && currentWeight > truck.pesoMaximo + EPSILON;
            
            if (weightExceeded) {
                const truckSection = truckIndex === 0 ? document.getElementById('truck-main') : document.getElementById('truck-second');
                truckSection.classList.add('weight-error');
                setTimeout(() => truckSection.classList.remove('weight-error'), 3000);
            }
            
            const finalStatus = [];
            statusMsgs.forEach((stats, name) => {
                if(stats.total > 0) finalStatus.push(`${isBitremMode ? `C${truckIndex+1}`:''} ${name}: ${stats.placed < stats.total ? '⚠️' : '✓'} ${stats.placed}/${stats.total}`);
            });
            if (isWeightMode) {
                const weightStatus = `Peso: ${currentWeight.toFixed(1)}/${truck.pesoMaximo}kg`;
                finalStatus.push(weightStatus);
                if (weightExceeded) finalStatus.push(`PESO EXCEDIDO!`);
            }
            allStatusMsgs = allStatusMsgs.concat(finalStatus);
            results.push({ positions, truck, truckIndex });
        });

        return { results, statusMsgs: allStatusMsgs };
    }

    // --- FUNÇÕES DE DESENHO APRIMORADAS ---

    function clearScene() {
        for (let i = scene.children.length - 1; i >= 0; i--) {
            const obj = scene.children[i];
            if (obj.isMesh || (obj.isLineSegments && obj !== truckWireframe && obj !== truck2Wireframe)) {
                if(obj.geometry) obj.geometry.dispose();
                if(obj.material) obj.material.dispose();
                scene.remove(obj);
            }
        }
        if (truckWireframe) { scene.remove(truckWireframe); truckWireframe.geometry.dispose(); truckWireframe.material.dispose(); truckWireframe = null; }
        if (truck2Wireframe) { scene.remove(truck2Wireframe); truck2Wireframe.geometry.dispose(); truck2Wireframe.material.dispose(); truck2Wireframe = null; }
    }

    function drawTruck(trucks) {
        const spacing = 50;
        let totalLength = 0;
        trucks.forEach((truck, index) => {
            const geometry = new THREE.BoxGeometry(truck.comprimento, truck.altura, truck.largura);
            const edges = new THREE.EdgesGeometry(geometry);
            const wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: index === 0 ? 0x101f4d : 0x1e40af, linewidth: 3, transparent: true, opacity: 0.8 }));
            const offsetX = index === 0 ? 0 : trucks[0].comprimento + spacing;
            totalLength = offsetX + truck.comprimento;
            wireframe.position.set(offsetX + truck.comprimento / 2, truck.altura / 2, truck.largura / 2);
            scene.add(wireframe);
            if (index === 0) truckWireframe = wireframe; else truck2Wireframe = wireframe;
        });
        const maxDim = Math.max(totalLength, trucks[0].largura, trucks[0].altura);
        const center = new THREE.Vector3(totalLength / 2, trucks[0].altura / 2, trucks[0].largura / 2);
        controls.target.copy(center);
        camera.position.set(center.x, center.y + maxDim * 0.8, center.z + maxDim * 1.5);
        camera.lookAt(center);
    }
    
    function drawPackage(pos, truckOffset = 0) {
        const geometry = new THREE.BoxGeometry(pos.length, pos.height, pos.width);
        const material = new THREE.MeshLambertMaterial({ color: pos.color, transparent: true, opacity: 0.9 });
        const boxMesh = new THREE.Mesh(geometry, material);
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;
        boxMesh.position.set(truckOffset + pos.x + pos.length / 2, pos.z + pos.height / 2, pos.y + pos.width / 2);
        scene.add(boxMesh);
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, linewidth: 1 }));
        line.position.copy(boxMesh.position);
        scene.add(line);
    }

    // --- FUNÇÃO DE STATUS ---
    
    function showStatus(message, type = 'info') {
        statusBar.textContent = message;
        statusBar.className = `status-bar ${type}`;
        if (type === 'warning' || type === 'error') {
            statusBar.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => statusBar.style.animation = '', 500);
        }
    }

    // --- FUNÇÃO PRINCIPAL DE ATUALIZAÇÃO ---

    async function updateVisualization() {
        try {
            calculateBtn.innerHTML = '⏳ Calculando...';
            calculateBtn.disabled = true;
            showStatus('Processando cálculos...', 'info');
            await new Promise(resolve => setTimeout(resolve, 100));
            const trucks = getTruckData();
            const packages = getPackagesData();
            clearScene();
            drawTruck(trucks);
            const { results, statusMsgs } = calculatePositions(trucks, packages);
            results.forEach(result => {
                const spacing = 50;
                const truckOffset = result.truckIndex === 0 ? 0 : trucks[0].comprimento + spacing;
                result.positions.forEach(pos => drawPackage(pos, truckOffset));
            });
            const finalMessage = statusMsgs.join(' | ');
            const hasWarnings = statusMsgs.some(msg => msg.includes('⚠️') || msg.includes('EXCEDIDO'));
            if (hasWarnings) showStatus(finalMessage, 'warning');
            else showStatus(finalMessage, 'success');
        } catch (error) {
            showStatus(`Erro: ${error.message}`, 'warning');
        } finally {
            calculateBtn.innerHTML = '🧮 Calcular e Visualizar';
            calculateBtn.disabled = false;
        }
    }

    // --- EVENT LISTENERS E INICIALIZAÇÃO ---
    weightModeToggle.addEventListener('change', toggleWeightMode);
    bitremModeToggle.addEventListener('change', toggleBitremMode);
    addPackageBtn.addEventListener('click', () => addPackageWidget());
    calculateBtn.addEventListener('click', updateVisualization);
    initThreeJS();
    addPackageWidget();
    toggleWeightMode();
    toggleBitremMode();
    setTimeout(() => updateVisualization(), 500);
});
