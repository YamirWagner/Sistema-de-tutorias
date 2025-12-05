/* frontend/js/buscar-historial.js */

document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Obtener elementos
    const btn = document.getElementById('btnBuscar');
    const input = document.getElementById('inputBusqueda');
    const resultados = document.getElementById('resultadosContainer');

    // 2. Escuchar el clic
    btn.addEventListener('click', function() {
        
        const texto = input.value;

        if (texto === "") {
            alert("⚠️ Por favor escribe un nombre o código.");
            return;
        }

        // Simulación: Mostramos los resultados estáticos
        // (Más adelante aquí conectarás con tu Base de Datos real)
        alert("🔍 Buscando historial de: " + texto);
        
        // Hacemos visible el contenedor de resultados
        resultados.style.display = 'block';
    });
});