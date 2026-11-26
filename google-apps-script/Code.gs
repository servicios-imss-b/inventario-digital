const SPREADSHEET_ID = '1NI-yDCU5ww-OSGOdBGXc77kbHtd0ynF-q7aRLVsA1io';

const TABLES = {
  units: { sheet: 'Unidades', headers: ['id', 'name', 'created_at'] },
  areas: { sheet: 'Areas', headers: ['id', 'unit_id', 'name', 'created_at'] },
  cabinets: {
    sheet: 'Mobiliario',
    headers: ['id', 'code', 'name', 'description', 'columns_count', 'rows_count', 'material', 'created_at'],
  },
  sections: {
    sheet: 'Secciones',
    headers: ['id', 'cabinet_id', 'code', 'name', 'row_index', 'col_index', 'width_ratio', 'notes'],
  },
  folders: {
    sheet: 'Carpetas',
    headers: [
      'id', 'uid', 'consecutive_number', 'administrative_unit_id', 'administrative_unit_name',
      'producing_area_id', 'producing_area_name', 'expediente_name', 'expediente_number',
      'documentary_year', 'oldest_date', 'newest_date', 'folder_number', 'observations',
      'spine_color', 'cabinet_id', 'cabinet_code', 'cabinet_name', 'section_id', 'section_code',
      'section_name', 'position_index', 'created_at', 'updated_at',
    ],
  },
  movements: {
    sheet: 'Movimientos',
    headers: [
      'id', 'folder_id', 'folder_uid', 'expediente_name', 'previous_cabinet_name',
      'previous_section_name', 'previous_position', 'new_cabinet_name', 'new_section_name',
      'new_position', 'action_type', 'notes', 'moved_at',
    ],
  },
  reports: {
    sheet: 'Reportes',
    headers: [
      'id', 'administrative_unit_name', 'producing_area_name', 'report_date', 'review_date',
      'checklist', 'producer_oldest_year', 'producer_newest_year', 'coordinator_oldest_year',
      'coordinator_newest_year', 'producer_condition', 'coordinator_condition', 'digital_backup',
      'dcai_documentation', 'dcai_clean', 'producer_area_name', 'producer_area_position',
      'rat_name', 'rat_position', 'coordinator_name', 'coordinator_position',
      'created_at', 'updated_at',
    ],
  },
};

const DEFAULT_SECTIONS = [
  ['S1', 'Superior Izquierda', 1, 1, 42, 'Nivel superior - Compartimento izquierdo'],
  ['S2', 'Superior Derecha', 1, 2, 58, 'Nivel superior - Compartimento derecho'],
  ['S3', 'Media Izquierda', 2, 1, 42, 'Nivel medio - Compartimento izquierdo'],
  ['S4', 'Media Derecha', 2, 2, 58, 'Nivel medio - Compartimento derecho'],
  ['S5', 'Inferior Izquierda', 3, 1, 42, 'Nivel inferior - Compartimento izquierdo'],
  ['S6', 'Inferior Derecha', 3, 2, 58, 'Nivel inferior - Compartimento derecho'],
];

function setup() {
  const spreadsheet = getSpreadsheet_();
  Object.keys(TABLES).forEach(function (key) {
    const table = TABLES[key];
    let sheet = spreadsheet.getSheetByName(table.sheet);
    if (!sheet) sheet = spreadsheet.insertSheet(table.sheet);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, table.headers.length).setValues([table.headers]);
      sheet.setFrozenRows(1);
    }
  });

  const cabinets = readTable_('cabinets');
  if (cabinets.length === 0) {
    saveRecord_('cabinets', {
      id: 1,
      code: 'M1',
      name: 'Mueble Principal',
      description: 'Estanteria fisica de 2 columnas y 3 niveles',
      columns_count: 2,
      rows_count: 3,
      material: 'Madera caoba',
    });
  }

  if (readTable_('sections').length === 0) {
    DEFAULT_SECTIONS.forEach(function (section, index) {
      saveRecord_('sections', {
        id: index + 1,
        cabinet_id: 1,
        code: section[0],
        name: section[1],
        row_index: section[2],
        col_index: section[3],
        width_ratio: section[4],
        notes: section[5],
      });
    });
  }

  return jsonOutput_({ ok: true, message: 'Hojas inicializadas.' });
}

