import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  CircleHelp,
  FileDown,
  FilePlus2,
  Save,
  X,
} from 'lucide-react';
import { downloadArchiveReportDocx } from '../utils/docx';
import { archiveYearOptions } from '../utils/years';
import type {
  AdministrativeUnit,
  ArchiveReportChecklistEntry,
  ArchiveReportInput,
  ArchiveReportRecord,
  ProducingArea,
} from '../types';

interface Props {
  reports: ArchiveReportRecord[];
  units: AdministrativeUnit[];
  areas: ProducingArea[];
  onSave: (input: ArchiveReportInput, id: number | null) => Promise<ArchiveReportRecord>;
}

const STEPS = [
  'Datos generales',
  'Rubro 1 al 5',
  'Fechas y condición',
  'Respaldo y DCAI',
  'Firmas',
];

const RUBRICS = [
  '¿Cuenta con expedientes de archivo debidamente integrados?',
  '¿Los expedientes cuentan con carátula de identificación?',
  '¿Los expedientes cuentan con cejilla de identificación?',
  '¿Cuenta con Inventarios Generales de Archivo de Trámite debidamente requisitados?',
  '¿Lo registrado en los Inventarios Generales de Archivo de Trámite coincide con los expedientes físicos?',
];

const INSTRUCTIONS: Record<string, string> = {
  unit: 'Indicar el nombre de la Unidad Administrativa (Unidad, Coordinación).',
  area: 'Indicar el nombre del área que produce los documentos o expedientes.',
  producerDate: 'Indicar la fecha en que el área realiza el reporte.',
  reviewDate: 'Indicar la fecha en que el Área Coordinadora lleva a cabo la revisión.',
  rubric1: 'Marcar SI o NO si cuenta con expedientes integrados y indicar la cantidad.',
  rubric2: 'Marcar SI o NO si los expedientes cuentan con carátula requisitada y indicar la cantidad.',
  rubric3: 'Marcar SI o NO si cuentan con cejilla de identificación en los folders y indicar la cantidad.',
  rubric4: 'Marcar SI o NO si tienen Inventarios Generales requisitados e indicar expedientes registrados.',
  rubric5: 'Marcar SI o NO si lo registrado coincide con los expedientes físicos integrados.',
  dates: 'Indicar el año más antiguo y el año más reciente de la documentación integrada.',
  condition: 'Marcar las condiciones físicas: Buenas, Regulares, Malas o Pésimas.',
  digital: 'Marcar si los expedientes cerrados cuentan con respaldo digital o expedientes escaneados.',
  dcai: 'Marcar si cuenta con DCAI y, si es afirmativo, indicar la cantidad de cajas.',
  clean: 'Marcar si la DCAI está limpia de grapas, clips, sujetadocumentos y cubrehojas.',
  producerArea: 'Capturar nombre, cargo y firma de la persona del Área Productora que requisitó el formato.',
  rat: 'Capturar nombre, cargo y firma del Responsable de Archivo de Trámite.',
  coordinator: 'Capturar nombre, cargo y firma del revisor adscrito al Área Coordinadora de Archivos.',
};

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

function blankReport(unitName: string): ArchiveReportInput {
  return {
    administrative_unit_name: unitName,
    producing_area_name: '',
    report_date: '',
    review_date: '',
    checklist: RUBRICS.map(() => emptyEntry()),
    producer_oldest_year: '',
    producer_newest_year: '',
    coordinator_oldest_year: '',
    coordinator_newest_year: '',
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
  };
}

function normalizeEntry(entry: ArchiveReportChecklistEntry | null | undefined): ArchiveReportChecklistEntry {
  return { ...emptyEntry(), ...(entry ?? {}) };
}

function reportInput(report: ArchiveReportRecord): ArchiveReportInput {
  return {
    administrative_unit_name: report.administrative_unit_name,
    producing_area_name: report.producing_area_name,
    report_date: report.report_date,
    review_date: report.review_date,
    checklist: Array.from({ length: 5 }, (_, index) => report.checklist[index] ?? emptyEntry()),
    producer_oldest_year: report.producer_oldest_year,
    producer_newest_year: report.producer_newest_year,
    coordinator_oldest_year: report.coordinator_oldest_year,
    coordinator_newest_year: report.coordinator_newest_year,
    producer_condition: report.producer_condition ?? '',
    coordinator_condition: report.coordinator_condition ?? '',
    digital_backup: normalizeEntry(report.digital_backup),
    dcai_documentation: normalizeEntry(report.dcai_documentation),
    dcai_clean: normalizeEntry(report.dcai_clean),
    producer_area_name: report.producer_area_name ?? '',
    producer_area_position: report.producer_area_position ?? '',
    rat_name: report.rat_name ?? '',
    rat_position: report.rat_position ?? '',
    coordinator_name: report.coordinator_name ?? '',
    coordinator_position: report.coordinator_position ?? '',
  };
}

