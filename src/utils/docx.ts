import JSZip from 'jszip';
import type { ArchiveReportInput, ArchiveReportChecklistEntry } from '../types';

function emptyEntry(): ArchiveReportChecklistEntry {
  return {
    producer_yes: false,
    producer_no: false,
    producer_quantity: '',
    coordinator_yes: false,
    coordinator_no: false,
    coordinator_quantity: '',
    observations: '',
  };
}

function formatDocxDate(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fillTableCell(xml: string, rowNumber: number, cellNumber: number, value: unknown): string {
  const rows = Array.from(xml.matchAll(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g));
  if (rowNumber < 1 || rowNumber > rows.length) return xml;

  const row = rows[rowNumber - 1][0];
  const cells = Array.from(row.matchAll(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g));
  if (cellNumber < 1 || cellNumber > cells.length) return xml;

  const cell = cells[cellNumber - 1][0];
  const tcPr = cell.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/)?.[0] ?? '';
  const filled = `<w:tc>${tcPr}<w:p><w:r><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p></w:tc>`;
  const filledRow = row.slice(0, (cells[cellNumber - 1].index ?? 0)) + filled + row.slice((cells[cellNumber - 1].index ?? 0) + cell.length);
  return xml.replace(row, filledRow);
}

function setTableCellCheckbox(xml: string, rowNumber: number, cellNumber: number, checkboxNumber: number, checked: boolean): string {
  const rows = Array.from(xml.matchAll(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g));
  const row = rows[rowNumber - 1]?.[0];
  if (!row) return xml;
  const cells = Array.from(row.matchAll(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g));
  const cellMatch = cells[cellNumber - 1];
  if (!cellMatch) return xml;
  const controls = Array.from(cellMatch[0].matchAll(/<w:sdt(?:\s[^>]*)?>[\s\S]*?<\/w:sdt>/g));
  const controlMatch = controls[checkboxNumber - 1];
  if (!controlMatch) return xml;

  const control = controlMatch[0]
    .replace(/<w14:checked w14:val="[^"]*"\s*\/>/, `<w14:checked w14:val="${checked ? '1' : '0'}"/>`)
    .replace(/<w:t>☐<\/w:t>/, `<w:t>${checked ? '☒' : '☐'}</w:t>`);
  const updatedCell = cellMatch[0].replace(controlMatch[0], control);
  const updatedRow = row.slice(0, (cellMatch.index ?? 0)) + updatedCell + row.slice((cellMatch.index ?? 0) + cellMatch[0].length);
  return xml.replace(row, updatedRow);
}

function fillSignatureCell(xml: string, cellNumber: number, name: string, position: string): string {
  if (!name.trim() && !position.trim()) return xml;
  const rows = Array.from(xml.matchAll(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g));
  const row = rows[21]?.[0];
  if (!row) return xml;
  const cells = Array.from(row.matchAll(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g));
  const cellMatch = cells[cellNumber - 1];
  if (!cellMatch) return xml;
  const paragraphMatch = Array.from(cellMatch[0].matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g))
    .find((match) => match[0].includes('Nombre y Firma'));
  if (!paragraphMatch) return xml;

  const paragraph = paragraphMatch[0];
  const labelRunMatch = Array.from(paragraph.matchAll(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g))
    .find((match) => match[0].includes('Nombre y Firma'));
  if (!labelRunMatch) return xml;

  const labelRun = labelRunMatch[0];
  const runProperties = labelRun.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? '';
  const filledRun = labelRun.replace(/(<w:t(?:\s[^>]*)?>)[\s\S]*?(<\/w:t>)/, `$1${escapeXml(name)}$2`);
  const cargoRuns = `<w:r>${runProperties}<w:br/></w:r><w:r>${runProperties}<w:t xml:space="preserve">Cargo: ${escapeXml(position)}</w:t></w:r>`;
  const updatedParagraph = paragraph.slice(0, (labelRunMatch.index ?? 0)) + filledRun + cargoRuns + paragraph.slice((labelRunMatch.index ?? 0) + labelRun.length);
  const updatedCell = cellMatch[0].replace(paragraph, updatedParagraph);
  const updatedRow = row.slice(0, (cellMatch.index ?? 0)) + updatedCell + row.slice((cellMatch.index ?? 0) + cellMatch[0].length);
  return xml.replace(row, updatedRow);
}