function doGet(event) {
  try {
    ensureSheets_();
    const action = event && event.parameter ? event.parameter.action : 'bootstrap';
    if (!action || action === 'bootstrap') return jsonOutput_(getBootstrap_());
    return jsonOutput_({ error: 'Accion GET no reconocida.' });
  } catch (error) {
    return jsonOutput_({ error: error.message || String(error) });
  }
}

function doPost(event) {
  try {
    ensureSheets_();
    const body = JSON.parse((event && event.postData && event.postData.contents) || '{}');
    switch (body.action) {
      case 'saveFolder':
        return jsonOutput_(saveFolder_(body.folder || {}));
      case 'deleteFolder':
        return jsonOutput_(deleteFolder_(body.id));
      case 'moveFolder':
        return jsonOutput_(moveFolder_(body));
      case 'saveReport':
        return jsonOutput_(saveReport_(body.report || {}));
      case 'deleteReport':
        return jsonOutput_({ ok: deleteRecord_('reports', body.id) });
      case 'saveSection':
        return jsonOutput_(saveRecord_('sections', body.section || {}));
      case 'saveCabinet':
        return jsonOutput_(saveRecord_('cabinets', body.cabinet || {}));
      case 'deleteSection':
        return jsonOutput_({ ok: deleteRecord_('sections', body.id) });
      case 'importFolders':
        return jsonOutput_(importFolders_(body.rows || []));
      default:
        return jsonOutput_({ error: 'Accion POST no reconocida.' });
    }
  } catch (error) {
    return jsonOutput_({ error: error.message || String(error) });
  }
}

function getBootstrap_() {
  const cabinets = readTable_('cabinets');
  const sections = readTable_('sections');
  const folders = readTable_('folders').map(function (folder) {
    const section = sections.find(function (item) { return Number(item.id) === Number(folder.section_id); });
    const cabinet = cabinets.find(function (item) { return Number(item.id) === Number(folder.cabinet_id); });
    return Object.assign({}, folder, {
      id: Number(folder.id),
      cabinet_id: cabinet ? Number(cabinet.id) : null,
      cabinet_code: cabinet ? cabinet.code : null,
      cabinet_name: cabinet ? cabinet.name : null,
      section_id: section ? Number(section.id) : null,
      section_code: section ? section.code : null,
      section_name: section ? section.name : null,
      position_index: folder.position_index ? Number(folder.position_index) : null,
    });
  });
  const reports = readTable_('reports').map(function (report) {
    try { report.checklist = JSON.parse(report.checklist || '[]'); } catch (_error) { report.checklist = []; }
    ['digital_backup', 'dcai_documentation', 'dcai_clean'].forEach(function (field) {
      try { report[field] = JSON.parse(report[field] || '{}'); } catch (_error) { report[field] = {}; }
    });
    ['digital_backup', 'dcai_documentation', 'dcai_clean'].forEach(function (field) {
      try { report[field] = JSON.parse(report[field] || '{}'); } catch (_error) { report[field] = {}; }
    });
    report.id = Number(report.id);
    return report;
  });

  return {
    cabinets: cabinets,
    sections: sections.map(function (item) {
      return Object.assign({}, item, {
        id: Number(item.id),
        cabinet_id: Number(item.cabinet_id),
        row_index: Number(item.row_index),
        col_index: Number(item.col_index),
        width_ratio: Number(item.width_ratio),
      });
    }),
    folders: folders,
    units: readTable_('units'),
    areas: readTable_('areas'),
    movements: readTable_('movements').reverse(),
    archiveReports: reports.reverse(),
  };
}

