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

export class CreateHistorialDto {
    categoria: WasteCategory;

    objeto: string;

    material: string;

    reciclable: boolean;

    estado: RecyclingStatus;

    confianza: number;

    preparacion: string[];

    observacion: string;
}