export async function downloadArchiveReportDocx(report: ArchiveReportInput): Promise<void> {
  const templateUrl = `${import.meta.env?.BASE_URL ?? '/'}bases/Reporte_Archivos_de_Tramite.docx`;
  const response = await fetch(templateUrl);
  if (!response.ok) throw new Error('No se encontró la plantilla DOCX oficial.');

  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) throw new Error('La plantilla DOCX no contiene document.xml.');

  let xml = await documentFile.async('string');
  const checklist = Array.from({ length: 5 }, (_, index) => ({ ...emptyEntry(), ...(report.checklist?.[index] ?? {}) }));
  const digitalBackup = { ...emptyEntry(), ...(report.digital_backup ?? {}) };
  const dcaiDocumentation = { ...emptyEntry(), ...(report.dcai_documentation ?? {}) };
  const dcaiClean = { ...emptyEntry(), ...(report.dcai_clean ?? {}) };

  xml = fillTableCell(xml, 2, 2, report.administrative_unit_name);
  xml = fillTableCell(xml, 3, 2, report.producing_area_name);
  xml = fillTableCell(xml, 4, 2, formatDocxDate(report.report_date));
  xml = fillTableCell(xml, 5, 2, formatDocxDate(report.review_date));

  checklist.forEach((entry, index) => {
    const row = 8 + index;
    xml = fillTableCell(xml, row, 3, entry.producer_yes ? 'X' : '');
    xml = fillTableCell(xml, row, 4, entry.producer_no ? 'X' : '');
    xml = fillTableCell(xml, row, 5, entry.producer_quantity);
    xml = fillTableCell(xml, row, 6, entry.coordinator_yes ? 'X' : '');
    xml = fillTableCell(xml, row, 7, entry.coordinator_no ? 'X' : '');
    xml = fillTableCell(xml, row, 8, entry.coordinator_quantity);
    xml = fillTableCell(xml, row, 9, entry.observations);
  });

  xml = fillTableCell(xml, 13, 3, report.producer_oldest_year);
  xml = fillTableCell(xml, 13, 4, report.producer_newest_year);
  xml = fillTableCell(xml, 13, 5, report.coordinator_oldest_year);
  xml = fillTableCell(xml, 13, 6, report.coordinator_newest_year);
  const conditionOptions = ['Buenas', 'Regulares', 'Malas', 'Pésimas'];
  for (let option = 0; option < conditionOptions.length; option++) {
    xml = setTableCellCheckbox(xml, 14, 3, option + 1, report.producer_condition === conditionOptions[option]);
    xml = setTableCellCheckbox(xml, 14, 4, option + 1, report.coordinator_condition === conditionOptions[option]);
  }

  const digital = { ...emptyEntry(), ...(report.digital_backup ?? {}) };
  const dcai = { ...emptyEntry(), ...(report.dcai_documentation ?? {}) };
  const clean = { ...emptyEntry(), ...(report.dcai_clean ?? {}) };
  xml = fillTableCell(xml, 16, 3, digital.producer_yes ? 'X' : '');
  xml = fillTableCell(xml, 16, 4, digital.producer_no ? 'X' : '');
  xml = fillTableCell(xml, 16, 5, digital.producer_observations ?? '');
  xml = fillTableCell(xml, 16, 6, digital.coordinator_yes ? 'X' : '');
  xml = fillTableCell(xml, 16, 7, digital.coordinator_no ? 'X' : '');
  xml = fillTableCell(xml, 16, 8, digital.coordinator_observations ?? digital.observations ?? '');
  xml = fillTableCell(xml, 18, 3, dcai.producer_yes ? 'X' : '');
  xml = fillTableCell(xml, 18, 4, dcai.producer_no ? 'X' : '');
  xml = fillTableCell(xml, 18, 5, dcai.producer_quantity);
  xml = fillTableCell(xml, 18, 6, dcai.coordinator_yes ? 'X' : '');
  xml = fillTableCell(xml, 18, 7, dcai.coordinator_no ? 'X' : '');
  xml = fillTableCell(xml, 18, 8, dcai.coordinator_quantity);
  xml = fillTableCell(xml, 18, 9, dcai.coordinator_observations ?? dcai.observations ?? '');
  xml = fillTableCell(xml, 20, 3, clean.producer_yes ? 'X' : '');
  xml = fillTableCell(xml, 20, 4, clean.producer_no ? 'X' : '');
  xml = fillTableCell(xml, 20, 5, clean.producer_observations ?? '');
  xml = fillTableCell(xml, 20, 6, clean.coordinator_yes ? 'X' : '');
  xml = fillTableCell(xml, 20, 7, clean.coordinator_no ? 'X' : '');
  xml = fillTableCell(xml, 20, 8, clean.coordinator_observations ?? clean.observations ?? '');

  xml = fillSignatureCell(xml, 1, report.producer_area_name, report.producer_area_position);
  xml = fillSignatureCell(xml, 3, report.rat_name, report.rat_position);
  xml = fillSignatureCell(xml, 5, report.coordinator_name, report.coordinator_position);

  zip.file('word/document.xml', xml);

  const output = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(output);
  const link = document.createElement('a');
  link.href = url;
  const safeDate = formatDocxDate(report.report_date) || new Date().toISOString().slice(0, 10);
  link.download = `Reporte_Archivos_Tramite_${safeDate}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
