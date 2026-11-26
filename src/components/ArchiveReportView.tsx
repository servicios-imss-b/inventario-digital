import React, { useState } from 'react';
import { ArrowLeft, CircleHelp, FileDown, FilePlus2, Save, X } from 'lucide-react';
import { downloadArchiveReportDocx } from '../utils/docx';
import { archiveYearOptions } from '../utils/years';
import type {
  AdministrativeUnit,
  ArchiveReportChecklistEntry,
  ArchiveReportInput,
  ArchiveReportRecord,
  ProducingArea,
} from '../types';

const FIELD_INSTRUCTIONS: Record<string, string> = {
  unit: 'Indicar el nombre de la Unidad Administrativa (Unidad, Coordinación).',
  area: 'Indicar el nombre del área que produce los documentos o expedientes.',
  producer_date: 'Indicar la fecha en la que el área realiza el reporte.',
  review_date: 'Indicar la fecha en la que el Área Coordinadora lleva a cabo la revisión.',
  rubric_1: 'Marcar con una X si cuenta con expedientes de archivo integrados y indicar la cantidad.',
  rubric_2: 'Marcar con una X si los expedientes integrados cuentan con carátula de identificación debidamente requisitada e indicar la cantidad.',
  rubric_3: 'Marcar con una X si los expedientes integrados cuentan con cejilla de identificación en los folders e indicar la cantidad.',
  rubric_4: 'Marcar con una X si tienen Inventarios Generales de Archivo de Trámite requisitados e indicar la cantidad de expedientes registrados.',
  rubric_5: 'Marcar con una X si la cantidad y descripción registrada en los inventarios coincide con los expedientes físicos integrados.',
  rubric_6: 'Indicar el año más reciente y antiguo de la documentación integrada en los expedientes.',
  rubric_7: 'Marcar con una X las condiciones físicas en las que se encuentran los expedientes: Buenas, Regulares, Malas o Pésimas.',
  rubric_8: 'Marcar con una X si los expedientes cerrados cuentan con respaldo digital o expedientes escaneados.',
  rubric_9: 'Marcar con una X si cuenta con DCAI y, si es afirmativo, indicar la cantidad de cajas.',
  rubric_10: 'Marcar con una X si la DCAI está limpia de material corrosivo: grapas, clips, sujetadocumentos y cubrehojas.',
  producer_area_signature: 'Plasmar nombre, cargo y firma de la persona servidora pública adscrita al Área Productora que requisitó el formato.',
  rat_signature: 'Plasmar nombre, cargo y firma del Responsable de Archivo de Trámite de la unidad administrativa.',
  coordinator_signature: 'Plasmar nombre, cargo y firma de la persona adscrita al Área Coordinadora de Archivos que realizó la revisión.',
};

function FieldInstructions({ instructionKey }: { instructionKey: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="archive-field-instructions">
      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        Instrucciones
      </button>
      {open && (
        <span className="archive-field-instructions-popover" role="tooltip">
          {FIELD_INSTRUCTIONS[instructionKey]}
        </span>
      )}
    </span>
  );
}

interface ArchiveReportViewProps {
  reports: ArchiveReportRecord[];
  units: AdministrativeUnit[];
  areas: ProducingArea[];
  onSave: (input: ArchiveReportInput, id: number | null) => Promise<ArchiveReportRecord>;
}

const RUBRICS = [
  '¿Cuenta con expedientes de archivo debidamente integrados?',
  '¿Los expedientes cuentan con carátula de identificación?',
  '¿Los expedientes cuentan con cejilla de identificación?',
  '¿Cuenta con Inventarios Generales de Archivo de Trámite debidamente requisitados?',
  '¿Lo registrado en los Inventarios Generales de Archivo de Trámite coincide con los expedientes físicos?',
];

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

