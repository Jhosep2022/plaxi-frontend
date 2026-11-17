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