function saveFolder_(folder) {
  if (folder.administrative_unit_name) {
    const unit = ensureNamedRecord_('units', folder.administrative_unit_name);
    folder.administrative_unit_id = unit.id;
  } else {
    folder.administrative_unit_id = '';
  }
  if (folder.producing_area_name) {
    const area = ensureNamedRecord_('areas', folder.producing_area_name, folder.administrative_unit_id);
    folder.producing_area_id = area.id;
  } else {
    folder.producing_area_id = '';
  }
  const saved = saveRecord_('folders', folder);
  if (!saved.uid) {
    saved.uid = 'CAR-' + String(saved.id).padStart(4, '0');
    saveRecord_('folders', saved);
  }
  return saved;
}

function saveReport_(report) {
  const record = Object.assign({}, report, {
    checklist: JSON.stringify(Array.isArray(report.checklist) ? report.checklist : []),
    digital_backup: JSON.stringify(report.digital_backup && typeof report.digital_backup === 'object' ? report.digital_backup : {}),
    dcai_documentation: JSON.stringify(report.dcai_documentation && typeof report.dcai_documentation === 'object' ? report.dcai_documentation : {}),
    dcai_clean: JSON.stringify(report.dcai_clean && typeof report.dcai_clean === 'object' ? report.dcai_clean : {}),
  });
  const saved = saveRecord_('reports', record);
  try { saved.checklist = JSON.parse(saved.checklist || '[]'); } catch (_error) { saved.checklist = []; }
  ['digital_backup', 'dcai_documentation', 'dcai_clean'].forEach(function (field) {
    try { saved[field] = JSON.parse(saved[field] || '{}'); } catch (_error) { saved[field] = {}; }
  });
  return saved;
}

function moveFolder_(request) {
  const folder = findRecord_('folders', request.folder_id);
  if (!folder) throw new Error('No se encontro la carpeta.');

  const sections = readTable_('sections');
  const cabinets = readTable_('cabinets');
  const section = request.target_section_id
    ? sections.find(function (item) { return Number(item.id) === Number(request.target_section_id); })
    : null;
  if (request.target_section_id && !section) throw new Error('No se encontro la seccion destino.');
  const cabinet = section
    ? cabinets.find(function (item) { return Number(item.id) === Number(section.cabinet_id); })
    : null;
  const position = section
    ? Number(request.target_position) || readTable_('folders').filter(function (item) {
        return Number(item.section_id) === Number(section.id) && Number(item.id) !== Number(folder.id);
      }).length + 1
    : '';

  const oldSection = sections.find(function (item) { return Number(item.id) === Number(folder.section_id); });
  const oldCabinet = cabinets.find(function (item) { return Number(item.id) === Number(folder.cabinet_id); });
  const oldPosition = folder.position_index || '';
  folder.cabinet_id = cabinet ? cabinet.id : '';
  folder.cabinet_code = cabinet ? cabinet.code : '';
  folder.cabinet_name = cabinet ? cabinet.name : '';
  folder.section_id = section ? section.id : '';
  folder.section_code = section ? section.code : '';
  folder.section_name = section ? section.name : '';
  folder.position_index = position;
  const saved = saveRecord_('folders', folder);

  saveRecord_('movements', {
    folder_id: folder.id,
    folder_uid: folder.uid,
    expediente_name: folder.expediente_name,
    previous_cabinet_name: oldCabinet ? oldCabinet.name : '',
    previous_section_name: oldSection ? oldSection.name : '',
    previous_position: oldPosition,
    new_cabinet_name: cabinet ? cabinet.name : '',
    new_section_name: section ? section.name : '',
    new_position: position,
    action_type: section ? (oldSection ? 'Reubicación' : 'Asignación') : 'Retiro',
    notes: request.notes || '',
    moved_at: new Date().toISOString(),
  });
  return { ok: true, folder: saved };
}

function importFolders_(rows) {
  if (!Array.isArray(rows)) throw new Error('rows debe ser una lista.');
  let imported = 0;
  rows.forEach(function (folder) {
    if (!folder.expediente_name) return;
    saveFolder_(folder);
    imported += 1;
  });
  return { imported: imported };
}

