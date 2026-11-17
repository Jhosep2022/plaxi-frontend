import type { CellValue, Worksheet } from 'exceljs';
import type { ImportClassGroup, ImportWorkbook } from './import-api.service';

const common = [
  ['Nombres', 'nombres'],
  ['Primer apellido', 'primerApellido'],
  ['Segundo apellido', 'segundoApellido'],
  ['CI', 'ci'],
  ['Teléfono', 'telefono'],
  ['Correo', 'correo'],
];
const sheets = [
  {
    name: 'Estudiantes',
    key: 'students',
    columns: [
      ...common,
      ['Fecha de nacimiento', 'fechaNacimiento'],
      ['Nivel', 'nivel'],
      ['Grado', 'grado'],
      ['Paralelo', 'letra'],
      ['Turno', 'turno'],
    ],
  },
  {
    name: 'Docentes',
    key: 'teachers',
    columns: [...common, ['Especialidad', 'especialidad']],
  },
  {
    name: 'Padres',
    key: 'parents',
    columns: [
      ...common,
      ['Ocupación', 'ocupacion'],
      ['CI del hijo', 'hijoCi'],
      ['Parentesco', 'parentesco'],
    ],
  },
] as const;

export async function createImportTemplate(
  groups: ImportClassGroup[],
  year: number,
): Promise<ArrayBuffer> {
  const Excel = await import('exceljs');
  const book = new Excel.Workbook();
  book.creator = 'Aulix';
  const instructions = book.addWorksheet('Instrucciones');
  instructions.getColumn(1).width = 110;
  [
    `Aulix · Carga de personas · Gestión ${year}`,
    'Completa las hojas Estudiantes, Docentes y Padres. Puedes dejar vacías las hojas que no utilizarás.',
    'No cambies los encabezados. Máximo 500 filas por hoja. Guarda como .xlsx (sin macros).',
    'Nombres, primer apellido y CI son obligatorios. El segundo apellido y contacto son opcionales.',
    'Escribe CI y teléfonos como texto, sin perder ceros. Cada persona debe usar su propio correo.',
    'Estudiantes: fecha real AAAA-MM-DD. Nivel: inicial, primaria o secundaria. Grado: número.',
    'Copia nivel, grado, paralelo y turno desde la hoja Paralelos de esta gestión.',
    'Padres: una fila por hijo. Repite exactamente los mismos datos del padre para vincular hermanos.',
    'CI del hijo debe coincidir con un estudiante de esta carga o ya registrado en el colegio.',
    'Parentesco: madre, padre o tutor. No se reemplazan datos ni se mueve de curso a personas existentes.',
    'La vista previa no guarda. Corrige los errores en Excel y vuelve a subirlo antes de confirmar.',
    'Después de confirmar, descarga una sola vez los accesos nuevos de estudiantes y entrégalos de forma privada.',
  ].forEach((line) => instructions.addRow([line]));
  for (const definition of sheets) {
    const sheet = book.addWorksheet(definition.name, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = definition.columns.map(([header, key]) => ({
      header,
      key,
      width: header === 'Correo' ? 30 : 24,
    }));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10102B' },
    };
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: definition.columns.length },
    };
    sheet.columns.forEach((column) => (column.numFmt = '@'));
    for (let row = 2; row <= 501; row++) {
      if (definition.key === 'students') {
        sheet.getCell(row, 8).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: ['"inicial,primaria,secundaria"'],
        };
        sheet.getCell(row, 11).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: ['"manana,tarde,noche"'],
        };
      }
      if (definition.key === 'parents')
        sheet.getCell(row, 9).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: ['"madre,padre,tutor"'],
        };
    }
  }
  const groupSheet = book.addWorksheet('Paralelos');
  groupSheet.columns = [
    'Nivel',
    'Grado',
    'Paralelo',
    'Turno',
    'Capacidad',
    'Inscritos',
  ].map((header) => ({ header, width: 22 }));
  groups.forEach((group) =>
    groupSheet.addRow([
      group.nivel,
      group.grado,
      group.letra,
      group.turno,
      group.capacidad,
      group.estudiantes,
    ]),
  );
  const bytes = await book.xlsx.writeBuffer();
  return Uint8Array.from(new Uint8Array(bytes)).buffer;
}

