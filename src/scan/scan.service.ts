import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';

export type WasteCategory =
  | 'plastico'
  | 'lata'
  | 'vidrio'
  | 'papel'
  | 'carton'
  | 'desconocido';

export type RecyclingStatus =
  | 'apto'
  | 'no_apto'
  | 'desconocido';

export interface ScanResult {
  categoria: WasteCategory;
  objeto: string;
  material: string;
  reciclable: boolean;
  estado: RecyclingStatus;
  confianza: number;
  preparacion: string[];
  observacion: string;
}

@Injectable()
export class ScanService {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error(
        'No se configuró GEMINI_API_KEY en el archivo .env',
      );
    }

    this.ai = new GoogleGenAI({
      apiKey,
    });

    this.model =
      this.configService.get<string>('GEMINI_MODEL') ??
      'gemini-3.5-flash-lite';
  }
  private readonly apiUrl =
  'http://localhost:3000/scan';
  private async generateWithRetry(
    imageBase64: string,
    mimeType: string,
  ) {
    const maxAttempts = 3;

    for (
      let attempt = 1;
      attempt <= maxAttempts;
      attempt++
    ) {
      try {
        return await this.ai.models.generateContent({
          model: this.model,

          contents: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            {
              text: this.getPrompt(),
            },
          ],

          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
      } catch (error: unknown) {
        const status = this.getApiStatus(error);

        const shouldRetry =
          status === 429 ||
          status === 500 ||
          status === 502 ||
          status === 503 ||
          status === 504;

        if (
          !shouldRetry ||
          attempt === maxAttempts
        ) {
          throw error;
        }

        const delay =
          1500 * Math.pow(2, attempt - 1);

        console.warn(
          `Gemini no disponible. Reintento ${attempt}/${maxAttempts} en ${delay} ms.`,
        );

        await this.delay(delay);
      }
    }

    throw new ServiceUnavailableException(
      'El servicio de análisis no está disponible',
    );
  }

  private getApiStatus(
    error: unknown,
  ): number | undefined {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error
    ) {
      const status = (
        error as { status?: unknown }
      ).status;

      return typeof status === 'number'
        ? status
        : undefined;
    }

    return undefined;
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
  async analyzeImage(
    file: Express.Multer.File,
  ): Promise<ScanResult> {
    try {
      const imageBase64 =
        file.buffer.toString('base64');

      const response =
        await this.generateWithRetry(
          imageBase64,
          file.mimetype,
        );

      const responseText = response.text;

      if (!responseText) {
        throw new ServiceUnavailableException(
          'Gemini no devolvió ningún resultado',
        );
      }

      const parsedResult = JSON.parse(
        responseText,
      ) as ScanResult;

      return this.normalizeResult(parsedResult);
    } catch (error) {
      if (
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      const status = this.getApiStatus(error);

      if (status === 503) {
        throw new ServiceUnavailableException(
          'Gemini está temporalmente saturado. Intentá nuevamente en unos minutos.',
        );
      }
      console.error(
        'Error al analizar la imagen:',
        error,
      );

      throw new InternalServerErrorException(
        'No fue posible analizar la imagen',
      );
    }
  }

private getPrompt(): string {
  return `
Analizá la imagen de un posible residuo doméstico.

El alcance de EcoScan está limitado exclusivamente a estas
cinco categorías:

1. "plastico": únicamente botellas plásticas.
2. "lata": latas metálicas de bebidas o alimentos.
3. "vidrio": botellas y frascos de vidrio.
4. "papel": hojas, diarios, revistas y papeles.
5. "carton": cajas y envases de cartón.

Utilizá la categoría "desconocido" cuando:

- El objeto no corresponda a ninguna de las cinco categorías.
- Aparezcan residuos orgánicos, comida, carne o vegetales.
- Aparezcan prendas, aparatos electrónicos, pilas o cerámica.
- Aparezca un objeto de plástico que no sea una botella.
- No haya un residuo claramente visible.
- La imagen esté demasiado oscura o borrosa.
- No sea posible determinar el material con suficiente claridad.

No amplíes las categorías aunque reconozcas otro tipo de residuo.

Asigná exactamente uno de estos estados:

- "apto":
  El objeto pertenece a una categoría permitida y puede
  reciclarse después de seguir las recomendaciones indicadas.

- "no_apto":
  El objeto pertenece claramente a una categoría permitida,
  pero presenta contaminación o deterioro visible que impide
  reciclarlo. Por ejemplo, papel o cartón con mucha grasa,
  humedad severa o restos orgánicos adheridos.

- "desconocido":
  El objeto está fuera del alcance, no hay un residuo visible
  o la imagen no permite identificarlo correctamente.

Reglas para "reciclable":

- Si el estado es "apto", reciclable debe ser true.
- Si el estado es "no_apto", reciclable debe ser false.
- Si el estado es "desconocido", reciclable debe ser false.

Reglas para "preparacion":

- Si el estado es "apto", incluí siempre recomendaciones
  breves para preparar correctamente el residuo.

- Las recomendaciones deben formularse de manera prudente.
  Si una condición no puede comprobarse visualmente, utilizá
  expresiones como "Verificá que...", "Enjuagalo si..." o
  "Retirá la tapa si el punto verde lo solicita".

- Para botellas y frascos, recomendá verificar que estén
  vacíos, enjuagarlos si tienen restos y dejarlos secar.

- Para latas, recomendá verificar que estén vacías,
  enjuagarlas si tienen restos y dejarlas secar.

- Para papel y cartón, recomendá mantenerlos limpios y secos,
  retirar materiales ajenos cuando corresponda y reducir
  su volumen.

- Si el estado es "no_apto", devolvé una lista vacía.
  Explicá claramente el motivo en "observacion".

- Si el estado es "desconocido", devolvé una lista vacía.

Reglas de análisis:

- Evaluá solamente aquello que pueda verse en la imagen.
- No afirmes que un envase está vacío, limpio o seco si no
  puede comprobarse visualmente.
- No supongas contaminación que no sea visible.
- No asegures el tipo exacto de plástico si no puede observarse.
- Si no podés determinar el material específico, utilizá una
  descripción general.
- Ante la duda entre "apto" y "no_apto", utilizá "apto" con
  recomendaciones preventivas, salvo que haya contaminación
  severa y claramente visible.
- Ante una duda importante sobre la categoría, utilizá
  "desconocido".
- La confianza debe representar la claridad visual de la
  clasificación del objeto y debe ser un número entero entre
  0 y 100.
- No agregues texto, Markdown ni explicaciones fuera del JSON.

Respondé únicamente con un JSON válido usando exactamente
esta estructura:

{
  "categoria": "plastico",
  "objeto": "Botella de agua",
  "material": "Plástico PET",
  "reciclable": true,
  "estado": "apto",
  "confianza": 94,
  "preparacion": [
    "Verificá que esté completamente vacía",
    "Enjuagala si contiene restos",
    "Dejala secar",
    "Aplastala para reducir su volumen",
    "Consultá en el punto verde si debés separar la tapa"
  ],
  "observacion": "Botella plástica apta para reciclaje después de prepararla."
}

Los únicos valores permitidos para "categoria" son:

- "plastico"
- "lata"
- "vidrio"
- "papel"
- "carton"
- "desconocido"

Los únicos valores permitidos para "estado" son:

- "apto"
- "no_apto"
- "desconocido"
  `.trim();
}

  private normalizeResult(
  result: ScanResult,
): ScanResult {
  const validCategories: WasteCategory[] = [
    'plastico',
    'lata',
    'vidrio',
    'papel',
    'carton',
    'desconocido',
  ];

  const validStatuses: RecyclingStatus[] = [
    'apto',
    'no_apto',
    'desconocido',
  ];

  let categoria: WasteCategory =
    validCategories.includes(result.categoria)
      ? result.categoria
      : 'desconocido';

  let estado: RecyclingStatus =
    validStatuses.includes(result.estado)
      ? result.estado
      : 'desconocido';

  /*
   * Si la categoría o el estado son desconocidos,
   * todo el resultado queda fuera del alcance.
   */
  if (
    categoria === 'desconocido' ||
    estado === 'desconocido'
  ) {
    categoria = 'desconocido';
    estado = 'desconocido';
  }

  const reciclable =
    estado === 'apto';

  const confidence =
    Number(result.confianza);

  const preparacion =
    estado === 'apto' &&
    Array.isArray(result.preparacion)
      ? result.preparacion.filter(
          (instruction) =>
            typeof instruction === 'string' &&
            instruction.trim().length > 0,
        )
      : [];

  return {
    categoria,

    objeto:
      result.objeto?.trim() ||
      'Objeto no identificado',

    material:
      result.material?.trim() ||
      'Material desconocido',

    reciclable,
    estado,

    confianza:
      Number.isFinite(confidence)
        ? Math.round(
            Math.max(
              0,
              Math.min(100, confidence),
            ),
          )
        : 0,

    preparacion,

    observacion:
      result.observacion?.trim() || '',
  };
}
}