function deleteFolder_(id) {
  const deleted = deleteRecord_('folders', id);
  if (deleted) {
    readTable_('movements').filter(function (item) { return Number(item.folder_id) === Number(id); })
      .forEach(function (item) { deleteRecord_('movements', item.id); });
  }
  return { ok: deleted };
}

function ensureSheets_() {
  const spreadsheet = getSpreadsheet_();
  Object.keys(TABLES).forEach(function (key) {
    const table = TABLES[key];
    let sheet = spreadsheet.getSheetByName(table.sheet);
    if (!sheet) sheet = spreadsheet.insertSheet(table.sheet);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, table.headers.length).setValues([table.headers]);
      sheet.setFrozenRows(1);
    }
  });
}

function getSpreadsheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (!spreadsheet) throw new Error('No se pudo abrir la hoja configurada.');
  return spreadsheet;
}

function readTable_(key) {
  const table = TABLES[key];
  const sheet = getSpreadsheet_().getSheetByName(table.sheet);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), table.headers.length).getValues();
  return values.slice(1).filter(function (row) { return row[0] !== ''; }).map(function (row) {
    return table.headers.reduce(function (record, header, index) {
      record[header] = row[index];
      return record;
    }, {});
  });
}

function findRecord_(key, id) {
  return readTable_(key).find(function (record) { return Number(record.id) === Number(id); }) || null;
}

function saveRecord_(key, data) {
  const table = TABLES[key];
  const sheet = getSpreadsheet_().getSheetByName(table.sheet);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const existing = data.id ? findRecord_(key, data.id) : null;
    const id = existing ? Number(existing.id) : (Number(data.id) || nextId_(key));
    const now = new Date().toISOString();
    const record = {};
    table.headers.forEach(function (header) {
      if (header === 'id') record[header] = id;
      else if (header === 'created_at') record[header] = (existing && existing.created_at) || now;
      else if (header === 'updated_at') record[header] = now;
      else if (Object.prototype.hasOwnProperty.call(data, header)) record[header] = data[header];
      else record[header] = existing ? existing[header] : '';
    });

    const values = table.headers.map(function (header) {
      const value = record[header];
      return value && typeof value === 'object' ? JSON.stringify(value) : (value == null ? '' : value);
    });
    const rowIndex = existing ? findRowIndex_(sheet, id) : sheet.getLastRow() + 1;
    sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
    return record;
  } finally {
    lock.releaseLock();
  }
}

function nextId_(key) {
  const propertyKey = 'next_id_' + key;
  const properties = PropertiesService.getScriptProperties();
  const stored = Number(properties.getProperty(propertyKey)) || 0;
  const highest = readTable_(key).reduce(function (max, record) {
    return Math.max(max, Number(record.id) || 0);
  }, 0);
  const id = Math.max(stored, highest) + 1;
  properties.setProperty(propertyKey, String(id));
  return id;
}

function findRowIndex_(sheet, id) {
  const values = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  const index = values.findIndex(function (row) { return Number(row[0]) === Number(id); });
  if (index < 0) throw new Error('No se encontro el registro para actualizar.');
  return index + 2;
}

function deleteRecord_(key, id) {
  const sheet = getSpreadsheet_().getSheetByName(TABLES[key].sheet);
  const rowIndex = findRowIndex_(sheet, id);
  if (rowIndex < 2) return false;
  sheet.deleteRow(rowIndex);
  return true;
}

function jsonOutput_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureNamedRecord_(key, name, unitId) {
  const normalizedName = String(name).trim();
  const existing = readTable_(key).find(function (record) {
    const sameName = String(record.name).toLowerCase() === normalizedName.toLowerCase();
    return key === 'areas'
      ? sameName && Number(record.unit_id || 0) === Number(unitId || 0)
      : sameName;
  });
  if (existing) return existing;
  return saveRecord_(key, { name: normalizedName, unit_id: unitId || '' });
}