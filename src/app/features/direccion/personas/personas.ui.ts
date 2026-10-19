// Validaciones compartidas de los formularios de Personas
export const PATRON_CI = /^\d{5,10}(-[0-9A-Za-z]{1,3})?$/; // CI boliviano con complemento opcional
export const PATRON_TELEFONO = /^(\d{7,8})?$/; // opcional: fijo (7) o celular (8)
export const PATRON_EMAIL = /^([^\s@]+@[^\s@]+\.[^\s@]+)?$/; // opcional
