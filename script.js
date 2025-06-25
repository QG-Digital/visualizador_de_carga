// --- LÓGICA DO EFEITO DE PARTÍCULAS (sem alterações) ---
const particleCanvas = document.getElementById('particle-canvas');
const ctx = particleCanvas.getContext('2d');
let particles = [];
function resizeCanvas() { particleCanvas.width = window.innerWidth; particleCanvas.height = window.innerHeight; }
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
function handlePointerMove(e) {
    let x, y;
    if (e.touches && e.touches.length > 0) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
    else { x = e.clientX; y = e.clientY; }
    for (let i = 0; i < 2; i++) {
        particles.push({ x, y, size: Math.random() * 4 + 1, speedX: Math.random() * 3 - 1.5, speedY: Math.random() * 3 - 1.5, color: 'rgba(59, 130, 246, 0.5)', life: 50 });
    }
}
document.addEventListener('mousemove', handlePointerMove);
document.addEventListener('touchmove', handlePointerMove);
function animateParticles() {
    ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.speedX; p.y += p.speedY; p.size *= 0.96; p.life--;
        if (p.life <= 0 || p.size < 0.5) { particles.splice(i, 1); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); }
    }
    requestAnimationFrame(animateParticles);
}
animateParticles();

// --- LÓGICA PRINCIPAL DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {

    const { jsPDF } = window.jspdf;

    // --- Seletores de Elementos ---
    const COLOR_PALETTE = ["#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#f59e0b", "#6366f1", "#ec4899", "#22d3ee", "#f97316", "#14b8a6"];
    const truckLengthInput = document.getElementById('truck-length'), truckWidthInput = document.getElementById('truck-width'), truckHeightInput = document.getElementById('truck-height'), truckWeightInput = document.getElementById('truck-weight');
    const truck2LengthInput = document.getElementById('truck2-length'), truck2WidthInput = document.getElementById('truck2-width'), truck2HeightInput = document.getElementById('truck2-height'), truck2WeightInput = document.getElementById('truck2-weight');
    const packagesListDiv = document.getElementById('packages-list'), addPackageBtn = document.getElementById('add-package-btn'), calculateBtn = document.getElementById('calculate-btn'), pdfBtn = document.getElementById('pdf-btn'), statusBar = document.getElementById('status-bar'), packageTemplate = document.getElementById('package-template'), vizContainer = document.getElementById('visualization-container');
    const weightModeToggle = document.getElementById('weight-mode-toggle'), fragilityModeToggle = document.getElementById('fragility-mode-toggle'), bitremModeToggle = document.getElementById('bitrem-mode-toggle');
    const truckDimensionsTitle = document.getElementById('truck-dimensions-title'), mainTruckTitle = document.getElementById('main-truck-title'), truckSecondSection = document.getElementById('truck-second'), bitremHint = document.getElementById('bitrem-hint');
    const loadingModal = document.getElementById('loading-modal'), progressBar = document.getElementById('progress-bar'), progressText = document.getElementById('progress-text');
    
    // --- Variáveis de Estado ---
    let scene, camera, renderer, controls;
    let isWeightMode = false, isFragilityMode = false, isBitremMode = false;
    let lastCalculationData = null;
    let activeTooltip = null;

    // --- Inicialização do Web Worker ---
    let calculatorWorker;
    if (window.Worker) {
        calculatorWorker = new Worker('calculator.worker.js'); 
    } else {
        alert("Seu navegador não suporta Web Workers. Cálculos pesados podem travar a interface.");
    }

    function initThreeJS() {
        scene = new THREE.Scene(); scene.background = new THREE.Color(getComputedStyle(document.body).getPropertyValue('--bg-color').trim());
        camera = new THREE.PerspectiveCamera(50, vizContainer.clientWidth / vizContainer.clientHeight, 0.1, 10000);
        camera.position.set(600, 600, 800); camera.lookAt(0, 0, 0);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(vizContainer.clientWidth, vizContainer.clientHeight); renderer.setPixelRatio(window.devicePixelRatio);
        vizContainer.appendChild(renderer.domElement);
        controls = new THREE.OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8), directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(300, 500, 400); scene.add(ambientLight, directionalLight);
        function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
        animate();
        window.addEventListener('resize', () => { if (vizContainer && renderer) { camera.aspect = vizContainer.clientWidth / vizContainer.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(vizContainer.clientWidth, vizContainer.clientHeight); }});
    }

    function toggleFields(selector, isEnabled) { document.querySelectorAll(selector).forEach(field => { field.style.display = isEnabled ? '' : 'none'; }); }
    function toggleWeightMode() { isWeightMode = weightModeToggle.checked; toggleFields('.weight-field', isWeightMode); }
    function toggleFragilityMode() { isFragilityMode = fragilityModeToggle.checked; toggleFields('.fragility-field', isFragilityMode); }
    function toggleBitremMode() {
        isBitremMode = bitremModeToggle.checked;
        truckDimensionsTitle.textContent = isBitremMode ? 'Dimensões dos Compartimentos (cm)' : 'Dimensões do Caminhão (cm)';
        mainTruckTitle.textContent = isBitremMode ? 'Primeiro Compartimento' : 'Caminhão';
        truckSecondSection.style.display = isBitremMode ? 'block' : 'none';
        bitremHint.style.display = isBitremMode ? 'block' : 'none';
    }

    function addPackageWidget(data = { name: `Tipo ${packagesListDiv.children.length + 1}`, len: 100, wid: 50, hgt: 50, qty: 10, wgt: 30, frg: 1 }) {
        if (packagesListDiv.children.length >= COLOR_PALETTE.length) { showStatus(`Limite de ${COLOR_PALETTE.length} tipos de pacotes atingido!`, 'warning'); return; }
        const clone = packageTemplate.content.cloneNode(true);
        const packageDiv = clone.querySelector('.package-config');
        const titleElement = packageDiv.querySelector('.package-title');
        titleElement.textContent = data.name;
        packageDiv.querySelector('.pkg-length').value = data.len; packageDiv.querySelector('.pkg-width').value = data.wid; packageDiv.querySelector('.pkg-height').value = data.hgt; packageDiv.querySelector('.pkg-quantity').value = data.qty; packageDiv.querySelector('.pkg-weight').value = data.wgt; packageDiv.querySelector('.pkg-fragility').value = data.frg;
        packagesListDiv.appendChild(clone);
        updatePackageWidgets();
        packageDiv.querySelector('.remove-btn').addEventListener('click', () => { if (packagesListDiv.children.length > 1) { packageDiv.remove(); updatePackageWidgets(); } });
        titleElement.addEventListener('dblclick', () => makeTitleEditable(titleElement));
        toggleWeightMode(); toggleFragilityMode();
    }

    function makeTitleEditable(titleElement) {
        const oldName = titleElement.textContent;
        const input = document.createElement('input');
        input.type = 'text'; input.value = oldName; input.className = 'package-title-input';
        titleElement.replaceWith(input);
        input.focus();
        const save = () => {
            const newName = input.value.trim() || oldName;
            const newTitleElement = document.createElement('h3');
            newTitleElement.className = 'package-title'; newTitleElement.textContent = newName;
            newTitleElement.title = 'Dê um duplo clique para renomear';
            input.replaceWith(newTitleElement);
            newTitleElement.addEventListener('dblclick', () => makeTitleEditable(newTitleElement));
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = oldName; input.blur(); } });
    }

    function updatePackageWidgets() {
        packagesListDiv.querySelectorAll('.package-config').forEach((widget, index) => { widget.style.borderLeftColor = COLOR_PALETTE[index % COLOR_PALETTE.length]; });
    }

    function getTruckData() {
        const trucks = [];
        const truck1 = { id: 0, l: parseFloat(truckLengthInput.value), w: parseFloat(truckWidthInput.value), h: parseFloat(truckHeightInput.value), maxW: isWeightMode ? parseFloat(truckWeightInput.value) : Infinity };
        if (isNaN(truck1.l) || truck1.l <= 0) throw new Error("Dimensões do caminhão inválidas.");
        trucks.push(truck1);
        if (isBitremMode) {
            const truck2 = { id: 1, l: parseFloat(truck2LengthInput.value), w: parseFloat(truck2WidthInput.value), h: parseFloat(truck2HeightInput.value), maxW: isWeightMode ? parseFloat(truck2WeightInput.value) : Infinity };
            if (isNaN(truck2.l) || truck2.l <= 0) throw new Error("Dimensões do bi-trem inválidas.");
            trucks.push(truck2);
        }
        return trucks;
    }

    function getPackagesData() {
        return Array.from(packagesListDiv.querySelectorAll('.package-config')).map((widget, index) => {
            const data = {
                name: widget.querySelector('.package-title').textContent,
                l: parseFloat(widget.querySelector('.pkg-length').value), w: parseFloat(widget.querySelector('.pkg-width').value), h: parseFloat(widget.querySelector('.pkg-height').value), qty: parseInt(widget.querySelector('.pkg-quantity').value),
                wgt: isWeightMode ? parseFloat(widget.querySelector('.pkg-weight').value) : 0,
                frg: isFragilityMode ? parseInt(widget.querySelector('.pkg-fragility').value) : 0,
                color: COLOR_PALETTE[index % COLOR_PALETTE.length]
            };
            if (isNaN(data.l) || isNaN(data.qty) || data.l <= 0 || data.qty <= 0) throw new Error(`Dados inválidos para o pacote "${data.name}".`);
            return data;
        });
    }

    function clearScene() { for (let i = scene.children.length - 1; i >= 0; i--) { const obj = scene.children[i]; if (obj.isMesh || obj.isLineSegments) { if (obj.geometry) obj.geometry.dispose(); if (obj.material) obj.material.dispose(); scene.remove(obj); } } }
    
    function drawTruck(trucks) {
        let totalLength = 0;
        trucks.forEach((truck, index) => {
            const geometry = new THREE.BoxGeometry(truck.l, truck.h, truck.w), edges = new THREE.EdgesGeometry(geometry), wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: index === 0 ? 0x101f4d : 0x1e40af, linewidth: 2 }));
            const spacing = 50, offsetX = index === 0 ? 0 : trucks[0].l + spacing;
            wireframe.position.set(offsetX + truck.l / 2, truck.h / 2, truck.w / 2); scene.add(wireframe);
            totalLength = offsetX + truck.l;
        });
        const maxDim = Math.max(totalLength, trucks[0].w, trucks[0].h), center = new THREE.Vector3(totalLength / 2, trucks[0].h / 2, trucks[0].w / 2);
        controls.target.copy(center); camera.position.set(center.x, center.y + maxDim, center.z + maxDim * 1.5);
    }
    
    function drawPackage(pos, trucks) {
        const geometry = new THREE.BoxGeometry(pos.l, pos.h, pos.w), material = new THREE.MeshLambertMaterial({ color: pos.color, transparent: true, opacity: 0.9 }), boxMesh = new THREE.Mesh(geometry, material);
        const spacing = 50, truckOffset = pos.truckId === 0 ? 0 : trucks[0].l + spacing;
        boxMesh.position.set(truckOffset + pos.x + pos.l / 2, pos.z + pos.h / 2, pos.y + pos.w / 2); scene.add(boxMesh);
    }
    
    function showStatus(message, type = 'info') { statusBar.textContent = message; statusBar.className = `status-bar ${type}`; }

    function showLoadingModal(show) {
        if (show) {
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
            loadingModal.style.display = 'flex';
            setTimeout(() => loadingModal.classList.add('visible'), 10);
        } else {
            loadingModal.classList.remove('visible');
            setTimeout(() => loadingModal.style.display = 'none', 300);
        }
    }

    function updateVisualization() {
        pdfBtn.disabled = true;
        try {
            calculateBtn.disabled = true;
            calculateBtn.innerHTML = '⏳ Calculando...';
            showStatus('Iniciando cálculo...', 'info');

            const trucks = getTruckData();
            const packages = getPackagesData();
            if (packages.length === 0) throw new Error("Adicione pelo menos um tipo de pacote.");

            showLoadingModal(true);
            calculatorWorker.postMessage({ trucks, packages, isWeightMode, isFragilityMode });

        } catch (error) {
            showStatus(`Erro: ${error.message}`, 'warning');
            calculateBtn.disabled = false;
            calculateBtn.innerHTML = '🧮 Calcular e Visualizar';
            showLoadingModal(false);
        }
    }

    if (calculatorWorker) {
        calculatorWorker.onmessage = function(e) {
            const { type, data, message, value } = e.data;

            if (type === 'progress') {
                const percent = Math.round(value);
                progressBar.style.width = `${percent}%`;
                progressText.textContent = `${percent}%`;

            } else if (type === 'result') {
                lastCalculationData = {
                    placedItems: data.placedItems,
                    unplacedItems: data.unplacedItems,
                    status: new Map(data.status),
                    truckStatus: new Map(data.truckStatus)
                };
                
                const { placedItems, unplacedItems, status, truckStatus } = lastCalculationData;

                const trucks = getTruckData();
                clearScene();
                drawTruck(trucks);
                placedItems.forEach(pos => drawPackage(pos, trucks));

                let finalMessage = Array.from(status.entries()).map(([name, data]) => `${name}: ${data.placed < data.total ? '⚠️' : '✓'} ${data.placed}/${data.total}`).join(' | ');
                
                if (isWeightMode) {
                    let weightMessages = [];
                     truckStatus.forEach((data, id) => {
                        const name = trucks.length > 1 ? `C${id+1}` : 'Peso';
                        const currentW = Math.round(data.currentWeight * 10) / 10;
                        const maxW = Math.round(data.maxWeight * 10) / 10;
                        weightMessages.push(`${name}: ${currentW}/${maxW}kg`);
                     });
                     finalMessage += ` | ${weightMessages.join(' | ')}`;
                }
                if (unplacedItems.length > 0) {
                    const reason = isWeightMode ? "por exceder o limite de peso/espaço" : "por falta de espaço";
                    finalMessage += ` | 🔴 ${unplacedItems.length} item(s) não coube(ram) ${reason}.`;
                }

                showStatus(finalMessage, unplacedItems.length > 0 ? 'warning' : 'success');
                pdfBtn.disabled = false;
                calculateBtn.disabled = false;
                calculateBtn.innerHTML = '🧮 Calcular e Visualizar';
                showLoadingModal(false);

            } else if (type === 'error') {
                showStatus(`Erro no cálculo: ${message}`, 'warning');
                calculateBtn.disabled = false;
                calculateBtn.innerHTML = '🧮 Calcular e Visualizar';
                showLoadingModal(false);
            }
        };

        calculatorWorker.onerror = function(error) {
            console.error('Erro no Worker:', error);
            showStatus(`Erro crítico no Worker: ${error.message}. Verifique o console.`, 'warning');
            calculateBtn.disabled = false;
            calculateBtn.innerHTML = '🧮 Calcular e Visualizar';
            showLoadingModal(false);
        };
    }

    function generatePDF() {
        if (!lastCalculationData) { showStatus('Calcule a carga antes de gerar o PDF.', 'warning'); return; }
        
        const { unplacedItems, status, truckStatus } = lastCalculationData;
        const packages = getPackagesData();
        const trucks = getTruckData();
        
        const doc = new jsPDF();
        const canvasImage = renderer.domElement.toDataURL('image/png', 1.0);
        
        doc.setFontSize(18); doc.text('Relatório de Carregamento 3D', 14, 22);
        doc.addImage(canvasImage, 'PNG', 15, 30, 180, 100);
        let finalY = 140;

        doc.setFontSize(14); doc.text('Lista de Itens para Carregamento', 14, finalY); finalY += 7;
        const tableBody = packages.map(p => [p.name, `${p.l}x${p.w}x${p.h} cm`, p.qty, isWeightMode ? `${p.wgt} kg` : '-', isFragilityMode ? p.frg : '-']);
        doc.autoTable({ head: [["Nome do Item", "Dimensões (CxLxA)", "Qtd", "Peso Unit.", "Frag."]], body: tableBody, startY: finalY, theme: 'grid' });
        finalY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(14); doc.text('Resumo do Carregamento', 14, finalY); finalY += 7;
        let summaryText = [];
        status.forEach((data, name) => { summaryText.push(`${name}: ${data.placed} de ${data.total} alocados.`); });
        if (isWeightMode) {
             truckStatus.forEach((data, id) => {
                const name = trucks.length > 1 ? `Compartimento ${id+1}` : 'Peso Total';
                const currentW = Math.round(data.currentWeight * 10) / 10;
                summaryText.push(`${name}: ${currentW}kg de ${data.maxWeight}kg utilizados.`);
             });
        }
        doc.setFontSize(10); doc.text(summaryText, 14, finalY); finalY += summaryText.length * 5;

        if (unplacedItems.length > 0) {
            finalY += 5;
            doc.setFontSize(12); doc.setTextColor(220, 53, 69); doc.text(`Itens Não Alocados (${unplacedItems.length})`, 14, finalY);
            doc.setTextColor(0, 0, 0); finalY += 7;
            let unplacedSummary = {};
            unplacedItems.forEach(item => { unplacedSummary[item.name] = (unplacedSummary[item.name] || 0) + 1; });
            let unplacedText = [];
            for (const name in unplacedSummary) { unplacedText.push(`- ${name}: ${unplacedSummary[name]} unidade(s)`); }
            doc.setFontSize(10); doc.text(unplacedText, 14, finalY);
        }
        doc.save(`relatorio_carga_${new Date().toISOString().slice(0,10)}.pdf`);
    }

    function setupTooltips() {
        document.querySelectorAll('.tooltip-icon').forEach(icon => {
            icon.addEventListener('mouseenter', (e) => {
                if (activeTooltip) activeTooltip.remove();
                const tooltipText = e.currentTarget.getAttribute('data-tooltip');
                activeTooltip = document.createElement('div');
                activeTooltip.className = 'tooltip-instance'; activeTooltip.innerHTML = tooltipText; document.body.appendChild(activeTooltip);
                const iconRect = e.currentTarget.getBoundingClientRect(), tooltipRect = activeTooltip.getBoundingClientRect();
                activeTooltip.style.left = `${iconRect.left + (iconRect.width / 2) - (tooltipRect.width / 2)}px`;
                activeTooltip.style.top = `${iconRect.top - tooltipRect.height - 8}px`;
                requestAnimationFrame(() => { activeTooltip.style.opacity = '1'; });
            });
            icon.addEventListener('mouseleave', () => { if (activeTooltip) { activeTooltip.style.opacity = '0'; setTimeout(() => activeTooltip.remove(), 200); activeTooltip = null; } });
        });
    }

    // --- EVENT LISTENERS E INICIALIZAÇÃO ---
    weightModeToggle.addEventListener('change', toggleWeightMode);
    fragilityModeToggle.addEventListener('change', toggleFragilityMode);
    bitremModeToggle.addEventListener('change', toggleBitremMode);
    addPackageBtn.addEventListener('click', () => addPackageWidget());
    calculateBtn.addEventListener('click', updateVisualization);
    pdfBtn.addEventListener('click', generatePDF);
    
    initThreeJS();
    setupTooltips();
    addPackageWidget();
    setTimeout(() => updateVisualization(), 200);
});