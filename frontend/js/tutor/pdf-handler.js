// pdf-handler.js - Manejador de generación de PDF (Sistema de Tutorías)
console.log('🚀 [PDF-HANDLER] Iniciando carga del módulo...');

(function() {
    'use strict';
    
    // Variables globales para el módulo
    let pdfBlobUrl = null;
    let pdfLoadTimeout = null;
    let currentEstudianteId = null;
    let currentConstanciaData = null;
    let isFirmada = false;
    let esReporteGeneral = false;
    
    /**
     * Mostrar notificación en el modal
     */
    function mostrarNotificacion(mensaje, tipo = 'info') {
        const notification = document.getElementById('pdfNotification');
        const icon = document.getElementById('notificationIcon');
        const messageEl = document.getElementById('notificationMessage');
        
        if (!notification || !icon || !messageEl) return;
        
        // Limpiar clases previas
        notification.className = 'pdf-notification';
        notification.classList.add(tipo);
        
        // Configurar icono según tipo
        if (tipo === 'success') {
            icon.textContent = '✓';
        } else if (tipo === 'error') {
            icon.textContent = '✗';
        } else {
            icon.textContent = 'ℹ';
        }
        
        messageEl.textContent = mensaje;
        notification.style.display = 'block';
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
    
    /**
     * Mostrar diálogo de confirmación
     */
    function mostrarConfirmacion(mensaje) {
        return new Promise((resolve) => {
            const dialog = document.getElementById('pdfConfirmDialog');
            const messageEl = document.getElementById('confirmMessage');
            const btnYes = document.getElementById('confirmYes');
            const btnNo = document.getElementById('confirmNo');
            
            if (!dialog || !messageEl || !btnYes || !btnNo) {
                resolve(false);
                return;
            }
            
            messageEl.textContent = mensaje;
            dialog.style.display = 'block';
            
            const handleYes = () => {
                dialog.style.display = 'none';
                btnYes.removeEventListener('click', handleYes);
                btnNo.removeEventListener('click', handleNo);
                resolve(true);
            };
            
            const handleNo = () => {
                dialog.style.display = 'none';
                btnYes.removeEventListener('click', handleYes);
                btnNo.removeEventListener('click', handleNo);
                resolve(false);
            };
            
            btnYes.addEventListener('click', handleYes);
            btnNo.addEventListener('click', handleNo);
        });
    }
    
    /**
     * Abrir modal de PDF
     */
    window.abrirModalPDF = function() {
        console.log('🔧 [abrirModalPDF] Abriendo modal...');
        const modal = document.getElementById('modalGenerarPDF');
        console.log('   Modal encontrado:', !!modal);
        
        if (modal) {
            // Actualizar título según tipo
            const titulo = modal.querySelector('.modal-header h2');
            if (titulo) {
                titulo.textContent = esReporteGeneral ? 'Reporte de Estudiantes' : 'Constancia de Tutoría';
            }
            
            // Ocultar/mostrar botones según tipo
            const btnFirmar = document.getElementById('btnFirmarConstanciaModal');
            const btnGuardar = document.getElementById('btnGuardarConstanciaModal');
            if (esReporteGeneral) {
                if (btnFirmar) btnFirmar.style.display = 'none';
                if (btnGuardar) btnGuardar.style.display = 'none';
            } else {
                if (btnFirmar) btnFirmar.style.display = '';
                if (btnGuardar) btnGuardar.style.display = '';
            }
            
            document.body.style.overflow = 'hidden';
            modal.style.display = 'flex';
            console.log('✅ Modal abierto (display: flex)');
            
            // Verificar elementos internos
            setTimeout(() => {
                console.log('   🔍 Verificando contenido del modal:');
                const iframe = document.getElementById('iframeConstanciaPDF');
                const loading = document.getElementById('loadingPDFIndicator');
                const error = document.getElementById('pdfErrorMessage');
                console.log('      iframe:', !!iframe, iframe ? `(${iframe.offsetWidth}x${iframe.offsetHeight})` : '');
                console.log('      loading:', !!loading, loading ? `display: ${loading.style.display}` : '');
                console.log('      error:', !!error, error ? `display: ${error.style.display}` : '');
            }, 50);
        } else {
            console.error('❌ Modal modalGenerarPDF no encontrado en el DOM');
            console.error('   Buscando modales en el documento...');
            const allModals = document.querySelectorAll('[id*="modal"]');
            console.error('   Modales encontrados:', allModals.length);
            allModals.forEach((m, idx) => {
                console.error('     Modal', idx, '- id:', m.id, 'display:', m.style.display);
            });
        }
    };
    
    /**
     * Cerrar modal de PDF
     */
    window.cerrarModalPDF = function() {
        console.log('🔧 [cerrarModalPDF] Cerrando modal...');
        const modal = document.getElementById('modalGenerarPDF');
        if (modal) {
            document.body.style.overflow = '';
            modal.style.display = 'none';
        }
        
        // Ocultar notificaciones y confirmación
        const notification = document.getElementById('pdfNotification');
        const confirmDialog = document.getElementById('pdfConfirmDialog');
        if (notification) notification.style.display = 'none';
        if (confirmDialog) confirmDialog.style.display = 'none';
        
        // Limpiar recursos
        if (pdfLoadTimeout) {
            clearTimeout(pdfLoadTimeout);
            pdfLoadTimeout = null;
        }
        
        const errorMsg = document.getElementById('pdfErrorMessage');
        const loadingMsg = document.getElementById('loadingPDFIndicator');
        if (errorMsg) errorMsg.style.display = 'none';
        if (loadingMsg) loadingMsg.style.display = 'none';
        
        if (pdfBlobUrl) {
            URL.revokeObjectURL(pdfBlobUrl);
            pdfBlobUrl = null;
        }
        
        currentEstudianteId = null;
        currentConstanciaData = null;
        isFirmada = false;
        
        console.log('✅ Modal cerrado');
    };
    
    /**
     * Configurar blob del PDF en el iframe
     */
    window.configurarPDFEnIframe = function(blob) {
        console.log('🔧 [configurarPDFEnIframe] Configurando PDF...');
        console.log('   Tamaño:', blob.size, 'bytes');
        console.log('   Tipo:', blob.type);
        
        const loadingIndicator = document.getElementById('loadingPDFIndicator');
        const errorMsg = document.getElementById('pdfErrorMessage');
        const iframe = document.getElementById('iframeConstanciaPDF');
        const canvasContainer = document.getElementById('pdfCanvasContainer');
        const pagesContainer = document.getElementById('pdfPagesContainer');
        
        console.log('   🔍 Elementos del DOM:');
        console.log('      loadingIndicator:', !!loadingIndicator);
        console.log('      errorMsg:', !!errorMsg);
        console.log('      iframe:', !!iframe);
        console.log('      canvasContainer:', !!canvasContainer);
        console.log('      pagesContainer:', !!pagesContainer);
        
        if (!pagesContainer || !canvasContainer) {
            console.error('❌ CRÍTICO: Contenedor de páginas no encontrado');
            alert('Error: No se encontró el contenedor para renderizar el PDF');
            return;
        }
        
        // Mostrar loading, ocultar error
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
        if (errorMsg) errorMsg.style.display = 'none';
        if (canvasContainer) canvasContainer.style.display = 'none';
        if (iframe) iframe.style.display = 'none';
        
        // Limpiar URL anterior
        if (pdfBlobUrl) {
            console.log('   🧹 Limpiando blob URL anterior');
            URL.revokeObjectURL(pdfBlobUrl);
        }
        
        // Crear nueva URL
        pdfBlobUrl = URL.createObjectURL(blob);
        console.log('   ✅ Blob URL creada:', pdfBlobUrl);
        
        // Usar PDF.js para renderizar
        console.log('   📚 Iniciando PDF.js...');
        
        // Configurar worker de PDF.js
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            console.log('   🔄 Cargando PDF con PDF.js...');
            
            const loadingTask = pdfjsLib.getDocument(pdfBlobUrl);
            loadingTask.promise.then(function(pdf) {
                console.log('   ✅ PDF cargado, total páginas:', pdf.numPages);
                
                // Limpiar páginas anteriores
                pagesContainer.innerHTML = '';
                
                // Verificar si la primera página está en blanco
                pdf.getPage(1).then(function(firstPage) {
                    const testViewport = firstPage.getViewport({ scale: 1 });
                    const testCanvas = document.createElement('canvas');
                    testCanvas.height = testViewport.height;
                    testCanvas.width = testViewport.width;
                    const testContext = testCanvas.getContext('2d');
                    
                    firstPage.render({
                        canvasContext: testContext,
                        viewport: testViewport
                    }).promise.then(function() {
                        // Verificar si el canvas está vacío
                        const imageData = testContext.getImageData(0, 0, testCanvas.width, testCanvas.height);
                        const data = imageData.data;
                        let isEmpty = true;
                        
                        // Revisar si todos los píxeles son blancos
                        for (let i = 0; i < data.length; i += 4) {
                            if (data[i] !== 255 || data[i+1] !== 255 || data[i+2] !== 255) {
                                isEmpty = false;
                                break;
                            }
                        }
                        
                        const startPage = isEmpty ? 2 : 1;
                        console.log('   🔍 Primera página vacía:', isEmpty, '- Iniciando desde página', startPage);
                        
                        // Renderizar todas las páginas (saltando la primera si está vacía)
                        const renderPromises = [];
                        for (let pageNum = startPage; pageNum <= pdf.numPages; pageNum++) {
                            renderPromises.push(
                                pdf.getPage(pageNum).then(function(page) {
                                    console.log('   📄 Renderizando página', pageNum, 'de', pdf.numPages);
                                    
                                    const viewport = page.getViewport({ scale: 1.5 });
                                    
                                    // Crear canvas para esta página
                                    const canvas = document.createElement('canvas');
                                    canvas.height = viewport.height;
                                    canvas.width = viewport.width;
                                    // Centrados consistentes en el modal
                                    canvas.style.display = 'block';
                                    canvas.style.margin = '0 auto';
                                    canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                                    canvas.style.background = 'white';
                                    
                                    const context = canvas.getContext('2d');
                                    const renderContext = {
                                        canvasContext: context,
                                        viewport: viewport
                                    };
                                    
                                    // Asegurar que el contenedor también esté centrado
                                    if (pagesContainer) {
                                        pagesContainer.style.display = 'flex';
                                        pagesContainer.style.flexDirection = 'column';
                                        pagesContainer.style.alignItems = 'center';
                                    }

                                    // Agregar canvas al contenedor
                                    pagesContainer.appendChild(canvas);
                                    
                                    return page.render(renderContext).promise;
                                })
                            );
                        }
                        
                        // Cuando todas las páginas estén renderizadas
                        Promise.all(renderPromises).then(function() {
                            console.log('   ✅ Todas las páginas renderizadas exitosamente');
                            if (loadingIndicator) loadingIndicator.style.display = 'none';
                            if (canvasContainer) canvasContainer.style.display = 'block';
                        }).catch(function(error) {
                            console.error('   ❌ Error renderizando páginas:', error);
                            if (loadingIndicator) loadingIndicator.style.display = 'none';
                            if (errorMsg) errorMsg.style.display = 'flex';
                        });
                    });
                });
            }).catch(function(error) {
                console.error('   ❌ Error con PDF.js:', error);
                console.log('   🔄 Intentando con iframe como fallback...');
                
                // Fallback: usar iframe
                if (iframe) {
                    iframe.style.display = 'block';
                    iframe.src = pdfBlobUrl;
                    
                    let loaded = false;
                    iframe.onload = function() {
                        console.log('   ✅ PDF cargado en iframe (fallback)');
                        loaded = true;
                        if (loadingIndicator) loadingIndicator.style.display = 'none';
                    };
                    
                    setTimeout(() => {
                        if (!loaded) {
                            console.warn('   ⚠️ Iframe tampoco funciona, mostrando opciones');
                            if (loadingIndicator) loadingIndicator.style.display = 'none';
                            if (iframe) iframe.style.display = 'none';
                            if (errorMsg) errorMsg.style.display = 'flex';
                        }
                    }, 2000);
                }
            });
        } else {
            console.warn('   ⚠️ PDF.js no disponible, usando iframe');
            // Usar iframe como único método
            if (iframe) {
                iframe.style.display = 'block';
                iframe.src = pdfBlobUrl;
                
                let loaded = false;
                iframe.onload = function() {
                    console.log('   ✅ PDF cargado en iframe');
                    loaded = true;
                    if (loadingIndicator) loadingIndicator.style.display = 'none';
                };
                
                setTimeout(() => {
                    if (!loaded) {
                        console.warn('   ⚠️ El navegador no puede mostrar el PDF');
                        if (loadingIndicator) loadingIndicator.style.display = 'none';
                        if (iframe) iframe.style.display = 'none';
                        if (errorMsg) errorMsg.style.display = 'flex';
                    }
                }, 2000);
            }
        }
    };
    
    /**
     * Abrir PDF en nueva pestaña
     */
    window.abrirPDFNuevaPestaña = function() {
        console.log('🔧 [abrirPDFNuevaPestaña]');
        if (pdfBlobUrl) {
            window.open(pdfBlobUrl, '_blank');
            console.log('✅ PDF abierto en nueva pestaña');
        } else {
            alert('No hay PDF disponible');
        }
    };
    
    /**
     * Descargar PDF
     */
    window.descargarPDFConstancia = function() {
        console.log('🔧 [descargarPDFConstancia]');
        if (!pdfBlobUrl) {
            alert('No hay PDF disponible para descargar');
            return;
        }
        
        fetch(pdfBlobUrl)
            .then(r => r.blob())
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'constancia_tutoria_' + new Date().getTime() + '.pdf';
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                console.log('✅ PDF descargado');
            })
            .catch(err => {
                console.error('❌ Error al descargar:', err);
                alert('Error al descargar el PDF');
            });
    };
    
    /**
     * Generar constancia PDF - FUNCIÓN PRINCIPAL
     */
    window.generarConstanciaPDFTutor = async function(estudianteId, esReporte = false) {
        console.log('🔍 [generarConstanciaPDFTutor] Iniciando...');
        console.log('   estudianteId:', estudianteId);
        console.log('   esReporte:', esReporte);
        
        if (!estudianteId && !esReporte) {
            console.error('❌ ID de estudiante inválido');
            alert('ID de estudiante no válido');
            return;
        }
        
        // Guardar ID y tipo para uso posterior
        currentEstudianteId = estudianteId;
        isFirmada = false;
        esReporteGeneral = esReporte;
        esReporteGeneral = esReporte;
        
        try {
            const token = localStorage.getItem('token');
            console.log('   Token:', token ? 'SÍ' : 'NO');
            
            if (!token) {
                console.error('❌ No hay token');
                alert('No hay sesión activa. Inicia sesión nuevamente.');
                return;
            }
            
            const baseApi = (window.APP_CONFIG && window.APP_CONFIG.API && window.APP_CONFIG.API.BASE_URL)
                ? window.APP_CONFIG.API.BASE_URL.replace(/\/$/, '')
                : ((window.APP_BASE_PATH || '').replace(/\/+$/, '') + '/api');
            
            // Usar endpoint diferente según si es reporte o constancia individual
            const url = esReporte 
                ? `${baseApi}/generar-reporte-estudiantes`
                : `${baseApi}/generar-pdf?estudianteId=${encodeURIComponent(estudianteId)}`;
            
            console.log('📡 Petición:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('📥 Respuesta:');
            console.log('   Status:', response.status);
            console.log('   OK:', response.ok);
            
            if (!response.ok) {
                let mensaje = '';
                try {
                    const errorJson = await response.json();
                    mensaje = errorJson.message || errorJson.error || response.statusText;
                    console.error('❌ Error del servidor:', errorJson);
                } catch (e) {
                    mensaje = await response.text();
                }
                
                console.error('❌ Error HTTP', response.status, ':', mensaje);
                alert(`Error ${response.status}: ${mensaje}`);
                return;
            }
            
            const blob = await response.blob();
            console.log('📄 Blob recibido:');
            console.log('   Tamaño:', blob.size, 'bytes');
            console.log('   Tipo:', blob.type);
            
            // Validación crítica
            if (blob.size === 0) {
                console.error('❌ Blob vacío');
                alert('Error: El servidor devolvió un archivo vacío');
                return;
            }
            
            if (blob.type !== 'application/pdf') {
                console.error('❌ Tipo incorrecto:', blob.type);
                const text = await blob.text();
                console.error('📄 Contenido:', text.substring(0, 500));
                alert('Error: El servidor no devolvió un PDF válido. Tipo: ' + blob.type);
                return;
            }
            
            // Abrir modal y configurar PDF
            abrirModalPDF();
            
            // Intentar mostrar en iframe, pero con fallback inmediato
            setTimeout(() => {
                configurarPDFEnIframe(blob);
            }, 100);
            
            console.log('✅ Proceso completado');
            
        } catch (error) {
            console.error('💥 Error inesperado:', error);
            console.error('   Tipo:', error.name);
            console.error('   Mensaje:', error.message);
            console.error('   Stack:', error.stack);
            alert('Error inesperado: ' + error.message);
        }
    };
    
    /**
     * Firmar constancia en el modal
     */
    window.firmarConstanciaModal = async function() {
        console.log('🔧 [firmarConstanciaModal] Iniciando firma...');
        
        if (!currentEstudianteId) {
            mostrarNotificacion('No hay constancia cargada', 'error');
            return;
        }
        
        if (isFirmada) {
            mostrarNotificacion('Esta constancia ya está firmada', 'info');
            return;
        }
        
        const confirmar = await mostrarConfirmacion('¿Desea firmar esta constancia? Se incluirá su nombre y la fecha actual.');
        if (!confirmar) {
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                mostrarNotificacion('No hay sesión activa', 'error');
                return;
            }
            
            mostrarNotificacion('Generando PDF con firma...', 'info');
            
            const baseApi = (window.APP_CONFIG && window.APP_CONFIG.API && window.APP_CONFIG.API.BASE_URL)
                ? window.APP_CONFIG.API.BASE_URL.replace(/\/$/, '')
                : ((window.APP_BASE_PATH || '').replace(/\/+$/, '') + '/api');
            
            // Regenerar PDF con firma
            const url = `${baseApi}/generar-pdf?estudianteId=${encodeURIComponent(currentEstudianteId)}&firmar=1`;
            console.log('📡 Regenerando PDF con firma:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error:', errorText);
                mostrarNotificacion('Error al firmar la constancia', 'error');
                return;
            }
            
            const blob = await response.blob();
            console.log('📄 PDF firmado recibido:', blob.size, 'bytes');
            
            // Recargar PDF en el iframe
            configurarPDFEnIframe(blob);
            
            isFirmada = true;
            mostrarNotificacion('Constancia firmada exitosamente', 'success');
            console.log('✅ Constancia firmada');
            
        } catch (error) {
            console.error('💥 Error al firmar:', error);
            mostrarNotificacion('Error al firmar la constancia: ' + error.message, 'error');
        }
    };
    
    /**
     * Guardar constancia en la base de datos
     */
    window.guardarConstanciaModal = async function() {
        console.log('🔧 [guardarConstanciaModal] Guardando en BD...');
        
        if (!currentEstudianteId) {
            mostrarNotificacion('No hay constancia para guardar', 'error');
            return;
        }
        
        try {
            mostrarNotificacion('Guardando constancia...', 'info');
            
            const token = localStorage.getItem('token');
            if (!token) {
                mostrarNotificacion('No hay sesión activa', 'error');
                return;
            }
            
            const baseApi = (window.APP_CONFIG && window.APP_CONFIG.API && window.APP_CONFIG.API.BASE_URL)
                ? window.APP_CONFIG.API.BASE_URL.replace(/\/$/, '')
                : ((window.APP_BASE_PATH || '').replace(/\/+$/, '') + '/api');
            
            // Guardar en BD
            const url = `${baseApi}/generar-pdf?estudianteId=${encodeURIComponent(currentEstudianteId)}&guardar=1`;
            console.log('📡 Guardando constancia:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error:', errorText);
                mostrarNotificacion('Error al guardar la constancia', 'error');
                return;
            }
            
            const result = await response.json();
            console.log('✅ Resultado:', result);
            
            if (result.success) {
                mostrarNotificacion('Constancia guardada exitosamente en la base de datos', 'success');
                
                // Esperar 2 segundos antes de cerrar
                setTimeout(async () => {
                    cerrarModalPDF();
                    
                    // Recargar la lista de estudiantes si existe la función
                    if (typeof window.loadMisEstudiantesContent === 'function') {
                        await window.loadMisEstudiantesContent();
                    }
                }, 2000);
            } else {
                mostrarNotificacion('Error: ' + (result.message || result.error), 'error');
            }
            
        } catch (error) {
            console.error('💥 Error al guardar:', error);
            mostrarNotificacion('Error al guardar la constancia: ' + error.message, 'error');
        }
    };
    
    // Verificar que la función se registró correctamente
    console.log('✅ [PDF-HANDLER] Módulo cargado completamente');
    console.log('   window.generarConstanciaPDFTutor:', typeof window.generarConstanciaPDFTutor);
    console.log('   window.abrirModalPDF:', typeof window.abrirModalPDF);
    console.log('   window.cerrarModalPDF:', typeof window.cerrarModalPDF);
    console.log('   window.firmarConstanciaModal:', typeof window.firmarConstanciaModal);
    console.log('   window.guardarConstanciaModal:', typeof window.guardarConstanciaModal);
    
})();
