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

export type ImportKind = 'student' | 'teacher' | 'parent';
const sheetKeys = {
  student: 'students',
  teacher: 'teachers',
  parent: 'parents',
} as const;
export const importSheetKey = (kind: ImportKind) => sheetKeys[kind];
export const importColumns = (kind: ImportKind) =>
  sheets.find((sheet) => sheet.key === sheetKeys[kind])!.columns;
export interface ImportCellIssue {
  kind: ImportKind;
  row: number;
  key: string;
  message: string;
}

export async function createImportTemplate(
  groups: ImportClassGroup[],
  year: number,
): Promise<ArrayBuffer> {
  const Excel = await import('exceljs');
  const book = new (Excel.Workbook ?? Excel.default.Workbook)();
  book.creator = 'Aulix';
  const instructions = book.addWorksheet('Instrucciones');
  instructions.getColumn(1).width = 110;
  [
    `Aulix · Carga de personas · Gestión ${year}`,
    'Completa las hojas Estudiantes, Docentes y Padres. Puedes dejar vacías las hojas que no utilizarás.',
    'No cambies los encabezados. Máximo 500 filas por hoja. Guarda como .xlsx (sin macros).',
    'Nombres, primer apellido y CI son obligatorios. El segundo apellido y contacto son opcionales.',
    'Escribe CI y teléfonos como texto, sin perder ceros. Cada persona debe usar su propio correo.',
    'Estudiantes: fecha DD/MM/AAAA o AAAA-MM-DD. Nivel: inicial, primaria o secundaria. Grado: número.',
    'Copia nivel, grado, paralelo y turno desde la hoja Paralelos de esta gestión.',
    'Padres: una fila por hijo. Repite exactamente los mismos datos del padre para vincular hermanos.',
    'CI del hijo debe coincidir con un estudiante de esta carga o ya registrado en el colegio.',
    'Parentesco: madre, padre o tutor. No se reemplazan datos ni se mueve de curso a personas existentes.',
    'La vista previa no guarda. Puedes corregir una fila desde Aulix sin volver a llenar la planilla.',
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
  const draft = await readImportDraft(input, yearId);
  if (draft.issues.length) throw new Error(draft.issues[0].message);
  return draft.workbook;
}

export async function createReviewedWorkbook(input: {
  groups: ImportClassGroup[];
  year: number;
  workbook: ImportWorkbook;
}): Promise<ArrayBuffer> {
  const Excel = await import('exceljs');
  const book = new (Excel.Workbook ?? Excel.default.Workbook)();
  await book.xlsx.load(await createImportTemplate(input.groups, input.year));
  for (const definition of sheets) {
    const sheet = book.getWorksheet(definition.name)!;
    for (const [index, person] of input.workbook[definition.key].entries()) {
      const row = Number(person['_row'] ?? index + 2);
      definition.columns.forEach(([, key], column) => {
        sheet.getCell(row, column + 1).value = String(person[key] ?? '');
      });
    }
  }
  const bytes = await book.xlsx.writeBuffer();
  return Uint8Array.from(new Uint8Array(bytes)).buffer;
}

export async function readImportDraft(
  input: ArrayBuffer,
  yearId: number,
): Promise<{ workbook: ImportWorkbook; issues: ImportCellIssue[] }> {
  const bytes = Uint8Array.from(new Uint8Array(input)).buffer;
  assertZipSize(bytes);
  const Excel = await import('exceljs');
  const book = new (Excel.Workbook ?? Excel.default.Workbook)();
  await book.xlsx.load(bytes);
  const result: ImportWorkbook = {
    yearId,
    students: [],
    teachers: [],
    parents: [],
  };
  const issues: ImportCellIssue[] = [];
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
      const values = definition.columns.map(([header, key], index) => {
        try {
          return [
            key,
            normalizeImportValue(key, readCell(sheet, rowNumber, index + 1)),
          ] as const;
        } catch (error) {
          const kind = (Object.keys(sheetKeys) as ImportKind[]).find(
            (kind) => sheetKeys[kind] === definition.key,
          )!;
          const cell = sheet.getCell(rowNumber, index + 1);
          const formula = cell.formula;
          issues.push({
            kind,
            row: rowNumber,
            key,
            message: `${sheet.name}, fila ${rowNumber} · ${header} (${cell.address}): ${error instanceof Error ? error.message : 'Revisa esta celda.'}`,
          });
          return [key, formula ? '=' + formula : cell.text] as const;
        }
      });
      if (!values.some(([, value]) => value !== '')) return;
      if (rows.length >= 500)
        throw new Error(`La hoja ${definition.name} supera las 500 filas.`);
      rows.push({ _row: rowNumber, ...Object.fromEntries(values) });
    });
    result[definition.key] = rows;
  }
  return { workbook: result, issues };
}
export function normalizeImportValue(key: string, value: string): string {
  if (key === 'telefono')
    return value
      .trim()
      .replace(/[\s().-]/g, '')
      .replace(/^(?:\+591|00591)(?=\d{8}$)/, '');
  if (key === 'fechaNacimiento') {
    const parts = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value.trim());
    if (parts)
      return `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  if (['nivel', 'turno', 'parentesco'].includes(key))
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  return value.trim();
}
function readCell(sheet: Worksheet, row: number, column: number): string {
  const cell = sheet.getCell(row, column);
  const value: CellValue = cell.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && 'hyperlink' in value)
    return value.text.trim();
  if (typeof value === 'object' && 'richText' in value)
    return value.richText
      .map((part) => part.text)
      .join('')
      .trim();
  if (typeof value === 'object')
    throw new Error(
      'Escribe el dato en lugar de la fórmula o del error de Excel. Puedes corregirlo aquí sin rehacer las otras filas.',
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
