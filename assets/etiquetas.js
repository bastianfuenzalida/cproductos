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
    const selectZplPlantilla = document.getElementById('selectZplPlantilla');
    const btnMostrarConfigImpresora = document.getElementById('btnMostrarConfigImpresora');
    const configBtnsContainer = document.getElementById('configBtnsContainer');

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
            cargarOpcionesZplPlantilla();
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
        let precioLimpio = window.selectedProduct.list_price;
        if (typeof precioLimpio === 'string') {
            precioLimpio = precioLimpio.replace(/[^0-9]/g, '');
        }
        precioLimpio = parseInt(precioLimpio) || 0;
        const data = {
            nombre_producto: limpiarHTML(window.selectedProduct.name),
            precio: precioLimpio,
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
        // 1. Obtener la plantilla seleccionada
        const plantillaId = selectZplPlantilla && selectZplPlantilla.value ? selectZplPlantilla.value : null;
        const plantillaNombre = selectZplPlantilla && selectZplPlantilla.selectedOptions.length > 0 ? selectZplPlantilla.selectedOptions[0].text : 'etiqueta';
        if (!plantillaId) {
            alert('Debe seleccionar una plantilla ZPL');
            return;
        }
        // 2. Obtener los datos de la tabla acumulado
        fetch('zpl_plantillas.php?id=' + plantillaId)
            .then(res => res.json())
            .then(data => {
                if (!data.success || !data.plantillas || !data.plantillas.length) {
                    alert('No se pudo obtener la plantilla ZPL');
                    return;
                }
                const zplBase = data.plantillas[0].codigo_zpl;
                // Obtener los datos de la tabla acumulado
                fetch('etiquetas.php')
                    .then(res => res.json())
                    .then(resp => {
                        if (!resp.success || !resp.etiquetas || !resp.etiquetas.length) {
                            alert('No hay productos acumulados para imprimir');
                            return;
                        }
                        let zplFinal = '';
                        resp.etiquetas.forEach(e => {
                            let zpl = zplBase;
                            const palabras = e.nombre_producto.split(/\s+/);
                            const pal1 = palabras.slice(0, 3).join(' ');
                            const pal2 = palabras.slice(3).join(' ');
                            zpl = zpl.replace(/&precio/g, '$' + Number(e.precio).toLocaleString('es-CL'));
                            zpl = zpl.replace(/&barcode/g, e.codigo_barras);
                            zpl = zpl.replace(/&p1/g, pal1);
                            zpl = zpl.replace(/&p2/g, pal2);
                            zpl = zpl.replace(/&sku/g, e.sku);
                            zpl = zpl.replace(/&cant/g, e.cantidad);
                            zplFinal += zpl + '\n';
                        });
                        // 3. Descargar el archivo .prn
                        const now = new Date();
                        const pad = n => n.toString().padStart(2, '0');
                        const fecha = `${pad(now.getDate())}-${pad(now.getMonth()+1)}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
                        const nombreArchivo = `${plantillaNombre.replace(/[^a-zA-Z0-9_-]/g,'_')}_${fecha}.prn`;
                        const blob = new Blob([zplFinal], {type: 'text/plain'});
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = nombreArchivo;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    });
            });
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

    // --- MODALES CONFIGURAR IMPRESORA Y ZPL ---
    const btnConfigImpresora = document.getElementById('btnConfigImpresora');
    const modalConfigImpresoraBg = document.getElementById('modalConfigImpresoraBg');
    const modalConfigImpresoraClose = document.getElementById('modalConfigImpresoraClose');

    const btnZplModal = document.getElementById('btnZplModal');
    const modalZplBg = document.getElementById('modalZplBg');
    const modalZplClose = document.getElementById('modalZplClose');

    // --- FUNCIONES PARA CONFIGURACIÓN DE IMPRESORA ---
    const impresoraHost = document.getElementById('impresoraHost');
    const impresoraNombre = document.getElementById('impresoraNombre');
    const guardarConfigImpresoraBtn = document.getElementById('guardarConfigImpresoraBtn');

    // Cargar configuración de impresora al abrir el modal
    if(btnConfigImpresora && modalConfigImpresoraBg) {
        btnConfigImpresora.addEventListener('click', function(e) {
            e.stopPropagation();
            cargarConfigImpresora();
            modalConfigImpresoraBg.classList.add('active');
        });
    }

    function cargarConfigImpresora() {
        if (!impresoraHost || !impresoraNombre) return;
        fetch('config_impresora.php')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.config) {
                    impresoraHost.value = data.config.host;
                    impresoraNombre.value = data.config.nombre;
                } else {
                    impresoraHost.value = '';
                    impresoraNombre.value = '';
                }
            })
            .catch(() => {
                alert('Error al cargar la configuración de la impresora');
                impresoraHost.value = '';
                impresoraNombre.value = '';
            });
    }

    // Guardar configuración de impresora
    if(guardarConfigImpresoraBtn) {
        guardarConfigImpresoraBtn.addEventListener('click', function() {
            const host = impresoraHost.value.trim();
            const nombre = impresoraNombre.value.trim();
            
            if (!host || !nombre) {
                alert('El host y el nombre de la impresora son requeridos');
                return;
            }

            fetch('config_impresora.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host, nombre })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('Configuración guardada correctamente');
                    modalConfigImpresoraBg.classList.remove('active');
                } else {
                    alert(data.error || 'Error al guardar la configuración');
                }
            })
            .catch(() => alert('Error de conexión'));
        });
    }

    // --- FUNCIONES PARA PLANTILLAS ZPL ---
    const zplNombre = document.getElementById('zplNombre');
    const zplCodigo = document.getElementById('zplCodigo');
    const guardarZplBtn = document.getElementById('guardarZplBtn');
    const zplTbody = document.getElementById('zplTbody');
    let plantillaEditando = null;

    // Cargar plantillas ZPL al abrir el modal
    if(btnZplModal && modalZplBg) {
        btnZplModal.addEventListener('click', function(e) {
            e.stopPropagation();
            cargarPlantillasZPL();
            modalZplBg.classList.add('active');
        });
    }

    function cargarPlantillasZPL() {
        if (!zplTbody) return;
        fetch('zpl_plantillas.php')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    zplTbody.innerHTML = data.plantillas.map(p => `
                        <tr>
                            <td>${p.nombre}</td>
                            <td>
                                <button class="btn-editar-zpl" data-id="${p.id}" title="Editar">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button class="btn-eliminar-zpl" data-id="${p.id}" title="Eliminar">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('');

                    // Agregar eventos a los botones de editar y eliminar
                    document.querySelectorAll('.btn-editar-zpl').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const id = this.getAttribute('data-id');
                            const plantilla = data.plantillas.find(p => p.id == id);
                            if (plantilla) {
                                plantillaEditando = plantilla;
                                zplNombre.value = plantilla.nombre;
                                zplCodigo.value = plantilla.codigo_zpl;
                                guardarZplBtn.textContent = 'Actualizar';
                            }
                        });
                    });

                    document.querySelectorAll('.btn-eliminar-zpl').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const id = this.getAttribute('data-id');
                            if (confirm('¿Está seguro de eliminar esta plantilla?')) {
                                eliminarPlantillaZPL(id);
                            }
                        });
                    });
                } else {
                    zplTbody.innerHTML = '<tr><td colspan="2">No hay plantillas guardadas</td></tr>';
                }
            })
            .catch(() => {
                zplTbody.innerHTML = '<tr><td colspan="2">Error al cargar las plantillas</td></tr>';
            });
    }

    function eliminarPlantillaZPL(id) {
        const formData = new FormData();
        formData.append('accion', 'delete');
        formData.append('id', id);

        fetch('zpl_plantillas.php', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                cargarPlantillasZPL();
                if (plantillaEditando && plantillaEditando.id == id) {
                    limpiarFormularioZPL();
                }
            } else {
                alert(data.error || 'Error al eliminar la plantilla');
            }
        })
        .catch(() => alert('Error de conexión'));
    }

    function limpiarFormularioZPL() {
        plantillaEditando = null;
        zplNombre.value = '';
        zplCodigo.value = '';
        guardarZplBtn.textContent = 'Guardar';
    }

    // Guardar o actualizar plantilla ZPL
    if(guardarZplBtn) {
        guardarZplBtn.addEventListener('click', function() {
            const nombre = zplNombre.value.trim();
            const codigo = zplCodigo.value.trim();
            
            if (!nombre || !codigo) {
                alert('El nombre y el código ZPL son requeridos');
                return;
            }

            const data = {
                nombre: nombre,
                codigo_zpl: codigo
            };

            if (plantillaEditando) {
                data.id = plantillaEditando.id;
            }

            fetch('zpl_plantillas.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert(plantillaEditando ? 'Plantilla actualizada' : 'Plantilla guardada');
                    limpiarFormularioZPL();
                    cargarPlantillasZPL();
                } else {
                    alert(data.error || 'Error al guardar la plantilla');
                }
            })
            .catch(() => alert('Error de conexión'));
        });
    }

    // Limpiar formulario al cerrar el modal ZPL
    if(modalZplClose && modalZplBg) {
        modalZplClose.addEventListener('click', function() {
            modalZplBg.classList.remove('active');
            limpiarFormularioZPL();
        });
        modalZplBg.addEventListener('click', function(e) {
            if (e.target === modalZplBg) {
                modalZplBg.classList.remove('active');
                limpiarFormularioZPL();
            }
        });
    }

    // Cerrar modal Configurar Impresora
    if(modalConfigImpresoraClose && modalConfigImpresoraBg) {
        modalConfigImpresoraClose.addEventListener('click', function() {
            modalConfigImpresoraBg.classList.remove('active');
        });
        modalConfigImpresoraBg.addEventListener('click', function(e) {
            if (e.target === modalConfigImpresoraBg) {
                modalConfigImpresoraBg.classList.remove('active');
            }
        });
    }

    // Cargar plantillas ZPL en el select al abrir el modal de impresión de etiquetas
    function cargarOpcionesZplPlantilla() {
        if (!selectZplPlantilla) return;
        fetch('zpl_plantillas.php')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.plantillas && data.plantillas.length > 0) {
                    selectZplPlantilla.innerHTML = data.plantillas.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
                } else {
                    selectZplPlantilla.innerHTML = '<option value="">(Sin plantillas ZPL)</option>';
                }
            })
            .catch(() => {
                selectZplPlantilla.innerHTML = '<option value="">(Error al cargar)</option>';
            });
    }

    if(btnMostrarConfigImpresora && configBtnsContainer) {
        btnMostrarConfigImpresora.addEventListener('click', function() {
            if (configBtnsContainer.style.display === 'none' || configBtnsContainer.style.display === '') {
                configBtnsContainer.style.display = 'flex';
            } else {
                configBtnsContainer.style.display = 'none';
            }
        });
    }

    // Delegación de eventos para abrir los modales de configuración
    if(configBtnsContainer) {
        configBtnsContainer.addEventListener('click', function(e) {
            // Obtener referencias actualizadas en cada click
            const modalConfigImpresoraBg = document.getElementById('modalConfigImpresoraBg');
            const modalZplBg = document.getElementById('modalZplBg');
            if (e.target && (e.target.id === 'btnConfigImpresora' || (e.target.closest && e.target.closest('#btnConfigImpresora')))) {
                if (typeof cargarConfigImpresora === 'function') cargarConfigImpresora();
                if (modalConfigImpresoraBg) modalConfigImpresoraBg.classList.add('active');
            }
            if (e.target && (e.target.id === 'btnZplModal' || (e.target.closest && e.target.closest('#btnZplModal')))) {
                if (typeof cargarPlantillasZPL === 'function') cargarPlantillasZPL();
                if (modalZplBg) modalZplBg.classList.add('active');
            }
        });
    }
}); 