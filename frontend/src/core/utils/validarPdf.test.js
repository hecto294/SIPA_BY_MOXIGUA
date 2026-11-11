import { describe, it, expect } from 'vitest';
import { validarPdf, validarPdfs, formatearTamano } from './validarPdf';

const MB = 1024 * 1024;

// Crea un File con contenido real y, si se pide, un tamaño simulado (para no generar MB reales).
const crearArchivo = ({ nombre = 'carta.pdf', tipo = 'application/pdf', contenido = '%PDF-1.4 contenido', tamano } = {}) => {
  const file = new File([contenido], nombre, { type: tipo });
  if (tamano !== undefined) {
    Object.defineProperty(file, 'size', { value: tamano });
  }
  return file;
};

describe('validarPdf - reglas de negocio para subir PDF', () => {
  it('acepta un PDF válido (extensión, tipo y firma correctos)', async () => {
    // Arrange
    const archivo = crearArchivo();

    // Act
    const resultado = await validarPdf(archivo);

    // Assert
    expect(resultado).toEqual({ ok: true });
  });

  it('rechaza cuando no se selecciona ningún archivo', async () => {
    const resultado = await validarPdf(null);

    expect(resultado.ok).toBe(false);
    expect(resultado.msg).toContain('selecciona un archivo');
  });

  it.each([
    ['carta.PDF', true],
    ['carta.pdf', true],
    ['carta.docx', false],
    ['carta.pdf.exe', false],
    ['carta.pdf.txt', false],
    ['carta', false],
  ])('extensión: "%s" → ok=%s', async (nombre, esperado) => {
    const resultado = await validarPdf(crearArchivo({ nombre }));

    expect(resultado.ok).toBe(esperado);
  });

  it.each([
    ['application/pdf', true],
    ['', true], // algunos navegadores no informan el tipo
    ['image/png', false],
    ['text/plain', false],
  ])('tipo MIME: "%s" → ok=%s', async (tipo, esperado) => {
    const resultado = await validarPdf(crearArchivo({ tipo }));

    expect(resultado.ok).toBe(esperado);
  });

  it.each([
    ['justo por debajo del límite', 5 * MB - 1, true],
    ['exactamente en el límite (5 MB)', 5 * MB, true],
    ['un byte sobre el límite', 5 * MB + 1, false],
    ['el doble del límite', 10 * MB, false],
  ])('tamaño con límite por defecto: %s', async (_caso, tamano, esperado) => {
    const resultado = await validarPdf(crearArchivo({ tamano }));

    expect(resultado.ok).toBe(esperado);
    if (!esperado) expect(resultado.msg).toContain('5MB');
  });

  it('respeta un límite personalizado recibido por parámetro', async () => {
    const archivo = crearArchivo({ tamano: 2 * MB + 1 });

    const conDos = await validarPdf(archivo, 2);
    const conTres = await validarPdf(archivo, 3);

    expect(conDos.ok).toBe(false);
    expect(conDos.msg).toContain('2MB');
    expect(conTres.ok).toBe(true);
  });

  it('rechaza un archivo renombrado a .pdf cuyo contenido no es un PDF real', async () => {
    const archivo = crearArchivo({ contenido: 'esto es solo texto' });

    const resultado = await validarPdf(archivo);

    expect(resultado.ok).toBe(false);
    expect(resultado.msg).toContain('no es un PDF real');
  });
});

describe('validarPdfs - varios archivos', () => {
  it('rechaza una lista vacía o indefinida', async () => {
    expect((await validarPdfs([])).ok).toBe(false);
    expect((await validarPdfs(undefined)).ok).toBe(false);
  });

  it('se detiene en el primer archivo inválido y devuelve su mensaje', async () => {
    const lista = [crearArchivo(), crearArchivo({ nombre: 'malo.txt' }), crearArchivo()];

    const resultado = await validarPdfs(lista);

    expect(resultado.ok).toBe(false);
    expect(resultado.msg).toContain('Solo se permiten archivos PDF');
  });

  it('acepta cuando todos los archivos son válidos', async () => {
    const resultado = await validarPdfs([crearArchivo(), crearArchivo({ nombre: 'otra.pdf' })]);

    expect(resultado).toEqual({ ok: true });
  });
});

describe('formatearTamano - conversión de bytes a texto', () => {
  it.each([
    [0, '0 KB'],
    [undefined, '0 KB'],
    [1, '1 B'],
    [1023, '1023 B'],
    [1024, '1.00 KB'],
    [1536, '1.50 KB'],
    [MB - 1, '1024.00 KB'],
    [MB, '1.00 MB'],
    [5 * MB, '5.00 MB'],
  ])('%s bytes → "%s"', (bytes, esperado) => {
    expect(formatearTamano(bytes)).toBe(esperado);
  });
});
