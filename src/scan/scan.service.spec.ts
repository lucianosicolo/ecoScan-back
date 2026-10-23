import { ConfigService } from '@nestjs/config';
import { HistorialService } from '../historico-scan/historico-scan.service';
import { ScanService } from './scan.service';
import type { ScanResult } from './scan.service';

describe('EcoScan result normalization', () => {
  let service: ScanService;

  const sample: ScanResult = {
    categoria: 'plastico',
    objeto: 'Botella de bebida',
    material: 'Plástico compatible con PET',
    reciclable: true,
    estado: 'apto',
    confianza: 85,
    preparacion: ['Verificá el símbolo PET'],
    observacion: 'Confirmá el material con el rotulado.',
  };

  beforeEach(() => {
    const config = {
      get: (name: string): string | undefined =>
        name === 'GEMINI_API_KEY' ? 'test-only-key' : undefined,
    } as ConfigService;

    const history = {} as HistorialService;
    service = new ScanService(config, history);
  });

  it('keeps a valid classification and clamps confidence to 100', () => {
    const result = service['normalizeResult']({
      ...sample,
      confianza: 135,
      preparacion: ['Verificá el símbolo PET', '   ', 'Enjuagá si hay restos'],
    });

    expect(result.categoria).toBe('plastico');
    expect(result.estado).toBe('apto');
    expect(result.confianza).toBe(100);
    expect(result.reciclable).toBe(true);
    expect(result.preparacion).toEqual([
      'Verificá el símbolo PET',
      'Enjuagá si hay restos',
    ]);
  });

  it('disables recycling instructions for non-recyclable paper or cardboard', () => {
    const result = service['normalizeResult']({
      ...sample,
      categoria: 'carton',
      objeto: 'Caja de cartón con grasa',
      material: 'Cartón',
      estado: 'no_apto',
      reciclable: true,
      preparacion: ['Reciclá el envase'],
    });

    expect(result.categoria).toBe('carton');
    expect(result.estado).toBe('no_apto');
    expect(result.reciclable).toBe(false);
    expect(result.preparacion).toEqual([]);
  });

  it('rejects categories outside the five defined types', () => {
    const result = service['normalizeResult']({
      ...sample,
      categoria: 'organico' as ScanResult['categoria'],
      objeto: 'Banana',
    });

    expect(result.categoria).toBe('desconocido');
    expect(result.estado).toBe('desconocido');
    expect(result.reciclable).toBe(false);
    expect(result.preparacion).toEqual([]);
  });

  it('keeps an identified but out-of-scope object as unknown', () => {
    const result = service['normalizeResult']({
      ...sample,
      categoria: 'desconocido',
      objeto: 'Botella reutilizable de acero',
      material: 'Acero inoxidable',
      estado: 'desconocido',
      confianza: 95,
    });

    expect(result.categoria).toBe('desconocido');
    expect(result.objeto).toBe('Botella reutilizable de acero');
    expect(result.confianza).toBe(95);
    expect(result.reciclable).toBe(false);
    expect(result.preparacion).toEqual([]);
  });

  it('converts an invalid state and nonnumeric confidence to safe defaults', () => {
    const result = service['normalizeResult']({
      ...sample,
      estado: 'invalid-state' as ScanResult['estado'],
      confianza: Number.NaN,
    });

    expect(result.estado).toBe('desconocido');
    expect(result.categoria).toBe('desconocido');
    expect(result.confianza).toBe(0);
    expect(result.reciclable).toBe(false);
    expect(result.preparacion).toEqual([]);
  });
});
