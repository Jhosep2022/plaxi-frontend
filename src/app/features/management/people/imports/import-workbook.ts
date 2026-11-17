import type { CellValue, Workbook, Worksheet } from 'exceljs';
import type { ImportClassGroup, ImportWorkbook } from './import-api.service';

// Rows per sheet: a big school loads its 1.000+ students in one sheet (same limit as the API)
export const MAX_ROWS_PER_SHEET = 2000;

type Column = readonly [header: string, key: string, required?: boolean];

// Only what is needed to create the person is required (marked in lime in the template).
// The rest can be completed later by each person from their profile.
const sheets = [
  {
    name: 'Estudiantes',
    key: 'students',
    columns: [
      ['Nombres', 'nombres', true],
      ['Primer apellido', 'primerApellido', true],
      ['Segundo apellido', 'segundoApellido'],
      ['CI', 'ci', true],
      ['Curso', 'curso', true],
      ['Fecha de nacimiento', 'fechaNacimiento'],
      ['Celular', 'telefono'],
      ['Correo', 'correo'],
      ['Tutor: nombres', 'tutorNombres'],
      ['Tutor: primer apellido', 'tutorPrimerApellido'],
      ['Tutor: CI', 'tutorCi'],
      ['Tutor: celular', 'tutorTelefono'],
      ['Tutor: parentesco', 'tutorParentesco'],
    ],
  },
  {
    name: 'Docentes',
    key: 'teachers',
    columns: [
      ['Nombres', 'nombres', true],
      ['Primer apellido', 'primerApellido', true],
      ['Segundo apellido', 'segundoApellido'],
      ['CI', 'ci', true],
      ['Celular', 'telefono'],
      ['Correo', 'correo'],
      ['Especialidad', 'especialidad'],
    ],
  },
  {
    name: 'Padres',
    key: 'parents',
    columns: [
      ['Nombres', 'nombres', true],
      ['Primer apellido', 'primerApellido', true],
      ['Segundo apellido', 'segundoApellido'],
      ['CI', 'ci', true],
      ['Celular', 'telefono'],
      ['Correo', 'correo'],
      ['Ocupación', 'ocupacion'],
      ['CI del hijo', 'hijoCi', true],
      ['Parentesco', 'parentesco'],
    ],
  },
] as const satisfies readonly { name: string; key: string; columns: readonly Column[] }[];

// Headers of older templates still read (course in four columns, "Teléfono")
const legacyHeaders: Record<string, string> = {
  telefono: 'telefono',
  nivel: 'nivel',
  grado: 'grado',
  paralelo: 'letra',
  turno: 'turno',
};

export type ImportKind = 'student' | 'teacher' | 'parent';
const sheetKeys = {
  student: 'students',
  teacher: 'teachers',
  parent: 'parents',
} as const;
export const importSheetKey = (kind: ImportKind) => sheetKeys[kind];
export const importColumns = (kind: ImportKind): readonly Column[] =>
  sheets.find((sheet) => sheet.key === sheetKeys[kind])!.columns;
export interface ImportCellIssue {
  kind: ImportKind;
  row: number;
  key: string;
  message: string;
}

const LEVELS: Record<string, string> = { inicial: 'Inicial', primaria: 'Primaria', secundaria: 'Secundaria' };
const SHIFTS: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
// Same label the API reads: "3° Secundaria A · Mañana"
export function courseLabel(group: Pick<ImportClassGroup, 'nivel' | 'grado' | 'letra' | 'turno'>): string {
  return `${group.grado}° ${LEVELS[group.nivel] ?? group.nivel} ${group.letra.toUpperCase()} · ${SHIFTS[group.turno] ?? group.turno}`;
}

