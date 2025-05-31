// --- Bloque de compras y modal historial de compras ---

function mostrarBloqueCompras(purchase_history) {
    const comprasGrid = document.querySelector('.compras-grid');
    const proveedorFull = document.querySelector('.proveedor-full');
    if (!purchase_history) {
        comprasGrid.innerHTML = '<div>Sin historial de compras</div><div></div>';
        proveedorFull.textContent = '';
        return;
    }
    // Formatear fecha
    let fecha = purchase_history.order_date || 'No disponible';
    if (fecha && fecha !== 'No disponible') {
        let soloFecha = String(fecha).split(' ')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) {
            const [y, m, d] = soloFecha.split('-');
            fecha = `${d}/${m}/${y}`;
        } else {
            fecha = soloFecha;
        }
    }
    // Costo con IVA
    let costo = 'No disponible';
    if (purchase_history.price) {
        const costoIVA = Math.round(parseInt(purchase_history.price) * 1.19);
        costo = `$${costoIVA.toLocaleString('es-CL')}`;
    }
    // Nº Pedido (solo código)
    let pedido = purchase_history.po_order || 'No disponible';
    if (pedido && pedido !== 'No disponible') {
        pedido = String(pedido);
        const partes = pedido.split(',');
        if (partes.length > 1 && /^\d+$/.test(partes[0].trim())) {
            pedido = partes.slice(1).join(',').trim();
        }
    }
    const cantidad = purchase_history.qty !== undefined ? purchase_history.qty : 'No disponible';
    const proveedor = purchase_history.partner_id && purchase_history.partner_id.length > 1 ? purchase_history.partner_id[1] : 'No disponible';
    comprasGrid.innerHTML = `
        <div class="compras-col">
            <div class="compras-row"><span class="compras-label">Fecha: </span><span class="compras-value">${fecha}</span></div>
            <div class="compras-row"><span class="compras-label">Costo: </span><span class="compras-value">${costo}</span></div>
        </div>
        <div class="compras-col">
            <div class="compras-row"><span class="compras-label">Cant: </span><span class="compras-value">${cantidad}</span></div>
            <div class="compras-row"><span class="compras-label">Pedido: </span><span class="compras-value">${pedido}</span></div>
        </div>
    `;
    proveedorFull.innerHTML = `<span class="proveedor-label">Proveedor:</span> <span class="proveedor-value">${proveedor}</span>`;
}

// Modal historial de compras
const verTodosComprasBtn = document.getElementById('verTodosComprasBtn');
const modalComprasBg = document.getElementById('modalComprasBg');
const modalComprasClose = document.getElementById('modalComprasClose');
const tablaComprasContainer = document.getElementById('tablaComprasContainer');

let historialComprasActual = [];

if (verTodosComprasBtn) {
    verTodosComprasBtn.addEventListener('click', function() {
        if (!selectedProduct || !selectedProduct.purchase_history_all) return;
        mostrarTablaCompras(selectedProduct.purchase_history_all);
        modalComprasBg.classList.add('active');
    });
}
if (modalComprasClose) {
    modalComprasClose.addEventListener('click', function() {
        modalComprasBg.classList.remove('active');
    });
}
if (modalComprasBg) {
    modalComprasBg.addEventListener('click', function(e) {
        if (e.target === modalComprasBg) {
            modalComprasBg.classList.remove('active');
        }
    });
}

function mostrarTablaCompras(historial) {
    if (!Array.isArray(historial) || historial.length === 0) {
        tablaComprasContainer.innerHTML = '<div style="color:#aaa;">No hay historial de compras para este producto.</div>';
        return;
    }
    let html = '<table class="tabla-compras">';
    html += '<tr><th>Fecha</th><th>Costo</th><th>Cant</th><th>Proveedor</th></tr>';
    historial.forEach(item => {
        // Formatear fecha
        let fecha = item.order_date || '';
        if (fecha) {
            let soloFecha = String(fecha).split(' ')[0];
            if (/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) {
                const [y, m, d] = soloFecha.split('-');
                fecha = `${d}/${m}/${y}`;
            } else {
                fecha = soloFecha;
            }
        }
        // Costo con IVA
        let costo = item.price ? `$${Math.round(parseInt(item.price) * 1.19).toLocaleString('es-CL')}` : '-';
        // Cantidad
        let cantidad = item.qty !== undefined ? item.qty : '-';
        // Proveedor
        let proveedor = (item.partner_id && item.partner_id.length > 1) ? item.partner_id[1] : '-';
        html += `<tr><td>${fecha}</td><td>${costo}</td><td>${cantidad}</td><td>${proveedor}</td></tr>`;
    });
    html += '</table>';
    tablaComprasContainer.innerHTML = html;
}

// Integración con updateProductDetails
window.mostrarBloqueCompras = mostrarBloqueCompras;
window.mostrarTablaCompras = mostrarTablaCompras;
