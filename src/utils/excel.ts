import * as XLSX from 'xlsx';
import type { ExcelImportRow } from '../api';
import type { FolderRecord, SpineColor } from '../types';

const TEMPLATE_HEADERS = [
  'Consecutivo',
  'Unidad Administrativa',
  'Área Productora',
  'Nombre del Expediente',
  'Número de Expediente',
  'Año o Periodo',
  'Fecha Más Antigua',
  'Fecha Más Reciente',
  'Número de Carpeta',
  'Observaciones',
  'Sección (ej. S1-S6)',
  'Posición',
  'Color de Lomo',
];

export function exportInventoryToExcel(folders: FolderRecord[], filename = 'inventario_archivo_fisico.xlsx'): void {
  const rows = folders.map((f) => ({
    'ID Sistema': f.uid,
    Consecutivo: f.consecutive_number,
    'Unidad Administrativa': f.administrative_unit_name,
    'Área Productora': f.producing_area_name,
    'Nombre del Expediente': f.expediente_name,
    'Número de Expediente': f.expediente_number,
    'Año o Periodo': f.documentary_year,
    'Fecha Más Antigua': f.oldest_date,
    'Fecha Más Reciente': f.newest_date,
    'Número de Carpeta': f.folder_number,
    Observaciones: f.observations,
    Mueble: f.cabinet_name || '',
    Sección: f.section_code ? `${f.section_code} · ${f.section_name}` : 'Sin ubicación',
    Posición: f.position_index ?? '',
    'Color de Lomo': f.spine_color,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 32 },
    { wch: 28 },
    { wch: 38 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 32 },
    { wch: 20 },
    { wch: 26 },
    { wch: 10 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
  XLSX.writeFile(workbook, filename);
}

export function downloadExcelTemplate(): void {
  const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
  worksheet['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 6, 18) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla_Carpetas');
  XLSX.writeFile(workbook, 'plantilla_inventario_carpetas.xlsx');
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function pickField(row: Record<string, unknown>, candidates: string[]): string {
  const entries = Object.entries(row);
  for (const cand of candidates) {
    const normCand = normalizeHeader(cand);
    const match = entries.find(([key]) => normalizeHeader(key) === normCand);
    if (match && match[1] !== undefined && match[1] !== null) {
      return String(match[1]).trim();
    }
  }
  return '';
}

const VALID_COLORS: SpineColor[] = ['blanco', 'gris', 'azul', 'naranja', 'oscuro'];

export async function parseExcelFile(file: File): Promise<ExcelImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('El archivo no contiene hojas de cálculo.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const parsed: ExcelImportRow[] = [];
  for (const row of rawRows) {
    const expedienteName = pickField(row, [
      'Nombre del Expediente',
      'Nombre o descripción del expediente',
      'Expediente',
      'Descripción',
      'Nombre',
    ]);
    if (!expedienteName) continue;

    const rawPos = pickField(row, ['Posición', 'Posicion']);
    const posNum = rawPos ? Number(rawPos) : null;
    const rawColor = pickField(row, ['Color de Lomo', 'Color Lomo', 'Color']).toLowerCase();
    const spineColor = VALID_COLORS.includes(rawColor as SpineColor) ? (rawColor as SpineColor) : 'blanco';

    const rawSection = pickField(row, ['Sección (ej. S1-S6)', 'Sección', 'Seccion', 'Compartimento']);
    const sectionCodeOnly = rawSection.includes('·') ? rawSection.split('·')[0].trim() : rawSection;

    parsed.push({
      consecutive_number: pickField(row, ['Consecutivo', 'Número de identificación o consecutivo', 'No. Consecutivo']),
      administrative_unit_name: pickField(row, ['Unidad Administrativa', 'Nombre de la unidad administrativa', 'Unidad']),
      producing_area_name: pickField(row, ['Área Productora', 'Area Productora', 'Nombre del área productora', 'Área']),
      expediente_name: expedienteName,
      expediente_number: pickField(row, ['Número de Expediente', 'Numero de Expediente', 'No. Expediente']),
      documentary_year: pickField(row, ['Año o Periodo', 'Año o periodo documental', 'Año', 'Periodo']),
      oldest_date: pickField(row, ['Fecha Más Antigua', 'Fecha mas antigua', 'Fecha Antigua']),
      newest_date: pickField(row, ['Fecha Más Reciente', 'Fecha mas reciente', 'Fecha Reciente']),
      folder_number: pickField(row, ['Número de Carpeta', 'Numero de Carpeta', 'No. Carpeta', 'Carpeta']),
      observations: pickField(row, ['Observaciones', 'Notas']),
      section_ref: sectionCodeOnly === 'Sin ubicación' ? '' : sectionCodeOnly,
      position_index: posNum && Number.isInteger(posNum) && posNum > 0 ? posNum : null,
      spine_color: spineColor,
    });
  }

  return parsed;
}
