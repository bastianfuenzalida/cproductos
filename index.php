<?php
session_start();
if (!isset($_SESSION['odoo_uid'])) {
    header('Location: login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saco Master Dog 18kg</title>
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
    <link rel="stylesheet" href="assets/styles.css">
    <link rel="stylesheet" href="assets/css/ventas.css">
    <link rel="stylesheet" href="assets/etiquetas.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
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
            <div class="info-precio-row">
            <span class="info-label">Precio de Venta</span>
                <div class="info-value">
                    <div class="precio-flex">
                        <input type="text" id="editPriceInput" class="info-value" disabled>
                        <button id="editPriceBtn" class="edit-icon-btn" title="Editar precio">
                            <span class="edit-icon">✏️</span>
                        </button>
                        <button id="savePriceBtn" class="save-icon-btn" title="Guardar precio">
                            <span class="save-icon">💾</span>
                        </button>
                        <span id="margenTag" style="display:none;position:absolute;top:-6px;right:-12px;z-index:2;font-size:0.75rem;"></span>
                    </div>
                </div>
            </div>
            <div>
                <span class="info-label">SKU</span>
                <div class="info-precio-row">
                    <div class="info-value">
                        <div class="precio-flex">
                            <input type="text" id="editSkuInput" class="info-value" disabled>
                            <button id="editSkuBtn" class="edit-icon-btn" title="Editar SKU"><span class="edit-icon">✏️</span></button>
                            <button id="saveSkuBtn" class="save-icon-btn" title="Guardar SKU"><span class="save-icon">💾</span></button>
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <span class="info-label">Cod. Barra</span>
                <div class="info-precio-row">
                    <div class="info-value">
                        <div class="precio-flex">
                            <input type="text" id="editBarcodeInput" class="info-value" disabled>
                            <button id="editBarcodeBtn" class="edit-icon-btn" title="Editar Cod. Barra"><span class="edit-icon">✏️</span></button>
                            <button id="saveBarcodeBtn" class="save-icon-btn" title="Guardar Cod. Barra"><span class="save-icon">💾</span></button>
                        </div>
                    </div>
                </div>
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
        <div class="ultimo-movimiento-stock" id="ultimoMovimientoStock" style="margin-bottom:1rem;color:#ffb300;font-weight:bold;font-size:1.05rem;">
            <!-- Aquí se mostrará el último movimiento de stock -->
        </div>
        <div class="section compras-section">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div class="compras-title">Última compra</div>
                <button id="verTodosComprasBtn" class="ver-todos-btn">Ver todos</button>
            </div>
            <div class="compras-grid">

            </div>
            <div class="proveedor-full">
                
            </div>
        </div>
        <div class="section analisis-section">
            <div class="analisis-title">Análisis de Ventas</div>
            <div class="ventas-grid"></div>
            <div class="analisis-grid">

            </div>
        </div>
        <!-- 
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
    </div>-->
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
    <!-- Modal de ajuste de inventario físico -->
    <div class="modal-inv-bg" id="modalInvBg">
        <div class="modal-inv-content">
            <button id="modalInvClose" class="modal-inv-close">&times;</button>
            <h2 style="color:var(--accent);margin-bottom:1rem;">Conteo Físico de Inventario</h2>
            <div style="margin-bottom:1rem;">
                <div class="inv-input-row">
                    <select id="invUbicacionSelect" class="modal-inv-input" style="flex:1;">
                        <option value="">Seleccione ubicación</option>
                        <option value="SALA" selected>SALA</option>
                        <option value="BODEGA">BODEGA</option>
                        <option value="2 PISO">2 PISO</option>
                        <option value="3 PISO">3 PISO</option>
                        <option value="OTRO">OTRO</option>
                    </select>
                    <input type="text" id="invUbicacionInput" class="modal-inv-input" placeholder="Otra ubicación" style="flex:1;display:none;">
                    <input type="number" id="invCantidadInput" class="modal-inv-input" placeholder="Cantidad" style="width:120px;" min="0" step="1">
                    <button id="invAgregarBtn" class="modal-inv-btn modal-inv-agregar">Agregar</button>
                </div>
            </div>
            <div class="inv-conteos-container" style="margin-bottom:1rem;max-height:200px;overflow-y:auto;">
                <table class="inv-conteos-table" style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="text-align:left;padding:0.5rem;border-bottom:1px solid #333;">Ubicación</th>
                            <th style="text-align:right;padding:0.5rem;border-bottom:1px solid #333;">Cantidad</th>
                            <th style="text-align:center;padding:0.5rem;border-bottom:1px solid #333;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="invConteosBody">
                        <!-- Los conteos se agregarán aquí dinámicamente -->
                    </tbody>
                    <tfoot>
                        <tr>
                            <td style="text-align:left;padding:0.5rem;border-top:1px solid #333;font-weight:bold;">Total</td>
                            <td style="text-align:right;padding:0.5rem;border-top:1px solid #333;font-weight:bold;" id="invTotalConteo">0</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div style="display:flex;gap:1rem;justify-content:center;">
                <button id="invCancelarBtn" class="modal-inv-btn modal-inv-cancelar">Cancelar</button>
                <button id="invGuardarBtn" class="modal-inv-btn modal-inv-guardar">Actualizar Stock</button>
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
    <!-- Botón de cerrar sesión -->
    <div style="width:100%;display:flex;justify-content:flex-end;margin-top:2.5rem;">
        <form action="logout.php" method="post" style="margin:0;">
            <button type="submit" style="background:#333;color:#fff;border:none;border-radius:6px;padding:0.4em 1.1em;font-size:0.95em;cursor:pointer;">Cerrar sesión</button>
        </form>
    </div>
    <!-- Modal Imprimir Fleje -->
    <div class="modal-etiquetas-bg" id="modalEtiquetasBg">
      <div class="modal-etiquetas-content">
        <button id="modalEtiquetasClose" class="modal-etiquetas-close">&times;</button>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;width:100%;">
          <h2 style="color:var(--accent);margin:0;">Imprimir Fleje</h2>
          <div style="flex:1;display:flex;justify-content:flex-end;">
            <button id="btnMostrarConfigImpresora" class="btn-config-gear"><i class="fa-solid fa-cog"></i></button>
          </div>
        </div>
        <div id="configBtnsContainer" style="display:none;justify-content:flex-end;align-items:center;margin-bottom:0.5em;gap:0.7em;">
          <button id="btnConfigImpresora" class="btn-config-modal">Configurar Impresora</button>
          <button id="btnZplModal" class="btn-config-modal">ZPL</button>
        </div>
        <div style="margin-bottom:1rem;">
          <label for="etiquetasCantidadInput">Cantidad de etiquetas:</label>
          <input type="number" id="etiquetasCantidadInput" class="modal-etiquetas-input" min="1" value="1" style="width:100px;margin-left:0.7em;">
        </div>
        <button id="agregarEtiquetaBtn" class="modal-etiquetas-agregar">Agregar a impresión</button>
        <div style="margin:1.2em 0 0.5em 0;font-weight:bold;color:var(--accent);display:flex;align-items:center;justify-content:flex-end;">
          <span style="flex:1;">Acumulado para impresión</span>
          <span id="borrarTodosEtiquetas" class="borrar-todos-etiquetas">Borrar todos</span>
        </div>
        <div id="spinnerEtiquetas" class="spinner-etiquetas" style="display:none;">
          <div class="spinner"></div>
        </div>
        <div id="tablaEtiquetasContainer">
          <table class="tabla-etiquetas">
            <thead>
              <tr><th>Producto</th><th>Cantidad</th><th>Acciones</th></tr>
            </thead>
            <tbody id="etiquetasTbody">
              <!-- Las filas se agregan dinámicamente -->
            </tbody>
          </table>
        </div>
        <!-- Selección de plantilla y botón imprimir debajo de la tabla -->
        <div style="margin-top:1.2em;display:flex;flex-direction:column;align-items:flex-start;gap:0.5em;">
          <span style="font-size:0.98em;color:#aaa;margin-bottom: -30px;">Seleccionar etiqueta</span>
          <div style="display:flex;flex-direction:row;align-items:center;gap:0.7em;width:100%;">
            <select id="selectZplPlantilla" class="modal-zpl-select" style="min-width:180px;"></select>
            <button id="imprimirEtiquetasBtn" class="modal-etiquetas-imprimir"><i class="fa-solid fa-print"></i> Imprimir Etiquetas</button>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Código de Barras Etiqueta -->
    <div class="modal-barcode-bg" id="modalBarcodeBg">
      <div class="modal-barcode-content">
        <button id="modalBarcodeClose" class="modal-barcode-close">&times;</button>
        <h2 style="color:var(--accent);margin-bottom:1rem;">SKU</h2>
        <div id="barcodeSku" style="font-size:1.2em;font-weight:bold;margin-bottom:0.7em;color:var(--accent);"></div>
        <h2 style="color:var(--accent);margin-bottom:1rem;">Código de Barras</h2>
        <div id="barcodeValue" style="font-size:1.5em;font-weight:bold;color:#fff;"></div>
      </div>
    </div>

    <!-- Modal Configurar Impresora FUERA del modal de impresión -->
    <div class="modal-config-impresora-bg" id="modalConfigImpresoraBg">
      <div class="modal-config-impresora-content">
        <button id="modalConfigImpresoraClose" class="modal-config-impresora-close">&times;</button>
        <h2 style="color:var(--accent);margin-bottom:1rem;">Configurar Impresora</h2>
        <div style="margin-bottom:1rem;">
          <label for="impresoraHost">IP o Host:</label>
          <input type="text" id="impresoraHost" class="modal-config-input" style="width:220px;margin-left:0.7em;">
        </div>
        <div style="margin-bottom:1.5rem;">
          <label for="impresoraNombre">Nombre Impresora:</label>
          <input type="text" id="impresoraNombre" class="modal-config-input" style="width:220px;margin-left:0.7em;">
        </div>
        <button id="guardarConfigImpresoraBtn" class="modal-config-guardar">Guardar</button>
      </div>
    </div>

    <!-- Modal ZPL FUERA del modal de impresión -->
    <div class="modal-zpl-bg" id="modalZplBg">
      <div class="modal-zpl-content">
        <button id="modalZplClose" class="modal-zpl-close">&times;</button>
        <h2 style="color:var(--accent);margin-bottom:1rem;">Gestión de Etiquetas ZPL</h2>
        <div style="margin-bottom:1rem;">
          <label for="zplNombre">Nombre Etiqueta:</label>
          <input type="text" id="zplNombre" class="modal-zpl-input" style="width:220px;margin-left:0.7em;">
        </div>
        <div style="margin-bottom:1.5rem;">
          <label for="zplCodigo">Código ZPL:</label><br>
          <textarea id="zplCodigo" class="modal-zpl-textarea" rows="5" style="width:100%;max-width:420px;"></textarea>
        </div>
        <button id="guardarZplBtn" class="modal-zpl-guardar">Guardar</button>
        <div style="margin:1.2em 0 0.5em 0;font-weight:bold;color:var(--accent);">Etiquetas ZPL guardadas</div>
        <div id="tablaZplContainer">
          <table class="tabla-zpl">
            <thead>
              <tr><th>Nombre</th><th>Acciones</th></tr>
            </thead>
            <tbody id="zplTbody">
              <!-- Las filas se agregan dinámicamente -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <script src="assets/main.js"></script>
    <script src="assets/ventas.js"></script>
    <script>
        // Obtener el usuario y nombre de Odoo desde PHP
        const odooUser = '<?php echo htmlspecialchars($_SESSION['odoo_user'] ?? ''); ?>';
        const odooName = '<?php echo htmlspecialchars($_SESSION['odoo_name'] ?? ''); ?>';
    </script>
    <script src="assets/compras.js"></script>
    <script src="assets/etiquetas.js"></script>
</body>
</html>