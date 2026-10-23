import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  mkdir,
  writeFile,
} from 'fs/promises';

import {
  join,
} from 'path';

import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import {
  randomUUID,
} from 'crypto';
import { HistorialService } from 'src/historico-scan/historico-scan.service';

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
  imagenUrl?: string;
}

@Injectable()
export class ScanService {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly historialService: HistorialService,
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
          },
        });
      } catch (error: unknown) {
        const status = this.getApiStatus(error);

        const shouldRetry =
          this.isRetryableApiStatus(
            status,
          );

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
  private async saveImage(
    file: Express.Multer.File,
  ): Promise<string> {

    const uploadsDirectory =
      join(
        process.cwd(),
        'uploads',
        'scans',
      );

    await mkdir(
      uploadsDirectory,
      {
        recursive: true,
      },
    );

    let extension = 'jpg';

    if (
      file.mimetype ===
      'image/png'
    ) {
      extension = 'png';
    }

    if (
      file.mimetype ===
      'image/webp'
    ) {
      extension = 'webp';
    }

    const filename =
      `${randomUUID()}.${extension}`;

    const filePath =
      join(
        uploadsDirectory,
        filename,
      );

    await writeFile(
      filePath,
      file.buffer,
    );

    return (
      `/uploads/scans/${filename}`
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

  private isRetryableApiStatus(
    status: number | undefined,
  ): boolean {

    return (
      status === 429 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504
    );
  }

  private delay(
    milliseconds: number,
  ): Promise<void> {

    return new Promise(
      (resolve) => {
        setTimeout(
          resolve,
          milliseconds,
        );
      },
    );
  }
  async analyzeImage(
    file: Express.Multer.File,
    userId: number,
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

      const normalizedResult =
        this.normalizeResult(
          parsedResult,
        );

      const imagenUrl =
        await this.saveImage(
          file,
        );

      await this.historialService.create(
        {
          ...normalizedResult,
          imagenUrl,
        },
        userId,
      );

      return {
        ...normalizedResult,
        imagenUrl,
      };
    } catch (error) {
      if (
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      const status = this.getApiStatus(error);

      if (
        this.isRetryableApiStatus(
          status,
        )
      ) {
        throw new ServiceUnavailableException(
          'El servicio de análisis está temporalmente ocupado. Intentá nuevamente en unos instantes.',
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

1. "plastico": únicamente botellas de bebidas fabricadas en PET.
2. "lata": únicamente latas de bebidas fabricadas en aluminio.
3. "vidrio": botellas y frascos de vidrio.
4. "papel": hojas, diarios, revistas y otros papeles.
5. "carton": cajas y envases de cartón.

El papel y el cartón sucios o deteriorados siguen perteneciendo
a sus respectivas categorías, pero deben recibir estado
"no_apto" si la contaminación visible impide su reciclaje.

IMPORTANTE:

La categoría "desconocido" puede representar dos situaciones
diferentes:

A) OBJETO IDENTIFICADO PERO FUERA DEL ALCANCE:
El objeto puede reconocerse visualmente, pero no pertenece a
ninguna de las cinco categorías admitidas por EcoScan.

En este caso:

- Usá "categoria": "desconocido".
- Usá "estado": "desconocido".
- Usá "reciclable": false.
- Identificá igualmente el objeto en "objeto".
- Indicá el material en "material" si puede determinarse
  visualmente.
- La confianza puede ser alta si el objeto se reconoce con
  claridad.
- En "observacion", explicá que el objeto fue identificado,
  pero se encuentra fuera del alcance de EcoScan.
- No utilices "Objeto no identificado" si realmente podés
  reconocer qué objeto aparece.

Ejemplo:

Una botella reutilizable de acero inoxidable debe devolver
algo similar a:

{
  "categoria": "desconocido",
  "objeto": "Botella reutilizable",
  "material": "Acero inoxidable",
  "reciclable": false,
  "estado": "desconocido",
  "confianza": 94,
  "preparacion": [],
  "observacion": "El objeto fue identificado, pero su material no pertenece a las categorías contempladas por EcoScan."
}

B) OBJETO NO IDENTIFICABLE:
Utilizá esta situación únicamente cuando la imagen realmente
no permita determinar qué objeto o residuo aparece.

Por ejemplo:

- No hay un residuo claramente visible.
- La imagen está demasiado oscura.
- La imagen está demasiado borrosa.
- Hay varios objetos y no puede determinarse cuál analizar.
- No puede identificarse el objeto con suficiente claridad.

En este caso:

- Usá "categoria": "desconocido".
- Usá "estado": "desconocido".
- Usá "reciclable": false.
- En "objeto", utilizá "Objeto no identificado".
- En "material", utilizá "Material desconocido" si tampoco
  puede determinarse.
- La confianza debe ser baja cuando la identificación visual
  sea insuficiente.
- En "observacion", explicá brevemente por qué no pudo
  identificarse.

También se consideran FUERA DEL ALCANCE, aunque puedan
identificarse correctamente:

- Residuos orgánicos, comida, carne o vegetales.
- Prendas o textiles.
- Aparatos electrónicos.
- Pilas o baterías.
- Cerámica.
- Botellas plásticas que no sean de bebidas PET, como envases
  de limpieza, botellas de otros polímeros o recipientes reutilizables.
- Otros objetos de plástico que no sean botellas PET de bebidas.
- Latas de conserva o alimentos y latas de acero u hojalata,
  aunque tengan una forma parecida a una lata de bebida.
- Otros objetos metálicos que no sean latas de bebidas de aluminio.
- Otros objetos que no pertenezcan a las cinco categorías
  admitidas.

No amplíes las categorías aunque reconozcas otro tipo de
residuo.

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
  El objeto está fuera del alcance de EcoScan o la imagen no
  permite identificarlo correctamente.

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
- Para clasificar una botella como "plastico", verificá que sea
  de bebida y que existan indicios visuales compatibles con PET,
  como el símbolo 1/PET, el rotulado o la apariencia habitual
  de una botella descartable para bebidas. La apariencia por sí
  sola no confirma químicamente que sea PET.
- Para clasificar una lata como "lata", verificá que sea de bebida
  y que haya indicios compatibles con aluminio. No confundas
  una lata de conserva o una lata de acero con aluminio.
- Si no hay indicios visuales suficientes para diferenciar PET
  de otros plásticos, o aluminio de otros metales, utilizá
  "desconocido" y explicá en "observacion" la incertidumbre.
  Si el objeto se reconoce pero el material necesario para
  asignarle una categoría no se puede determinar, utilizá
  "Objeto no identificado" para indicar que la CLASIFICACIÓN
  no pudo confirmarse, sin inventar el material.
- No asegures PET ni aluminio como composición confirmada
  cuando el rotulado no sea legible: indicá que la identificación
  es orientativa y que el usuario debe verificar el símbolo o
  la información del envase.
- Si no podés determinar el material específico, utilizá una
  descripción general.
- Ante la duda entre "apto" y "no_apto", utilizá "apto" con
  recomendaciones preventivas, salvo que haya contaminación
  severa y claramente visible.
- Ante una duda importante sobre la categoría, utilizá
  "desconocido".
- Si reconocés claramente un objeto fuera del alcance, no
  reduzcas artificialmente la confianza solo por estar fuera
  de las categorías permitidas.
- La confianza debe representar la claridad visual con la que
  se pudo identificar y clasificar el objeto observado.
- La confianza debe ser un número entero entre 0 y 100.
- No agregues texto, Markdown ni explicaciones fuera del JSON.

Respondé únicamente con un JSON válido usando exactamente
esta estructura:

{
  "categoria": "plastico",
  "objeto": "Botella de agua",
  "material": "Plástico, compatible con PET",
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
  "observacion": "La botella de bebida parece compatible con PET. Verificá el símbolo del envase antes de depositarla en un punto verde."
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