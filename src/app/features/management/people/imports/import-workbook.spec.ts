import { Workbook } from 'exceljs';
import {
  createImportTemplate,
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
});
