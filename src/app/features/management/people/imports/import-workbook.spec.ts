import { Workbook } from 'exceljs';
import {
  createImportTemplate,
  createReviewedWorkbook,
  readImportDraft,
  readImportWorkbook,
  safeCsvCell,
} from './import-workbook';

describe('Aulix Excel template', () => {
  const groups = [
    {
      nivel: 'primaria',
      grado: 1,
      letra: 'A',
      turno: 'manana',
      capacidad: 30,
      estudiantes: 5,
    },
  ];
  it('offers only real school choices and dependent lists through row 501', async () => {
    const actualGroups = [
      ...groups,
      { ...groups[0], letra: 'B', turno: 'tarde' },
      { ...groups[0], nivel: 'secundaria', grado: 3, turno: 'noche' },
    ];
    const book = new Workbook();
    await book.xlsx.load(await createImportTemplate(actualGroups, 2027));
    const students = book.getWorksheet('Estudiantes')!;
    const options = book.getWorksheet('Opciones_Aulix')!;
    expect(options.state).toBe('hidden');
    expect(students.getCell('H2').dataValidation.formulae).toEqual([
      'aulix_niveles',
    ]);
    expect(students.getCell('I2').dataValidation.formulae![0]).toContain('$H2');
    expect(students.getCell('J2').dataValidation.formulae![0]).toContain('$I2');
    expect(students.getCell('K501').dataValidation.formulae![0]).toContain(
      '$J501',
    );
    expect(students.getCell('K501').dataValidation.errorStyle).toBe('stop');
    const values = (name: string) => {
      const range = book.definedNames
        .getRanges(name)
        .ranges[0].split('!')[1]
        .replace(/\$/g, '');
      const [start, end] = range.split(':');
      const first = options.getCell(start),
        last = options.getCell(end ?? start);
      return Array.from(
        { length: Number(last.row) - Number(first.row) + 1 },
        (_, index) =>
          options.getCell(Number(first.row) + index, Number(first.col)).value,
      );
    };
    expect(values('aulix_niveles')).toEqual(['primaria', 'secundaria']);
    expect(values('aulix_grados_primaria')).toEqual(['1']);
    expect(values('aulix_paralelos_primaria_1')).toEqual(['A', 'B']);
    expect(values('aulix_turnos_primaria_1_A')).toEqual(['manana']);
    expect(values('aulix_turnos_primaria_1_B')).toEqual(['tarde']);
    expect(values('aulix_turnos_secundaria_3_A')).toEqual(['noche']);
  });
  it('reads automatic email links and formatted text without following links', async () => {
    const book = new Workbook();
    await book.xlsx.load(await createImportTemplate(groups, 2027));
    const sheet = book.getWorksheet('Estudiantes')!;
    sheet.getCell('A2').value = {
      richText: [{ text: 'Ana ' }, { text: 'María', font: { bold: true } }],
    };
    sheet.getCell('F2').value = {
      text: 'ana@example.test',
      hyperlink: 'mailto:ana@example.test',
    };
    sheet.getCell('G2').value = '20/02/2018';
    sheet.getCell('E2').value = '+591 7123-4567';
    const parsed = await readImportWorkbook(
      (await book.xlsx.writeBuffer()) as ArrayBuffer,
      12,
    );
    expect(parsed.students[0]['nombres']).toBe('Ana María');
    expect(parsed.students[0]['correo']).toBe('ana@example.test');
    expect(parsed.students[0]['fechaNacimiento']).toBe('2018-02-20');
    expect(parsed.students[0]['telefono']).toBe('71234567');
  });
  it('retains all rows and gives a precise cell error instead of discarding the workbook', async () => {
    const book = new Workbook();
    await book.xlsx.load(await createImportTemplate(groups, 2027));
    const sheet = book.getWorksheet('Estudiantes')!;
    sheet.getCell('A2').value = { formula: '1+1', result: 2 };
    sheet.getCell('A3').value = 'Persona conservada';
    const draft = await readImportDraft(
      (await book.xlsx.writeBuffer()) as ArrayBuffer,
      12,
    );
    expect(draft.workbook.students.length).toBe(2);
    expect(draft.workbook.students[0]['nombres']).toBe('=1+1');
    expect(draft.workbook.students[1]['nombres']).toBe('Persona conservada');
    expect(draft.issues[0]).toEqual(
      jasmine.objectContaining({ kind: 'student', row: 2, key: 'nombres' }),
    );
    expect(draft.issues[0].message).toContain('A2');
    expect(draft.issues[0].message).toContain('Nombres');
  });
  it('keeps an empty template empty and includes actual class groups', async () => {
    const bytes = await createImportTemplate(groups, 2027);
    expect(await readImportWorkbook(bytes, 12)).toEqual({
      yearId: 12,
      students: [],
      teachers: [],
      parents: [],
    });
    const book = new Workbook();
    await book.xlsx.load(bytes);
    expect(book.getWorksheet('Paralelos')!.getCell('A2').value).toBe(
      'primaria',
    );
  });
  it('preserves leading zeros and actual Excel row numbers across empty rows', async () => {
    const book = new Workbook();
    await book.xlsx.load(await createImportTemplate(groups, 2027));
    book.getWorksheet('Estudiantes')!.getRow(4).values = [
      'Ana',
      'López',
      '',
      '00123456',
      '',
      '',
      '2018-02-20',
      'primaria',
      1,
      'A',
      'manana',
    ];
    const parsed = await readImportWorkbook(
      (await book.xlsx.writeBuffer()) as ArrayBuffer,
      12,
    );
    expect(parsed.students).toEqual([
      {
        _row: 4,
        nombres: 'Ana',
        primerApellido: 'López',
        segundoApellido: '',
        ci: '00123456',
        telefono: '',
        correo: '',
        fechaNacimiento: '2018-02-20',
        nivel: 'primaria',
        grado: '1',
        letra: 'A',
        turno: 'manana',
      },
    ]);
  });
  it('rejects formulas and renamed columns with a useful location', async () => {
    const book = new Workbook();
    await book.xlsx.load(await createImportTemplate(groups, 2027));
    book.getWorksheet('Estudiantes')!.getCell('A2').value = { formula: '1+1' };
    await expectAsync(
      readImportWorkbook((await book.xlsx.writeBuffer()) as ArrayBuffer, 12),
    ).toBeRejectedWithError(/Estudiantes, fila 2/);
    book.getWorksheet('Estudiantes')!.getCell('A1').value = 'Changed';
    await expectAsync(
      readImportWorkbook((await book.xlsx.writeBuffer()) as ArrayBuffer, 12),
    ).toBeRejectedWithError(/encabezado Nombres/);
  });
  it('protects downloaded error and credential CSV files against formula injection', () => {
    expect(safeCsvCell('=HYPERLINK("evil")')).toBe('"\'=HYPERLINK(""evil"")"');
    expect(safeCsvCell('Ana, Rosa')).toBe('"Ana, Rosa"');
  });
  it('exports corrected data without replacing or dropping other rows', async () => {
    const workbook = {
      yearId: 12,
      students: [
        { _row: 2, nombres: 'Corregido', ci: '00123456' },
        { _row: 4, nombres: 'Conservado', ci: '00123457' },
      ],
      teachers: [],
      parents: [],
    };
    const copy = await createReviewedWorkbook({ groups, year: 2027, workbook });
    expect(
      (await readImportWorkbook(copy, 12)).students.map((row) => [
        row['_row'],
        row['nombres'],
        row['ci'],
      ]),
    ).toEqual([
      [2, 'Corregido', '00123456'],
      [4, 'Conservado', '00123457'],
    ]);
  });
});
