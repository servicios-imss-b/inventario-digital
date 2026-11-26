import React, { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { Cabinet, FolderRecord, Section } from '../types';

interface MoveLocationModalProps {
  folder: FolderRecord | null;
  cabinets: Cabinet[];
  sections: Section[];
  folders: FolderRecord[];
  onClose: () => void;
  onConfirm: (params: {
    folder_id: number;
    target_section_id: number | null;
    target_position: number | null;
    notes: string;
  }) => Promise<void>;
}

export function MoveLocationModal({
  folder,
  cabinets,
  sections,
  folders,
  onClose,
  onConfirm,
}: MoveLocationModalProps) {
  const [targetSectionId, setTargetSectionId] = useState<string>('');
  const [targetPosition, setTargetPosition] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!folder) return;
    setTargetSectionId(folder.section_id ? String(folder.section_id) : '');
    setTargetPosition('');
    setNotes('');
    setError('');
  }, [folder]);

  if (!folder) return null;

  const selectedSecNum = targetSectionId ? Number(targetSectionId) : null;
  const targetSection = selectedSecNum ? sections.find((s) => s.id === selectedSecNum) : null;
  const targetCabinet = targetSection ? cabinets.find((c) => c.id === targetSection.cabinet_id) : null;
  const foldersInTarget = selectedSecNum
    ? folders.filter((f) => f.section_id === selectedSecNum && f.id !== folder.id)
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!folder) return;
    setSaving(true);
    setError('');
    try {
      const posNum = selectedSecNum && targetPosition ? Number(targetPosition) : null;
      await onConfirm({
        folder_id: folder.id,
        target_section_id: selectedSecNum,
        target_position: posNum && Number.isInteger(posNum) && posNum > 0 ? posNum : null,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al mover carpeta.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Cambiar ubicación física</h2>
            <p className="text-xs text-slate-500">
              {folder.uid} · {folder.expediente_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}

          {/* Before -> After summary */}
          <div className="grid grid-cols-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-11">
            <div className="sm:col-span-5">
              <span className="block text-slate-500">Ubicación actual</span>
              <span className="mt-0.5 block font-medium text-slate-900">
                {folder.section_id
                  ? `${folder.cabinet_code} · ${folder.section_code} · Pos. ${folder.position_index}`
                  : 'Sin ubicación asignada'}
              </span>
            </div>
            <div className="flex justify-center sm:col-span-1">
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
            <div className="sm:col-span-5">
              <span className="block text-slate-500">Nueva ubicación</span>
              <span className="mt-0.5 block font-semibold text-blue-800">
                {targetSection && targetCabinet
                  ? `${targetCabinet.code} · ${targetSection.code} · Pos. ${targetPosition || foldersInTarget.length + 1}`
                  : 'Sin ubicación (retirar)'}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Seleccionar nueva sección del mobiliario
            </label>
            <select
              value={targetSectionId}
              onChange={(e) => setTargetSectionId(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              <option value="">Retirar del mueble (Sin ubicación asignada)</option>
              {cabinets.map((cab) => (
                <optgroup key={cab.id} label={`${cab.code} · ${cab.name}`}>
                  {sections
                    .filter((s) => s.cabinet_id === cab.id)
                    .map((sec) => {
                      const count = folders.filter((f) => f.section_id === sec.id).length;
                      return (
                        <option key={sec.id} value={String(sec.id)}>
                          {sec.code} · {sec.name} ({count} carpetas)
                        </option>
                      );
                    })}
                </optgroup>
              ))}
            </select>
          </div>

          {selectedSecNum !== null && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Posición dentro de la sección (1 a {foldersInTarget.length + 1})
              </label>
              <input
                type="number"
                min={1}
                max={foldersInTarget.length + 1}
                value={targetPosition}
                onChange={(e) => setTargetPosition(e.target.value)}
                placeholder={`Al final (Posición ${foldersInTarget.length + 1})`}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Motivo o nota del movimiento (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Reorganización anual por año documental"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-60"
            >
              {saving ? 'Moviendo...' : 'Confirmar movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
