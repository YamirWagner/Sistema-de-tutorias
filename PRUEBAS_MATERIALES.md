# 🧪 PRUEBAS - Sistema de Materiales de Tutoría

## 📋 Resumen de Cambios Implementados

### ✅ Correcciones Realizadas

#### 1. **Backend (atencionTutoria.php)**
- ✨ **Nueva función `procesarMateriales()`**: Procesa inteligentemente materiales de apoyo y recursos
  - Soporta strings con saltos de línea
  - Soporta arrays de strings
  - Soporta arrays de objetos
  - Detecta automáticamente el tipo de material (PDF, Video, Enlace, Documento, Otro)

- ✨ **Nueva función `determinarTipoMaterial()`**: Identifica el tipo correcto de material
  - Por extensión de archivo (.pdf, .docx, .xlsx, etc.)
  - Por URL (YouTube, Vimeo, Google Drive, Dropbox)
  - Por protocolo (http://, https://)

- ✨ **Nueva función `generarTituloMaterial()`**: Crea títulos descriptivos
  - Usa nombre de archivo si está disponible
  - Identifica plataformas conocidas (YouTube, Drive, etc.)
  - Trunca textos largos elegantemente

- ✨ **Nueva función `procesarTareas()`**: Guarda tareas asignadas (solo para tutorías académicas)

- 🔧 **Logs de depuración mejorados**: 
  - Identifica claramente inicio y fin de operaciones
  - Muestra tipo y contenido de datos recibidos
  - Cuenta materiales guardados exitosamente
  - Registra errores con stack trace completo

#### 2. **Frontend (atenciontutoria.js)**
- 🔄 **Unificación de campos comunes**: `materialesApoyo` y `recursosRecomendados` se envían en todas las modalidades
- 📊 **Logs de consola detallados**: Para debugging en desarrollo
- ✅ **Validación mejorada**: Verifica campos antes de enviar
- 🎯 **Guardado parcial actualizado**: Las tres funciones (académica, personal, profesional) incluyen materiales

#### 3. **Estructura de Datos**
Los materiales se guardan en la tabla `materiales` con:
- `idTutoria`: Relación con la tutoría
- `titulo`: Generado automáticamente o basado en archivo
- `descripcion`: Contenido completo del material
- `tipo`: ENUM('PDF', 'Video', 'Documento', 'Enlace', 'Otro')
- `enlace`: URL o referencia al recurso
- `fechaRegistro`: Fecha de creación

---

## 🧪 Plan de Pruebas

### **Prueba 1: Tutoría Académica con Materiales**

**Datos de Prueba:**
```
Materiales de Apoyo:
- Guía de Programación Orientada a Objetos
- Ejercicios prácticos de clases y objetos
- https://drive.google.com/file/ejemplo.pdf

Recursos Recomendados:
- https://www.youtube.com/watch?v=ejemplo
- Libro: Clean Code - Robert Martin
- https://www.geeksforgeeks.org/object-oriented-programming-oops-concept-in-java/
```

**Resultado Esperado:**
- 3 registros en tabla `materiales` de tipo "Material de apoyo"
- 3 registros en tabla `materiales` de tipo "Recurso recomendado"
- Tipos detectados: Enlace, Video, Enlace
- Títulos descriptivos generados

---

### **Prueba 2: Tutoría Personal con Recursos**

**Datos de Prueba:**
```
Materiales de Apoyo:
- Técnicas de manejo de estrés
- Guía de organización del tiempo

Recursos Recomendados:
- https://www.youtube.com/watch?v=gestion-tiempo
- App recomendada: Notion para organización
- https://www.mindtools.com/pages/article/newHTE_03.htm
```

**Resultado Esperado:**
- 2 registros de tipo "Material de apoyo" → Tipo: Otro
- 3 registros de tipo "Recurso recomendado" → Tipos: Video, Otro, Enlace
- Sin errores de procesamiento

---

### **Prueba 3: Tutoría Profesional con Enlaces**

**Datos de Prueba:**
```
Materiales de Apoyo:
Plantilla de CV profesional
Ejemplos de cartas de presentación

Recursos Recomendados:
https://www.linkedin.com/pulse/mejores-practicas-cv
https://www.indeed.com/career-advice/resumes-cover-letters
CV_Template.docx
```

**Resultado Esperado:**
- 2 registros de materiales → Tipo: Otro
- 3 registros de recursos → Tipos: Enlace, Enlace, Documento
- Detección correcta de extensión .docx

---

### **Prueba 4: Campo Vacío (No debería generar errores)**

**Datos de Prueba:**
```
Materiales de Apoyo: [vacío]
Recursos Recomendados: [vacío]
```

**Resultado Esperado:**
- 0 registros en tabla materiales
- Log: "Campo 'materialesApoyo' no presente o vacío"
- Log: "Campo 'recursosRecomendados' no presente o vacío"
- Sin errores, tutoría se finaliza correctamente

---

### **Prueba 5: Formato Mixto (Strings multilínea)**

**Datos de Prueba:**
```
Materiales de Apoyo:
Tutorial de Git
https://www.youtube.com/watch?v=git-basics
documento.pdf
Ejercicios prácticos

Recursos Recomendados:
https://git-scm.com/book/es/v2
https://www.atlassian.com/git/tutorials
```

**Resultado Esperado:**
- 4 materiales guardados (cada línea no vacía)
- Tipos: Otro, Video, PDF, Otro
- 2 recursos guardados
- Tipos: Enlace, Enlace

---

## 📊 Verificación en Base de Datos

### **Consulta SQL para verificar materiales guardados:**

```sql
-- Ver todos los materiales de una tutoría específica
SELECT 
    id,
    titulo,
    tipo,
    LEFT(descripcion, 50) AS descripcion_corta,
    enlace,
    fechaRegistro
FROM materiales
WHERE idTutoria = [ID_TUTORIA]
ORDER BY id DESC;

-- Contar materiales por tipo
SELECT 
    tipo,
    COUNT(*) as cantidad
FROM materiales
WHERE idTutoria = [ID_TUTORIA]
GROUP BY tipo;

-- Ver última tutoría finalizada con sus materiales
SELECT 
    t.id,
    t.tipo AS tipoTutoria,
    t.estado,
    t.fechaRealizada,
    COUNT(m.id) AS total_materiales
FROM tutoria t
LEFT JOIN materiales m ON t.id = m.idTutoria
WHERE t.estado = 'Realizada'
GROUP BY t.id
ORDER BY t.fechaRealizada DESC
LIMIT 1;
```

---

## 🔍 Monitoreo de Logs

### **Archivos de Log a Revisar:**

1. **`backend/storage/logs/atencion_debug.log`**
   - Buscar: "=========== INICIO registrarSesionFinal ==========="
   - Verificar: Tipos de datos recibidos
   - Contar: Materiales guardados exitosamente

2. **Consola del Navegador (F12)**
   - Buscar: "📦 Datos iniciales:"
   - Verificar: "📎 Materiales de apoyo:"
   - Verificar: "🔗 Recursos recomendados:"
   - Buscar: "✅ Tutoría finalizada exitosamente"

### **Ejemplo de Log Exitoso:**

```
=========== INICIO registrarSesionFinal ===========
tutorId: 2
idTutoria: 45
tipoTutoria: Academica
materialesApoyo presente: SÍ
recursosRecomendados presente: SÍ
materialesApoyo tipo: string
materialesApoyo contenido: "Guía de POO\nEjercicios prácticos"
recursosRecomendados tipo: string
recursosRecomendados contenido: "https://youtube.com/ejemplo\nLibro: Clean Code"
Tutoría actualizada a estado 'Realizada', procesando materiales...
materialesApoyo procesado como STRING: 2 elementos
Material guardado: Título='Guía de POO', Tipo='Otro', Enlace='Guía de POO'
Material guardado: Título='Ejercicios prácticos', Tipo='Otro', Enlace='Ejercicios prácticos'
Total de materialesApoyo guardados: 2 de 2
recursosRecomendados procesado como STRING: 2 elementos
Material guardado: Título='Video de YouTube', Tipo='Video', Enlace='https://youtube.com/ejemplo'
Material guardado: Título='Libro: Clean Code', Tipo='Otro', Enlace='Libro: Clean Code'
Total de recursosRecomendados guardados: 2 de 2
=========== Tutoría 45 FINALIZADA correctamente por tutor 2 ===========
```

---

## ⚠️ Casos de Error Conocidos

### **Error 1: JSON mal formado en respuesta**
- **Síntoma**: "Error parseando JSON"
- **Causa**: Error PHP antes del JSON
- **Solución**: Revisar `atencion_debug.log` para ver el error PHP real

### **Error 2: Materiales no se guardan**
- **Síntoma**: Log muestra "0 de X" materiales guardados
- **Causa**: Posible error en INSERT o transacción
- **Solución**: Revisar permisos de tabla, conexión BD activa

### **Error 3: Tipo de material incorrecto**
- **Síntoma**: Videos detectados como "Otro"
- **Causa**: URL sin protocolo o formato no estándar
- **Solución**: Agregar protocolo https:// en el frontend antes de enviar

---

## ✅ Checklist Final

- [ ] Tutoría académica guarda materiales correctamente
- [ ] Tutoría personal guarda recursos correctamente
- [ ] Tutoría profesional guarda enlaces correctamente
- [ ] Campos vacíos no generan errores
- [ ] Logs muestran cantidades correctas
- [ ] Base de datos contiene registros en tabla `materiales`
- [ ] Tipos de materiales son correctos (PDF, Video, Enlace, etc.)
- [ ] Títulos son descriptivos y legibles
- [ ] No hay errores en consola del navegador
- [ ] No hay errores PHP en `atencion_debug.log`

---

## 🎯 Próximos Pasos (Opcional)

1. **Subida de Archivos Real**: Implementar manejo de archivos físicos (actualmente solo simula)
2. **Vista para Estudiantes**: Mostrar materiales en panel de estudiante
3. **Descarga de Materiales**: Permitir descargar archivos subidos
4. **Edición de Materiales**: Permitir editar/eliminar materiales individualmente
5. **Filtros y Búsqueda**: Buscar materiales por tipo o fecha

---

**Fecha de Actualización**: 31 de Diciembre de 2025  
**Versión**: 2.0  
**Estado**: ✅ Implementado y listo para pruebas
