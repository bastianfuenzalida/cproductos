// Lógica del modal de impresión de etiquetas

document.addEventListener('DOMContentLoaded', function() {
    const btnsImpEtiqueta = Array.from(document.querySelectorAll('.actions button')).filter(btn => btn.textContent.trim().toLowerCase().includes('imp. etiqueta'));
    const modalEtiquetasBg = document.getElementById('modalEtiquetasBg');
    const modalEtiquetasClose = document.getElementById('modalEtiquetasClose');
    const etiquetasCantidadInput = document.getElementById('etiquetasCantidadInput');
    const agregarEtiquetaBtn = document.getElementById('agregarEtiquetaBtn');
    const etiquetasTbody = document.getElementById('etiquetasTbody');
    const spinner = document.getElementById('spinnerEtiquetas');
    const imprimirEtiquetasBtn = document.getElementById('imprimirEtiquetasBtn');
    const borrarTodosEtiquetas = document.getElementById('borrarTodosEtiquetas');

    function limpiarHTML(str) {
        return str.replace(/<[^>]*>/g, '');
    }

    // Abrir modal
    btnsImpEtiqueta.forEach(btn => {
        btn.addEventListener('click', function() {
            if (!window.selectedProduct) {
                alert('Debe seleccionar un producto');
                return;
            }
            etiquetasCantidadInput.value = 1;
            modalEtiquetasBg.classList.add('active');
            cargarAcumuladoEtiquetas();
        });
    });

    // Cerrar modal
    modalEtiquetasClose.addEventListener('click', function() {
        modalEtiquetasBg.classList.remove('active');
    });
    modalEtiquetasBg.addEventListener('click', function(e) {
        if (e.target === modalEtiquetasBg) {
            modalEtiquetasBg.classList.remove('active');
        }
    });

    // Agregar a impresión (ahora en backend)
    agregarEtiquetaBtn.addEventListener('click', function() {
        const cantidad = parseInt(etiquetasCantidadInput.value) || 1;
        if (!window.selectedProduct) {
            alert('Debe seleccionar un producto');
            return;
        }
        if (cantidad < 1) {
            alert('La cantidad debe ser mayor a 0');
            return;
        }
        // Preparar datos
        const data = {
            nombre_producto: limpiarHTML(window.selectedProduct.name),
            precio: parseInt(window.selectedProduct.list_price) || 0,
            codigo_barras: window.selectedProduct.barcode || '',
            sku: window.selectedProduct.default_code || '',
            cantidad: cantidad
        };
        fetch('etiquetas.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(resp => {
            if (resp.success) {
                cargarAcumuladoEtiquetas();
                etiquetasCantidadInput.value = 1;
            } else {
                alert(resp.error || 'Error al guardar');
            }
        })
        .catch(() => alert('Error de conexión'));
    });

    function cargarAcumuladoEtiquetas() {
        spinner.style.display = 'flex';
        etiquetasTbody.innerHTML = '';
        fetch('etiquetas.php')
            .then(res => res.json())
            .then(data => {
                spinner.style.display = 'none';
                if (data.success) {
                    etiquetasTbody.innerHTML = data.etiquetas.map(e =>
                        `<tr>
                            <td>${e.nombre_producto}</td>
                            <td><input type="number" class="input-cantidad-etiqueta" data-sku="${e.sku}" value="${e.cantidad}" min="0" style="width:60px;text-align:right;"></td>
                            <td><button class="btn-barcode-etiqueta" title="Ver código de barras" data-sku="${e.sku}" data-barcode="${e.codigo_barras || ''}"><i class="fa-solid fa-barcode"></i></button><button class="btn-eliminar-etiqueta" title="Eliminar" data-sku="${e.sku}">🗑️</button></td>
                        </tr>`
                    ).join('');
                    // Agregar eventos a los botes de basura
                    document.querySelectorAll('.btn-eliminar-etiqueta').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const sku = this.getAttribute('data-sku');
                            if (confirm('¿Seguro que desea eliminar todas las etiquetas activas de este producto?')) {
                                fetch('etiquetas.php', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ accion: 'desactivar', sku })
                                })
                                .then(res => res.json())
                                .then(resp => {
                                    if (resp.success) {
                                        cargarAcumuladoEtiquetas();
                                    } else {
                                        alert(resp.error || 'Error al eliminar');
                                    }
                                })
                                .catch(() => alert('Error de conexión'));
                            }
                        });
                    });
                    // Agregar eventos a los inputs de cantidad
                    document.querySelectorAll('.input-cantidad-etiqueta').forEach(input => {
                        input.addEventListener('change', function() {
                            const sku = this.getAttribute('data-sku');
                            const nuevoValor = parseInt(this.value) || 0;
                            const valorActual = parseInt(this.defaultValue) || 0;
                            if (nuevoValor !== valorActual) {
                                const diferencia = nuevoValor - valorActual;
                                fetch('etiquetas.php', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ accion: 'actualizar_cantidad', sku, diferencia })
                                })
                                .then(res => res.json())
                                .then(resp => {
                                    if (resp.success) {
                                        cargarAcumuladoEtiquetas();
                                    } else {
                                        alert(resp.error || 'Error al actualizar cantidad');
                                    }
                                })
                                .catch(() => alert('Error de conexión'));
                            }
                        });
                    });
                } else {
                    etiquetasTbody.innerHTML = '<tr><td colspan="3">Error al cargar</td></tr>';
                }
            })
            .catch(() => {
                spinner.style.display = 'none';
                etiquetasTbody.innerHTML = '<tr><td colspan="3">Error de conexión</td></tr>';
            });
    }

    imprimirEtiquetasBtn.addEventListener('click', function() {
        alert('Funcionalidad de impresión próximamente');
    });

    // Lógica para mostrar el modal de código de barras
    const modalBarcodeBg = document.getElementById('modalBarcodeBg');
    const modalBarcodeClose = document.getElementById('modalBarcodeClose');
    const barcodeSku = document.getElementById('barcodeSku');
    const barcodeValue = document.getElementById('barcodeValue');

    document.addEventListener('click', function(e) {
        if (e.target.closest('.btn-barcode-etiqueta')) {
            const btn = e.target.closest('.btn-barcode-etiqueta');
            const sku = btn.getAttribute('data-sku') || '';
            const barcode = btn.getAttribute('data-barcode') || '';
            barcodeSku.textContent = sku;
            barcodeValue.textContent = barcode || '(Sin código de barras)';
            modalBarcodeBg.classList.add('active');
        }
    });
    modalBarcodeClose.addEventListener('click', function() {
        modalBarcodeBg.classList.remove('active');
    });
    modalBarcodeBg.addEventListener('click', function(e) {
        if (e.target === modalBarcodeBg) {
            modalBarcodeBg.classList.remove('active');
        }
    });

    // Lógica para borrar todos los productos acumulados para impresión
    borrarTodosEtiquetas.addEventListener('click', function() {
        if (confirm('¿Seguro que desea borrar TODOS los productos acumulados para impresión?')) {
            fetch('etiquetas.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accion: 'desactivar_todos' })
            })
            .then(res => res.json())
            .then(resp => {
                if (resp.success) {
                    cargarAcumuladoEtiquetas();
                } else {
                    alert(resp.error || 'Error al borrar todos');
                }
            })
            .catch(() => alert('Error de conexión'));
        }
    });
}); 