export async function readImportWorkbook(
  input: ArrayBuffer,
  yearId: number,
): Promise<ImportWorkbook> {
  const bytes = Uint8Array.from(new Uint8Array(input)).buffer;
  assertZipSize(bytes);
  const Excel = await import('exceljs');
  const book = new Excel.Workbook();
  await book.xlsx.load(bytes);
  const result: ImportWorkbook = {
    yearId,
    students: [],
    teachers: [],
    parents: [],
  };
  for (const definition of sheets) {
    const sheet = book.getWorksheet(definition.name);
    if (!sheet)
      throw new Error(
        `Falta la hoja ${definition.name}. Usa la plantilla descargada desde Aulix.`,
      );
    definition.columns.forEach(([header], index) => {
      if (sheet.getCell(1, index + 1).text.trim() !== header)
        throw new Error(
          `El encabezado ${header} cambió en ${definition.name}. Usa la plantilla de Aulix.`,
        );
    });
    const rows: Record<string, unknown>[] = [];
    if (sheet.rowCount > 10000)
      throw new Error(
        'La hoja tiene demasiadas filas. Limpia las filas vacías que sobran.',
      );
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = definition.columns.map(
        ([, key], index) =>
          [key, readCell(sheet, rowNumber, index + 1)] as const,
      );
      if (!values.some(([, value]) => value !== '')) return;
      if (rows.length >= 500)
        throw new Error(`La hoja ${definition.name} supera las 500 filas.`);
      rows.push({ _row: rowNumber, ...Object.fromEntries(values) });
    });
    result[definition.key] = rows;
  }
  return result;
}
function readCell(sheet: Worksheet, row: number, column: number): string {
  const cell = sheet.getCell(row, column);
  const value: CellValue = cell.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object')
    throw new Error(
      `${sheet.name}, fila ${row}: usa valores simples, sin fórmulas ni enlaces.`,
    );
  return String(value).trim();
}
export function downloadFile(
  bytes: BlobPart,
  name: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function safeCsvCell(value: string): string {
  return (
    '"' +
    (/^\s*[=+\-@]|^[\t\r]/.test(value) ? "'" + value : value).replace(
      /"/g,
      '""',
    ) +
    '"'
  );
}

// Check ZIP expansion bounds before an XLSX parser allocates memory for the workbook.
function assertZipSize(bytes: ArrayBuffer): void {
  if (bytes.byteLength > 3 * 1024 * 1024)
    throw new Error('El Excel debe pesar como máximo 3 MB.');
  const view = new DataView(bytes);
  let end = -1;
  for (
    let offset = bytes.byteLength - 22;
    offset >= Math.max(0, bytes.byteLength - 65557);
    offset--
  ) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error('No es un archivo XLSX válido.');
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true),
    expanded = 0;
  if (count > 1000)
    throw new Error(
      'El Excel contiene demasiados elementos. Usa una copia limpia de la plantilla.',
    );
  for (let index = 0; index < count; index++) {
    if (
      offset + 46 > bytes.byteLength ||
      view.getUint32(offset, true) !== 0x02014b50
    )
      throw new Error('El Excel está dañado o no es compatible.');
    expanded += view.getUint32(offset + 24, true);
    if (expanded > 25 * 1024 * 1024)
      throw new Error('El contenido del Excel es demasiado grande.');
    offset +=
      46 +
      view.getUint16(offset + 28, true) +
      view.getUint16(offset + 30, true) +
      view.getUint16(offset + 32, true);
  }
}
