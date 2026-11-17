import { Workbook } from 'exceljs';
import { courseLabel, createImportTemplate, createReviewedWorkbook, readImportDraft, readImportWorkbook, safeCsvCell } from './import-workbook';

describe('Aulix Excel template', () => {
  const groups = [{ nivel: 'primaria', grado: 1, letra: 'A', turno: 'manana', capacidad: 30, estudiantes: 5 }];
  const load = async (bytes: ArrayBuffer) => {
    const book = new Workbook();
    await book.xlsx.load(bytes);
    return book;
  };
  const write = async (book: Workbook) => (await book.xlsx.writeBuffer()) as ArrayBuffer;

  it('offers the school courses as one list and marks only the required columns', async () => {
    const actual = [...groups, { ...groups[0], letra: 'B', turno: 'tarde' }, { ...groups[0], nivel: 'secundaria', grado: 3 }];
    const book = await load(await createImportTemplate(actual, 2027));
    const students = book.getWorksheet('Estudiantes')!;
    const options = book.getWorksheet('Opciones_Aulix')!;
    expect(options.state).toBe('hidden');
    expect([1, 2, 3].map((row) => options.getCell(row, 1).value)).toEqual([
      '1° Primaria A · Mañana',
      '1° Primaria B · Tarde',
      '3° Secundaria A · Mañana',
    ]);
    expect(students.getCell('E2').dataValidation.formulae).toEqual(['aulix_cursos']);
    expect(students.getCell('E2001').dataValidation.formulae).toEqual(['aulix_cursos']);
    expect(students.getCell('E1').value).toBe('Curso');
    // Required headers are lime; optional ones dark
    expect((students.getCell('A1').fill as { fgColor: { argb: string } }).fgColor.argb).toBe('FFBCCF4E');
    expect((students.getCell('F1').fill as { fgColor: { argb: string } }).fgColor.argb).toBe('FF10102B');
  });

  it('builds the same course label the API reads', () => {
    expect(courseLabel({ nivel: 'secundaria', grado: 3, letra: 'b', turno: 'tarde' })).toBe('3° Secundaria B · Tarde');
  });

  it('reads email links, formatted text, +591 phones, local dates and tutor columns', async () => {
    const book = await load(await createImportTemplate(groups, 2027));
    const sheet = book.getWorksheet('Estudiantes')!;
    sheet.getCell('A2').value = { richText: [{ text: 'Ana ' }, { text: 'María', font: { bold: true } }] };
    sheet.getCell('H2').value = { text: 'ana@example.test', hyperlink: 'mailto:ana@example.test' };
    sheet.getCell('F2').value = '20/02/2018';
    sheet.getCell('G2').value = '+591 7123-4567';
    sheet.getCell('K2').value = '99887766';
    sheet.getCell('M2').value = 'Madre';
    const [student] = (await readImportWorkbook(await write(book), 12)).students;
    expect(student).toEqual(
      jasmine.objectContaining({
        nombres: 'Ana María',
        correo: 'ana@example.test',
        fechaNacimiento: '2018-02-20',
        telefono: '71234567',
        tutorCi: '99887766',
        tutorParentesco: 'madre',
      }),
    );
  });

  it('reads columns by their name, even moved or with optional ones removed', async () => {
    const book = new Workbook();
    const sheet = book.addWorksheet('Estudiantes');
    sheet.addRow(['CI', 'Curso', 'Primer apellido', 'Nombres']);
    sheet.addRow(['00123456', '3ro A secundaria', 'López', 'Ana']);
    const [student] = (await readImportWorkbook(await write(book), 12)).students;
    expect(student).toEqual({ _row: 2, ci: '00123456', curso: '3ro A secundaria', primerApellido: 'López', nombres: 'Ana' });
  });

  it('still reads older templates with the course in four columns and "Teléfono"', async () => {
    const book = new Workbook();
    const sheet = book.addWorksheet('Estudiantes');
    sheet.addRow(['Nombres', 'Primer apellido', 'CI', 'Teléfono', 'Nivel', 'Grado', 'Paralelo', 'Turno']);
    sheet.addRow(['Ana', 'López', '00123456', '71234567', 'Primaria', 1, 'A', 'Mañana']);
    const [student] = (await readImportWorkbook(await write(book), 12)).students;
    expect(student).toEqual(jasmine.objectContaining({ telefono: '71234567', nivel: 'primaria', grado: '1', letra: 'A', turno: 'manana' }));
  });

  it('names the missing required column', async () => {
    const book = new Workbook();
    book.addWorksheet('Estudiantes').addRow(['Nombres', 'CI', 'Curso']);
    await expectAsync(readImportWorkbook(await write(book), 12)).toBeRejectedWithError(/Primer apellido/);
  });

  it('keeps every row and points to the cell with a formula that has no value', async () => {
    const book = await load(await createImportTemplate(groups, 2027));
    const sheet = book.getWorksheet('Estudiantes')!;
    sheet.getCell('A2').value = { formula: 'A9' } as never;
    sheet.getCell('A3').value = { formula: 'CONCAT("Ro","sa")', result: 'Rosa' };
    sheet.getCell('A4').value = 'Persona conservada';
    const draft = await readImportDraft(await write(book), 12);
    expect(draft.workbook.students.map((row) => row['nombres'])).toEqual(['=A9', 'Rosa', 'Persona conservada']);
    expect(draft.issues).toEqual([jasmine.objectContaining({ kind: 'student', row: 2, key: 'nombres' })]);
    expect(draft.issues[0].message).toContain('A2');
  });

  it('keeps an empty template empty', async () => {
    expect(await readImportWorkbook(await createImportTemplate(groups, 2027), 12)).toEqual({
      yearId: 12,
      students: [],
      teachers: [],
      parents: [],
    });
  });

  it('preserves leading zeros and actual Excel row numbers across empty rows', async () => {
    const book = await load(await createImportTemplate(groups, 2027));
    book.getWorksheet('Estudiantes')!.getRow(4).values = ['Ana', 'López', '', '00123456', '1° Primaria A · Mañana'];
    const [student] = (await readImportWorkbook(await write(book), 12)).students;
    expect(student).toEqual(jasmine.objectContaining({ _row: 4, ci: '00123456', curso: '1° Primaria A · Mañana' }));
  });

  it('protects downloaded error and credential CSV files against formula injection', () => {
    expect(safeCsvCell('=HYPERLINK("evil")')).toBe('"\'=HYPERLINK(""evil"")"');
    expect(safeCsvCell('Ana, Rosa')).toBe('"Ana, Rosa"');
  });

  it('exports corrected data without dropping rows and turns old four-column courses into the list value', async () => {
    const workbook = {
      yearId: 12,
      students: [
        { _row: 2, nombres: 'Corregido', ci: '00123456', nivel: 'primaria', grado: '1', letra: 'A', turno: 'manana' },
        { _row: 4, nombres: 'Conservado', ci: '00123457', curso: '1° Primaria A · Mañana' },
      ],
      teachers: [],
      parents: [],
    };
    const copy = await createReviewedWorkbook({ groups, year: 2027, workbook });
    expect((await readImportWorkbook(copy, 12)).students.map((row) => [row['_row'], row['nombres'], row['curso']])).toEqual([
      [2, 'Corregido', '1° Primaria A · Mañana'],
      [4, 'Conservado', '1° Primaria A · Mañana'],
    ]);
  });
});
