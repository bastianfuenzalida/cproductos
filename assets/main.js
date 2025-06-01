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

    function cargarUltimoMovimientoStock(productId) {
        const div = document.getElementById('ultimoMovimientoStock');
        if (!div) return;
        div.innerHTML = '<span style="color:#ffb300;font-size:0.93em;">Últ. Ajuste Stock: </span> <span style="color:#fff;font-size:0.93em;">Buscando último movimiento...</span>';
        fetch(`ultimo_movimiento_stock.php?product_id=${productId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && !data.empty) {
                    const fechaObj = new Date(data.date);
                    // Ajustar la hora restando 4 horas
                    fechaObj.setHours(fechaObj.getHours() - 4);
                    const fecha = fechaObj.toLocaleString('es-CL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                    let texto = `Fecha: ${fecha} | Stock Ajustado: ${data.qty_done ?? data.qty}`;
                    if (typeof data.stock_final !== 'undefined') {
                        texto += ` | Stock Final: ${data.stock_final}`;
                    }
                    texto += ` | Ref: ${data.reference}`;
                    div.innerHTML = `<span style="color:#ffb300;font-size:0.93em;">Últ. Ajuste Stock: </span><span style="color:#fff;font-size:0.93em; class="marquee-scroll">${texto}</span>`;
                } else {
                    div.innerHTML = `<span style="color:#ffb300;font-size:0.93em;">Últ. Ajuste Stock: </span> <span style="color:#fff;font-size:0.93em;">Sin movimientos de ajuste de inventario</span>`;
                }
            })
            .catch(() => {
                div.innerHTML = `<span style="color:#ffb300;font-size:0.93em;">Últ. Ajuste Stock: </span> <span style="color:#fff;font-size:0.93em;">Error al consultar movimiento de stock</span>`;
            });
    }

    function updateProductDetails(product) {
        restaurarVistaPrecio();
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
        const precioVenta = parseInt((product.list_price || '').toString().replace(/[^\d]/g, '')) || 0;
        editPriceInput.value = precioVenta ? `$${precioVenta.toLocaleString('es-CL')}` : '-';
        editSkuInput.value = product.default_code || '';
        editBarcodeInput.value = product.barcode || '';
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
        restaurarVistaPrecio();
        restaurarVistaSku();
        restaurarVistaBarcode();
        cargarUltimoMovimientoStock(product.id);
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
                        // Cerrar resultados primero
                        searchResults.classList.remove('active');
                        searchInput.blur(); // Evitar que el input recupere el foco y reabra la lista
                        const productId = this.dataset.productId;
                        const product = data.results.find(p => p.id === parseInt(productId));
                        if (product) {
                            document.querySelectorAll('.search-result-item').forEach(i => 
                                i.classList.remove('selected'));
                            this.classList.add('selected');
                            // Logs para depuración
                            console.log('Producto seleccionado:', product);
                            console.log('purchase_history:', product.purchase_history);
                            console.log('ID:', product.id);
                            updateProductDetails(product);
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
                const precioVenta = parseInt((selectedProduct.list_price || 0).toString()) || 0;
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
            mostrarMensajeModal('¡Stock actualizado exitosamente!', true);
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

    // Modal de ajuste de inventario físico
    const modalInvBg = document.getElementById('modalInvBg');
    const modalInvClose = document.getElementById('modalInvClose');
    const invUbicacionSelect = document.getElementById('invUbicacionSelect');
    const invUbicacionInput = document.getElementById('invUbicacionInput');
    const invCantidadInput = document.getElementById('invCantidadInput');
    const invAgregarBtn = document.getElementById('invAgregarBtn');
    const invCancelarBtn = document.getElementById('invCancelarBtn');
    const invGuardarBtn = document.getElementById('invGuardarBtn');
    const invConteosBody = document.getElementById('invConteosBody');
    const invTotalConteo = document.getElementById('invTotalConteo');

    // Array para almacenar los conteos
    let conteosFisicos = [];

    // Función para cargar conteos desde la base de datos
    function cargarConteosDesdeBD(productId) {
        conteosFisicos = [];
        invConteosBody.innerHTML = '';
        invTotalConteo.textContent = '0';
        fetch(`consultar_conteos.php?product_id=${productId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && Array.isArray(data.conteos)) {
                    conteosFisicos = data.conteos.map(c => ({
                        id: c.id, // Aseguramos que el id esté presente
                        ubicacion: c.ubicacion,
                        cantidad: parseInt(c.cantidad),
                        fecha: c.fecha
                    }));
                    actualizarTablaConteos();
                }
            });
    }

    // Botón de abrir modal (Ajuste Inv)
    document.querySelectorAll('.actions button').forEach(btn => {
        if (btn.textContent.trim() === 'Ajuste Inv') {
            btn.addEventListener('click', function() {
                if (!selectedProduct) {
                    mostrarMensaje('No hay producto seleccionado', 'error');
                    return;
                }
                // Resetear el select a SALA y ocultar el input
                invUbicacionSelect.value = 'SALA';
                invUbicacionInput.style.display = 'none';
                invUbicacionInput.value = '';
                invCantidadInput.value = '';
                // Cargar conteos activos desde la base de datos
                cargarConteosDesdeBD(selectedProduct.id);
                // Mostrar el modal
                modalInvBg.classList.add('active');
            });
        }
    });

    // Cerrar modal
    modalInvClose.addEventListener('click', function() {
        modalInvBg.classList.remove('active');
    });
    modalInvBg.addEventListener('click', function(e) {
        if (e.target === modalInvBg) {
            modalInvBg.classList.remove('active');
        }
    });
    invCancelarBtn.addEventListener('click', function() {
        modalInvBg.classList.remove('active');
    });

    // Agregar conteo
    invAgregarBtn.addEventListener('click', function() {
        let ubicacion = '';
        const ubicacionSeleccionada = invUbicacionSelect.value;
        if (ubicacionSeleccionada === 'OTRO') {
            ubicacion = invUbicacionInput.value.trim();
            if (!ubicacion) {
                mostrarMensaje('Debe ingresar una ubicación', 'error');
                return;
            }
        } else if (ubicacionSeleccionada) {
            ubicacion = ubicacionSeleccionada;
        } else {
            mostrarMensaje('Debe seleccionar una ubicación', 'error');
            return;
        }

        const cantidad = parseInt(invCantidadInput.value) || 0;
        if (cantidad < 0) {
            mostrarMensaje('La cantidad debe ser un número válido', 'error');
            return;
        }

        // Enviar a la base de datos
        invAgregarBtn.disabled = true;
        fetch('guardar_conteo.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: selectedProduct.id,
                usuario: odooUser,
                ubicacion: ubicacion,
                cantidad: cantidad
            })
        })
        .then(res => res.json())
        .then(data => {
            invAgregarBtn.disabled = false;
            if (!data.success) {
                mostrarMensaje(data.error || 'No se pudo guardar el conteo', 'error');
                return;
            }
            // Limpiar solo los campos de texto, mantener la selección
            invUbicacionSelect.value = ubicacionSeleccionada;
            if (ubicacionSeleccionada === 'OTRO') {
                invUbicacionInput.style.display = 'block';
            } else {
                invUbicacionInput.style.display = 'none';
            }
            invUbicacionInput.value = '';
            invCantidadInput.value = '';
            invCantidadInput.focus();
            // Recargar la tabla desde la base de datos
            cargarConteosDesdeBD(selectedProduct.id);
        })
        .catch(() => {
            invAgregarBtn.disabled = false;
            mostrarMensaje('Error de conexión', 'error');
        });
    });

    // Función para eliminar conteo
    function eliminarConteoBD(id) {
        fetch('eliminar_conteo.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                mostrarMensaje(data.error || 'No se pudo eliminar el conteo', 'error');
                return;
            }
            cargarConteosDesdeBD(selectedProduct.id);
        })
        .catch(() => {
            mostrarMensaje('Error de conexión', 'error');
        });
    }

    // Modificar actualizarTablaConteos para usar el id de la bd
    function actualizarTablaConteos() {
        invConteosBody.innerHTML = conteosFisicos.map((conteo, index) => {
            const fecha = new Date(conteo.fecha).toLocaleString('es-CL', {
                hour: '2-digit',
                minute: '2-digit'
            });
            return `
                <tr>
                    <td>
                        <div>${conteo.ubicacion}</div>
                        <div style="font-size:0.8em;color:#888;">${fecha}</div>
                    </td>
                    <td style="text-align:right">${conteo.cantidad}</td>
                    <td style="text-align:center">
                        <button class="btn-eliminar-conteo" data-id="${conteo.id || ''}" title="Eliminar conteo">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Actualizar total
        const total = conteosFisicos.reduce((sum, conteo) => sum + conteo.cantidad, 0);
        invTotalConteo.textContent = total;

        // Agregar event listeners a los botones de eliminar
        document.querySelectorAll('.btn-eliminar-conteo').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.id;
                if (id) {
                    if (confirm('¿Está seguro de eliminar este conteo?')) {
                        eliminarConteoBD(id);
                    }
                }
            });
        });
    }

    // Guardar ajuste de inventario
    invGuardarBtn.addEventListener('click', function() {
        if (conteosFisicos.length === 0) {
            mostrarMensaje('Debe agregar al menos un conteo', 'error');
            return;
        }

        const total = conteosFisicos.reduce((sum, conteo) => sum + conteo.cantidad, 0);
        // Usar el primer nombre del usuario para el motivo
        const primerNombre = odooName ? odooName.split(' ')[0] : odooUser;
        const motivo = `INV FÍSICO [${primerNombre}]: ${conteosFisicos.map(c => `${c.ubicacion}(${c.cantidad})`).join(', ')}`;

        // Mostrar confirmación
        modalConfirmBg.classList.add('active');
        document.querySelector('#modalConfirmBg p').textContent =
            `¿Está seguro de actualizar el stock a ${total} unidades?\nMotivo: ${motivo}`;

        // Limpiar eventos anteriores
        confirmYesBtn.onclick = null;
        confirmNoBtn.onclick = null;

        // Manejar confirmación
        confirmYesBtn.onclick = function() {
            modalConfirmBg.classList.remove('active');

            // Solo ajustar stock y marcar como validados
            const formData = new FormData();
            formData.append('product_id', selectedProduct.id);
            formData.append('new_qty', total);
            formData.append('reason', motivo);

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
                    // Marcar conteos como validados en la base de datos
                    fetch('limpiar_conteos.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ product_id: selectedProduct.id })
                    });
                    mostrarMensaje(data.message, 'success');
                    modalInvBg.classList.remove('active');
                    if (document.getElementById('stockReal')) {
                        document.getElementById('stockReal').textContent = total;
                    }
                    if (document.getElementById('stockPrevisto')) {
                        document.getElementById('stockPrevisto').textContent = '-';
                    }
                    // Recargar la ficha del producto seleccionado
                    recargarProductoSeleccionado();
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

    const lastProductId = localStorage.getItem('lastProductId');
    if (lastProductId) {
        fetch('search_products.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: lastProductId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                updateProductDetails(data.results[0]);
            }
            localStorage.removeItem('lastProductId');
        });
    }

    // --- Edición inline de precio ---
    const editPriceBtn = document.getElementById('editPriceBtn');
    const savePriceBtn = document.getElementById('savePriceBtn');
    const editPriceInput = document.getElementById('editPriceInput');

    function restaurarVistaPrecio() {
        editPriceInput.disabled = true;
        savePriceBtn.style.display = 'none';
        editPriceBtn.style.display = 'flex';
        // Forzar por si algún estilo viejo queda
        savePriceBtn.classList.remove('force-visible');
        editPriceBtn.classList.remove('force-visible');
    }

    if (editPriceBtn && savePriceBtn && editPriceInput) {
        restaurarVistaPrecio();

        editPriceBtn.addEventListener('click', function() {
            editPriceInput.disabled = false;
            editPriceBtn.style.display = 'none';
            savePriceBtn.style.display = 'flex';
            savePriceBtn.classList.add('force-visible');
            editPriceBtn.classList.remove('force-visible');
            editPriceInput.focus();
            editPriceInput.select();
        });

        editPriceInput.addEventListener('blur', function() {
            setTimeout(() => {
                if (editPriceInput.disabled) return;
                // Formatear antes de deshabilitar
                let valor = this.value.replace(/\D/g, '');
                if (valor.length > 0) {
                    this.value = '$' + parseInt(valor).toLocaleString('es-CL');
                }
                restaurarVistaPrecio();
            }, 200);
        });

        savePriceBtn.addEventListener('click', function() {
            const nuevoPrecio = parseInt(editPriceInput.value.replace(/\D/g, '')) || 0;
            const precioActual = parseInt(editPriceInput.value.replace(/\D/g, '')) || 0;
            
            if (!selectedProduct || !nuevoPrecio) {
                mostrarMensaje('Ingrese un precio válido', 'error');
                return;
            }

            editPriceInput.disabled = true;
            savePriceBtn.disabled = true;

            fetch('update_field.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: selectedProduct.id,
                    field: 'list_price',
                    value: nuevoPrecio
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    editPriceInput.value = `$${nuevoPrecio.toLocaleString('es-CL')}`;
                    restaurarVistaPrecio();
                    mostrarMensaje('Precio actualizado', 'success');
                } else {
                    mostrarMensaje(data.error || 'No se pudo actualizar el precio', 'error');
                    editPriceInput.disabled = false;
                    savePriceBtn.disabled = false;
                }
            })
            .catch(() => {
                mostrarMensaje('Error de conexión', 'error');
                editPriceInput.disabled = false;
                savePriceBtn.disabled = false;
            });
        });
    }

    // --- Edición inline de SKU ---
    const editSkuBtn = document.getElementById('editSkuBtn');
    const saveSkuBtn = document.getElementById('saveSkuBtn');
    const editSkuInput = document.getElementById('editSkuInput');

    function restaurarVistaSku() {
        editSkuInput.disabled = true;
        saveSkuBtn.style.display = 'none';
        editSkuBtn.style.display = 'flex';
        saveSkuBtn.disabled = false;
    }
    if (editSkuBtn && saveSkuBtn && editSkuInput) {
        restaurarVistaSku();
        editSkuBtn.addEventListener('click', function() {
            editSkuInput.disabled = false;
            editSkuBtn.style.display = 'none';
            saveSkuBtn.style.display = 'flex';
            editSkuInput.focus();
            editSkuInput.select();
        });
        editSkuInput.addEventListener('blur', function() {
            setTimeout(() => {
                if (editSkuInput.disabled) return;
                restaurarVistaSku();
            }, 200);
        });
        saveSkuBtn.addEventListener('click', function() {
            const nuevoSku = editSkuInput.value.trim();
            const skuActual = selectedProduct ? (selectedProduct.default_code || '').trim() : '';
            if (!selectedProduct) {
                mostrarMensaje('No hay producto seleccionado', 'error');
                return;
            }
            if (nuevoSku === skuActual) {
                restaurarVistaSku();
                return;
            }
            editSkuInput.disabled = true;
            saveSkuBtn.disabled = true;
            fetch('update_field.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: selectedProduct.id,
                    field: 'default_code',
                    value: nuevoSku
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    editSkuInput.value = nuevoSku;
                    selectedProduct.default_code = nuevoSku;
                    restaurarVistaSku();
                    mostrarMensaje('SKU actualizado', 'success');
                } else {
                    mostrarMensaje(data.error || 'No se pudo actualizar el SKU', 'error');
                    editSkuInput.disabled = false;
                    saveSkuBtn.disabled = false;
                }
            })
            .catch(() => {
                mostrarMensaje('Error de conexión', 'error');
                editSkuInput.disabled = false;
                saveSkuBtn.disabled = false;
            });
        });
    }

    // --- Edición inline de Cod. Barra ---
    const editBarcodeBtn = document.getElementById('editBarcodeBtn');
    const saveBarcodeBtn = document.getElementById('saveBarcodeBtn');
    const editBarcodeInput = document.getElementById('editBarcodeInput');

    function restaurarVistaBarcode() {
        editBarcodeInput.disabled = true;
        saveBarcodeBtn.style.display = 'none';
        editBarcodeBtn.style.display = 'flex';
        saveBarcodeBtn.disabled = false;
    }
    if (editBarcodeBtn && saveBarcodeBtn && editBarcodeInput) {
        restaurarVistaBarcode();
        editBarcodeBtn.addEventListener('click', function() {
            editBarcodeInput.disabled = false;
            editBarcodeBtn.style.display = 'none';
            saveBarcodeBtn.style.display = 'flex';
            editBarcodeInput.focus();
            editBarcodeInput.select();
        });
        editBarcodeInput.addEventListener('blur', function() {
            setTimeout(() => {
                if (editBarcodeInput.disabled) return;
                restaurarVistaBarcode();
            }, 200);
        });
        saveBarcodeBtn.addEventListener('click', function() {
            const nuevoBarcode = editBarcodeInput.value.trim();
            const barcodeActual = selectedProduct ? (selectedProduct.barcode || '').trim() : '';
            if (!selectedProduct) {
                mostrarMensaje('No hay producto seleccionado', 'error');
                return;
            }
            if (nuevoBarcode === barcodeActual) {
                restaurarVistaBarcode();
                return;
            }
            editBarcodeInput.disabled = true;
            saveBarcodeBtn.disabled = true;
            fetch('update_field.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: selectedProduct.id,
                    field: 'barcode',
                    value: nuevoBarcode
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    editBarcodeInput.value = nuevoBarcode;
                    selectedProduct.barcode = nuevoBarcode;
                    restaurarVistaBarcode();
                    mostrarMensaje('Código de barra actualizado', 'success');
                } else {
                    mostrarMensaje(data.error || 'No se pudo actualizar el código de barra', 'error');
                    editBarcodeInput.disabled = false;
                    saveBarcodeBtn.disabled = false;
                }
            })
            .catch(() => {
                mostrarMensaje('Error de conexión', 'error');
                editBarcodeInput.disabled = false;
                saveBarcodeBtn.disabled = false;
            });
        });
    }

    // Permitir agregar conteo con Enter
    invUbicacionSelect.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (this.value === 'OTRO') {
                invUbicacionInput.focus();
            } else {
                invCantidadInput.focus();
            }
        }
    });

    invUbicacionInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            invCantidadInput.focus();
        }
    });

    invCantidadInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            invAgregarBtn.click();
        }
    });

    // Subir el modal cuando aparece el teclado en móviles
    function isMobile() {
        return window.innerWidth <= 600;
    }
    [invUbicacionInput, invCantidadInput].forEach(input => {
        input.addEventListener('focus', function() {
            if (isMobile()) {
                modalInvBg.querySelector('.modal-inv-content').classList.add('keyboard-up');
            }
        });
        input.addEventListener('blur', function() {
            if (isMobile()) {
                setTimeout(() => {
                    modalInvBg.querySelector('.modal-inv-content').classList.remove('keyboard-up');
                }, 200); // Espera a que el teclado se oculte
            }
        });
    });

    // Agregar event listener para el botón de ajuste de stock (Ajuste Stock)
    document.querySelectorAll('.actions button').forEach(btn => {
        if (btn.textContent.trim() === 'Ajuste Stock') {
            btn.addEventListener('click', function() {
                if (!selectedProduct) {
                    mostrarMensaje('No hay producto seleccionado', 'error');
                    return;
                }
                console.log("Abriendo modal de ajuste de stock para producto:", selectedProduct);
                const modalStockBg = document.getElementById('modalStockBg');
                if (modalStockBg) {
                    // Cargar el valor del stock actual en el input de cantidad del modal
                    const stockCantidadInput = document.getElementById('stockCantidadInput');
                    if (stockCantidadInput && stockReal) {
                        stockCantidadInput.value = stockReal.textContent;
                    }
                    modalStockBg.classList.add('active');
                } else {
                    console.error("No se encontró el modal de ajuste de stock (modalStockBg)");
                }
            });
        }
    });

    // Agregar event listeners para los botones del modal de ajuste de stock (Ajuste Stock)
    const modalStockBg = document.getElementById('modalStockBg');
    const modalStockClose = document.getElementById('modalStockClose');
    const stockCancelarBtn = document.getElementById('stockCancelarBtn');
    const stockGuardarBtn = document.getElementById('stockGuardarBtn');
    const stockMotivoInput = document.getElementById('stockMotivoInput');
    const stockCantidadInput = document.getElementById('stockCantidadInput');

    if (modalStockClose) {
        modalStockClose.addEventListener('click', function() {
            modalStockBg.classList.remove('active');
        });
    } else {
        console.error("No se encontró el botón de cerrar (modalStockClose)");
    }

    if (stockCancelarBtn) {
        stockCancelarBtn.addEventListener('click', function() {
            modalStockBg.classList.remove('active');
        });
    } else {
        console.error("No se encontró el botón de cancelar (stockCancelarBtn)");
    }

    if (stockGuardarBtn) {
        stockGuardarBtn.addEventListener('click', function() {
            const motivo = stockMotivoInput ? stockMotivoInput.value.trim() : "";
            const cantidad = stockCantidadInput ? (parseInt(stockCantidadInput.value) || 0) : 0;
            console.log("Guardando ajuste de stock: motivo=", motivo, "cantidad=", cantidad);
            if (selectedProduct && cantidad >= 0) {
                const formData = new FormData();
                formData.append("product_id", selectedProduct.id);
                formData.append("new_qty", cantidad);
                formData.append("reason", motivo);
                fetch("adjust_stock.php", { method: "POST", body: formData })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            mostrarMensaje("¡Ajuste de stock guardado con éxito!", "success");
                            modalStockBg.classList.remove("active");
                            // Opcional: actualizar el stock en la interfaz (por ejemplo, stockReal)
                            if (stockReal) stockReal.textContent = cantidad;
                            // Recargar la ficha del producto seleccionado
                            recargarProductoSeleccionado();
                        } else {
                            mostrarMensaje(data.error || "Error al guardar el ajuste de stock", "error");
                        }
                    })
                    .catch (err => {
                        console.error("Error al guardar ajuste de stock:", err);
                        mostrarMensaje("Error de conexión", "error");
                    });
            } else {
                mostrarMensaje("Debe ingresar una cantidad válida (no negativa) y un motivo.", "error");
            }
        });
    } else {
        console.error("No se encontró el botón de guardar (stockGuardarBtn)");
    }

    // Función para recargar la ficha del producto seleccionado
    function recargarProductoSeleccionado() {
        if (!selectedProduct || !selectedProduct.id) return;
        fetch('search_products.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: selectedProduct.id })
        })
        .then(response => response.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                updateProductDetails(data.results[0]);
            } else {
                mostrarMensaje('No se pudo recargar el producto', 'error');
            }
        })
        .catch(() => {
            mostrarMensaje('Error de conexión al recargar producto', 'error');
        });
    }
});

