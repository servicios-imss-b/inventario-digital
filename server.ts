import express, { type Request, type Response } from 'express';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import JSZip from 'jszip';

const PORT = 3001;
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.resolve(DATA_DIR, 'archive.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize relational schema
db.exec(`
  CREATE TABLE IF NOT EXISTS administrative_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS producing_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER REFERENCES administrative_units(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(unit_id, name)
  );

  CREATE TABLE IF NOT EXISTS cabinets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    columns_count INTEGER NOT NULL DEFAULT 2,
    rows_count INTEGER NOT NULL DEFAULT 3,
    material TEXT NOT NULL DEFAULT 'Madera',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cabinet_id INTEGER NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    row_index INTEGER NOT NULL,
    col_index INTEGER NOT NULL,
    width_ratio INTEGER NOT NULL DEFAULT 50,
    notes TEXT NOT NULL DEFAULT '',
    UNIQUE(cabinet_id, code)
  );

  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL UNIQUE,
    consecutive_number TEXT NOT NULL DEFAULT '',
    administrative_unit_id INTEGER REFERENCES administrative_units(id) ON DELETE SET NULL,
    administrative_unit_name TEXT NOT NULL DEFAULT '',
    producing_area_id INTEGER REFERENCES producing_areas(id) ON DELETE SET NULL,
    producing_area_name TEXT NOT NULL DEFAULT '',
    expediente_name TEXT NOT NULL,
    expediente_number TEXT NOT NULL DEFAULT '',
    documentary_year TEXT NOT NULL DEFAULT '',
    oldest_date TEXT NOT NULL DEFAULT '',
    newest_date TEXT NOT NULL DEFAULT '',
    folder_number TEXT NOT NULL DEFAULT '',
    observations TEXT NOT NULL DEFAULT '',
    spine_color TEXT NOT NULL DEFAULT 'blanco',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER NOT NULL UNIQUE REFERENCES folders(id) ON DELETE CASCADE,
    cabinet_id INTEGER NOT NULL REFERENCES cabinets(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    position_index INTEGER NOT NULL DEFAULT 1,
    assigned_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS movement_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    folder_uid TEXT NOT NULL,
    expediente_name TEXT NOT NULL,
    previous_cabinet_name TEXT,
    previous_section_name TEXT,
    previous_position INTEGER,
    new_cabinet_name TEXT,
    new_section_name TEXT,
    new_position INTEGER,
    action_type TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    moved_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS archive_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    administrative_unit_name TEXT NOT NULL DEFAULT '',
    producing_area_name TEXT NOT NULL DEFAULT '',
    report_date TEXT NOT NULL DEFAULT '',
    review_date TEXT NOT NULL DEFAULT '',
    checklist_json TEXT NOT NULL DEFAULT '[]',
    producer_oldest_year TEXT NOT NULL DEFAULT '',
    producer_newest_year TEXT NOT NULL DEFAULT '',
    coordinator_oldest_year TEXT NOT NULL DEFAULT '',
    coordinator_newest_year TEXT NOT NULL DEFAULT '',
    producer_condition TEXT NOT NULL DEFAULT '',
    coordinator_condition TEXT NOT NULL DEFAULT '',
    digital_backup_json TEXT NOT NULL DEFAULT '{}',
    dcai_documentation_json TEXT NOT NULL DEFAULT '{}',
    dcai_clean_json TEXT NOT NULL DEFAULT '{}',
    producer_area_signature TEXT NOT NULL DEFAULT '',
    rat_signature TEXT NOT NULL DEFAULT '',
    producer_signature TEXT NOT NULL DEFAULT '',
    coordinator_signature TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Seed physical furniture structure strictly from the reference photograph (1 cabinet, 6 compartments: 2 cols x 3 rows)
const cabinetCountRow = db.prepare('SELECT COUNT(*) AS count FROM cabinets').get() as { count: number };
if (cabinetCountRow.count === 0) {
  const now = new Date().toISOString();
  const insertCabinet = db.prepare(`
    INSERT INTO cabinets (code, name, description, columns_count, rows_count, material, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const cabRes = insertCabinet.run(
    'M1',
    'Mueble Principal',
    'Estantería física de madera de 2 columnas y 3 niveles (6 secciones)',
    2,
    3,
    'Madera caoba',
    now
  );
  const cabinetId = Number(cabRes.lastInsertRowid);

  const insertSection = db.prepare(`
    INSERT INTO sections (cabinet_id, code, name, row_index, col_index, width_ratio, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const initialSections = [
    { code: 'S1', name: 'Superior Izquierda', row: 1, col: 1, ratio: 42, notes: 'Nivel superior · Compartimento izquierdo' },
    { code: 'S2', name: 'Superior Derecha', row: 1, col: 2, ratio: 58, notes: 'Nivel superior · Compartimento derecho' },
    { code: 'S3', name: 'Media Izquierda', row: 2, col: 1, ratio: 42, notes: 'Nivel medio · Compartimento izquierdo' },
    { code: 'S4', name: 'Media Derecha', row: 2, col: 2, ratio: 58, notes: 'Nivel medio · Compartimento derecho' },
    { code: 'S5', name: 'Inferior Izquierda', row: 3, col: 1, ratio: 42, notes: 'Nivel inferior · Compartimento izquierdo' },
    { code: 'S6', name: 'Inferior Derecha', row: 3, col: 2, ratio: 58, notes: 'Nivel inferior · Compartimento derecho' },
  ];
  for (const s of initialSections) {
    insertSection.run(cabinetId, s.code, s.name, s.row, s.col, s.ratio, s.notes);
  }
}

// Seed real administrative unit observed on the reference form (without creating fake folder records)
const unitCountRow = db.prepare('SELECT COUNT(*) AS count FROM administrative_units').get() as { count: number };
if (unitCountRow.count === 0) {
  db.prepare('INSERT INTO administrative_units (name, created_at) VALUES (?, ?)').run(
    'Coordinación de Planeación Estratégica',
    new Date().toISOString()
  );
}

// Helpers
const ALLOWED_SPINE_COLORS = new Set(['blanco', 'gris', 'azul', 'naranja', 'oscuro']);

function cleanStr(val: unknown, maxLen = 500): string {
  if (typeof val !== 'string' && typeof val !== 'number') return '';
  return String(val).trim().slice(0, maxLen);
}

function sanitizeSpineColor(val: unknown): string {
  const s = cleanStr(val, 20).toLowerCase();
  return ALLOWED_SPINE_COLORS.has(s) ? s : 'blanco';
}

function getOrCreateUnitId(unitName: string, now: string): number | null {
  if (!unitName) return null;
  const existing = db.prepare('SELECT id FROM administrative_units WHERE LOWER(name) = LOWER(?)').get(unitName) as
    | { id: number }
    | undefined;
  if (existing) return existing.id;
  const res = db.prepare('INSERT INTO administrative_units (name, created_at) VALUES (?, ?)').run(unitName, now);
  return Number(res.lastInsertRowid);
}

function getOrCreateAreaId(areaName: string, unitId: number | null, now: string): number | null {
  if (!areaName) return null;
  const existing = db
    .prepare('SELECT id FROM producing_areas WHERE LOWER(name) = LOWER(?) AND (unit_id IS ? OR unit_id = ?)')
    .get(areaName, unitId, unitId) as { id: number } | undefined;
  if (existing) return existing.id;
  const res = db
    .prepare('INSERT INTO producing_areas (unit_id, name, created_at) VALUES (?, ?, ?)')
    .run(unitId, areaName, now);
  return Number(res.lastInsertRowid);
}

function nextFolderUid(): string {
  const row = db.prepare('SELECT MAX(id) AS maxId FROM folders').get() as { maxId: number | null };
  const nextNum = (row?.maxId ?? 0) + 1;
  return `CAR-${String(nextNum).padStart(4, '0')}`;
}

function reindexSection(sectionId: number): void {
  const rows = db
    .prepare('SELECT id FROM locations WHERE section_id = ? ORDER BY position_index ASC, id ASC')
    .all(sectionId) as Array<{ id: number }>;
  const update = db.prepare('UPDATE locations SET position_index = ? WHERE id = ?');
  rows.forEach((row, index) => {
    update.run(index + 1, row.id);
  });
}

function fetchAllFolders() {
  return db
    .prepare(`
      SELECT
        f.*,
        l.cabinet_id,
        c.code AS cabinet_code,
        c.name AS cabinet_name,
        l.section_id,
        s.code AS section_code,
        s.name AS section_name,
        l.position_index
      FROM folders f
      LEFT JOIN locations l ON l.folder_id = f.id
      LEFT JOIN cabinets c ON c.id = l.cabinet_id
      LEFT JOIN sections s ON s.id = l.section_id
      ORDER BY f.id DESC
    `)
    .all();
}

function fetchFolderById(id: number) {
  return db
    .prepare(`
      SELECT
        f.*,
        l.cabinet_id,
        c.code AS cabinet_code,
        c.name AS cabinet_name,
        l.section_id,
        s.code AS section_code,
        s.name AS section_name,
        l.position_index
      FROM folders f
      LEFT JOIN locations l ON l.folder_id = f.id
      LEFT JOIN cabinets c ON c.id = l.cabinet_id
      LEFT JOIN sections s ON s.id = l.section_id
      WHERE f.id = ?
    `)
    .get(id);
}

function moveFolderLocation(
  folderId: number,
  targetSectionId: number | null,
  targetPosition: number | null,
  notes: string
) {
  const folder = db.prepare('SELECT id, uid, expediente_name FROM folders WHERE id = ?').get(folderId) as
    | { id: number; uid: string; expediente_name: string }
    | undefined;
  if (!folder) {
    throw new Error('Carpeta no encontrada');
  }

  const currentLoc = db
    .prepare(`
      SELECT l.id, l.cabinet_id, l.section_id, l.position_index, c.name AS cabinet_name, s.code AS section_code, s.name AS section_name
      FROM locations l
      JOIN cabinets c ON c.id = l.cabinet_id
      JOIN sections s ON s.id = l.section_id
      WHERE l.folder_id = ?
    `)
    .get(folderId) as
    | {
        id: number;
        cabinet_id: number;
        section_id: number;
        position_index: number;
        cabinet_name: string;
        section_code: string;
        section_name: string;
      }
    | undefined;

  const now = new Date().toISOString();

  if (targetSectionId === null) {
    if (!currentLoc) return; // Already unassigned
    db.prepare('DELETE FROM locations WHERE folder_id = ?').run(folderId);
    reindexSection(currentLoc.section_id);
    db.prepare(`
      INSERT INTO movement_history (
        folder_id, folder_uid, expediente_name,
        previous_cabinet_name, previous_section_name, previous_position,
        new_cabinet_name, new_section_name, new_position,
        action_type, notes, moved_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 'Retiro', ?, ?)
    `).run(
      folder.id,
      folder.uid,
      folder.expediente_name,
      currentLoc.cabinet_name,
      `${currentLoc.section_code} · ${currentLoc.section_name}`,
      currentLoc.position_index,
      notes || 'Retirada del mobiliario (sin ubicación asignada)',
      now
    );
    db.prepare('UPDATE folders SET updated_at = ? WHERE id = ?').run(now, folderId);
    return;
  }

  const targetSection = db
    .prepare(`
      SELECT s.id, s.cabinet_id, s.code, s.name, c.name AS cabinet_name
      FROM sections s
      JOIN cabinets c ON c.id = s.cabinet_id
      WHERE s.id = ?
    `)
    .get(targetSectionId) as
    | { id: number; cabinet_id: number; code: string; name: string; cabinet_name: string }
    | undefined;

  if (!targetSection) {
    throw new Error('Sección destino no encontrada');
  }

  const existingInTarget = db
    .prepare('SELECT id, folder_id, position_index FROM locations WHERE section_id = ? AND folder_id != ? ORDER BY position_index ASC')
    .all(targetSectionId, folderId) as Array<{ id: number; folder_id: number; position_index: number }>;

  const maxPos = existingInTarget.length + 1;
  const desiredPos =
    targetPosition && targetPosition >= 1 ? Math.min(Math.floor(targetPosition), maxPos) : maxPos;

  // Check if nothing actually changed
  if (currentLoc && currentLoc.section_id === targetSectionId && currentLoc.position_index === desiredPos) {
    return;
  }

  // Delete from old location if present
  const oldSectionId = currentLoc?.section_id ?? null;
  if (currentLoc) {
    db.prepare('DELETE FROM locations WHERE folder_id = ?').run(folderId);
  }

  // Shift items in target section to open up desiredPos
  const updateTargetPos = db.prepare('UPDATE locations SET position_index = ? WHERE id = ?');
  let pos = 1;
  for (const row of existingInTarget) {
    if (pos === desiredPos) pos++;
    updateTargetPos.run(pos, row.id);
    pos++;
  }

  // Insert into new location
  db.prepare(`
    INSERT INTO locations (folder_id, cabinet_id, section_id, position_index, assigned_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(folderId, targetSection.cabinet_id, targetSection.id, desiredPos, now);

  if (oldSectionId !== null && oldSectionId !== targetSectionId) {
    reindexSection(oldSectionId);
  }

  const actionType = !currentLoc
    ? 'Asignación'
    : currentLoc.section_id === targetSectionId
      ? 'Reordenamiento'
      : 'Reubicación';

  db.prepare(`
    INSERT INTO movement_history (
      folder_id, folder_uid, expediente_name,
      previous_cabinet_name, previous_section_name, previous_position,
      new_cabinet_name, new_section_name, new_position,
      action_type, notes, moved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    folder.id,
    folder.uid,
    folder.expediente_name,
    currentLoc ? currentLoc.cabinet_name : null,
    currentLoc ? `${currentLoc.section_code} · ${currentLoc.section_name}` : null,
    currentLoc ? currentLoc.position_index : null,
    targetSection.cabinet_name,
    `${targetSection.code} · ${targetSection.name}`,
    desiredPos,
    actionType,
    notes || '',
    now
  );

  db.prepare('UPDATE folders SET updated_at = ? WHERE id = ?').run(now, folderId);
}

const archiveReportColumns = db.prepare('PRAGMA table_info(archive_reports)').all() as Array<{ name: string }>;
const archiveReportColumnNames = new Set(archiveReportColumns.map((column) => column.name));
const archiveReportAlterations: Record<string, string> = {
  producer_condition: "TEXT NOT NULL DEFAULT ''",
  coordinator_condition: "TEXT NOT NULL DEFAULT ''",
  digital_backup_json: "TEXT NOT NULL DEFAULT '{}'",
  dcai_documentation_json: "TEXT NOT NULL DEFAULT '{}'",
  dcai_clean_json: "TEXT NOT NULL DEFAULT '{}'",
  producer_area_signature: "TEXT NOT NULL DEFAULT ''",
  rat_signature: "TEXT NOT NULL DEFAULT ''",
  producer_signature: "TEXT NOT NULL DEFAULT ''",
  producer_area_name: "TEXT NOT NULL DEFAULT ''",
  producer_area_position: "TEXT NOT NULL DEFAULT ''",
  rat_name: "TEXT NOT NULL DEFAULT ''",
  rat_position: "TEXT NOT NULL DEFAULT ''",
  coordinator_name: "TEXT NOT NULL DEFAULT ''",
  coordinator_position: "TEXT NOT NULL DEFAULT ''",
  coordinator_signature: "TEXT NOT NULL DEFAULT ''",
};
for (const [columnName, definition] of Object.entries(archiveReportAlterations)) {
  if (!archiveReportColumnNames.has(columnName)) {
    db.exec(`ALTER TABLE archive_reports ADD COLUMN ${columnName} ${definition}`);
  }
}

const app = express();
app.use(express.json({ limit: '5mb' }));

function escapeXmlText(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function setDocxTableCell(xml: string, rowNumber: number, cellNumber: number, value: unknown): string {
  const rows = Array.from(xml.matchAll(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g));
  if (rowNumber < 1 || rowNumber > rows.length) return xml;
  const row = rows[rowNumber - 1][0];
  const cells = Array.from(row.matchAll(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g));
  if (cellNumber < 1 || cellNumber > cells.length) return xml;
  const cell = cells[cellNumber - 1][0];
  const opening = cell.match(/^<w:tc(?:\s[^>]*)?>/)?.[0] ?? '<w:tc>';
  const tcPr = cell.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/)?.[0] ?? '';
  const text = escapeXmlText(value);
  const filled = `${opening}${tcPr}<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p></w:tc>`;
  const filledRow = row.slice(0, cells[cellNumber - 1].index) + filled + row.slice((cells[cellNumber - 1].index ?? 0) + cell.length);
  return xml.replace(row, filledRow);
}

app.post('/api/reports/docx', async (req: Request, res: Response) => {
  try {
    const templatePath = path.resolve(process.cwd(), 'bases', 'Reporte_Archivos_de_Tramite.docx');
    const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));
    const documentFile = zip.file('word/document.xml');
    if (!documentFile) {
      res.status(500).json({ error: 'No se encontró document.xml en la plantilla DOCX.' });
      return;
    }

    let xml = await documentFile.async('string');
    const report = req.body ?? {};
    const checklist = Array.isArray(report.checklist) ? report.checklist : [];

    xml = setDocxTableCell(xml, 2, 2, report.administrative_unit_name);
    xml = setDocxTableCell(xml, 3, 2, report.producing_area_name);
    xml = setDocxTableCell(xml, 4, 2, report.report_date);
    xml = setDocxTableCell(xml, 5, 2, report.review_date);

    for (let index = 0; index < 5; index++) {
      const rowNumber = 8 + index;
      const entry = checklist[index] ?? {};
      xml = setDocxTableCell(xml, rowNumber, 3, entry.producer_yes ? 'X' : '');
      xml = setDocxTableCell(xml, rowNumber, 4, entry.producer_no ? 'X' : '');
      xml = setDocxTableCell(xml, rowNumber, 5, entry.producer_quantity);
      xml = setDocxTableCell(xml, rowNumber, 6, entry.coordinator_yes ? 'X' : '');
      xml = setDocxTableCell(xml, rowNumber, 7, entry.coordinator_no ? 'X' : '');
      xml = setDocxTableCell(xml, rowNumber, 8, entry.coordinator_quantity);
      xml = setDocxTableCell(xml, rowNumber, 9, entry.observations);
    }

    xml = setDocxTableCell(xml, 13, 3, report.producer_oldest_year);
    xml = setDocxTableCell(xml, 13, 4, report.producer_newest_year);
    xml = setDocxTableCell(xml, 13, 5, report.coordinator_oldest_year);
    xml = setDocxTableCell(xml, 13, 6, report.coordinator_newest_year);

    xml = setDocxTableCell(xml, 14, 3, report.producer_condition ? `${report.producer_condition}.` : '');

    const conditionText = escapeXmlText(report.coordinator_condition ? `${report.coordinator_condition}.` : '');
    xml = xml.replace(/<w:tc>\s*<w:tcPr>[\s\S]*?<\/w:tcPr>\s*<w:p[^>]*>[\s\S]*?<\/w:p>\s*<\/w:tc>/g, (match) => match);

    const digital = report.digital_backup ?? {};
    const dcai = report.dcai_documentation ?? {};
    const dcaiClean = report.dcai_clean ?? {};
    const extraRowsXml = `<w:p><w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">Rubros adicionales</w:t></w:r></w:p>
      <w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>
      <w:tr><w:tc><w:p><w:r><w:t>8</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>¿Los expedientes cerrados cuentan con respaldo digital? (Expedientes escaneados)</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t xml:space="preserve">Área Productora: ${digital.producer_yes ? 'SÍ' : ''} ${digital.producer_no ? 'NO' : ''}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t xml:space="preserve">Área Coordinadora: ${digital.coordinator_yes ? 'SÍ' : ''} ${digital.coordinator_no ? 'NO' : ''} Observaciones: ${escapeXmlText(digital.observations || '')}</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:p><w:r><w:t>9</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>¿Cuenta con documentación de comprobación administrativa inmediata (DCAI)?</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t xml:space="preserve">Área Productora: ${dcai.producer_yes ? 'SÍ' : ''} ${dcai.producer_no ? 'NO' : ''} Cajas: ${escapeXmlText(dcai.producer_quantity || '')}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t xml:space="preserve">Área Coordinadora: ${dcai.coordinator_yes ? 'SÍ' : ''} ${dcai.coordinator_no ? 'NO' : ''} Cajas: ${escapeXmlText(dcai.coordinator_quantity || '')} Observaciones: ${escapeXmlText(dcai.observations || '')}</w:t></w:r></w:p></w:tc></w:tr>
      <w:tr><w:tc><w:p><w:r><w:t>10</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>¿La DCAI se encuentra limpia de material corrosivo?</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t xml:space="preserve">Área Productora: ${dcaiClean.producer_yes ? 'SÍ' : ''} ${dcaiClean.producer_no ? 'NO' : ''}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t xml:space="preserve">Área Coordinadora: ${dcaiClean.coordinator_yes ? 'SÍ' : ''} ${dcaiClean.coordinator_no ? 'NO' : ''} Observaciones: ${escapeXmlText(dcaiClean.observations || '')} Condición coordinadora: ${conditionText}</w:t></w:r></w:p></w:tc></w:tr>
      </w:tbl>
      <w:p><w:r><w:t xml:space="preserve">Área Productora — Nombre: ${escapeXmlText(report.producer_area_name || '')} | Cargo: ${escapeXmlText(report.producer_area_position || '')}</w:t></w:r></w:p>
      <w:p><w:r><w:t xml:space="preserve">Responsable de Archivo de Trámite — Nombre: ${escapeXmlText(report.rat_name || '')} | Cargo: ${escapeXmlText(report.rat_position || '')}</w:t></w:r></w:p>
      <w:p><w:r><w:t xml:space="preserve">Revisor Adscrito al Área Coordinadora — Nombre: ${escapeXmlText(report.coordinator_name || '')} | Cargo: ${escapeXmlText(report.coordinator_position || '')}</w:t></w:r></w:p>
      <w:p><w:r><w:t>Firma: ______________________________</w:t></w:r></w:p>
      <w:p><w:r><w:t>Firma: ______________________________</w:t></w:r></w:p>
      <w:p><w:r><w:t>Firma: ______________________________</w:t></w:r></w:p>`;
    xml = xml.replace('</w:body>', `${extraRowsXml}</w:body>`);

    xml = xml
      .replace(/Responsable de Archivo de Trámite/g, escapeXmlText(report.producer_signature || 'Responsable de Archivo de Trámite'))
      .replace(/Revisor Adscrito al Área Coordinadora de Archivos/g, escapeXmlText(report.coordinator_signature || 'Revisor Adscrito al Área Coordinadora de Archivos'));

    zip.file('word/document.xml', xml);
    const output = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Reporte_Archivos_Tramite_${report.report_date || new Date().toISOString().slice(0, 10)}.docx"`);
    res.send(output);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo generar el DOCX desde la plantilla.' });
  }
});

function parseArchiveReportRow(row: Record<string, unknown>) {
  const {
    checklist_json,
    digital_backup_json,
    dcai_documentation_json,
    dcai_clean_json,
    ...fields
  } = row;
  let checklist: unknown[] = [];
  try {
    const parsed = JSON.parse(String(checklist_json ?? '[]'));
    if (Array.isArray(parsed)) checklist = parsed;
  } catch {
    checklist = [];
  }
  function parseJsonObject(value: unknown) {
    try {
      const parsed = JSON.parse(String(value ?? '{}'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {
    ...fields,
    checklist,
    digital_backup: parseJsonObject(digital_backup_json),
    dcai_documentation: parseJsonObject(dcai_documentation_json),
    dcai_clean: parseJsonObject(dcai_clean_json),
  };
}

function fetchArchiveReports() {
  const rows = db
    .prepare('SELECT * FROM archive_reports ORDER BY updated_at DESC, id DESC')
    .all() as Array<Record<string, unknown>>;
  return rows.map(parseArchiveReportRow);
}

function fetchArchiveReport(id: number) {
  const row = db.prepare('SELECT * FROM archive_reports WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? parseArchiveReportRow(row) : null;
}

function cleanArchiveReportBody(body: Record<string, any>) {
  const entries = Array.isArray(body.checklist) ? body.checklist : [];
  const checklist = Array.from({ length: 5 }, (_, index) => {
    const entry = entries[index] ?? {};
    return {
      producer_yes: entry.producer_yes === true,
      producer_no: entry.producer_no === true,
      producer_quantity: cleanStr(entry.producer_quantity, 30),
      coordinator_yes: entry.coordinator_yes === true,
      coordinator_no: entry.coordinator_no === true,
      coordinator_quantity: cleanStr(entry.coordinator_quantity, 30),
      observations: cleanStr(entry.observations, 500),
    };
  });
  return {
    administrative_unit_name: cleanStr(body.administrative_unit_name, 200),
    producing_area_name: cleanStr(body.producing_area_name, 200),
    report_date: cleanStr(body.report_date, 40),
    review_date: cleanStr(body.review_date, 40),
    checklist,
    producer_oldest_year: cleanStr(body.producer_oldest_year, 40),
    producer_newest_year: cleanStr(body.producer_newest_year, 40),
    coordinator_oldest_year: cleanStr(body.coordinator_oldest_year, 40),
    coordinator_newest_year: cleanStr(body.coordinator_newest_year, 40),
    producer_condition: cleanStr(body.producer_condition, 20),
    coordinator_condition: cleanStr(body.coordinator_condition, 20),
    digital_backup: body.digital_backup ?? {},
    dcai_documentation: body.dcai_documentation ?? {},
    dcai_clean: body.dcai_clean ?? {},
    producer_area_signature: cleanStr(body.producer_area_signature, 200),
    rat_signature: cleanStr(body.rat_signature, 200),
    producer_signature: cleanStr(body.producer_signature, 200),
    producer_area_name: cleanStr(body.producer_area_name, 200),
    producer_area_position: cleanStr(body.producer_area_position, 200),
    rat_name: cleanStr(body.rat_name, 200),
    rat_position: cleanStr(body.rat_position, 200),
    coordinator_name: cleanStr(body.coordinator_name, 200),
    coordinator_position: cleanStr(body.coordinator_position, 200),
    coordinator_signature: cleanStr(body.coordinator_signature, 200),
  };
}

// Bootstrap endpoint
app.get('/api/bootstrap', (_req: Request, res: Response) => {
  try {
    const cabinets = db.prepare('SELECT * FROM cabinets ORDER BY id ASC').all();
    const sections = db.prepare('SELECT * FROM sections ORDER BY cabinet_id ASC, row_index ASC, col_index ASC').all();
    const folders = fetchAllFolders();
    const units = db.prepare('SELECT * FROM administrative_units ORDER BY name ASC').all();
    const areas = db.prepare('SELECT * FROM producing_areas ORDER BY name ASC').all();
    const movements = db.prepare('SELECT * FROM movement_history ORDER BY id DESC LIMIT 300').all();
    const archiveReports = fetchArchiveReports();
    res.json({ cabinets, sections, folders, units, areas, movements, archiveReports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar los datos del archivo' });
  }
});

app.post('/api/archive-reports', (req: Request, res: Response) => {
  try {
    const report = cleanArchiveReportBody(req.body ?? {});
    const now = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO archive_reports (
          administrative_unit_name, producing_area_name, report_date, review_date, checklist_json,
          producer_oldest_year, producer_newest_year, coordinator_oldest_year, coordinator_newest_year,
          producer_condition, coordinator_condition, digital_backup_json, dcai_documentation_json, dcai_clean_json,
          producer_area_name, producer_area_position, rat_name, rat_position, coordinator_name, coordinator_position, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        report.administrative_unit_name,
        report.producing_area_name,
        report.report_date,
        report.review_date,
        JSON.stringify(report.checklist),
        report.producer_oldest_year,
        report.producer_newest_year,
        report.coordinator_oldest_year,
        report.coordinator_newest_year,
        report.producer_condition,
        report.coordinator_condition,
        JSON.stringify(report.digital_backup),
        JSON.stringify(report.dcai_documentation),
        JSON.stringify(report.dcai_clean),
        report.producer_area_name,
        report.producer_area_position,
        report.rat_name,
        report.rat_position,
        report.coordinator_name,
        report.coordinator_position,
        now,
        now
      );
    res.status(201).json(fetchArchiveReport(Number(result.lastInsertRowid)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar el reporte.' });
  }
});

app.put('/api/archive-reports/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1 || !fetchArchiveReport(id)) {
      res.status(404).json({ error: 'No se encontró el reporte.' });
      return;
    }
    const report = cleanArchiveReportBody(req.body ?? {});
    db.prepare(
      `UPDATE archive_reports SET
        administrative_unit_name = ?, producing_area_name = ?, report_date = ?, review_date = ?, checklist_json = ?,
        producer_oldest_year = ?, producer_newest_year = ?, coordinator_oldest_year = ?, coordinator_newest_year = ?,
        producer_condition = ?, coordinator_condition = ?, digital_backup_json = ?, dcai_documentation_json = ?, dcai_clean_json = ?,
        producer_area_name = ?, producer_area_position = ?, rat_name = ?, rat_position = ?, coordinator_name = ?, coordinator_position = ?, updated_at = ?
      WHERE id = ?`
    ).run(
      report.administrative_unit_name,
      report.producing_area_name,
      report.report_date,
      report.review_date,
      JSON.stringify(report.checklist),
      report.producer_oldest_year,
      report.producer_newest_year,
      report.coordinator_oldest_year,
      report.coordinator_newest_year,
      report.producer_condition,
      report.coordinator_condition,
      JSON.stringify(report.digital_backup),
      JSON.stringify(report.dcai_documentation),
      JSON.stringify(report.dcai_clean),
      report.producer_area_name,
      report.producer_area_position,
      report.rat_name,
      report.rat_position,
      report.coordinator_name,
      report.coordinator_position,
      new Date().toISOString(),
      id
    );
    res.json(fetchArchiveReport(id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo actualizar el reporte.' });
  }
});

// Create folder
app.post('/api/folders', (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const expedienteName = cleanStr(body.expediente_name, 300);
    if (!expedienteName) {
      res.status(400).json({ error: 'El nombre o descripción del expediente es obligatorio.' });
      return;
    }

    const consecutiveNumber = cleanStr(body.consecutive_number, 60);
    const unitName = cleanStr(body.administrative_unit_name, 200);
    const areaName = cleanStr(body.producing_area_name, 200);
    const expedienteNumber = cleanStr(body.expediente_number, 100);
    const documentaryYear = cleanStr(body.documentary_year, 60);
    const oldestDate = cleanStr(body.oldest_date, 40);
    const newestDate = cleanStr(body.newest_date, 40);
    const folderNumber = cleanStr(body.folder_number, 60);
    const observations = cleanStr(body.observations, 1000);
    const spineColor = sanitizeSpineColor(body.spine_color);
    const sectionId =
      typeof body.section_id === 'number' && Number.isInteger(body.section_id) ? body.section_id : null;
    const positionIndex =
      typeof body.position_index === 'number' && Number.isInteger(body.position_index) ? body.position_index : null;

    const createTx = db.transaction(() => {
      const now = new Date().toISOString();
      const unitId = getOrCreateUnitId(unitName, now);
      const areaId = getOrCreateAreaId(areaName, unitId, now);
      const uid = nextFolderUid();

      const result = db
        .prepare(`
          INSERT INTO folders (
            uid, consecutive_number,
            administrative_unit_id, administrative_unit_name,
            producing_area_id, producing_area_name,
            expediente_name, expediente_number,
            documentary_year, oldest_date, newest_date,
            folder_number, observations, spine_color,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          uid,
          consecutiveNumber,
          unitId,
          unitName,
          areaId,
          areaName,
          expedienteName,
          expedienteNumber,
          documentaryYear,
          oldestDate,
          newestDate,
          folderNumber,
          observations,
          spineColor,
          now,
          now
        );

      const folderId = Number(result.lastInsertRowid);
      if (sectionId !== null) {
        moveFolderLocation(folderId, sectionId, positionIndex, 'Asignación inicial al registrar carpeta');
      }
      return folderId;
    });

    const folderId = createTx();
    res.status(201).json(fetchFolderById(folderId));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al registrar la carpeta';
    res.status(400).json({ error: message });
  }
});

// Bulk import folders from Excel
app.post('/api/folders/import', (req: Request, res: Response) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!rows || rows.length === 0) {
      res.status(400).json({ error: 'No se recibieron registros para importar.' });
      return;
    }
    if (rows.length > 2000) {
      res.status(400).json({ error: 'El lote máximo por importación es de 2,000 carpetas.' });
      return;
    }

    const allSections = db.prepare('SELECT id, code, name FROM sections').all() as Array<{
      id: number;
      code: string;
      name: string;
    }>;

    const importTx = db.transaction(() => {
      let createdCount = 0;
      const now = new Date().toISOString();

      for (const raw of rows) {
        const expedienteName = cleanStr(raw.expediente_name, 300);
        if (!expedienteName) continue;

        const consecutiveNumber = cleanStr(raw.consecutive_number, 60);
        const unitName = cleanStr(raw.administrative_unit_name, 200);
        const areaName = cleanStr(raw.producing_area_name, 200);
        const expedienteNumber = cleanStr(raw.expediente_number, 100);
        const documentaryYear = cleanStr(raw.documentary_year, 60);
        const oldestDate = cleanStr(raw.oldest_date, 40);
        const newestDate = cleanStr(raw.newest_date, 40);
        const folderNumber = cleanStr(raw.folder_number, 60);
        const observations = cleanStr(raw.observations, 1000);
        const spineColor = sanitizeSpineColor(raw.spine_color);

        const unitId = getOrCreateUnitId(unitName, now);
        const areaId = getOrCreateAreaId(areaName, unitId, now);
        const uid = nextFolderUid();

        const result = db
          .prepare(`
            INSERT INTO folders (
              uid, consecutive_number,
              administrative_unit_id, administrative_unit_name,
              producing_area_id, producing_area_name,
              expediente_name, expediente_number,
              documentary_year, oldest_date, newest_date,
              folder_number, observations, spine_color,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            uid,
            consecutiveNumber,
            unitId,
            unitName,
            areaId,
            areaName,
            expedienteName,
            expedienteNumber,
            documentaryYear,
            oldestDate,
            newestDate,
            folderNumber,
            observations,
            spineColor,
            now,
            now
          );

        const folderId = Number(result.lastInsertRowid);
        createdCount++;

        // Match section by ID, code (S1..S6), or name
        let matchedSectionId: number | null = null;
        if (typeof raw.section_id === 'number' && Number.isInteger(raw.section_id)) {
          const found = allSections.find((s) => s.id === raw.section_id);
          if (found) matchedSectionId = found.id;
        } else if (raw.section_ref) {
          const ref = cleanStr(raw.section_ref, 120).toLowerCase();
          const found = allSections.find(
            (s) => s.code.toLowerCase() === ref || s.name.toLowerCase() === ref || `${s.code} · ${s.name}`.toLowerCase() === ref
          );
          if (found) matchedSectionId = found.id;
        }

        if (matchedSectionId !== null) {
          const pos =
            typeof raw.position_index === 'number' && Number.isInteger(raw.position_index)
              ? raw.position_index
              : null;
          moveFolderLocation(folderId, matchedSectionId, pos, 'Importación masiva desde Excel');
        }
      }
      return createdCount;
    });

    const imported = importTx();
    res.status(201).json({ imported });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al importar registros';
    res.status(400).json({ error: message });
  }
});

// Update folder
app.put('/api/folders/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'ID de carpeta inválido' });
      return;
    }

    const existing = db.prepare('SELECT id FROM folders WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Carpeta no encontrada' });
      return;
    }

    const body = req.body ?? {};
    const expedienteName = cleanStr(body.expediente_name, 300);
    if (!expedienteName) {
      res.status(400).json({ error: 'El nombre o descripción del expediente es obligatorio.' });
      return;
    }

    const consecutiveNumber = cleanStr(body.consecutive_number, 60);
    const unitName = cleanStr(body.administrative_unit_name, 200);
    const areaName = cleanStr(body.producing_area_name, 200);
    const expedienteNumber = cleanStr(body.expediente_number, 100);
    const documentaryYear = cleanStr(body.documentary_year, 60);
    const oldestDate = cleanStr(body.oldest_date, 40);
    const newestDate = cleanStr(body.newest_date, 40);
    const folderNumber = cleanStr(body.folder_number, 60);
    const observations = cleanStr(body.observations, 1000);
    const spineColor = sanitizeSpineColor(body.spine_color);

    const hasSectionField = Object.prototype.hasOwnProperty.call(body, 'section_id');
    const sectionId =
      body.section_id === null
        ? null
        : typeof body.section_id === 'number' && Number.isInteger(body.section_id)
          ? body.section_id
          : undefined;
    const positionIndex =
      typeof body.position_index === 'number' && Number.isInteger(body.position_index) ? body.position_index : null;

    const updateTx = db.transaction(() => {
      const now = new Date().toISOString();
      const unitId = getOrCreateUnitId(unitName, now);
      const areaId = getOrCreateAreaId(areaName, unitId, now);

      db.prepare(`
        UPDATE folders SET
          consecutive_number = ?,
          administrative_unit_id = ?,
          administrative_unit_name = ?,
          producing_area_id = ?,
          producing_area_name = ?,
          expediente_name = ?,
          expediente_number = ?,
          documentary_year = ?,
          oldest_date = ?,
          newest_date = ?,
          folder_number = ?,
          observations = ?,
          spine_color = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        consecutiveNumber,
        unitId,
        unitName,
        areaId,
        areaName,
        expedienteName,
        expedienteNumber,
        documentaryYear,
        oldestDate,
        newestDate,
        folderNumber,
        observations,
        spineColor,
        now,
        id
      );

      if (hasSectionField && sectionId !== undefined) {
        moveFolderLocation(id, sectionId, positionIndex, 'Actualización desde ficha de carpeta');
      }
    });

    updateTx();
    res.json(fetchFolderById(id));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar carpeta';
    res.status(400).json({ error: message });
  }
});

// Delete folder
app.delete('/api/folders/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const delTx = db.transaction(() => {
      const loc = db.prepare('SELECT section_id FROM locations WHERE folder_id = ?').get(id) as
        | { section_id: number }
        | undefined;
      const result = db.prepare('DELETE FROM folders WHERE id = ?').run(id);
      if (result.changes === 0) {
        throw new Error('Carpeta no encontrada');
      }
      if (loc) {
        reindexSection(loc.section_id);
      }
    });

    delTx();
    res.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar carpeta';
    res.status(404).json({ error: message });
  }
});

// Move / relocate / withdraw a folder
app.post('/api/locations/move', (req: Request, res: Response) => {
  try {
    const folderId = Number(req.body?.folder_id);
    const rawTarget = req.body?.target_section_id;
    const targetSectionId = rawTarget === null || rawTarget === undefined ? null : Number(rawTarget);
    const targetPosition =
      typeof req.body?.target_position === 'number' && Number.isInteger(req.body.target_position)
        ? req.body.target_position
        : null;
    const notes = cleanStr(req.body?.notes, 300);

    if (!Number.isInteger(folderId)) {
      res.status(400).json({ error: 'ID de carpeta inválido' });
      return;
    }
    if (targetSectionId !== null && !Number.isInteger(targetSectionId)) {
      res.status(400).json({ error: 'Sección destino inválida' });
      return;
    }

    const moveTx = db.transaction(() => {
      moveFolderLocation(folderId, targetSectionId, targetPosition, notes);
    });
    moveTx();

    res.json({ ok: true, folder: fetchFolderById(folderId) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al reubicar carpeta';
    res.status(400).json({ error: message });
  }
});

// Update section metadata/organization
app.put('/api/sections/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'ID de sección inválido' });
      return;
    }
    const name = cleanStr(req.body?.name, 100);
    const code = cleanStr(req.body?.code, 20);
    const notes = cleanStr(req.body?.notes, 300);
    const widthRatio = Number(req.body?.width_ratio);

    if (!name || !code) {
      res.status(400).json({ error: 'El código y nombre de la sección son obligatorios.' });
      return;
    }

    db.prepare('UPDATE sections SET code = ?, name = ?, notes = ?, width_ratio = ? WHERE id = ?').run(
      code,
      name,
      notes,
      Number.isFinite(widthRatio) && widthRatio >= 20 && widthRatio <= 80 ? Math.round(widthRatio) : 50,
      id
    );
    res.json(db.prepare('SELECT * FROM sections WHERE id = ?').get(id));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al actualizar sección';
    res.status(400).json({ error: message });
  }
});

// Add new section to an existing cabinet
app.post('/api/cabinets/:id/sections', (req: Request, res: Response) => {
  try {
    const cabinetId = Number(req.params.id);
    if (!Number.isInteger(cabinetId)) {
      res.status(400).json({ error: 'ID de mueble inválido' });
      return;
    }
    const name = cleanStr(req.body?.name, 100);
    const code = cleanStr(req.body?.code, 20);
    const notes = cleanStr(req.body?.notes, 300);
    const rowIndex = Number(req.body?.row_index) || 1;
    const colIndex = Number(req.body?.col_index) || 1;
    const widthRatio = Number(req.body?.width_ratio) || 50;

    if (!name || !code) {
      res.status(400).json({ error: 'Código y nombre son obligatorios.' });
      return;
    }

    const result = db
      .prepare(`
        INSERT INTO sections (cabinet_id, code, name, row_index, col_index, width_ratio, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(cabinetId, code, name, rowIndex, colIndex, widthRatio, notes);

    // Recalculate cabinet row/col bounds
    const maxBounds = db
      .prepare('SELECT MAX(row_index) AS maxR, MAX(col_index) AS maxC FROM sections WHERE cabinet_id = ?')
      .get(cabinetId) as { maxR: number; maxC: number };
    db.prepare('UPDATE cabinets SET rows_count = ?, columns_count = ? WHERE id = ?').run(
      maxBounds.maxR || 1,
      maxBounds.maxC || 1,
      cabinetId
    );

    res.status(201).json(db.prepare('SELECT * FROM sections WHERE id = ?').get(result.lastInsertRowid));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al agregar sección';
    res.status(400).json({ error: message });
  }
});

// Delete an empty section
app.delete('/api/sections/:id', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'ID de sección inválido' });
      return;
    }
    const occ = db.prepare('SELECT COUNT(*) AS cnt FROM locations WHERE section_id = ?').get(id) as { cnt: number };
    if (occ.cnt > 0) {
      res.status(400).json({ error: 'No se puede eliminar una sección que aún contiene carpetas. Reubícalas primero.' });
      return;
    }
    const sec = db.prepare('SELECT cabinet_id FROM sections WHERE id = ?').get(id) as
      | { cabinet_id: number }
      | undefined;
    if (!sec) {
      res.status(404).json({ error: 'Sección no encontrada' });
      return;
    }
    db.prepare('DELETE FROM sections WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al eliminar sección';
    res.status(400).json({ error: message });
  }
});

// Create a new cabinet if physical archive expands
app.post('/api/cabinets', (req: Request, res: Response) => {
  try {
    const name = cleanStr(req.body?.name, 120);
    const code = cleanStr(req.body?.code, 20);
    const description = cleanStr(req.body?.description, 300);
    const material = cleanStr(req.body?.material, 80) || 'Madera';
    const cols = Math.min(Math.max(Number(req.body?.columns_count) || 2, 1), 6);
    const rows = Math.min(Math.max(Number(req.body?.rows_count) || 3, 1), 6);

    if (!name || !code) {
      res.status(400).json({ error: 'El código y nombre del mueble son obligatorios.' });
      return;
    }

    const tx = db.transaction(() => {
      const now = new Date().toISOString();
      const cabRes = db
        .prepare(`
          INSERT INTO cabinets (code, name, description, columns_count, rows_count, material, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(code, name, description, cols, rows, material, now);
      const cabId = Number(cabRes.lastInsertRowid);

      const insertSec = db.prepare(`
        INSERT INTO sections (cabinet_id, code, name, row_index, col_index, width_ratio, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      let seq = 1;
      for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
          insertSec.run(cabId, `S${seq}`, `Nivel ${r} · Columna ${c}`, r, c, Math.round(100 / cols), '');
          seq++;
        }
      }
      return cabId;
    });

    const cabId = tx();
    res.status(201).json(db.prepare('SELECT * FROM cabinets WHERE id = ?').get(cabId));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al crear mueble';
    res.status(400).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Archivo Digital server listening on http://localhost:${PORT}`);
  });
}

startServer();