export async function createImportTemplate(groups: ImportClassGroup[], year: number): Promise<ArrayBuffer> {
  const Excel = await import('exceljs');
  const book = new (Excel.Workbook ?? Excel.default.Workbook)();
  book.creator = 'Aulix';
  const instructions = book.addWorksheet('Instrucciones');
  instructions.getColumn(1).width = 110;
  [
    `Aulix · Carga de personas · Gestión ${year}`,
    '',
    'Solo las columnas en verde son obligatorias: nombres, primer apellido, CI y curso. Lo demás puede quedar vacío.',
    'Curso: elígelo de la lista. También entendemos «3ro A secundaria» o «3° A tarde» si lo pegas desde otra planilla.',
    'Tutor (opcional): escribe al padre, madre o tutor en la misma fila del estudiante. Para hermanos, repite sus datos.',
    'Hoja Padres: solo si un estudiante tiene un segundo tutor o si cargas padres de estudiantes ya registrados.',
    'Fechas: DD/MM/AAAA o AAAA-MM-DD. Celular: 8 dígitos; puede llevar +591 o espacios.',
    'Si un dato opcional está mal (celular, correo, fecha), la persona igual se guarda sin ese dato y te avisamos.',
    'Las filas con un dato obligatorio mal quedan para corregir; las demás se guardan igual.',
    `Hasta ${MAX_ROWS_PER_SHEET} filas por hoja. Las personas ya registradas se reconocen por su CI y no se modifican.`,
    'Después de guardar, descarga una sola vez los accesos de los estudiantes y entrégalos de forma privada.',
  ].forEach((line) => instructions.addRow([line]));
  instructions.getRow(1).font = { bold: true, size: 14 };

  const options = book.addWorksheet('Opciones_Aulix', { state: 'hidden' });
  const labels = groups.map(courseLabel);
  (labels.length ? labels : ['']).forEach((label, index) => (options.getCell(index + 1, 1).value = label));
  book.definedNames.add(`'Opciones_Aulix'!$A$1:$A$${Math.max(labels.length, 1)}`, 'aulix_cursos');

  for (const definition of sheets) {
    const sheet = book.addWorksheet(definition.name, { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.columns = definition.columns.map(([header, key]) => ({
      header,
      key,
      width: key === 'correo' || key === 'curso' ? 28 : 20,
    }));
    definition.columns.forEach(([, , required], index) => {
      const cell = sheet.getRow(1).getCell(index + 1);
      cell.font = { bold: true, color: { argb: required ? 'FF10102B' : 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: required ? 'FFBCCF4E' : 'FF10102B' } };
    });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: definition.columns.length } };
    sheet.columns.forEach((column) => (column.numFmt = '@'));
    const course = definition.columns.findIndex(([, key]) => key === 'curso') + 1;
    const relationship = definition.columns.findIndex(([, key]) => key === 'parentesco' || key === 'tutorParentesco') + 1;
    for (let row = 2; row <= MAX_ROWS_PER_SHEET + 1; row++) {
      if (course)
        sheet.getCell(row, course).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['aulix_cursos'],
          showErrorMessage: true,
          errorStyle: 'warning',
          errorTitle: 'Curso',
          error: 'Elige un curso de la lista. Si lo dejas así, Aulix intentará reconocerlo.',
        };
      if (relationship)
        sheet.getCell(row, relationship).dataValidation = { type: 'list', allowBlank: true, formulae: ['"madre,padre,tutor"'] };
    }
  }
  const bytes = await book.xlsx.writeBuffer();
  return Uint8Array.from(new Uint8Array(bytes)).buffer;
}

export async function readImportWorkbook(input: ArrayBuffer, yearId: number): Promise<ImportWorkbook> {
  const draft = await readImportDraft(input, yearId);
  if (draft.issues.length) throw new Error(draft.issues[0].message);
  return draft.workbook;
}

// A copy of the school's sheet with its corrections and the course list, to continue later
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
      const values: Record<string, unknown> = { ...person, curso: person['curso'] || legacyCourse(person, input.groups) };
      definition.columns.forEach(([, key], column) => {
        sheet.getCell(row, column + 1).value = String(values[key] ?? '');
      });
    }
  }
  const bytes = await book.xlsx.writeBuffer();
  return Uint8Array.from(new Uint8Array(bytes)).buffer;
}

// Reads the sheets by their header names, so moved or removed optional columns do not break the load
export async function readImportDraft(
  input: ArrayBuffer,
  yearId: number,
): Promise<{ workbook: ImportWorkbook; issues: ImportCellIssue[] }> {
  const bytes = Uint8Array.from(new Uint8Array(input)).buffer;
  assertZipSize(bytes);
  const Excel = await import('exceljs');
  const book: Workbook = new (Excel.Workbook ?? Excel.default.Workbook)();
  await book.xlsx.load(bytes);
  const result: ImportWorkbook = { yearId, students: [], teachers: [], parents: [] };
  const issues: ImportCellIssue[] = [];
  const found = sheets.filter((definition) => book.getWorksheet(definition.name));
  if (!found.length) throw new Error('No encontramos las hojas Estudiantes, Docentes o Padres. Usa la plantilla de Aulix.');
  for (const definition of found) {
    const sheet = book.getWorksheet(definition.name)!;
    const kind = (Object.keys(sheetKeys) as ImportKind[]).find((entry) => sheetKeys[entry] === definition.key)!;
    const columns = mapColumns(sheet, definition.columns);
    const missing = definition.columns
      .filter(([, key, required]) => required && !columns.some((column) => column.key === key))
      .filter(([, key]) => !(key === 'curso' && ['nivel', 'grado', 'letra'].every((part) => columns.some((column) => column.key === part))));
    if (missing.length)
      throw new Error(`En la hoja ${definition.name} falta la columna ${missing.map(([header]) => `«${header}»`).join(', ')}.`);
    if (sheet.rowCount > 20000) throw new Error('La hoja tiene demasiadas filas. Borra las filas vacías que sobran.');
    const rows: Record<string, unknown>[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = columns.map(({ key, index, header }) => {
        try {
          return [key, normalizeImportValue(key, readCell(sheet, rowNumber, index))] as const;
        } catch (error) {
          const cell = sheet.getCell(rowNumber, index);
          issues.push({
            kind,
            row: rowNumber,
            key,
            message: `${header} (${cell.address}): ${error instanceof Error ? error.message : 'Revisa esta celda.'}`,
          });
          return [key, cell.formula ? '=' + cell.formula : cell.text] as const;
        }
      });
      if (!values.some(([, value]) => value !== '')) return;
      if (rows.length >= MAX_ROWS_PER_SHEET)
        throw new Error(`La hoja ${definition.name} supera las ${MAX_ROWS_PER_SHEET} filas. Divídela en dos cargas.`);
      rows.push({ _row: rowNumber, ...Object.fromEntries(values) });
    });
    result[definition.key] = rows;
  }
  return { workbook: result, issues };
}

const plainHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');

function mapColumns(sheet: Worksheet, columns: readonly Column[]): { key: string; index: number; header: string }[] {
  const known = new Map<string, string>([
    ...columns.map(([header, key]) => [plainHeader(header), key] as const),
    ...Object.entries(legacyHeaders),
  ]);
  const mapped: { key: string; index: number; header: string }[] = [];
  sheet.getRow(1).eachCell((cell, index) => {
    const key = known.get(plainHeader(cell.text));
    if (key && !mapped.some((entry) => entry.key === key)) mapped.push({ key, index, header: cell.text.trim() });
  });
  return mapped;
}

function legacyCourse(person: Record<string, unknown>, groups: ImportClassGroup[]): string {
  const group = groups.find(
    (entry) =>
      entry.nivel === person['nivel'] &&
      String(entry.grado) === String(person['grado']) &&
      entry.letra.toUpperCase() === String(person['letra'] ?? '').toUpperCase() &&
      entry.turno === person['turno'],
  );
  return group ? courseLabel(group) : '';
}

export function normalizeImportValue(key: string, value: string): string {
  if (key === 'telefono' || key === 'tutorTelefono')
    return value
      .trim()
      .replace(/[\s().-]/g, '')
      .replace(/^(?:\+591|00591)(?=\d{8}$)/, '');
  if (key === 'fechaNacimiento') {
    const parts = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value.trim());
    if (parts) return `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  if (['nivel', 'turno', 'parentesco', 'tutorParentesco'].includes(key))
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  return value.trim();
}
function readCell(sheet: Worksheet, row: number, column: number): string {
  const cell = sheet.getCell(row, column);
  const value: CellValue = cell.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && 'hyperlink' in value) return value.text.trim();
  if (typeof value === 'object' && 'richText' in value)
    return value.richText
      .map((part) => part.text)
      .join('')
      .trim();
  // A formula with its last result (e.g. =CONCAT(...)) is read as that result
  if (typeof value === 'object' && 'result' in value && value.result !== undefined && typeof value.result !== 'object')
    return String(value.result).trim();
  if (typeof value === 'object')
    throw new Error('Escribe el dato en lugar de la fórmula o del error de Excel. Puedes corregirlo aquí sin rehacer las otras filas.');
  return String(value).trim();
}
export function downloadFile(bytes: BlobPart, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function safeCsvCell(value: string): string {
  return '"' + (/^\s*[=+\-@]|^[\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""') + '"';
}

// Check ZIP expansion bounds before an XLSX parser allocates memory for the workbook.
function assertZipSize(bytes: ArrayBuffer): void {
  if (bytes.byteLength > 3 * 1024 * 1024) throw new Error('El Excel debe pesar como máximo 3 MB.');
  const view = new DataView(bytes);
  let end = -1;
  for (let offset = bytes.byteLength - 22; offset >= Math.max(0, bytes.byteLength - 65557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error('No es un archivo XLSX válido.');
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true),
    expanded = 0;
  if (count > 1000) throw new Error('El Excel contiene demasiados elementos. Usa una copia limpia de la plantilla.');
  for (let index = 0; index < count; index++) {
    if (offset + 46 > bytes.byteLength || view.getUint32(offset, true) !== 0x02014b50)
      throw new Error('El Excel está dañado o no es compatible.');
    expanded += view.getUint32(offset + 24, true);
    if (expanded > 25 * 1024 * 1024) throw new Error('El contenido del Excel es demasiado grande.');
    offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
}