function localDate(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function blankReport(unitName: string): ArchiveReportInput {
  return {
    administrative_unit_name: unitName,
    producing_area_name: '',
    report_date: '',
    review_date: '',
    checklist: RUBRICS.map(() => emptyEntry()),
    producer_condition: '',
    coordinator_condition: '',
    digital_backup: emptyEntry(),
    dcai_documentation: emptyEntry(),
    dcai_clean: emptyEntry(),
    producer_area_name: '',
    producer_area_position: '',
    rat_name: '',
    rat_position: '',
    coordinator_name: '',
    coordinator_position: '',
    producer_oldest_year: '',
    producer_newest_year: '',
    coordinator_oldest_year: '',
    coordinator_newest_year: '',
    coordinator_signature: '',
  };
}

function reportInput(report: ArchiveReportRecord): ArchiveReportInput {
  return {
    administrative_unit_name: report.administrative_unit_name,
    producing_area_name: report.producing_area_name,
    report_date: report.report_date,
    review_date: report.review_date,
    checklist: Array.from({ length: 5 }, (_, index) => report.checklist[index] ?? emptyEntry()),
    producer_condition: report.producer_condition ?? '',
    coordinator_condition: report.coordinator_condition ?? '',
    digital_backup: report.digital_backup ?? emptyEntry(),
    dcai_documentation: report.dcai_documentation ?? emptyEntry(),
    dcai_clean: report.dcai_clean ?? emptyEntry(),
    producer_area_name: report.producer_area_name ?? report.producer_area_signature ?? '',
    producer_area_position: report.producer_area_position ?? '',
    rat_name: report.rat_name ?? report.rat_signature ?? '',
    rat_position: report.rat_position ?? '',
    producer_oldest_year: report.producer_oldest_year,
    producer_newest_year: report.producer_newest_year,
    coordinator_oldest_year: report.coordinator_oldest_year,
    coordinator_newest_year: report.coordinator_newest_year,
    coordinator_name: report.coordinator_name ?? report.coordinator_signature ?? '',
    coordinator_position: report.coordinator_position ?? '',
  };
}

export function ArchiveReportView({ reports, units, areas, onSave }: ArchiveReportViewProps) {
  const [report, setReport] = useState<ArchiveReportInput | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  function startNewReport() {
    setReport(blankReport(units[0]?.name ?? ''));
    setEditingId(null);
    setError('');
  }

  function updateReport<K extends keyof ArchiveReportInput>(field: K, value: ArchiveReportInput[K]) {
    setReport((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateEntry(index: number, patch: Partial<ArchiveReportChecklistEntry>) {
    setReport((current) =>
      current
        ? {
            ...current,
            checklist: current.checklist.map((entry, entryIndex) =>
              entryIndex === index ? { ...entry, ...patch } : entry
            ),
          }
        : current
    );
  }

  async function saveReport(downloadDocx = false) {
    if (!report || saving) return;
    setSaving(true);
    setError('');
    try {
      const saved = await onSave(report, editingId);
      setEditingId(saved.id);
      if (downloadDocx) await downloadArchiveReportDocx(saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el reporte.');
    } finally {
      setSaving(false);
    }
  }

  if (!report) {
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reportes de archivos de trámite</h2>
            <p className="mt-1 text-sm text-slate-500">Formatos guardados para completar, revisar o imprimir.</p>
          </div>
          <button
            type="button"
            onClick={startNewReport}
            className="inline-flex items-center gap-2 rounded-md bg-blue-800 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-900"
          >
            <FilePlus2 className="h-4 w-4" /> Nuevo reporte
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <FilePlus2 className="mx-auto h-6 w-6 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-800">Aún no hay reportes guardados</p>
            <button type="button" onClick={startNewReport} className="mt-3 text-sm font-medium text-blue-800 hover:underline">
              Llenar el formato
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Unidad administrativa</th>
                  <th className="px-4 py-3 font-semibold">Área productora</th>
                  <th className="px-4 py-3 font-semibold">Fecha de reporte</th>
                  <th className="px-4 py-3 font-semibold">Última actualización</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((savedReport) => (
                  <tr key={savedReport.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{savedReport.administrative_unit_name || 'Sin unidad'}</td>
                    <td className="px-4 py-3 text-slate-700">{savedReport.producing_area_name || 'Sin área'}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{savedReport.report_date || '—'}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-500">{savedReport.updated_at.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setReport(reportInput(savedReport));
                          setEditingId(savedReport.id);
                          setError('');
                        }}
                        className="rounded px-2.5 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-50"
                      >
                        Abrir / imprimir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  const uniqueAreas = Array.from(new Set(areas.map((area) => area.name)));

  return (
    <div className="space-y-3">
      <div className="archive-report-screen-only flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setReport(null);
            setEditingId(null);
            setError('');
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Reportes guardados
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setInstructionsOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <CircleHelp className="h-4 w-4" /> Instrucciones
          </button>
          <button
            type="button"
            onClick={() => void saveReport()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button
            type="button"
            onClick={() => void saveReport(true)}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-blue-800 px-3 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" /> Guardar y descargar DOCX
          </button>
        </div>
      </div>

      {error && <p role="alert" className="archive-report-screen-only rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {instructionsOpen && (
        <div className="archive-report-screen-only fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="archive-instructions-title">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[#7394DB]">Instructivo oficial</p>
                <h2 id="archive-instructions-title" className="mt-1 text-lg font-semibold text-slate-900">Reporte de Archivos de Trámite</h2>
              </div>
              <button type="button" onClick={() => setInstructionsOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar instrucciones">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 px-5 py-5 text-sm text-slate-700">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Objetivo</h3>
                <p className="mt-1">Verificar, diagnosticar y contrastar de manera integral el estado de organización, conservación, digitalización y depuración normativa de los expedientes resguardados por el Área Productora.</p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Datos generales</h3>
                <ul className="mt-2 space-y-2">
                  <li><strong>Unidad Administrativa:</strong> indicar el nombre de la Unidad o Coordinación.</li>
                  <li><strong>Área Productora:</strong> indicar el área que produce los documentos o expedientes.</li>
                  <li><strong>Fechas:</strong> capturar la fecha del reporte y la fecha de revisión por el Área Coordinadora.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Rubro a rubro</h3>
                <ol className="mt-2 list-decimal space-y-2 pl-5">
                  <li>Marcar SI o NO si los expedientes están debidamente integrados e indicar la cantidad.</li>
                  <li>Marcar si cuentan con carátula de identificación debidamente requisitada e indicar la cantidad.</li>
                  <li>Marcar si cuentan con cejilla de identificación en los folders e indicar la cantidad.</li>
                  <li>Marcar si tienen Inventarios Generales debidamente requisitados e indicar cuántos expedientes están registrados.</li>
                  <li>Marcar si lo registrado en los inventarios coincide con los expedientes físicos.</li>
                  <li>Indicar el año más antiguo y más reciente de la documentación integrada.</li>
                  <li>Indicar si las condiciones físicas son Buenas, Regulares, Malas o Pésimas.</li>
                  <li>Indicar si los expedientes cerrados cuentan con respaldo digital o expedientes escaneados.</li>
                  <li>Indicar si existe Documentación de Comprobación Administrativa Inmediata (DCAI) y su cantidad de cajas.</li>
                  <li>Indicar si la DCAI está limpia de material corrosivo: grapas, clips, sujetadocumentos y cubrehojas.</li>
                </ol>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Firmas</h3>
                <p className="mt-1">Capturar nombre, cargo y firma de: el Área Productora, el Responsable de Archivo de Trámite y el revisor adscrito al Área Coordinadora de Archivos.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <section className="archive-report-paper" aria-label="Reporte de archivos de trámite">
          <h1 className="archive-report-title">REPORTE DE ARCHIVOS DE TRÁMITE</h1>

          <table className="archive-report-meta-table">
            <tbody>
              <tr>
                <th>NOMBRE DE LA UNIDAD ADMINISTRATIVA:</th>
                <td>
                  <input
                    aria-label="Nombre de la unidad administrativa"
                    list="archive-report-units"
                    value={report.administrative_unit_name}
                    onChange={(event) => updateReport('administrative_unit_name', event.target.value)}
                    className="archive-report-field"
                  />
                  <datalist id="archive-report-units">
                    {units.map((unit) => <option key={unit.id} value={unit.name} />)}
                  </datalist>
                  <FieldInstructions instructionKey="unit" />
                </td>
              </tr>
              <tr>
                <th>NOMBRE DEL ÁREA PRODUCTORA:</th>
                <td>
                  <input
                    aria-label="Nombre del área productora"
                    list="archive-report-areas"
                    value={report.producing_area_name}
                    onChange={(event) => updateReport('producing_area_name', event.target.value)}
                    className="archive-report-field"
                  />
                  <datalist id="archive-report-areas">
                    {uniqueAreas.map((area) => <option key={area} value={area} />)}
                  </datalist>
                  <FieldInstructions instructionKey="area" />
                </td>
              </tr>
            </tbody>
          </table>

          <table className="archive-report-dates-table">
            <tbody>
              <tr>
                <th>Fecha de reporte Área Productora:</th>
                <td><input aria-label="Fecha de reporte Área Productora" type="date" value={report.report_date} onChange={(event) => updateReport('report_date', event.target.value)} className="archive-report-field" /><FieldInstructions instructionKey="producer_date" /></td>
              </tr>
              <tr>
                <th>Fecha de revisión Área Coordinadora de Archivos:</th>
                <td><input aria-label="Fecha de revisión Área Coordinadora de Archivos" type="date" value={report.review_date} onChange={(event) => updateReport('review_date', event.target.value)} className="archive-report-field" /><FieldInstructions instructionKey="review_date" /></td>
              </tr>
            </tbody>
          </table>

          <table className="archive-report-checklist">
            <colgroup>
              <col className="report-col-number" />
              <col className="report-col-rubric" />
              <col className="report-col-yes" />
              <col className="report-col-no" />
              <col className="report-col-quantity" />
              <col className="report-col-yes" />
              <col className="report-col-no" />
              <col className="report-col-quantity" />
              <col className="report-col-observations" />
            </colgroup>
            <thead>
              <tr className="archive-report-group-head">
                <th colSpan={2}></th>
                <th colSpan={3}>Área Productora</th>
                <th colSpan={4}>Área Coordinadora de Archivos</th>
              </tr>
              <tr className="archive-report-column-head">
                <th>No.</th>
                <th>Rubro Verificado</th>
                <th>SÍ</th>
                <th>NO</th>
                <th>Cantidad</th>
                <th>SÍ</th>
                <th>NO</th>
                <th>Cantidad</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {RUBRICS.map((rubric, index) => {
                const entry = report.checklist[index] ?? emptyEntry();
                return (
                  <tr key={rubric}>
                    <th className="archive-report-row-number">{index + 1}</th>
                    <td className="archive-report-rubric">{rubric}<FieldInstructions instructionKey={`rubric_${index + 1}`} /></td>
                    <td className="archive-report-answer"><label><input aria-label={`Rubro ${index + 1}, Área Productora, Sí`} type="radio" name={`producer-${index}`} checked={entry.producer_yes} onChange={() => updateEntry(index, { producer_yes: true, producer_no: false })} /><span className="archive-report-print-mark">{entry.producer_yes ? 'X' : ''}</span></label></td>
                    <td className="archive-report-answer"><label><input aria-label={`Rubro ${index + 1}, Área Productora, No`} type="radio" name={`producer-${index}`} checked={entry.producer_no} onChange={() => updateEntry(index, { producer_yes: false, producer_no: true })} /><span className="archive-report-print-mark">{entry.producer_no ? 'X' : ''}</span></label></td>
                    <td><input aria-label={`Rubro ${index + 1}, cantidad Área Productora`} inputMode="numeric" value={entry.producer_quantity} onChange={(event) => updateEntry(index, { producer_quantity: event.target.value })} className="archive-report-entry archive-report-quantity" /></td>
                    <td className="archive-report-answer archive-report-coordinator"><label><input aria-label={`Rubro ${index + 1}, Área Coordinadora, Sí`} type="radio" name={`coordinator-${index}`} checked={entry.coordinator_yes} onChange={() => updateEntry(index, { coordinator_yes: true, coordinator_no: false })} /><span className="archive-report-print-mark">{entry.coordinator_yes ? 'X' : ''}</span></label></td>
                    <td className="archive-report-answer archive-report-coordinator"><label><input aria-label={`Rubro ${index + 1}, Área Coordinadora, No`} type="radio" name={`coordinator-${index}`} checked={entry.coordinator_no} onChange={() => updateEntry(index, { coordinator_yes: false, coordinator_no: true })} /><span className="archive-report-print-mark">{entry.coordinator_no ? 'X' : ''}</span></label></td>
                    <td className="archive-report-coordinator"><input aria-label={`Rubro ${index + 1}, cantidad Área Coordinadora`} inputMode="numeric" value={entry.coordinator_quantity} onChange={(event) => updateEntry(index, { coordinator_quantity: event.target.value })} className="archive-report-entry archive-report-quantity" /></td>
                    <td className="archive-report-coordinator"><textarea aria-label={`Rubro ${index + 1}, observaciones`} rows={2} value={entry.observations} onChange={(event) => updateEntry(index, { observations: event.target.value })} className="archive-report-entry archive-report-observation" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <table className="archive-report-years">
            <colgroup>
              <col className="years-col-number" />
              <col className="years-col-description" />
              <col />
              <col />
              <col />
              <col />
              <col className="years-col-observations" />
            </colgroup>
            <tbody>
              <tr>
                <th>6</th>
                <td>Refiera los años que abarca la documentación que se resguarda en el archivo de trámite (fechas extremas)<FieldInstructions instructionKey="rubric_6" /></td>
                <th>Fecha más antigua<br /><select aria-label="Fecha más antigua Área Productora" value={report.producer_oldest_year} onChange={(event) => updateReport('producer_oldest_year', event.target.value)} className="archive-report-entry archive-report-year"><option value="">Seleccionar año</option>{archiveYearOptions().map((year) => <option key={year} value={String(year)}>{year}</option>)}</select></th>
                <th>Fecha más reciente<br /><select aria-label="Fecha más reciente Área Productora" value={report.producer_newest_year} onChange={(event) => updateReport('producer_newest_year', event.target.value)} className="archive-report-entry archive-report-year"><option value="">Seleccionar año</option>{archiveYearOptions().map((year) => <option key={year} value={String(year)}>{year}</option>)}</select></th>
                <th className="archive-report-coordinator">Fecha más antigua<br /><select aria-label="Fecha más antigua Área Coordinadora" value={report.coordinator_oldest_year} onChange={(event) => updateReport('coordinator_oldest_year', event.target.value)} className="archive-report-entry archive-report-year"><option value="">Seleccionar año</option>{archiveYearOptions().map((year) => <option key={year} value={String(year)}>{year}</option>)}</select></th>
                <th className="archive-report-coordinator">Fecha más reciente<br /><select aria-label="Fecha más reciente Área Coordinadora" value={report.coordinator_newest_year} onChange={(event) => updateReport('coordinator_newest_year', event.target.value)} className="archive-report-entry archive-report-year"><option value="">Seleccionar año</option>{archiveYearOptions().map((year) => <option key={year} value={String(year)}>{year}</option>)}</select></th>
                <td className="archive-report-coordinator"></td>
              </tr>
            </tbody>
          </table>

          <table className="archive-report-condition">
            <tbody>
              <tr>
                <th className="archive-report-row-number">7</th>
                <td>¿En qué condiciones se encuentran los documentos?<FieldInstructions instructionKey="rubric_7" /></td>
                <td>
                  <div className="archive-report-condition-grid" aria-label="Condición física Área Productora">
                    {(['Buenas', 'Regulares', 'Malas', 'Pésimas'] as const).map((condition) => (
                      <label key={condition}>
                        <input
                          type="radio"
                          name="producer-condition"
                          checked={report.producer_condition === condition}
                          onChange={() => updateReport('producer_condition', condition)}
                        />
                        <span>{condition}.</span>
                      </label>
                    ))}
                  </div>
                </td>
                <td className="archive-report-coordinator">
                  <div className="archive-report-condition-grid" aria-label="Condición física revisada por el Área Coordinadora">
                    {(['Buenas', 'Regulares', 'Malas', 'Pésimas'] as const).map((condition) => (
                      <label key={condition}>
                        <input
                          type="radio"
                          name="coordinator-condition"
                          checked={report.coordinator_condition === condition}
                          onChange={() => updateReport('coordinator_condition', condition)}
                        />
                        <span>{condition}.</span>
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="archive-report-extended-rubrics">
            <thead>
              <tr>
                <th>No.</th>
                <th>Rubro Verificado</th>
                <th>Área Productora</th>
                <th>Área Coordinadora de Archivos</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>8</th>
                <td>¿Los expedientes cerrados cuentan con respaldo digital? (Expedientes escaneados)<FieldInstructions instructionKey="rubric_8" /></td>
                <td>
                  <label><input type="radio" name="digital-producer" checked={report.digital_backup.producer_yes} onChange={() => updateReport('digital_backup', { ...report.digital_backup, producer_yes: true, producer_no: false })} /> SÍ</label>
                  <label><input type="radio" name="digital-producer" checked={report.digital_backup.producer_no} onChange={() => updateReport('digital_backup', { ...report.digital_backup, producer_yes: false, producer_no: true })} /> NO</label>
                </td>
                <td>
                  <label><input type="radio" name="digital-coordinator" checked={report.digital_backup.coordinator_yes} onChange={() => updateReport('digital_backup', { ...report.digital_backup, coordinator_yes: true, coordinator_no: false })} /> SÍ</label>
                  <label><input type="radio" name="digital-coordinator" checked={report.digital_backup.coordinator_no} onChange={() => updateReport('digital_backup', { ...report.digital_backup, coordinator_yes: false, coordinator_no: true })} /> NO</label>
                  <input aria-label="Observaciones respaldo digital" value={report.digital_backup.observations} onChange={(event) => updateReport('digital_backup', { ...report.digital_backup, observations: event.target.value })} className="archive-report-entry" placeholder="Observaciones" />
                </td>
              </tr>
              <tr>
                <th>9</th>
                <td>¿Cuenta con documentación de comprobación administrativa inmediata (DCAI)?<FieldInstructions instructionKey="rubric_9" /></td>
                <td>
                  <label><input type="radio" name="dcai-producer" checked={report.dcai_documentation.producer_yes} onChange={() => updateReport('dcai_documentation', { ...report.dcai_documentation, producer_yes: true, producer_no: false })} /> SÍ</label>
                  <label><input type="radio" name="dcai-producer" checked={report.dcai_documentation.producer_no} onChange={() => updateReport('dcai_documentation', { ...report.dcai_documentation, producer_yes: false, producer_no: true })} /> NO</label>
                  <input aria-label="Cantidad de cajas DCAI Área Productora" inputMode="numeric" value={report.dcai_documentation.producer_quantity} onChange={(event) => updateReport('dcai_documentation', { ...report.dcai_documentation, producer_quantity: event.target.value })} className="archive-report-entry" placeholder="Cantidad de cajas" />
                </td>
                <td>
                  <label><input type="radio" name="dcai-coordinator" checked={report.dcai_documentation.coordinator_yes} onChange={() => updateReport('dcai_documentation', { ...report.dcai_documentation, coordinator_yes: true, coordinator_no: false })} /> SÍ</label>
                  <label><input type="radio" name="dcai-coordinator" checked={report.dcai_documentation.coordinator_no} onChange={() => updateReport('dcai_documentation', { ...report.dcai_documentation, coordinator_yes: false, coordinator_no: true })} /> NO</label>
                  <input aria-label="Cantidad de cajas DCAI Área Coordinadora" inputMode="numeric" value={report.dcai_documentation.coordinator_quantity} onChange={(event) => updateReport('dcai_documentation', { ...report.dcai_documentation, coordinator_quantity: event.target.value })} className="archive-report-entry" placeholder="Cantidad de cajas" />
                  <input aria-label="Observaciones DCAI" value={report.dcai_documentation.observations} onChange={(event) => updateReport('dcai_documentation', { ...report.dcai_documentation, observations: event.target.value })} className="archive-report-entry" placeholder="Observaciones" />
                </td>
              </tr>
              <tr>
                <th>10</th>
                <td>¿La DCAI se encuentra limpia de material corrosivo?<FieldInstructions instructionKey="rubric_10" /></td>
                <td>
                  <label><input type="radio" name="dcai-clean-producer" checked={report.dcai_clean.producer_yes} onChange={() => updateReport('dcai_clean', { ...report.dcai_clean, producer_yes: true, producer_no: false })} /> SÍ</label>
                  <label><input type="radio" name="dcai-clean-producer" checked={report.dcai_clean.producer_no} onChange={() => updateReport('dcai_clean', { ...report.dcai_clean, producer_yes: false, producer_no: true })} /> NO</label>
                </td>
                <td>
                  <label><input type="radio" name="dcai-clean-coordinator" checked={report.dcai_clean.coordinator_yes} onChange={() => updateReport('dcai_clean', { ...report.dcai_clean, coordinator_yes: true, coordinator_no: false })} /> SÍ</label>
                  <label><input type="radio" name="dcai-clean-coordinator" checked={report.dcai_clean.coordinator_no} onChange={() => updateReport('dcai_clean', { ...report.dcai_clean, coordinator_yes: false, coordinator_no: true })} /> NO</label>
                  <input aria-label="Observaciones DCAI limpia" value={report.dcai_clean.observations} onChange={(event) => updateReport('dcai_clean', { ...report.dcai_clean, observations: event.target.value })} className="archive-report-entry" placeholder="Observaciones" />
                </td>
              </tr>
            </tbody>
          </table>

          <div className="archive-report-signatures">
            <label>
              <input aria-label="Nombre del Área Productora" value={report.producer_area_name} onChange={(event) => updateReport('producer_area_name', event.target.value)} className="archive-report-signature-input" />
              <input aria-label="Cargo del Área Productora" value={report.producer_area_position} onChange={(event) => updateReport('producer_area_position', event.target.value)} className="archive-report-signature-input" />
              <span>Nombre y Cargo<br />Área Productora</span>
              <FieldInstructions instructionKey="producer_area_signature" />
            </label>
            <label>
              <input aria-label="Nombre del Responsable de Archivo de Trámite" value={report.rat_name} onChange={(event) => updateReport('rat_name', event.target.value)} className="archive-report-signature-input" />
              <input aria-label="Cargo del Responsable de Archivo de Trámite" value={report.rat_position} onChange={(event) => updateReport('rat_position', event.target.value)} className="archive-report-signature-input" />
              <span>Nombre y Cargo<br />Responsable de Archivo de Trámite</span>
              <FieldInstructions instructionKey="rat_signature" />
            </label>
            <label>
              <input aria-label="Nombre del Revisor del Área Coordinadora" value={report.coordinator_name} onChange={(event) => updateReport('coordinator_name', event.target.value)} className="archive-report-signature-input" />
              <input aria-label="Cargo del Revisor del Área Coordinadora" value={report.coordinator_position} onChange={(event) => updateReport('coordinator_position', event.target.value)} className="archive-report-signature-input" />
              <span>Nombre y Cargo<br />Revisor Adscrito al Área Coordinadora de Archivos</span>
              <FieldInstructions instructionKey="coordinator_signature" />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}