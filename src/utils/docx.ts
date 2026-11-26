import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { ArchiveReportInput, ArchiveReportChecklistEntry } from '../types';

const RUBRICS = [
  '¿Cuenta con expedientes de archivo debidamente integrados?',
  '¿Los expedientes cuentan con carátula de identificación?',
  '¿Los expedientes cuentan con cejilla de identificación?',
  '¿Cuenta con Inventarios Generales de Archivo de Trámite debidamente requisitados?',
  '¿Lo registrado en los Inventarios Generales de Archivo de Trámite coincide con los expedientes físicos?',
];

function border() {
  return { style: BorderStyle.SINGLE, size: 1, color: '111111' };
}

function borders() {
  const value = border();
  return { top: value, bottom: value, left: value, right: value };
}

function cell(text: string, width: number, options: { bold?: boolean; center?: boolean } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: borders(),
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: options.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, bold: options.bold, size: 18 })],
    })],
  });
}

function entryValue(entry: ArchiveReportChecklistEntry | undefined) {
  return entry ?? {
    producer_yes: false,
    producer_no: false,
    producer_quantity: '',
    coordinator_yes: false,
    coordinator_no: false,
    coordinator_quantity: '',
    observations: '',
  };
}

export async function downloadArchiveReportDocx(report: ArchiveReportInput): Promise<void> {
  const mainRows = RUBRICS.map((rubric, index) => {
    const entry = entryValue(report.checklist[index]);
    return new TableRow({ children: [
      cell(String(index + 1), 4, { center: true }),
      cell(rubric, 35),
      cell(`${entry.producer_yes ? 'X' : ''}  ${entry.producer_no ? 'X' : ''}  ${entry.producer_quantity}`, 17, { center: true }),
      cell(`${entry.coordinator_yes ? 'X' : ''}  ${entry.coordinator_no ? 'X' : ''}  ${entry.coordinator_quantity}`, 17, { center: true }),
      cell(entry.observations, 27),
    ] });
  });

  const doc = new Document({ sections: [{ properties: {}, children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'REPORTE DE ARCHIVOS DE TRÁMITE', bold: true, size: 28 })] }),
    new Paragraph({ children: [new TextRun({ text: `NOMBRE DE LA UNIDAD ADMINISTRATIVA: ${report.administrative_unit_name || ''}` })] }),
    new Paragraph({ children: [new TextRun({ text: `NOMBRE DEL ÁREA PRODUCTORA: ${report.producing_area_name || ''}` })] }),
    new Paragraph({ children: [new TextRun({ text: `Fecha de reporte Área Productora: ${report.report_date || ''}` })] }),
    new Paragraph({ children: [new TextRun({ text: `Fecha de revisión Área Coordinadora de Archivos: ${report.review_date || ''}` })] }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [
        cell('No.', 4, { bold: true, center: true }),
        cell('Rubro Verificado', 35, { bold: true, center: true }),
        cell('Área Productora\nSÍ  NO  Cantidad', 17, { bold: true, center: true }),
        cell('Área Coordinadora de Archivos\nSÍ  NO  Cantidad', 17, { bold: true, center: true }),
        cell('Observaciones', 27, { bold: true, center: true }),
      ] }),
      ...mainRows,
      new TableRow({ children: [
        cell('6', 4, { center: true }),
        cell('Refiera los años que abarca la documentación que se resguarda en el archivo de trámite (fechas extremas)', 35),
        cell(`Más antigua: ${report.producer_oldest_year || ''}\nMás reciente: ${report.producer_newest_year || ''}`, 17),
        cell(`Más antigua: ${report.coordinator_oldest_year || ''}\nMás reciente: ${report.coordinator_newest_year || ''}`, 17),
        cell('', 27),
      ] }),
      new TableRow({ children: [
        cell('7', 4, { center: true }),
        cell('¿En qué condiciones se encuentran los documentos?', 35),
        cell(report.producer_condition || '', 17, { center: true }),
        cell(report.coordinator_condition || '', 17, { center: true }),
        cell('', 27),
      ] }),
      new TableRow({ children: [
        cell('8', 4, { center: true }),
        cell('¿Los expedientes cerrados cuentan con respaldo digital? (Expedientes escaneados)', 35),
        cell(report.digital_backup.producer_yes ? 'SÍ' : report.digital_backup.producer_no ? 'NO' : '', 17, { center: true }),
        cell(report.digital_backup.coordinator_yes ? 'SÍ' : report.digital_backup.coordinator_no ? 'NO' : '', 17, { center: true }),
        cell(report.digital_backup.observations || '', 27),
      ] }),
      new TableRow({ children: [
        cell('9', 4, { center: true }),
        cell('¿Cuenta con documentación de comprobación administrativa inmediata (DCAI)?', 35),
        cell(`${report.dcai_documentation.producer_yes ? 'SÍ' : report.dcai_documentation.producer_no ? 'NO' : ''} ${report.dcai_documentation.producer_quantity || ''}`, 17),
        cell(`${report.dcai_documentation.coordinator_yes ? 'SÍ' : report.dcai_documentation.coordinator_no ? 'NO' : ''} ${report.dcai_documentation.coordinator_quantity || ''}`, 17),
        cell(report.dcai_documentation.observations || '', 27),
      ] }),
      new TableRow({ children: [
        cell('10', 4, { center: true }),
        cell('¿La DCAI se encuentra limpia de material corrosivo?', 35),
        cell(report.dcai_clean.producer_yes ? 'SÍ' : report.dcai_clean.producer_no ? 'NO' : '', 17, { center: true }),
        cell(report.dcai_clean.coordinator_yes ? 'SÍ' : report.dcai_clean.coordinator_no ? 'NO' : '', 17, { center: true }),
        cell(report.dcai_clean.observations || '', 27),
      ] }),
    ] }),
    new Paragraph({ children: [new TextRun({ text: `Área Productora — Nombre: ${report.producer_area_name || ''}` })] }),
    new Paragraph({ children: [new TextRun({ text: `Cargo: ${report.producer_area_position || ''}` })] }),
    new Paragraph({ children: [new TextRun({ text: 'Firma: ______________________________' })] }),
    new Paragraph({ children: [new TextRun({ text: `Responsable de Archivo de Trámite — Nombre: ${report.rat_name || ''}` })] }),
    new Paragraph({ children: [new TextRun({ text: `Cargo: ${report.rat_position || ''}` })] }),
    new Paragraph({ children: [new TextRun({ text: 'Firma: ______________________________' })] }),
    new Paragraph({ children: [new TextRun({ text: `Revisor Adscrito al Área Coordinadora — Nombre: ${report.coordinator_name || ''}` })] }),
    new Paragraph({ children: [new TextRun({ text: `Cargo: ${report.coordinator_position || ''}` })] }),
    new Paragraph({ children: [new TextRun({ text: 'Firma: ______________________________' })] }),
  ] }] });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Reporte_Archivos_Tramite_${report.report_date || new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
