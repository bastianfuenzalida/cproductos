// --- Bloque de análisis de ventas ---

const COLORES_EQUIPOS = {
    "Mercado Libre": "#e91e63",
    "Repartos": "#2196f3",
    "Eat Touch": "#9c27b0",
    "Sitio Web": "#8bc34a",
    "Punto de venta": "#ff9800"
    // ...agrega más equipos y colores aquí
};

function mostrarBloqueVentas(sales_history) {
    const ventasGrid = document.querySelector('.ventas-grid');
    if (!ventasGrid) {
        return;
    }

    if (!sales_history || !Array.isArray(sales_history) || sales_history.length === 0) {
        ventasGrid.innerHTML = '<div class="ventas-col"><div class="ventas-row"><span class="ventas-label">Venta x Sem:</span><span class="ventas-value">Sin datos</span> <span class="ventas-label" style="margin-left:1.5em;">Mensual:</span><span class="ventas-value">Sin datos</span></div></div>';
        return;
    }

    // Calcular venta semanal y mensual promedio de los últimos 2 meses
    const ventaSemanal = calcularVentaSemanal(sales_history);
    const ventaMensual = calcularVentaMensual(sales_history);
    // Calcular porcentajes por equipo
    const equipos = calcularPorcentajePorEquipo(sales_history);
    const equiposHtml = equipos.length > 0 ? `<div class="equipos-circulos">${equipos.map(e => crearCirculoEquipo(e)).join('')}</div>` : '';
    
    ventasGrid.innerHTML = `
        <div class="ventas-col">
            <div class="ventas-row">
                <span class="ventas-label">Venta x Sem:</span>
                <span class="ventas-value">${ventaSemanal}</span>
                <span class="ventas-label" style="margin-left:1.5em;">Mensual:</span>
                <span class="ventas-value">${ventaMensual}</span>
            </div>
            ${equiposHtml}
        </div>
    `;
}

function crearCirculoEquipo(equipo) {
    // SVG círculo de progreso tipo donut
    const size = 44;
    const stroke = 5;
    const radius = (size - stroke) / 2;
    const circ = 2 * Math.PI * radius;
    const pct = Math.max(0, Math.min(100, equipo.porcentaje));
    const dash = (pct / 100) * circ;
    return `
    <div class="equipo-circulo-svg-container">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="#bbb" stroke-width="${stroke}" fill="none" />
            <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="${equipo.color}" stroke-width="${stroke}" fill="none"
                stroke-dasharray="${dash} ${circ - dash}" stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})" />
            <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" alignment-baseline="middle" font-size="1em" fill="#222" font-weight="bold">${pct}%</text>
        </svg>
        <div class="equipo-nombre-svg">${equipo.nombre}</div>
    </div>
    `;
}

function calcularVentaSemanal(sales_history) {
    const dosMesesAtras = new Date();
    dosMesesAtras.setMonth(dosMesesAtras.getMonth() - 2);
    const ventasRecientes = sales_history.filter(venta => {
        const fechaVenta = new Date(venta.date);
        return fechaVenta >= dosMesesAtras;
    });
    if (ventasRecientes.length === 0) return 'Sin datos';
    const totalUnidades = ventasRecientes.reduce((sum, venta) => sum + (venta.qty || 0), 0);
    const semanas = 8;
    const promedioSemanal = Math.round(totalUnidades / semanas);
    return promedioSemanal.toLocaleString('es-CL');
}

function calcularVentaMensual(sales_history) {
    const dosMesesAtras = new Date();
    dosMesesAtras.setMonth(dosMesesAtras.getMonth() - 2);
    const ventasRecientes = sales_history.filter(venta => {
        const fechaVenta = new Date(venta.date);
        return fechaVenta >= dosMesesAtras;
    });
    if (ventasRecientes.length === 0) return 'Sin datos';
    const totalUnidades = ventasRecientes.reduce((sum, venta) => sum + (venta.qty || 0), 0);
    const meses = 2;
    const promedioMensual = Math.round(totalUnidades / meses);
    return promedioMensual.toLocaleString('es-CL');
}

function calcularPorcentajePorEquipo(sales_history) {
    const dosMesesAtras = new Date();
    dosMesesAtras.setMonth(dosMesesAtras.getMonth() - 2);
    const ventasRecientes = sales_history.filter(venta => {
        const fechaVenta = new Date(venta.date);
        return fechaVenta >= dosMesesAtras;
    });
    const totalUnidades = ventasRecientes.reduce((sum, venta) => sum + (venta.qty || 0), 0);
    if (totalUnidades === 0) return [];
    // Agrupar por equipo
    const equipos = {};
    ventasRecientes.forEach(venta => {
        const nombre = venta.team_id || 'Sin equipo';
        if (!equipos[nombre]) equipos[nombre] = 0;
        equipos[nombre] += venta.qty || 0;
    });
    // Generar colores aleatorios y porcentajes
    const colores = {};
    const getColor = nombre => {
        if (COLORES_EQUIPOS[nombre]) return COLORES_EQUIPOS[nombre];
        if (!colores[nombre]) {
            colores[nombre] = `hsl(${Math.floor(Math.random()*360)},70%,60%)`;
        }
        return colores[nombre];
    };
    return Object.entries(equipos)
        .map(([nombre, cantidad]) => ({
            nombre,
            porcentaje: Math.round((cantidad / totalUnidades) * 100),
            color: getColor(nombre)
        }))
        .sort((a, b) => b.porcentaje - a.porcentaje); // Orden descendente
}

// Función para cargar el historial de ventas
function cargarHistorialVentas(productId) {
    if (!productId) {
        return;
    }

    fetch('get_sales_history.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_id: productId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            mostrarBloqueVentas([]);
            return;
        }
        mostrarBloqueVentas(data.sales_history);
    })
    .catch(error => {
        mostrarBloqueVentas([]);
    });
}

// Integración con updateProductDetails
window.mostrarBloqueVentas = mostrarBloqueVentas;
window.cargarHistorialVentas = cargarHistorialVentas;
