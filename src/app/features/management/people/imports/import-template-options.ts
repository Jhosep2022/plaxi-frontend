import type { Workbook } from 'exceljs';
import type { ImportClassGroup } from './import-api.service';

// Named ranges let Excel restrict each choice to the preceding choices, without macros.
export function addClassGroupDropdowns(
  book: Workbook,
  groups: ImportClassGroup[],
): void {
  const options = book.addWorksheet('Opciones_Aulix', { state: 'hidden' });
  let column = 0;
  const addList = (name: string, values: string[]) => {
    column++;
    options.getCell(1, column).value = name;
    const choices = values.length ? values : [''];
    choices.forEach((value, index) => {
      options.getCell(index + 2, column).value = value;
    });
    const letter = options.getColumn(column).letter;
    book.definedNames.add(
      `'Opciones_Aulix'!$${letter}$2:$${letter}$${choices.length + 1}`,
      name,
    );
  };
  addList('aulix_vacio', []);
  const levels = unique(groups.map((group) => group.nivel));
  addList('aulix_niveles', levels);
  for (const level of levels) {
    const atLevel = groups.filter((group) => group.nivel === level);
    const grades = unique(atLevel.map((group) => String(group.grado)));
    addList(`aulix_grados_${level}`, grades);
    for (const grade of grades) {
      const atGrade = atLevel.filter((group) => String(group.grado) === grade);
      const letters = unique(atGrade.map((group) => group.letra));
      addList(`aulix_paralelos_${level}_${grade}`, letters);
      for (const letter of letters) {
        addList(
          `aulix_turnos_${level}_${grade}_${letter}`,
          unique(
            atGrade
              .filter((group) => group.letra === letter)
              .map((group) => group.turno),
          ),
        );
      }
    }
  }
  const students = book.getWorksheet('Estudiantes')!;
  for (let row = 2; row <= 501; row++) {
    const formulas = [
      'aulix_niveles',
      `INDIRECT(IF($H${row}="","aulix_vacio","aulix_grados_"&$H${row}))`,
      `INDIRECT(IF(OR($H${row}="",$I${row}=""),"aulix_vacio","aulix_paralelos_"&$H${row}&"_"&$I${row}))`,
      `INDIRECT(IF(OR($H${row}="",$I${row}="",$J${row}=""),"aulix_vacio","aulix_turnos_"&$H${row}&"_"&$I${row}&"_"&$J${row}))`,
    ];
    formulas.forEach((formula, index) => {
      students.getCell(row, index + 8).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [formula],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Elige una opción de la lista',
        error:
          'Usa los desplegables de nivel, grado, paralelo y turno, en ese orden. Solo aparecen cursos de esta gestión.',
        showInputMessage: true,
        promptTitle: 'Cursos de tu colegio',
        prompt:
          'Elige nivel, después grado, paralelo y turno. Si cambias una opción anterior, vuelve a elegir las siguientes.',
      };
    });
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, 'es', { numeric: true }),
  );
}
