// models/page.ts
export interface Page<T> {
    content: T[];       // Lista de elementos en la página actual
    totalElements: number; // Total de elementos
    totalPages: number;    // Número total de páginas
    size: number;          // Tamaño de cada página
    number: number;        // Número de la página actual (0 para la primera página)
  }
  