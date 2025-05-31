document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchResults = document.getElementById('searchResults');
    const productTitle = document.getElementById('productTitle');
    const productPhoto = document.getElementById('productPhoto');
    const stockReal = document.getElementById('stockReal');
    const stockPrevisto = document.getElementById('stockPrevisto');
    const productPrice = document.getElementById('productPrice');
    const productSku = document.getElementById('productSku');
    const productBarcode = document.getElementById('productBarcode');
    const productCategory = document.getElementById('productCategory');
    const modalImgBg = document.getElementById('modalImgBg');
    const modalImg = document.getElementById('modalImg');
    const modalImgClose = document.getElementById('modalImgClose');
    const modalImgSpinner = document.getElementById('modalImgSpinner');
    const openQrBtn = document.getElementById('openQrBtn');
    const modalQrBg = document.getElementById('modalQrBg');
    const modalQrClose = document.getElementById('modalQrClose');
    let qrReaderDiv = document.getElementById('qr-reader');
    let html5QrCode = null;
    let qrActive = false;
    let qrStarted = false;

    let searchTimeout;

    function calcularPrecioSugerido(margen) {
        if (!lastPurchasePrice) return 0;
        let sugerido = lastPurchasePrice * 1.19 * (1 + margen/100);
        sugerido = Math.ceil(sugerido / 100) * 100; // Redondear a la centena superior
        sugerido = sugerido - (sugerido % 100) + 90; // Ajustar para terminar en 90
        return sugerido;
    }

    function actualizarPrecios() {
        const margen = parseFloat(margenInput.value) || 0;
        const sugerido = calcularPrecioSugerido(margen);
        precioSugeridoModal.textContent = `$${sugerido.toLocaleString('es-CL')}`;
        // Actualizar el input solo si no está siendo editado
        if (document.activeElement !== nuevoPrecioInput) {
            nuevoPrecioInput.value = `$${sugerido.toLocaleString('es-CL')}`;
        }
    }

    function updateProductDetails(product) {
        console.log('updateProductDetails llamado con producto:', product);
        selectedProduct = product;
        productTitle.textContent = product.name.replace(/<[^>]*>/g, '');
        if (product.image_medium) {
            const imgSrc = `data:image/png;base64,${product.image_medium}`;
            productPhoto.innerHTML = `<img src="${imgSrc}" alt="${product.name}" id="mainProductImg">`;
            productPhoto.classList.remove('placeholder');
            lastImgSrc = imgSrc;
        } else {
            productPhoto.innerHTML = 'Sin imagen';
            productPhoto.classList.add('placeholder');
            lastImgSrc = null;
        }
        stockReal.textContent = product.qty_available;
        stockPrevisto.textContent = product.virtual_available;
        // Mostrar precio con formato chileno
        const precioVenta = parseInt((product.list_price || '').toString().replace(/[^\d]/g, ''));
        productPrice.textContent = precioVenta ? `$${precioVenta.toLocaleString('es-CL')}` : '-';
        productSku.textContent = product.default_code;
        productBarcode.textContent = product.barcode;
        productCategory.textContent = product.categ_id;
        // Calcular y mostrar margen
        mostrarMargenTag(product);
        // Actualizar bloque de compras con la última compra
        if (typeof mostrarBloqueCompras === 'function') {
            mostrarBloqueCompras(product.purchase_history);
        }
        // Cargar historial de ventas
        if (typeof cargarHistorialVentas === 'function') {
            console.log('Llamando a cargarHistorialVentas con ID:', product.id);
            cargarHistorialVentas(product.id);
        } else {
            console.error('La función cargarHistorialVentas no está disponible');
        }
    }

    function mostrarMargenTag(product) {
        const margenTag = document.getElementById('margenTag');
        let lastPurchase = 0;
        if (product.last_purchase_price) {
            if (typeof product.last_purchase_price === 'string') {
                lastPurchase = parseInt(product.last_purchase_price.replace(/[^\d]/g, ''));
            } else {
                lastPurchase = product.last_purchase_price;
            }
        }
        const precioVenta = parseInt((product.list_price || '').toString().replace(/[^\d]/g, ''));
        if (lastPurchase > 0 && precioVenta > 0) {
            const margen = ((precioVenta / (lastPurchase * 1.19)) - 1) * 100;
            const margenRedondeado = Math.round(margen);
            let color = '#e53935'; // rojo por defecto
            if (margenRedondeado >= 30) color = '#43a047'; // verde
            else if (margenRedondeado >= 15) color = '#fbc02d'; // amarillo
            margenTag.textContent = margenRedondeado + '%';
            margenTag.style.display = 'inline-block';
            margenTag.style.background = color;
            margenTag.style.color = '#fff';
            margenTag.style.padding = '2px 8px';
            margenTag.style.borderRadius = '8px';
            margenTag.style.fontWeight = 'bold';
            margenTag.style.fontSize = '1rem';
            margenTag.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        } else {
            margenTag.style.display = 'none';
        }
    }

    openQrBtn.addEventListener('click', function() {
        abrirModalQR();
    });

    function abrirModalQR() {
        modalQrBg.classList.add('active');
        // Eliminar y recrear el div del lector para asegurar reinicio limpio
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                html5QrCode.clear().then(() => {
                    html5QrCode = null;
                    crearYIniciarLector();
                });
            }).catch(() => {
                html5QrCode = null;
                crearYIniciarLector();
            });
        } else {
            crearYIniciarLector();
        }
    }

    function crearYIniciarLector() {
        if (qrReaderDiv) qrReaderDiv.remove();
        const newDiv = document.createElement('div');
        newDiv.id = 'qr-reader';
        newDiv.className = 'modal-qr-reader';
        document.querySelector('.modal-qr-content').appendChild(newDiv);
        qrReaderDiv = newDiv;
        html5QrCode = new Html5Qrcode("qr-reader");
        startQr();
    }

    function startQr() {
        qrActive = false;
        qrStarted = true;
        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 15,
                qrbox: { width: 200, height: 80 },
                aspectRatio: 0.8,
                formatsToSupport: [ Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8 ]
            },
            (decodedText, decodedResult) => {
                if (!qrActive) {
                    qrActive = true;
                    // Cierra el modal y actualiza el input inmediatamente
                    modalQrBg.classList.remove('active');
                    document.getElementById('searchInput').value = decodedText;
                    const event = new Event('input', { bubbles: true });
                    document.getElementById('searchInput').dispatchEvent(event);
                    // Intenta detener y destruir el lector, pero no dependas de las promesas
                    try {
                        html5QrCode.stop().then(() => {
                            html5QrCode.clear().then(() => {
                                html5QrCode = null;
                                if (qrReaderDiv) qrReaderDiv.remove();
                                qrStarted = false;
                            }).catch(() => {
                                html5QrCode = null;
                                if (qrReaderDiv) qrReaderDiv.remove();
                                qrStarted = false;
                            });
                        }).catch(() => {
                            html5QrCode = null;
                            if (qrReaderDiv) qrReaderDiv.remove();
                            qrStarted = false;
                        });
                    } catch (e) {
                        html5QrCode = null;
                        if (qrReaderDiv) qrReaderDiv.remove();
                        qrStarted = false;
                    }
                }
            },
            (errorMessage) => {
                // Ignorar errores de escaneo
            }
        ).catch(err => {
            qrReaderDiv.innerHTML = '<div style="color:red;max-width:250px;text-align:center;">No se pudo acceder a la cámara.<br>¿Estás usando HTTPS?<br>Permite el acceso a la cámara en tu navegador.</div>';
            qrStarted = false;
        });
    }

    function stopQr() {
        if (html5QrCode && qrStarted) {
            html5QrCode.stop().then(() => {
                html5QrCode.clear().then(() => {
                    html5QrCode = null;
                    qrStarted = false;
                });
            }).catch(() => {
                html5QrCode = null;
                qrStarted = false;
            });
        }
    }

    modalQrClose.addEventListener('click', function() {
        modalQrBg.classList.remove('active');
        stopQr();
    });
    modalQrBg.addEventListener('click', function(e) {
        if (e.target === modalQrBg) {
            modalQrBg.classList.remove('active');
            stopQr();
        }
    });

    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();
        
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            searchResults.classList.remove('active');
            return;
        }

        searchResults.innerHTML = '<div class="loading">Buscando...</div>';
        searchResults.classList.add('active');

        searchTimeout = setTimeout(() => {
            fetch('search_products.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: query })
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    searchResults.innerHTML = `<div class="search-result-item">Error: ${data.error}</div>`;
                    return;
                }

                if (data.results.length === 0) {
                    searchResults.innerHTML = '<div class="search-result-item">No se encontraron resultados</div>';
                    return;
                }

                // Si hay solo un resultado, seleccionarlo automáticamente
                if (data.results.length === 1) {
                    updateProductDetails(data.results[0]);
                    searchResults.classList.remove('active');
                    return;
                }

                searchResults.innerHTML = data.results.map(product => `
                    <div class="search-result-item" data-product-id="${product.id}">
                        <div class="product-name">${product.name}</div>
                        <div class="product-details">
                            <span class="product-sku">SKU: ${product.default_code}</span>
                            <span class="product-stock">Stock: ${product.qty_available}</span>
                            <span class="product-price">$${product.list_price}</span>
                        </div>
                    </div>
                `).join('');

                // Agregar event listeners a los resultados
                document.querySelectorAll('.search-result-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const productId = this.dataset.productId;
                        const product = data.results.find(p => p.id === parseInt(productId));
                        if (product) {
                            // Remover selección anterior
                            document.querySelectorAll('.search-result-item').forEach(i => 
                                i.classList.remove('selected'));
                            // Marcar como seleccionado
                            this.classList.add('selected');
                            // Actualizar detalles
                            updateProductDetails(product);
                            // Cerrar resultados
                            searchResults.classList.remove('active');
                        }
                    });
                });
            })
            .catch(error => {
                searchResults.innerHTML = `<div class="search-result-item">Error al buscar: ${error.message}</div>`;
            });
        }, 300);
    });

    // Cerrar resultados al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });

    // Evento para abrir el modal al hacer clic en la imagen
    productPhoto.addEventListener('click', function(e) {
        const img = productPhoto.querySelector('img');
        if (img && lastImgSrc && selectedProduct && selectedProduct.id) {
            // Mostrar spinner y ocultar imagen
            modalImgSpinner.style.display = 'flex';
            modalImg.style.display = 'none';
            modalImg.src = '';
            modalImgBg.classList.add('active');
            // Petición AJAX para obtener la imagen grande
            fetch('get_image.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selectedProduct.id })
            })
            .then(res => res.json())
            .then(data => {
                let imgSrc = lastImgSrc;
                if (data.image_1024) {
                    imgSrc = `data:image/png;base64,${data.image_1024}`;
                }
                // Cuando la imagen grande termine de cargar, ocultar spinner y mostrar imagen
                modalImg.onload = function() {
                    modalImgSpinner.style.display = 'none';
                    modalImg.style.display = 'block';
                };
                modalImg.src = imgSrc;
            })
            .catch(() => {
                modalImg.src = lastImgSrc;
                modalImgSpinner.style.display = 'none';
                modalImg.style.display = 'block';
            });
        }
    });
    // Cerrar modal al hacer clic en la X
    modalImgClose.addEventListener('click', function() {
        modalImgBg.classList.remove('active');
        modalImg.src = '';
        modalImg.style.display = 'none';
        modalImgSpinner.style.display = 'none';
    });
    // Cerrar modal al hacer clic fuera de la imagen
    modalImgBg.addEventListener('click', function(e) {
        if (e.target === modalImgBg) {
            modalImgBg.classList.remove('active');
            modalImg.src = '';
            modalImg.style.display = 'none';
            modalImgSpinner.style.display = 'none';
        }
    });

    // Mostrar/ocultar el ícono de borrado según el contenido del input
    searchInput.addEventListener('input', function() {
        if (searchInput.value.length > 0) {
            clearSearchBtn.classList.add('visible');
        } else {
            clearSearchBtn.classList.remove('visible');
        }
    });
    // Al hacer clic en el ícono de borrado
    clearSearchBtn.addEventListener('click', function() {
        searchInput.value = '';
        clearSearchBtn.classList.remove('visible');
        searchResults.classList.remove('active');
        searchResults.innerHTML = '';
        searchInput.focus();
    });

    // MODAL ACTUALIZAR PRECIO
    const modalPrecioBg = document.getElementById('modalPrecioBg');
    const modalPrecioClose = document.getElementById('modalPrecioClose');
    const precioActualModal = document.getElementById('precioActualModal');
    const ultimoPrecioCompraModal = document.getElementById('ultimoPrecioCompraModal');
    const precioSugeridoModal = document.getElementById('precioSugeridoModal');
    const nuevoPrecioInput = document.getElementById('nuevoPrecioInput');
    const margenInput = document.getElementById('margenInput');
    const decreaseMargenBtn = document.getElementById('decreaseMargenBtn');
    const increaseMargenBtn = document.getElementById('increaseMargenBtn');
    const guardarPrecioBtn = document.getElementById('guardarPrecioBtn');
    // MODAL CONFIRMACION
    const modalConfirmBg = document.getElementById('modalConfirmBg');
    const confirmYesBtn = document.getElementById('confirmYesBtn');
    const confirmNoBtn = document.getElementById('confirmNoBtn');
    // MODAL MENSAJE
    const modalMsgBg = document.getElementById('modalMsgBg');
    const modalMsgContent = document.getElementById('modalMsgContent');

    // Botón de abrir modal (Actualizar Precio)
    document.querySelectorAll('.actions button').forEach(btn => {
        if (btn.textContent.includes('Actualizar Precio')) {
            btn.addEventListener('click', function() {
                if (!selectedProduct) return;
                // Mostrar precio actual con formato chileno
                const precioVenta = parseInt(selectedProduct.list_price.replace(/[^\d]/g, ''));
                precioActualModal.textContent = `$${precioVenta.toLocaleString('es-CL')}`;
                
                // Obtener y mostrar último precio de compra + IVA
                let lastPurchase = 0;
                if (selectedProduct.last_purchase_price) {
                    if (typeof selectedProduct.last_purchase_price === 'string') {
                        lastPurchase = parseInt(selectedProduct.last_purchase_price.replace(/[^\d]/g, ''));
                    } else {
                        lastPurchase = selectedProduct.last_purchase_price;
                    }
                }
                let lastPurchaseIVA = Math.round(lastPurchase * 1.19);
                ultimoPrecioCompraModal.textContent = lastPurchaseIVA ? `$${lastPurchaseIVA.toLocaleString('es-CL')}` : 'No disponible';
                lastPurchasePrice = lastPurchase;
                lastPurchasePriceIVA = lastPurchaseIVA;
                // Mostrar margen actual en el modal
                mostrarMargenActualModal(precioVenta, lastPurchaseIVA);
                // Resetear margen a 30%
                margenInput.value = '30';
                // Calcular sugerido terminado en 90
                const margen = parseFloat(margenInput.value) || 0;
                const sugerido = calcularPrecioSugerido(margen);
                precioSugeridoModal.textContent = `$${sugerido.toLocaleString('es-CL')}`;
                nuevoPrecioInput.value = `$${sugerido.toLocaleString('es-CL')}`;
                modalPrecioBg.classList.add('active');
            });
        }
    });
    // Cerrar modal precio
    modalPrecioClose.addEventListener('click', function() {
        modalPrecioBg.classList.remove('active');
    });
    // Guardar precio (abrir confirmación)
    guardarPrecioBtn.addEventListener('click', function() {
        modalConfirmBg.classList.add('active');
    });
    // Confirmar actualización
    confirmYesBtn.addEventListener('click', function() {
        modalConfirmBg.classList.remove('active');
        // Obtener el nuevo precio como número
        let nuevoPrecio = parseInt(nuevoPrecioInput.value.replace(/[^\d]/g, '')) || 0;
        if (!selectedProduct || !nuevoPrecio) {
            mostrarMensajeModal('Error: datos incompletos', false);
            return;
        }
        // Deshabilitar botón para evitar doble envío
        guardarPrecioBtn.disabled = true;
        fetch('update_price.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: selectedProduct.id,
                new_price: nuevoPrecio
            })
        })
        .then(res => res.json())
        .then(data => {
            guardarPrecioBtn.disabled = false;
            if (data.success) {
                modalPrecioBg.classList.remove('active');
                mostrarMensajeModal('¡Precio actualizado exitosamente!', true);
                // Opcional: actualizar el precio mostrado en la ficha
                productPrice.textContent = `$${nuevoPrecio.toLocaleString('es-CL')}`;
            } else {
                mostrarMensajeModal(data.message || 'No se pudo actualizar el precio', false);
            }
        })
        .catch(err => {
            guardarPrecioBtn.disabled = false;
            mostrarMensajeModal('Error de conexión', false);
        });
    });
    // Cancelar confirmación
    confirmNoBtn.addEventListener('click', function() {
        modalConfirmBg.classList.remove('active');
    });
    // Función para mostrar mensaje de éxito/error
    function mostrarMensajeModal(msg, exito) {
        modalMsgContent.textContent = msg;
        modalMsgContent.style.color = exito ? 'var(--accent)' : '#ff4444';
        modalMsgBg.classList.add('active');
        setTimeout(() => {
            modalMsgBg.classList.remove('active');
        }, 1800);
    }

    // Eventos para el control de margen
    margenInput.addEventListener('input', function() {
        let value = parseFloat(this.value) || 0;
        if (value < 0) value = 0;
        if (value > 100) value = 100;
        this.value = value.toFixed(1);
        actualizarPrecios();
    });

    decreaseMargenBtn.addEventListener('click', function() {
        let value = parseFloat(margenInput.value) || 0;
        value = Math.max(0, value - 0.5);
        margenInput.value = value.toFixed(1);
        actualizarPrecios();
    });

    increaseMargenBtn.addEventListener('click', function() {
        let value = parseFloat(margenInput.value) || 0;
        value = Math.min(100, value + 0.5);
        margenInput.value = value.toFixed(1);
        actualizarPrecios();
    });

    // Manejar el evento input para mantener solo números
    nuevoPrecioInput.addEventListener('input', function() {
        // Solo mantener números
        this.value = this.value.replace(/[^\d]/g, '');
    });

    // Al hacer click en el input de nuevo precio, borrar su contenido
    nuevoPrecioInput.addEventListener('click', function() {
        this.value = '';
    });

    // Cuando el input pierde el foco, aplicar formato de moneda, sin forzar el 90 y actualizar el margen
    nuevoPrecioInput.addEventListener('blur', function() {
        let value = parseInt(this.value.replace(/[^\d]/g, '')) || 0;
        if (value > 0) {
            // Solo aplicar formato, NO ajustar a 90
            this.value = `$${value.toLocaleString('es-CL')}`;
            // Calcular y actualizar margen si hay último precio de compra
            if (lastPurchasePrice > 0) {
                // El precio sugerido incluye IVA, así que el margen es sobre el neto con IVA
                // margen = ((nuevoPrecio / (lastPurchasePrice * 1.19)) - 1) * 100
                let margenCalc = ((value / (lastPurchasePrice * 1.19)) - 1) * 100;
                margenCalc = Math.max(0, margenCalc); // No permitir margen negativo
                margenInput.value = margenCalc.toFixed(1);
                // También actualizamos el precio sugerido por si el usuario quiere volver a sugerido
                const sugerido = calcularPrecioSugerido(margenCalc);
                precioSugeridoModal.textContent = `$${sugerido.toLocaleString('es-CL')}`;
            }
        } else {
            // Si no hay valor, mostrar el sugerido
            const margen = parseFloat(margenInput.value) || 0;
            const sugerido = calcularPrecioSugerido(margen);
            this.value = `$${sugerido.toLocaleString('es-CL')}`;
        }
    });

    // Cuando el input recibe el foco, quitar formato
    nuevoPrecioInput.addEventListener('focus', function() {
        let value = parseInt(this.value.replace(/[^\d]/g, '')) || '';
        this.value = value;
    });

    function mostrarMargenActualModal(precioVenta, lastPurchaseIVA) {
        const margenActualModal = document.getElementById('margenActualModal');
        if (!margenActualModal) return;
        if (lastPurchaseIVA > 0 && precioVenta > 0) {
            const margen = ((precioVenta / lastPurchaseIVA) - 1) * 100;
            const margenRedondeado = Math.round(margen);
            let color = '#e53935'; // rojo por defecto
            if (margenRedondeado >= 30) color = '#43a047'; // verde
            else if (margenRedondeado >= 15) color = '#fbc02d'; // amarillo
            margenActualModal.textContent = margenRedondeado + '%';
            margenActualModal.style.background = 'none';
            margenActualModal.style.color = color;
            margenActualModal.style.padding = '0';
            margenActualModal.style.borderRadius = '0';
            margenActualModal.style.fontWeight = 'bold';
            margenActualModal.style.fontSize = '1rem';
            margenActualModal.style.marginLeft = '0';
            margenActualModal.style.display = 'inline';
        } else {
            margenActualModal.textContent = '-';
            margenActualModal.style.background = 'none';
            margenActualModal.style.color = '#fff';
            margenActualModal.style.display = 'inline';
        }
    }

    // Modal de ajuste de stock
    const modalStockBg = document.getElementById('modalStockBg');
    const modalStockClose = document.getElementById('modalStockClose');
    const stockCancelarBtn = document.getElementById('stockCancelarBtn');
    const stockGuardarBtn = document.getElementById('stockGuardarBtn');
    const stockMotivoInput = document.getElementById('stockMotivoInput');
    const stockCantidadInput = document.getElementById('stockCantidadInput');

    // Botón de abrir modal (Ajuste Stock)
    document.querySelectorAll('.actions button').forEach(btn => {
        if (btn.textContent.includes('Ajuste Stock')) {
            console.log('Botón Ajuste Stock encontrado');
            btn.addEventListener('click', function() {
                console.log('Click en botón Ajuste Stock');
                if (!selectedProduct) {
                    console.log('No hay producto seleccionado');
                    return;
                }
                // Actualizar el motivo con el SKU del producto
                stockMotivoInput.value = `INV: SKU ${selectedProduct.default_code}`;
                // Poner la cantidad actual como valor inicial
                stockCantidadInput.value = selectedProduct.qty_available;
                // Mostrar el modal
                modalStockBg.classList.add('active');
            });
        }
    });

    // Cerrar modal
    if (modalStockClose) {
        modalStockClose.addEventListener('click', function() {
            modalStockBg.classList.remove('active');
        });
    }
    if (modalStockBg) {
        modalStockBg.addEventListener('click', function(e) {
            if (e.target === modalStockBg) {
                modalStockBg.classList.remove('active');
            }
        });
    }
    if (stockCancelarBtn) {
        stockCancelarBtn.addEventListener('click', function() {
            modalStockBg.classList.remove('active');
        });
    }

    // Guardar ajuste
    if (stockGuardarBtn) {
        stockGuardarBtn.addEventListener('click', function() {
            if (!selectedProduct) return;

            const newQty = parseInt(stockCantidadInput.value);
            const reason = stockMotivoInput.value.trim();

            if (isNaN(newQty) || newQty < 0) {
                mostrarMensaje('La cantidad debe ser un número válido', 'error');
                return;
            }
            if (!reason) {
                mostrarMensaje('Debe ingresar un motivo para el ajuste', 'error');
                return;
            }

            // Mostrar mensaje de confirmación
            modalConfirmBg.classList.add('active');
            document.querySelector('#modalConfirmBg p').textContent = 
                `¿Está seguro de ajustar el stock a ${newQty} unidades?`;

            // Limpiar cualquier evento anterior para evitar conflictos
            confirmYesBtn.onclick = null;
            confirmNoBtn.onclick = null;

            // Manejar confirmación SOLO para ajuste de stock
            confirmYesBtn.onclick = function() {
                modalConfirmBg.classList.remove('active');
                // Enviar ajuste a Odoo
                const formData = new FormData();
                formData.append('product_id', selectedProduct.id);
                formData.append('new_qty', newQty);
                formData.append('reason', reason);

                fetch('adjust_stock.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        mostrarMensaje(data.error, 'error');
                        return;
                    }
                    if (data.success) {
                        mostrarMensaje(data.message, 'success');
                        modalStockBg.classList.remove('active');
                        if (document.getElementById('stockReal')) {
                            document.getElementById('stockReal').textContent = newQty;
                        }
                        if (typeof updateProductDetails === 'function') {
                            fetch('search_products.php', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ product_id: selectedProduct.id })
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.results && data.results.length > 0) {
                                    updateProductDetails(data.results[0]);
                                }
                            })
                            .catch(error => {
                                console.error('Error al recargar producto:', error);
                            });
                        }
                    }
                })
                .catch(error => {
                    mostrarMensaje(error.message || 'Error al ajustar el stock', 'error');
                });
            };

            confirmNoBtn.onclick = function() {
                modalConfirmBg.classList.remove('active');
            };
        });
    }

    function mostrarMensaje(msg, tipo) {
        // tipo: 'success' o 'error'
        if (!window.modalMsgBg || !window.modalMsgContent) {
            // Si no existen, los creamos
            let bg = document.createElement('div');
            bg.id = 'modalMsgBg';
            bg.className = 'modal-msg-bg';
            let content = document.createElement('div');
            content.id = 'modalMsgContent';
            content.className = 'modal-msg-content';
            bg.appendChild(content);
            document.body.appendChild(bg);
            window.modalMsgBg = bg;
            window.modalMsgContent = content;
        }
        window.modalMsgContent.textContent = msg;
        window.modalMsgContent.style.color = (tipo === 'success') ? 'var(--accent)' : '#ff4444';
        window.modalMsgBg.classList.add('active');
        setTimeout(() => {
            window.modalMsgBg.classList.remove('active');
        }, 1800);
    }
});

