// calculator.worker.js

/**
 * Função de cálculo de posicionamento de pacotes.
 * Esta função é executada em um thread separado para não bloquear a UI.
 */
function calculatePositions(trucks, packages, isWeightMode, isFragilityMode) {
    let allItems = [];
    packages.forEach(pkg => {
        for (let i = 0; i < pkg.qty; i++) {
            allItems.push({ ...pkg, vol: pkg.l * pkg.w * pkg.h });
        }
    });

    // Ordenação: primeiro por fragilidade (menos frágeis primeiro), depois por volume (maiores primeiro)
    allItems.sort((a, b) => a.frg - b.frg || b.vol - a.vol);

    let placedItems = [];
    let unplacedItems = [...allItems];
    let status = new Map(packages.map(p => [p.name, { placed: 0, total: p.qty }]));
    let truckStatus = new Map(trucks.map(t => [t.id, { currentWeight: 0, maxWeight: t.maxW }]));
    
    let itemsProcessed = 0;
    const totalItemsToProcess = allItems.length;
    let lastProgressUpdate = -1; // -1 para garantir que a primeira atualização (0%) seja enviada
    
    // Envia o progresso inicial
    postMessage({ type: 'progress', value: 0 });

    for (const truck of trucks) {
        if (unplacedItems.length === 0) break;

        const itemsToTry = [...unplacedItems];
        unplacedItems = [];
        
        const occupancy = new Array(Math.ceil(truck.l)).fill(0).map(() => 
            new Array(Math.ceil(truck.w)).fill(0).map(() => 
                new Array(Math.ceil(truck.h)).fill(null)
            )
        );
        
        for (const item of itemsToTry) {
            let placed = false;
            
            if (isWeightMode && truckStatus.get(truck.id).currentWeight + item.wgt > truck.maxW) {
                unplacedItems.push(item);
            } else {
                 // Loop de posicionamento (a parte mais lenta)
                for (let z = 0; z <= truck.h - item.h && !placed; z++) {
                    for (let y = 0; y <= truck.w - item.w && !placed; y++) {
                        for (let x = 0; x <= truck.l - item.l && !placed; x++) {
                            let canPlace = true;
                            // Verificação de colisão e fragilidade
                            for (let i = x; i < x + item.l && canPlace; i++) {
                                for (let j = y; j < y + item.w && canPlace; j++) {
                                    // Checa colisão com caixas já existentes
                                    for (let k = z; k < z + item.h; k++) {
                                        if (occupancy[i][j][k] !== null) {
                                            canPlace = false;
                                            break;
                                        }
                                    }
                                    if (!canPlace) break;

                                    // Checa fragilidade (item abaixo)
                                    if (z > 0 && isFragilityMode) {
                                        const itemBelow = occupancy[i][j][z - 1];
                                        if (itemBelow && itemBelow.frg > item.frg) {
                                            canPlace = false;
                                            break;
                                        }
                                    }
                                }
                            }
                            
                            if (canPlace) {
                                for (let i = x; i < x + item.l; i++) for (let j = y; j < y + item.w; j++) for (let k = z; k < z + item.h; k++) { occupancy[i][j][k] = item; }
                                placedItems.push({ ...item, x, y, z, truckId: truck.id });
                                truckStatus.get(truck.id).currentWeight += item.wgt;
                                status.get(item.name).placed++;
                                placed = true;
                            }
                        }
                    }
                }
                if (!placed) {
                    unplacedItems.push(item);
                }
            }

            itemsProcessed++;
            const progress = Math.round((itemsProcessed / totalItemsToProcess) * 100);
            if (progress > lastProgressUpdate) {
                postMessage({ type: 'progress', value: progress });
                lastProgressUpdate = progress;
            }
        }
    }
    // Convertendo Maps para Arrays para poderem ser transferidos pelo worker
    return { 
        placedItems, 
        unplacedItems, 
        status: Array.from(status.entries()), 
        truckStatus: Array.from(truckStatus.entries()) 
    };
}

// Ouve mensagens da thread principal
self.onmessage = function(e) {
    const { trucks, packages, isWeightMode, isFragilityMode } = e.data;
    try {
        const results = calculatePositions(trucks, packages, isWeightMode, isFragilityMode);
        // Envia o resultado final de volta
        postMessage({ type: 'result', data: results });
    } catch (error) {
        // Envia um erro de volta, se ocorrer
        postMessage({ type: 'error', message: error.message });
    }
};