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

export async function downloadArchiveReportDocx(report: ArchiveReportInput): Promise<void> {
  const templateUrl = `${import.meta.env.BASE_URL}bases/Reporte_Archivos_de_Tramite.docx`;
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
  xml = fillTableCell(xml, 4, 2, report.report_date);
  xml = fillTableCell(xml, 5, 2, report.review_date);

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

  xml = xml.replace(/Responsable de Archivo de Trámite/g, escapeXml(report.rat_name || 'Responsable de Archivo de Trámite'));
  xml = xml.replace(/Revisor Adscrito al Área Coordinadora de Archivos/g, escapeXml(report.coordinator_name || 'Revisor Adscrito al Área Coordinadora de Archivos'));

  const extraRows = `<w:p><w:r><w:t>8. ¿Los expedientes cerrados cuentan con respaldo digital? (Expedientes escaneados): ${digitalBackup.producer_yes ? 'SÍ' : digitalBackup.producer_no ? 'NO' : ''}</w:t></w:r></w:p>
<w:p><w:r><w:t>Observaciones coordinadora: ${escapeXml(digitalBackup.observations || '')}</w:t></w:r></w:p>
<w:p><w:r><w:t>9. ¿Cuenta con DCAI? ${dcaiDocumentation.producer_yes ? 'SÍ' : dcaiDocumentation.producer_no ? 'NO' : ''}; Cajas área productora: ${escapeXml(dcaiDocumentation.producer_quantity || '')}; Cajas coordinadora: ${escapeXml(dcaiDocumentation.coordinator_quantity || '')}</w:t></w:r></w:p>
<w:p><w:r><w:t>Observaciones DCAI: ${escapeXml(dcaiDocumentation.observations || '')}</w:t></w:r></w:p>
<w:p><w:r><w:t>10. ¿La DCAI está limpia de material corrosivo? ${dcaiClean.producer_yes ? 'SÍ' : dcaiClean.producer_no ? 'NO' : ''}</w:t></w:r></w:p>
<w:p><w:r><w:t>Área Productora — Nombre: ${escapeXml(report.producer_area_name || '')}; Cargo: ${escapeXml(report.producer_area_position || '')}</w:t></w:r></w:p>
<w:p><w:r><w:t>Responsable de Archivo de Trámite — Nombre: ${escapeXml(report.rat_name || '')}; Cargo: ${escapeXml(report.rat_position || '')}</w:t></w:r></w:p>
<w:p><w:r><w:t>Revisor Adscrito al Área Coordinadora — Nombre: ${escapeXml(report.coordinator_name || '')}; Cargo: ${escapeXml(report.coordinator_position || '')}</w:t></w:r></w:p>
<w:p><w:r><w:t>Firmas: ______________________________  ______________________________  ______________________________</w:t></w:r></w:p>`;

  xml = xml.replace(/<\/w:sectPr>/, `${extraRows}</w:sectPr>`);
  zip.file('word/document.xml', xml);

  const output = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(output);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Reporte_Archivos_Tramite_${report.report_date || new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
