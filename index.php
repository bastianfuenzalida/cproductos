<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saco Master Dog 18kg</title>
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
    <div class="container">
        <div class="search-container">
            <div class="search-bar">
                <span class="search-icon">🔍</span>
                <input type="text" id="searchInput" placeholder="Buscar producto...">
                <button type="button" class="clear-icon" id="clearSearchBtn" title="Borrar búsqueda">&times;</button>
                <button type="button" class="camera-icon" id="openQrBtn" title="Escanear código de barras">
                    <span>📷</span>
                </button>
            </div>
            <div class="search-results" id="searchResults">
                <!-- Los resultados se cargarán aquí dinámicamente -->
            </div>
        </div>
        <div class="product-title" id="productTitle">Seleccione un producto</div>
        <div class="product-photo placeholder" id="productPhoto">Foto Producto</div>
        <div class="info-grid">
            <div>
                <span class="info-label">Stock Real</span>
                <span class="info-value" id="stockReal">-</span>
            </div>
            <div>
                <span class="info-label">Previsto</span>
                <span class="info-value" id="stockPrevisto">-</span>
            </div>
            <div>
                <span class="info-label">Precio</span>
                <span class="info-value" id="productPrice">-</span>
                <span id="margenTag" style="display:none;position:absolute;top:-6px;right:12px;z-index:2;font-size:0.85rem;box-shadow:0 2px 8px rgba(0,0,0,0.15);"></span>
            </div>
            <div>
                <span class="info-label">SKU</span>
                <span class="info-value" id="productSku">-</span>
            </div>
            <div>
                <span class="info-label">Cod. Barra</span>
                <span class="info-value" id="productBarcode">-</span>
            </div>
            <div>
                <span class="info-label">Categoría</span>
                <span class="info-value" id="productCategory">-</span>
            </div>
        </div>
        <div class="actions">
            <button>Imp. Etiqueta</button>
            <button>Actualizar Precio</button>
            <button>Ajuste Inv</button>
            <button>Ajuste Stock</button>
        </div>
        <div class="status-stock-bar">
            <span class="status-label">Status Stock</span>
            <span class="status-value">Bajo</span>
        </div>
        <div class="section compras-section">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div class="compras-title">Última compra</div>
                <button id="verTodosComprasBtn" class="ver-todos-btn">Ver todos</button>
            </div>
            <div class="compras-grid">
                <div>
                    Últ. Fecha: 10/06/2024<br>
                    Costo: $24.890<br>
                    Nº Pedido: PO06852
                </div>
                <div>
                    Cant: 10<br>
                    Nº Total Pedidos: 85
                </div>
            </div>
            <div class="proveedor-full">
                Proveedor: SOCIEDAD COMERCIAL ALLENDES HERMANOS S.A.
            </div>
        </div>
        <div class="section analisis-section">
            <div class="analisis-title">Análisis de Ventas</div>
            <div class="ventas-grid"></div>
            <div class="analisis-grid">
                <div>
                    Venta x Sem: 15<br>
                    Últ. Venta: 01/05/25<br>
                    Team: Punto Venta
                </div>
                <div>
                    Venta Mes: 50<br>
                    PPV: $29.900
                </div>
            </div>
        </div>
        <div class="section resumen-section">
            <div class="resumen-title">Resumen mes actual</div>
            <div class="resumen-grid">
                <div>
                    Comprado: $10.000.000
                </div>
                <div>
                    Vendido: $1.200.000
                </div>
            </div>
            <div class="resumen-subtitle">Equipos de Venta</div>
            <div class="resumen-grid resumen-equipos">
                <div>
                    POS: $600.000<br>
                    WEB: $100.000<br>
                    MARKETPLACES: $100.000
                </div>
                <div>
                    REPARTOS: $300.000<br>
                    MERCADO LIBRE: $100.000<br>
                    OTROS: $0
                </div>
            </div>
        </div>
    </div>
    <!-- Modal para imagen grande -->
    <div class="modal-img-bg" id="modalImgBg">
        <div class="modal-img-content">
            <span class="modal-img-close" id="modalImgClose">&times;</span>
            <div id="modalImgSpinner" class="modal-img-spinner" style="display:none">
                <div class="spinner"></div>
            </div>
            <img id="modalImg" src="" alt="Imagen grande producto" style="display:none">
        </div>
    </div>
    <!-- Modal QR -->
    <div class="modal-qr-bg" id="modalQrBg">
        <div class="modal-qr-content">
            <button id="modalQrClose" class="modal-qr-close">&times;</button>
            <div class="modal-qr-label" style="color:#ffb300;margin-bottom:0.7rem;text-align:center;font-size:1.1rem;">Escanea un código de barras</div>
            <div id="qr-reader" class="modal-qr-reader"></div>
        </div>
    </div>
    <!-- Modal para actualizar precio -->
    <div class="modal-precio-bg" id="modalPrecioBg">
        <div class="modal-precio-content">
            <button id="modalPrecioClose" class="modal-precio-close">&times;</button>
            <h2 style="color:var(--accent);margin-bottom:1rem;">Actualizar Precio de Venta</h2>
            <div style="margin-bottom:0.7rem;display:flex;align-items:center;gap:8px;">
                Precio actual: <b id="precioActualModal">-</b>
                <span id="margenActualModalLabel">Margen %: <b id="margenActualModal"></b></span>
            </div>
            <div style="margin-bottom:0.7rem;">Último precio de compra: <b id="ultimoPrecioCompraModal">-</b></div>
            <div class="margen-control">
                <label for="margenInput">Margen (%):</label>
                <button type="button" id="decreaseMargenBtn" title="Disminuir margen">-</button>
                <input type="number" id="margenInput" min="0" max="100" step="0.1" value="30">
                <button type="button" id="increaseMargenBtn" title="Aumentar margen">+</button>
            </div>
            <div style="margin-bottom:0.7rem;">Precio sugerido: <b id="precioSugeridoModal">-</b></div>
            <div style="margin-bottom:1.2rem;">
                <label for="nuevoPrecioInput">Nuevo precio de venta:</label>
                <input type="text" id="nuevoPrecioInput" class="modal-precio-input" min="0" step="100" style="width:120px; font-size:1.2rem; margin-left:0.5rem;" inputmode="numeric" pattern="[0-9]*">
            </div>
            <button id="guardarPrecioBtn" class="modal-precio-guardar">Guardar</button>
        </div>
    </div>
    <!-- Modal de confirmación -->
    <div class="modal-confirm-bg" id="modalConfirmBg">
        <div class="modal-confirm-content">
            <p style="margin-bottom:1.2rem;">¿Está seguro de actualizar el precio de venta?</p>
            <button id="confirmYesBtn" class="modal-confirm-btn modal-confirm-yes">Sí</button>
            <button id="confirmNoBtn" class="modal-confirm-btn modal-confirm-no">No</button>
        </div>
    </div>
    <!-- Modal de ajuste de stock -->
    <div class="modal-stock-bg" id="modalStockBg">
        <div class="modal-stock-content">
            <button id="modalStockClose" class="modal-stock-close">&times;</button>
            <h2 style="color:var(--accent);margin-bottom:1rem;">Ajuste de Stock</h2>
            <div style="margin-bottom:1rem;">
                <label for="stockMotivoInput">Motivo del ajuste:</label>
                <input type="text" id="stockMotivoInput" class="modal-stock-input" value="INV: SKU " style="width:100%; margin-top:0.5rem;">
            </div>
            <div style="margin-bottom:1.5rem;">
                <label for="stockCantidadInput">Nueva cantidad:</label>
                <input type="number" id="stockCantidadInput" class="modal-stock-input" style="width:120px; margin-top:0.5rem;" min="0" step="1">
            </div>
            <div style="display:flex; gap:1rem; justify-content:center;">
                <button id="stockCancelarBtn" class="modal-stock-btn modal-stock-cancelar">Cancelar</button>
                <button id="stockGuardarBtn" class="modal-stock-btn modal-stock-guardar">Guardar</button>
            </div>
        </div>
    </div>
    <!-- Mensaje de éxito/error -->
    <div id="modalMsgBg" class="modal-msg-bg"><div id="modalMsgContent" class="modal-msg-content"></div></div>
    <!-- Modal historial de compras -->
    <div class="modal-compras-bg" id="modalComprasBg">
        <div class="modal-compras-content">
            <button id="modalComprasClose" class="modal-compras-close">&times;</button>
            <h2 style="color:var(--accent);margin-bottom:1rem;">Historial de Compras</h2>
            <div id="tablaComprasContainer"></div>
        </div>
    </div>

    <script src="assets/main.js"></script>
    <script src="assets/ventas.js"></script>
    <script src="assets/compras.js"></script>
</body>
</html>