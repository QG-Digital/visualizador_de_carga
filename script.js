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
    const packagesListDiv = document.getElementById('packages-list');
    const addPackageBtn = document.getElementById('add-package-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const statusBar = document.getElementById('status-bar');
    const packageTemplate = document.getElementById('package-template');
    const vizContainer = document.getElementById('visualization-container');

    // --- CONFIGURAÇÃO DA CENA 3D (THREE.JS) ---
    let scene, camera, renderer, controls, truckWireframe;
    
    function initThreeJS() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff); // Fundo branco dentro do canvas

        camera = new THREE.PerspectiveCamera(50, vizContainer.clientWidth / vizContainer.clientHeight, 0.1, 10000);
        camera.position.set(600, 600, 800);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Alpha true para fundo transparente se necessário
        renderer.setSize(vizContainer.clientWidth, vizContainer.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio); // Melhor qualidade em telas HiDPI
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        vizContainer.appendChild(renderer.domElement);
        
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.screenSpacePanning = false;
        controls.minDistance = 200;
        controls.maxDistance = 5000;


        // Iluminação
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(200, 500, 300);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();
        
        window.addEventListener('resize', () => {
            camera.aspect = vizContainer.clientWidth / vizContainer.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(vizContainer.clientWidth, vizContainer.clientHeight);
        }, false);
    }

    // --- LÓGICA DA INTERFACE ---

    function addPackageWidget(data = { length: 100, width: 50, height: 50, quantity: 10 }) {
        if (packagesListDiv.children.length >= COLOR_PALETTE.length) {
            statusBar.textContent = `Limite de ${COLOR_PALETTE.length} tipos de pacotes atingido!`;
            statusBar.className = 'status-bar warning';
            return;
        }
        
        const clone = packageTemplate.content.cloneNode(true);
        const packageDiv = clone.querySelector('.package-config');
        
        packageDiv.querySelector('.pkg-length').value = data.length;
        packageDiv.querySelector('.pkg-width').value = data.width;
        packageDiv.querySelector('.pkg-height').value = data.height;
        packageDiv.querySelector('.pkg-quantity').value = data.quantity;
        
        packagesListDiv.appendChild(clone);
        updatePackageWidgets();

        packageDiv.querySelector('.remove-btn').addEventListener('click', () => {
             if (packagesListDiv.children.length <= 1) {
                statusBar.textContent = "Deve haver pelo menos um tipo de pacote!";
                statusBar.className = 'status-bar warning';
                return;
            }
            packageDiv.remove();
            updatePackageWidgets();
        });
    }
    
    function updatePackageWidgets() {
        const packageWidgets = packagesListDiv.querySelectorAll('.package-config');
        packageWidgets.forEach((widget, index) => {
            const packageId = index + 1;
            widget.querySelector('.package-title').textContent = `Tipo ${packageId}`;
            
            // Atualiza labels e ids para acessibilidade
            widget.querySelector('label[for^="pkg-length"]').setAttribute('for', `pkg-length-${packageId}`);
            widget.querySelector('.pkg-length').id = `pkg-length-${packageId}`;
            widget.querySelector('label[for^="pkg-width"]').setAttribute('for', `pkg-width-${packageId}`);
            widget.querySelector('.pkg-width').id = `pkg-width-${packageId}`;
            // ... e assim por diante para todos os inputs
            
            // Adiciona cor da borda baseada no índice
            widget.style.borderLeftColor = COLOR_PALETTE[index % COLOR_PALETTE.length];
        });
    }

    // --- COLETA E VALIDAÇÃO DE DADOS ---

    function getTruckData() {
        const dims = {
            comprimento: parseFloat(truckLengthInput.value),
            largura: parseFloat(truckWidthInput.value),
            altura: parseFloat(truckHeightInput.value),
        };
        if (Object.values(dims).some(v => isNaN(v) || v <= 0)) {
            throw new Error("Dimensões do caminhão inválidas. Devem ser números positivos.");
        }
        return dims;
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
                nome: `Tipo ${index + 1}`
            };

            if (isNaN(data.comprimento) || data.comprimento <= 0 ||
                isNaN(data.largura)     || data.largura <= 0 ||
                isNaN(data.altura)      || data.altura <= 0 ||
                isNaN(data.quantidade)  || data.quantidade <= 0) 
            {
                throw new Error(`Dados inválidos para o ${data.nome}. Valores devem ser números positivos.`);
            }

            packages.push(data);
        });
        return packages;
    }
    
    // --- ALGORITMO DE EMPACOTAMENTO (Heurística Best-Fit) ---
    
    function calculatePositions(truckDims, packages) {
        // Expande cada tipo de pacote em itens individuais
        let allItems = [];
        packages.forEach((pkg, index) => {
            for(let i=0; i < pkg.quantidade; i++) {
                allItems.push({
                    length: pkg.comprimento,
                    width: pkg.largura,
                    height: pkg.altura,
                    volume: pkg.comprimento * pkg.largura * pkg.altura,
                    color: COLOR_PALETTE[index % COLOR_PALETTE.length],
                    name: pkg.nome,
                });
            }
        });

        // Ordena todos os itens do maior para o menor
        allItems.sort((a, b) => b.volume - a.volume);

        const positions = [];
        const statusMsgs = new Map();
        packages.forEach(p => statusMsgs.set(p.nome, { placed: 0, total: p.quantidade }));
        
        const gridSize = 5; // Aumentar a resolução pode melhorar o encaixe, mas custa performance
        const gridX = Math.ceil(truckDims.comprimento / gridSize);
        const gridY = Math.ceil(truckDims.largura / gridSize);
        const gridZ = Math.ceil(truckDims.altura / gridSize);
        const occupancy = Array.from({ length: gridX }, () => 
                          Array.from({ length: gridY }, () => 
                          Array(gridZ).fill(false)));
        
        for (const item of allItems) {
            let placed = false;
            
            if (item.length > truckDims.comprimento || item.width > truckDims.largura || item.height > truckDims.altura) {
                continue; // Pula item maior que o caminhão
            }

            const cellsX = Math.ceil(item.length / gridSize);
            const cellsY = Math.ceil(item.width / gridSize);
            const cellsZ = Math.ceil(item.height / gridSize);

            // Tenta encaixar no primeiro espaço livre que encontrar (First-Fit)
            for (let z = 0; z <= gridZ - cellsZ; z++) {
                for (let y = 0; y <= gridY - cellsY; y++) {
                    for (let x = 0; x <= gridX - cellsX; x++) {
                        
                        // Checagem de colisão com os limites reais do caminhão
                        const realX = x * gridSize;
                        const realY = y * gridSize;
                        const realZ = z * gridSize;
                        if (realX + item.length > truckDims.comprimento ||
                            realY + item.width > truckDims.largura ||
                            realZ + item.height > truckDims.altura) {
                            continue;
                        }

                        let isSpaceFree = true;
                        // Verifica se o espaço no grid está livre
                        for (let i = x; i < x + cellsX; i++) {
                            for (let j = y; j < y + cellsY; j++) {
                                for (let k = z; k < z + cellsZ; k++) {
                                    if (occupancy[i][j][k]) {
                                        isSpaceFree = false; break;
                                    }
                                }
                                if (!isSpaceFree) break;
                            }
                            if (!isSpaceFree) break;
                        }

                        if (isSpaceFree) {
                            // Ocupa o espaço
                            for (let i = x; i < x + cellsX; i++) {
                                for (let j = y; j < y + cellsY; j++) {
                                    for (let k = z; k < z + cellsZ; k++) {
                                        occupancy[i][j][k] = true;
                                    }
                                }
                            }

                            positions.push({
                                x: realX, y: realY, z: realZ,
                                length: item.length, width: item.width, height: item.height,
                                color: item.color
                            });
                            
                            statusMsgs.get(item.name).placed++;
                            placed = true;
                            break; // sai do loop x
                        }
                    }
                    if (placed) break; // sai do loop y
                }
                if (placed) break; // sai do loop z
            }
        }
        
        const finalStatus = [];
        statusMsgs.forEach((stats, name) => {
            if (stats.placed < stats.total) {
                finalStatus.push(`AVISO: ${name} - Couberam ${stats.placed} de ${stats.total}.`);
            } else {
                finalStatus.push(`${name}: ${stats.placed}/${stats.total} alocados.`);
            }
        });

        return { positions, statusMsgs: finalStatus };
    }


    // --- FUNÇÕES DE DESENHO (THREE.JS) ---

    function clearScene() {
        for (let i = scene.children.length - 1; i >= 0; i--) {
            const obj = scene.children[i];
            // Não remove luzes, helpers ou o próprio wireframe do caminhão
            if (obj.isMesh || (obj.isLineSegments && obj !== truckWireframe)) {
                if(obj.geometry) obj.geometry.dispose();
                if(obj.material) obj.material.dispose();
                scene.remove(obj);
            }
        }
    }

    function drawTruck(dims) {
        if (truckWireframe) {
            scene.remove(truckWireframe);
            truckWireframe.geometry.dispose();
            truckWireframe.material.dispose();
        }
        
        const geometry = new THREE.BoxGeometry(dims.comprimento, dims.altura, dims.largura);
        const edges = new THREE.EdgesGeometry(geometry);
        truckWireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ 
            color: 0x101f4d, 
            linewidth: 2 
        }));
        
        // Centraliza o caminhão e sua visualização
        const center = new THREE.Vector3(
            dims.comprimento / 2,
            dims.altura / 2,
            dims.largura / 2
        );
        truckWireframe.position.copy(center);
        
        scene.add(truckWireframe);
        
        controls.target.copy(center);
        // Ajusta a posição da câmera para enquadrar o caminhão
        const maxDim = Math.max(dims.comprimento, dims.largura, dims.altura);
        camera.position.x = center.x;
        camera.position.y = center.y + maxDim * 0.5;
        camera.position.z = center.z + maxDim * 1.5;
        camera.lookAt(center);
    }
    
    function drawPackage(pos) {
        const geometry = new THREE.BoxGeometry(pos.length, pos.height, pos.width);
        const material = new THREE.MeshLambertMaterial({ 
            color: pos.color, 
        });
        const boxMesh = new THREE.Mesh(geometry, material);
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;

        boxMesh.position.set(
            pos.x + pos.length / 2,
            pos.z + pos.height / 2, // Z do algoritmo é o Y do Three.js (altura)
            pos.y + pos.width / 2   // Y do algoritmo é o Z do Three.js (profundidade)
        );
        scene.add(boxMesh);
        
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ 
            color: 0x000000, 
            transparent: true, 
            opacity: 0.25 
        }));
        line.position.copy(boxMesh.position);
        scene.add(line);
    }

    // --- FUNÇÃO PRINCIPAL DE ATUALIZAÇÃO ---

    async function updateVisualization() {
        try {
            calculateBtn.innerHTML = '⏳ Calculando...';
            calculateBtn.disabled = true;
            statusBar.textContent = 'Processando...';
            statusBar.className = 'status-bar';
            
            // Pequeno delay para o UI atualizar antes do processamento pesado
            await new Promise(resolve => setTimeout(resolve, 50));

            const truckDims = getTruckData();
            const packages = getPackagesData();
            
            clearScene();
            drawTruck(truckDims);

            const { positions, statusMsgs } = calculatePositions(truckDims, packages);
            positions.forEach(drawPackage);

            statusBar.textContent = statusMsgs.join(' | ');
            statusBar.classList.remove('warning', 'success');
            
            if (statusMsgs.some(msg => msg.includes('AVISO'))) {
                statusBar.classList.add('warning');
            } else {
                statusBar.classList.add('success');
            }

        } catch (error) {
            statusBar.textContent = `Erro: ${error.message}`;
            statusBar.className = 'status-bar warning';
        } finally {
            calculateBtn.innerHTML = '🧮 Calcular e Visualizar';
            calculateBtn.disabled = false;
        }
    }

    // --- EVENT LISTENERS E INICIALIZAÇÃO ---
    addPackageBtn.addEventListener('click', () => addPackageWidget());
    calculateBtn.addEventListener('click', updateVisualization);

    initThreeJS();
    addPackageWidget(); 
    updateVisualization();
});