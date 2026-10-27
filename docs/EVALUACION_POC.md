# Protocolo reproducible de evaluación — EcoScan

**Estado al 26 de octubre de 2026: evaluación diseñada; medición de exactitud pendiente.**
No confundir las pruebas automáticas de integración con una medición de precisión de Gemini.

## Hipótesis y variable principal

EcoScan clasifica fotografías individuales en una de cinco clases:
- `plastico`: botella de bebida PET
- `lata`: lata de bebida de aluminio
- `vidrio`: botella o frasco de vidrio
- `papel`: papel limpio
- `carton`: cartón limpio

Se mide si la **categoría predicha** coincide con la **categoría real**, verificada previamente. No se entrena un clasificador propio; el backend utiliza Gemini con un prompt específico.

## Dataset exploratorio

- **50 fotografías principales**: 10 de cada categoría, con variación de fondo, ángulo, luz y condición física.
- **15 casos complementarios, fuera de la exactitud principal**: 5 residuos contaminados reconocibles, 5 objetos fuera del alcance, 5 imágenes no identificables.
- Cada fotografía debe tener un residuo principal y una etiqueta real comprobada **antes de ejecutar** Gemini.
- PET y aluminio **no se pueden confirmar químicamente por apariencia**. Registrar etiqueta 1/PET, rotulado, envase o ficha del fabricante; si no se verifica, excluir la muestra principal y reemplazarla.
- No escoger únicamente imágenes exitosas después de ver los resultados ni modificar el prompt durante el mismo experimento.

## Protocolo técnico

1. Encender MySQL y el backend local con sus variables `DB_*`, `JWT_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`.
2. Crear una **cuenta exclusiva de evaluación**. `POST /scan` guarda cada foto y análisis en el historial.
3. Inventariar fotografías y evidencia material verificable. Usar JPEG, PNG o WebP hasta 5 MB, un residuo principal por foto.
4. Analizar cada imagen exactamente una vez a través de `POST /scan` con JWT y campo multipart `image`.
5. Registrar fecha UTC, versión de modelo, hash de imagen, clase real, clase predicha, estado real/predicho, confianza orientativa, código de respuesta y errores.
6. Calcular aciertos y exactitud principal; reportar cobertura de procesamiento y fallos técnicos por separado, además de matriz de confusión y resultados por categoría.
7. Analizar los 15 casos complementarios por separado: no apto, fuera del alcance y no identificado.

## Fórmulas

- Exactitud sobre total = aciertos / 50 (si se enviaron las 50 fotos).
- Cobertura = clasificaciones válidas / 50.
- Exactitud entre procesadas = aciertos / clasificaciones válidas.
- Sensibilidad por categoría = clasificaciones correctas de esa categoría / fotos reales de esa categoría.
- `confianza` devuelta por Gemini **NO equivale a una probabilidad calibrada de acierto**.

No publicar una exactitud calculada a partir de respuestas simuladas, de un único objeto repetido o de una selección posterior de fotos acertadas.

## Implementación y papel académico

Se preparó un kit local con un manifiesto de 65 casos, planilla de registro y un script Python sin dependencias de terceros para ejecutar el backend, calcular matriz de confusión y generar un resumen descriptivo para el paper. **No se han incorporado imágenes ni resultados reales en este repositorio.**

Una muestra de 50 fotos aporta una evidencia exploratoria para el trabajo final, no valida un despliegue comercial. El mapa de puntos verdes y EcoMundo son funcionalidades complementarias y **no integran** la evaluación de exactitud de IA.

## Texto para el paper, antes de medir

> Para la evaluación se definió un conjunto exploratorio equilibrado de 50 fotografías correspondientes a PET, aluminio, vidrio, papel y cartón. Se contemplan variaciones de iluminación, ángulo, fondo y condiciones del objeto. Se definieron además 15 casos complementarios para evaluar objetos fuera del alcance, residuos contaminados e imágenes sin identificación suficiente. La categoría real deberá verificarse antes del procesamiento. La métrica principal será la exactitud de clasificación, acompañada de cobertura, resultados por categoría y matriz de confusión, sin interpretar el valor de confianza del modelo como una probabilidad calibrada.

**No afirmar que estas pruebas ya se ejecutaron ni insertar cifras hasta tener la evidencia correspondiente.**