function Instruction({ instructionKey }: { instructionKey: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="archive-wizard-instruction">
      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <CircleHelp className="h-3.5 w-3.5" /> Instrucciones
      </button>
      {open && <span role="tooltip">{INSTRUCTIONS[instructionKey]}</span>}
    </span>
  );
}

export function ArchiveReportWizard({ reports, units, areas, onSave }: Props) {
  const [report, setReport] = useState<ArchiveReportInput | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [generalInstructions, setGeneralInstructions] = useState(false);

  function startNew() {
    setReport(blankReport(units[0]?.name ?? ''));
    setEditingId(null);
    setStep(0);
    setError('');
  }

  function update<K extends keyof ArchiveReportInput>(field: K, value: ArchiveReportInput[K]) {
    setReport((current) => current ? { ...current, [field]: value } : current);
  }

  function updateEntry(index: number, patch: Partial<ArchiveReportChecklistEntry>) {
    setReport((current) => current ? {
      ...current,
      checklist: current.checklist.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry),
    } : current);
  }

  async function save(download = false) {
    if (!report || saving) return;
    setSaving(true);
    setError('');
    const normalizedReport: ArchiveReportInput = {
      ...report,
      checklist: Array.from({ length: 5 }, (_, index) => normalizeEntry(report.checklist[index])),
      digital_backup: normalizeEntry(report.digital_backup),
      dcai_documentation: normalizeEntry(report.dcai_documentation),
      dcai_clean: normalizeEntry(report.dcai_clean),
    };
    try {
      const saved = await onSave(normalizedReport, editingId);
      setEditingId(saved.id);
      if (download) await downloadArchiveReportDocx(normalizedReport);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el reporte.');
    } finally {
      setSaving(false);
    }
  }

  if (!report) {
    return (
      <section className="archive-wizard-list space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reportes de archivos de trámite</h2>
            <p className="mt-1 text-sm text-slate-500">Complete el reporte paso a paso y conserve el formato oficial.</p>
          </div>
          <button type="button" onClick={startNew} className="inline-flex items-center gap-2 rounded-full bg-blue-800 px-4 py-2 text-sm font-medium text-white">
            <FilePlus2 className="h-4 w-4" /> Nuevo reporte
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="border-b border-slate-200 px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-800">Aún no hay reportes guardados</p>
            <button type="button" onClick={startNew} className="mt-3 text-sm font-medium text-blue-800 hover:underline">Llenar el formato</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {reports.map((saved) => (
              <div key={saved.id} className="grid gap-3 px-2 py-4 sm:grid-cols-[1fr_1fr_180px_auto] sm:items-center">
                <div><p className="text-xs text-slate-500">Unidad administrativa</p><p className="text-sm font-semibold">{saved.administrative_unit_name || 'Sin unidad'}</p></div>
                <div><p className="text-xs text-slate-500">Área productora</p><p className="text-sm">{saved.producing_area_name || 'Sin área'}</p></div>
                <div><p className="text-xs text-slate-500">Fecha</p><p className="text-sm tabular-nums">{saved.report_date || '—'}</p></div>
                <button type="button" onClick={() => { setReport(reportInput(saved)); setEditingId(saved.id); setStep(0); setError(''); }} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">Abrir reporte</button>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  const uniqueAreas = Array.from(new Set(areas.map((area) => area.name)));
  const digitalBackup = normalizeEntry(report.digital_backup);
  const dcaiDocumentation = normalizeEntry(report.dcai_documentation);
  const dcaiClean = normalizeEntry(report.dcai_clean);

  return (
    <div className="archive-wizard-shell">
      <div className="archive-wizard-topbar">
        <button type="button" onClick={() => { setReport(null); setEditingId(null); setError(''); }} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
          <ArrowLeft className="h-4 w-4" /> Reportes guardados
        </button>
        <div className="archive-wizard-actions">
          <button type="button" onClick={() => setGeneralInstructions(true)} className="archive-wizard-secondary"><CircleHelp className="h-4 w-4" /> Instructivo completo</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="archive-wizard-secondary"><Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar'}</button>
          <button type="button" onClick={() => void save(true)} disabled={saving} className="archive-wizard-primary"><FileDown className="h-4 w-4" /> Descargar DOCX</button>
        </div>
      </div>

      {generalInstructions && (
        <div className="archive-wizard-modal-backdrop" role="dialog" aria-modal="true">
          <div className="archive-wizard-modal">
            <div className="archive-wizard-modal-head"><div><p>Instructivo oficial</p><h2>Reporte de Archivos de Trámite</h2></div><button type="button" onClick={() => setGeneralInstructions(false)} aria-label="Cerrar"><X className="h-5 w-5" /></button></div>
            <ol>
              <li>Unidad administrativa: indicar el nombre de la Unidad o Coordinación.</li>
              <li>Área productora: indicar el área que produce los documentos o expedientes.</li>
              <li>Fecha del reporte: indicar la fecha en que el área realiza el reporte.</li>
              <li>Rubros 1–5: marcar SI o NO y capturar cantidades u observaciones cuando corresponda.</li>
              <li>Fechas extremas: indicar el año más antiguo y más reciente de la documentación integrada.</li>
              <li>Condiciones: indicar Buenas, Regulares, Malas o Pésimas.</li>
              <li>Respaldos y DCAI: indicar respaldo digital, existencia de DCAI, cajas y limpieza de material corrosivo.</li>
              <li>Firmas: capturar nombre, cargo y firma del Área Productora, RAT y revisor del ACA.</li>
            </ol>
          </div>
        </div>
      )}

      {error && <p className="archive-wizard-error" role="alert">{error}</p>}

      <nav className="archive-wizard-steps" aria-label="Pasos del reporte">
        {STEPS.map((label, index) => (
          <button key={label} type="button" onClick={() => setStep(index)} className={index === step ? 'active' : index < step ? 'done' : ''}>
            <span>{index < step ? <CircleCheck className="h-4 w-4" /> : index + 1}</span>{label}
          </button>
        ))}
      </nav>

      <div className="archive-wizard-content">
        {step === 0 && (
          <section>
            <h2>Datos generales</h2>
            <p>Capture la unidad, el área productora y las fechas de reporte y revisión.</p>
            <div className="archive-wizard-grid">
              <label>Nombre de la Unidad Administrativa <input list="wizard-units" value={report.administrative_unit_name} onChange={(event) => update('administrative_unit_name', event.target.value)} /><Instruction instructionKey="unit" /><datalist id="wizard-units">{units.map((unit) => <option key={unit.id} value={unit.name} />)}</datalist></label>
              <label>Nombre del Área Productora <input list="wizard-areas" value={report.producing_area_name} onChange={(event) => update('producing_area_name', event.target.value)} /><Instruction instructionKey="area" /><datalist id="wizard-areas">{uniqueAreas.map((area) => <option key={area} value={area} />)}</datalist></label>
              <label>Fecha de reporte Área Productora <input type="date" value={report.report_date} onChange={(event) => update('report_date', event.target.value)} /><Instruction instructionKey="producerDate" /></label>
              <label>Fecha de revisión Área Coordinadora <input type="date" value={report.review_date} onChange={(event) => update('review_date', event.target.value)} /><Instruction instructionKey="reviewDate" /></label>
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <h2>Rubros 1 al 5</h2>
            <p>Marque SI o NO y registre cantidad u observaciones cuando corresponda.</p>
            <div className="archive-wizard-rubrics">
              {RUBRICS.map((rubric, index) => {
                const entry = report.checklist[index] ?? emptyEntry();
                return (
                  <article key={rubric}>
                    <div className="archive-wizard-rubric-title"><span>{index + 1}</span><div><h3>{rubric}</h3><Instruction instructionKey={`rubric${index + 1}`} /></div></div>
                    <div className="archive-wizard-rubric-fields">
                      <fieldset><legend>Área Productora</legend><label><input type="radio" checked={entry.producer_yes} onChange={() => updateEntry(index, { producer_yes: true, producer_no: false })} /> SÍ</label><label><input type="radio" checked={entry.producer_no} onChange={() => updateEntry(index, { producer_yes: false, producer_no: true })} /> NO</label><input inputMode="numeric" value={entry.producer_quantity} onChange={(event) => updateEntry(index, { producer_quantity: event.target.value })} placeholder="Cantidad" /></fieldset>
                      <fieldset><legend>Área Coordinadora</legend><label><input type="radio" checked={entry.coordinator_yes} onChange={() => updateEntry(index, { coordinator_yes: true, coordinator_no: false })} /> SÍ</label><label><input type="radio" checked={entry.coordinator_no} onChange={() => updateEntry(index, { coordinator_yes: false, coordinator_no: true })} /> NO</label><input inputMode="numeric" value={entry.coordinator_quantity} onChange={(event) => updateEntry(index, { coordinator_quantity: event.target.value })} placeholder="Cantidad" /><input value={entry.observations} onChange={(event) => updateEntry(index, { observations: event.target.value })} placeholder="Observaciones" /></fieldset>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2>Fechas extremas y condición física</h2>
            <p>Complete el rubro 6 y seleccione la condición física del rubro 7.</p>
            <div className="archive-wizard-grid">
              <label>Fecha más antigua — Área Productora
                <select value={report.producer_oldest_year} onChange={(event) => update('producer_oldest_year', event.target.value)}><option value="">Seleccionar año</option>{archiveYearOptions().map((year) => <option key={year} value={String(year)}>{year}</option>)}</select>
                <Instruction instructionKey="dates" />
              </label>
              <label>Fecha más reciente — Área Productora
                <select value={report.producer_newest_year} onChange={(event) => update('producer_newest_year', event.target.value)}><option value="">Seleccionar año</option>{archiveYearOptions().map((year) => <option key={year} value={String(year)}>{year}</option>)}</select>
              </label>
              <label>Fecha más antigua — Área Coordinadora
                <select value={report.coordinator_oldest_year} onChange={(event) => update('coordinator_oldest_year', event.target.value)}><option value="">Seleccionar año</option>{archiveYearOptions().map((year) => <option key={year} value={String(year)}>{year}</option>)}</select>
              </label>
              <label>Fecha más reciente — Área Coordinadora
                <select value={report.coordinator_newest_year} onChange={(event) => update('coordinator_newest_year', event.target.value)}><option value="">Seleccionar año</option>{archiveYearOptions().map((year) => <option key={year} value={String(year)}>{year}</option>)}</select>
              </label>
            </div>
            <div className="archive-wizard-condition">
              <h3>¿En qué condiciones se encuentran los documentos? <Instruction instructionKey="condition" /></h3>
              <div><fieldset><legend>Área Productora</legend>{(['Buenas', 'Regulares', 'Malas', 'Pésimas'] as const).map((value) => <label key={value}><input type="radio" checked={report.producer_condition === value} onChange={() => update('producer_condition', value)} /> {value}</label>)}</fieldset><fieldset><legend>Área Coordinadora</legend>{(['Buenas', 'Regulares', 'Malas', 'Pésimas'] as const).map((value) => <label key={value}><input type="radio" checked={report.coordinator_condition === value} onChange={() => update('coordinator_condition', value)} /> {value}</label>)}</fieldset></div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h2>Rubros 8 al 10</h2>
            <p>Respaldos digitales, DCAI y limpieza de material corrosivo.</p>
            <div className="archive-wizard-rubrics">
              <article><div className="archive-wizard-rubric-title"><span>8</span><div><h3>¿Los expedientes cerrados cuentan con respaldo digital?</h3><Instruction instructionKey="digital" /></div></div><div className="archive-wizard-rubric-fields"><fieldset><legend>Área Productora</legend><label><input type="radio" checked={digitalBackup.producer_yes} onChange={() => update('digital_backup', { ...digitalBackup, producer_yes: true, producer_no: false })} /> SÍ</label><label><input type="radio" checked={digitalBackup.producer_no} onChange={() => update('digital_backup', { ...digitalBackup, producer_yes: false, producer_no: true })} /> NO</label></fieldset><fieldset><legend>Área Coordinadora</legend><label><input type="radio" checked={digitalBackup.coordinator_yes} onChange={() => update('digital_backup', { ...digitalBackup, coordinator_yes: true, coordinator_no: false })} /> SÍ</label><label><input type="radio" checked={digitalBackup.coordinator_no} onChange={() => update('digital_backup', { ...digitalBackup, coordinator_yes: false, coordinator_no: true })} /> NO</label><input value={digitalBackup.observations} onChange={(event) => update('digital_backup', { ...digitalBackup, observations: event.target.value })} placeholder="Observaciones" /></fieldset></div></article>
              <article><div className="archive-wizard-rubric-title"><span>9</span><div><h3>¿Cuenta con documentación de comprobación administrativa inmediata (DCAI)?</h3><Instruction instructionKey="dcai" /></div></div><div className="archive-wizard-rubric-fields"><fieldset><legend>Área Productora</legend><label><input type="radio" checked={dcaiDocumentation.producer_yes} onChange={() => update('dcai_documentation', { ...dcaiDocumentation, producer_yes: true, producer_no: false })} /> SÍ</label><label><input type="radio" checked={dcaiDocumentation.producer_no} onChange={() => update('dcai_documentation', { ...dcaiDocumentation, producer_yes: false, producer_no: true })} /> NO</label><input inputMode="numeric" value={dcaiDocumentation.producer_quantity} onChange={(event) => update('dcai_documentation', { ...dcaiDocumentation, producer_quantity: event.target.value })} placeholder="Cantidad de cajas" /></fieldset><fieldset><legend>Área Coordinadora</legend><label><input type="radio" checked={dcaiDocumentation.coordinator_yes} onChange={() => update('dcai_documentation', { ...dcaiDocumentation, coordinator_yes: true, coordinator_no: false })} /> SÍ</label><label><input type="radio" checked={dcaiDocumentation.coordinator_no} onChange={() => update('dcai_documentation', { ...dcaiDocumentation, coordinator_yes: false, coordinator_no: true })} /> NO</label><input inputMode="numeric" value={dcaiDocumentation.coordinator_quantity} onChange={(event) => update('dcai_documentation', { ...dcaiDocumentation, coordinator_quantity: event.target.value })} placeholder="Cantidad de cajas" /></fieldset></div></article>
              <article><div className="archive-wizard-rubric-title"><span>10</span><div><h3>¿La DCAI se encuentra limpia de material corrosivo?</h3><Instruction instructionKey="clean" /></div></div><div className="archive-wizard-rubric-fields"><fieldset><legend>Área Productora</legend><label><input type="radio" checked={dcaiClean.producer_yes} onChange={() => update('dcai_clean', { ...dcaiClean, producer_yes: true, producer_no: false })} /> SÍ</label><label><input type="radio" checked={dcaiClean.producer_no} onChange={() => update('dcai_clean', { ...dcaiClean, producer_yes: false, producer_no: true })} /> NO</label></fieldset><fieldset><legend>Área Coordinadora</legend><label><input type="radio" checked={dcaiClean.coordinator_yes} onChange={() => update('dcai_clean', { ...dcaiClean, coordinator_yes: true, coordinator_no: false })} /> SÍ</label><label><input type="radio" checked={dcaiClean.coordinator_no} onChange={() => update('dcai_clean', { ...dcaiClean, coordinator_yes: false, coordinator_no: true })} /> NO</label><input value={dcaiClean.observations} onChange={(event) => update('dcai_clean', { ...dcaiClean, observations: event.target.value })} placeholder="Observaciones" /></fieldset></div></article>
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h2>Firmas</h2>
            <p>Capture nombre y cargo. Las líneas de firma quedan en el formato para firmar de forma manual al imprimir.</p>
            <div className="archive-wizard-grid">
              <label>Nombre — Área Productora <input value={report.producer_area_name} onChange={(event) => update('producer_area_name', event.target.value)} /><Instruction instructionKey="producerArea" /></label>
              <label>Cargo — Área Productora <input value={report.producer_area_position} onChange={(event) => update('producer_area_position', event.target.value)} /></label>
              <label>Nombre — Responsable de Archivo de Trámite <input value={report.rat_name} onChange={(event) => update('rat_name', event.target.value)} /><Instruction instructionKey="rat" /></label>
              <label>Cargo — Responsable de Archivo de Trámite <input value={report.rat_position} onChange={(event) => update('rat_position', event.target.value)} /></label>
              <label>Nombre — Revisor Adscrito al Área Coordinadora <input value={report.coordinator_name} onChange={(event) => update('coordinator_name', event.target.value)} /><Instruction instructionKey="coordinator" /></label>
              <label>Cargo — Revisor Adscrito al Área Coordinadora <input value={report.coordinator_position} onChange={(event) => update('coordinator_position', event.target.value)} /></label>
            </div>
          </section>
        )}

      </div>

      <div className="archive-wizard-footer">
        <button type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft className="h-4 w-4" /> Anterior</button>
        {step < STEPS.length - 1 ? <button type="button" onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}>Siguiente <ArrowRight className="h-4 w-4" /></button> : <button type="button" onClick={() => void save(true)} disabled={saving}><FileDown className="h-4 w-4" /> Guardar y descargar DOCX</button>}
      </div>
    </div>
  );
}
