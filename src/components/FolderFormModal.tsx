import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type {
  AdministrativeUnit,
  Cabinet,
  FolderInput,
  FolderRecord,
  ProducingArea,
  Section,
  SpineColor,
} from '../types';

interface FolderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FolderInput) => Promise<void>;
  editingFolder: FolderRecord | null;
  defaultSectionId?: number | null;
  cabinets: Cabinet[];
  sections: Section[];
  units: AdministrativeUnit[];
  areas: ProducingArea[];
}

const SPINE_OPTIONS: Array<{ value: SpineColor; label: string; swatch: string }> = [
  { value: 'blanco', label: 'Blanco', swatch: 'bg-white border-slate-300' },
  { value: 'gris', label: 'Gris', swatch: 'bg-slate-300 border-slate-400' },
  { value: 'azul', label: 'Azul', swatch: 'bg-sky-400 border-sky-500' },
  { value: 'naranja', label: 'Naranja', swatch: 'bg-orange-400 border-orange-500' },
  { value: 'oscuro', label: 'Oscuro', swatch: 'bg-slate-700 border-slate-800' },
];

export function FolderFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingFolder,
  defaultSectionId = null,
  cabinets,
  sections,
  units,
  areas,
}: FolderFormModalProps) {
  const [consecutiveNumber, setConsecutiveNumber] = useState('');
  const [unitName, setUnitName] = useState('');
  const [areaName, setAreaName] = useState('');
  const [expedienteName, setExpedienteName] = useState('');
  const [expedienteNumber, setExpedienteNumber] = useState('');
  const [documentaryYear, setDocumentaryYear] = useState('');
  const [oldestDate, setOldestDate] = useState('');
  const [newestDate, setNewestDate] = useState('');
  const [folderNumber, setFolderNumber] = useState('');
  const [observations, setObservations] = useState('');
  const [spineColor, setSpineColor] = useState<SpineColor>('blanco');
  const [sectionId, setSectionId] = useState<string>('');
  const [positionIndex, setPositionIndex] = useState<string>('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (editingFolder) {
      setConsecutiveNumber(editingFolder.consecutive_number || '');
      setUnitName(editingFolder.administrative_unit_name || '');
      setAreaName(editingFolder.producing_area_name || '');
      setExpedienteName(editingFolder.expediente_name || '');
      setExpedienteNumber(editingFolder.expediente_number || '');
      setDocumentaryYear(editingFolder.documentary_year || '');
      setOldestDate(editingFolder.oldest_date || '');
      setNewestDate(editingFolder.newest_date || '');
      setFolderNumber(editingFolder.folder_number || '');
      setObservations(editingFolder.observations || '');
      setSpineColor(editingFolder.spine_color || 'blanco');
      setSectionId(editingFolder.section_id ? String(editingFolder.section_id) : '');
      setPositionIndex(editingFolder.position_index ? String(editingFolder.position_index) : '');
    } else {
      setConsecutiveNumber('');
      setUnitName('');
      setAreaName('');
      setExpedienteName('');
      setExpedienteNumber('');
      setDocumentaryYear('');
      setOldestDate('');
      setNewestDate('');
      setFolderNumber('');
      setObservations('');
      setSpineColor('blanco');
      setSectionId(defaultSectionId ? String(defaultSectionId) : '');
      setPositionIndex('');
    }
  }, [isOpen, editingFolder, defaultSectionId]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!expedienteName.trim()) {
      setError('El nombre o descripción del expediente es obligatorio.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const parsedSection = sectionId ? Number(sectionId) : null;
      const parsedPos = parsedSection && positionIndex ? Number(positionIndex) : null;
      await onSubmit({
        consecutive_number: consecutiveNumber.trim(),
        administrative_unit_name: unitName.trim(),
        producing_area_name: areaName.trim(),
        expediente_name: expedienteName.trim(),
        expediente_number: expedienteNumber.trim(),
        documentary_year: documentaryYear.trim(),
        oldest_date: oldestDate.trim(),
        newest_date: newestDate.trim(),
        folder_number: folderNumber.trim(),
        observations: observations.trim(),
        spine_color: spineColor,
        section_id: parsedSection,
        position_index: parsedPos && Number.isInteger(parsedPos) && parsedPos > 0 ? parsedPos : null,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la carpeta.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 id="folder-modal-title" className="text-lg font-semibold text-slate-900">
              {editingFolder ? `Editar carpeta · ${editingFolder.uid}` : 'Registrar nueva carpeta'}
            </h2>
            <p className="text-xs text-slate-500">
              Capture únicamente la información visible en la carátula. Deje en blanco los campos sin dato.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700"
            aria-label="Cerrar formulario"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                No. de identificación o consecutivo
              </label>
              <input
                type="text"
                value={consecutiveNumber}
                onChange={(e) => setConsecutiveNumber(e.target.value)}
                placeholder="Ej. 001, PAT-01"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nombre o descripción del expediente <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={expedienteName}
                onChange={(e) => setExpedienteName(e.target.value)}
                placeholder="Tal como aparece en la carátula o lomo"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nombre de la unidad administrativa
              </label>
              <input
                type="text"
                list="units-datalist"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="Ej. Coordinación de Planeación Estratégica"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
              <datalist id="units-datalist">
                {units.map((u) => (
                  <option key={u.id} value={u.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nombre del área productora
              </label>
              <input
                type="text"
                list="areas-datalist"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="Opcional si figura en la carátula"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
              <datalist id="areas-datalist">
                {areas.map((a) => (
                  <option key={a.id} value={a.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Número de expediente
              </label>
              <input
                type="text"
                value={expedienteNumber}
                onChange={(e) => setExpedienteNumber(e.target.value)}
                placeholder="Cuando exista"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Año o periodo documental
              </label>
              <input
                type="text"
                value={documentaryYear}
                onChange={(e) => setDocumentaryYear(e.target.value)}
                placeholder="Ej. 2025 o 2020-2024"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Número de carpeta
              </label>
              <input
                type="text"
                value={folderNumber}
                onChange={(e) => setFolderNumber(e.target.value)}
                placeholder="Cuando exista (ej. 1 de 2)"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Fecha más antigua
              </label>
              <input
                type="text"
                value={oldestDate}
                onChange={(e) => setOldestDate(e.target.value)}
                placeholder="Ej. 15/01/2024 o Enero 2024"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Fecha más reciente
              </label>
              <input
                type="text"
                value={newestDate}
                onChange={(e) => setNewestDate(e.target.value)}
                placeholder="Ej. 20/12/2025 o Diciembre 2025"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Ubicación física en mobiliario y apariencia del lomo
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Mueble y sección
                </label>
                <select
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                >
                  <option value="">Sin ubicación asignada</option>
                  {cabinets.map((cab) => (
                    <optgroup key={cab.id} label={`${cab.code} · ${cab.name}`}>
                      {sections
                        .filter((s) => s.cabinet_id === cab.id)
                        .map((sec) => (
                          <option key={sec.id} value={String(sec.id)}>
                            {sec.code} · {sec.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Posición en sección
                </label>
                <input
                  type="number"
                  min={1}
                  disabled={!sectionId}
                  value={positionIndex}
                  onChange={(e) => setPositionIndex(e.target.value)}
                  placeholder="Automática (al final)"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Color físico del lomo (para identificación visual en el mueble)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {SPINE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSpineColor(opt.value)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      spineColor === opt.value
                        ? 'border-blue-700 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-sm border ${opt.swatch}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Observaciones
            </label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Anotaciones visibles en la carátula o estado físico de la carpeta"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-800 px-5 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {saving ? 'Guardando...' : editingFolder ? 'Guardar cambios' : 'Registrar carpeta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
