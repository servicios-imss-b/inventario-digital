import React, { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Cabinet, FolderRecord, Section } from '../types';

interface CabinetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  cabinets: Cabinet[];
  sections: Section[];
  folders: FolderRecord[];
  onUpdateSection: (id: number, data: { code: string; name: string; notes: string; width_ratio: number }) => Promise<void>;
  onAddSection: (
    cabinetId: number,
    data: { code: string; name: string; row_index: number; col_index: number; width_ratio: number; notes: string }
  ) => Promise<void>;
  onDeleteSection: (id: number) => Promise<void>;
  onCreateCabinet: (data: {
    code: string;
    name: string;
    description: string;
    material: string;
    columns_count: number;
    rows_count: number;
  }) => Promise<void>;
}

export function CabinetConfigModal({
  isOpen,
  onClose,
  cabinets,
  sections,
  folders,
  onUpdateSection,
  onAddSection,
  onDeleteSection,
  onCreateCabinet,
}: CabinetConfigModalProps) {
  const [selectedCabId, setSelectedCabId] = useState<number>(cabinets[0]?.id ?? 1);
  const [editingSec, setEditingSec] = useState<Section | null>(null);
  const [secCode, setSecCode] = useState('');
  const [secName, setSecName] = useState('');
  const [secNotes, setSecNotes] = useState('');
  const [secRatio, setSecRatio] = useState('50');

  const [showNewCab, setShowNewCab] = useState(false);
  const [cabCode, setCabCode] = useState('');
  const [cabName, setCabName] = useState('');
  const [cabDesc, setCabDesc] = useState('');
  const [cabMaterial, setCabMaterial] = useState('Madera');
  const [cabCols, setCabCols] = useState('2');
  const [cabRows, setCabRows] = useState('3');

  const [showAddSec, setShowAddSec] = useState(false);
  const [newSecCode, setNewSecCode] = useState('');
  const [newSecName, setNewSecName] = useState('');
  const [newSecRow, setNewSecRow] = useState('1');
  const [newSecCol, setNewSecCol] = useState('1');
  const [newSecRatio, setNewSecRatio] = useState('50');
  const [newSecNotes, setNewSecNotes] = useState('');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const activeCab = cabinets.find((c) => c.id === selectedCabId) || cabinets[0];
  const cabSections = activeCab ? sections.filter((s) => s.cabinet_id === activeCab.id) : [];

  function startEditSection(sec: Section) {
    setEditingSec(sec);
    setSecCode(sec.code);
    setSecName(sec.name);
    setSecNotes(sec.notes);
    setSecRatio(String(sec.width_ratio));
    setError('');
  }

  async function saveSectionEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSec) return;
    setBusy(true);
    setError('');
    try {
      await onUpdateSection(editingSec.id, {
        code: secCode.trim(),
        name: secName.trim(),
        notes: secNotes.trim(),
        width_ratio: Number(secRatio) || 50,
      });
      setEditingSec(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar sección.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCab) return;
    setBusy(true);
    setError('');
    try {
      await onAddSection(activeCab.id, {
        code: newSecCode.trim(),
        name: newSecName.trim(),
        row_index: Number(newSecRow) || 1,
        col_index: Number(newSecCol) || 1,
        width_ratio: Number(newSecRatio) || 50,
        notes: newSecNotes.trim(),
      });
      setShowAddSec(false);
      setNewSecCode('');
      setNewSecName('');
      setNewSecNotes('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al agregar sección.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCabinet(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onCreateCabinet({
        code: cabCode.trim(),
        name: cabName.trim(),
        description: cabDesc.trim(),
        material: cabMaterial.trim(),
        columns_count: Number(cabCols) || 2,
        rows_count: Number(cabRows) || 3,
      });
      setShowNewCab(false);
      setCabCode('');
      setCabName('');
      setCabDesc('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al agregar mueble.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteSec(sec: Section) {
    setError('');
    setBusy(true);
    try {
      await onDeleteSection(sec.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la sección.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Configuración del mobiliario físico</h2>
            <p className="text-xs text-slate-500">
              Ajuste nombres, proporciones o agregue secciones y muebles si cambia la organización física.
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

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}

          {/* Cabinet selector + New cabinet */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {cabinets.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCabId(c.id)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeCab?.id === c.id
                      ? 'border-blue-800 bg-blue-800 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {c.code} · {c.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowNewCab((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo mueble
            </button>
          </div>

          {showNewCab && (
            <form onSubmit={handleCreateCabinet} className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Registrar nuevo mueble físico</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  required
                  value={cabCode}
                  onChange={(e) => setCabCode(e.target.value)}
                  placeholder="Código (ej. M2)"
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
                <input
                  type="text"
                  required
                  value={cabName}
                  onChange={(e) => setCabName(e.target.value)}
                  placeholder="Nombre del mueble"
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm sm:col-span-2"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <input
                  type="text"
                  value={cabMaterial}
                  onChange={(e) => setCabMaterial(e.target.value)}
                  placeholder="Material"
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={cabCols}
                  onChange={(e) => setCabCols(e.target.value)}
                  placeholder="Columnas"
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={cabRows}
                  onChange={(e) => setCabRows(e.target.value)}
                  placeholder="Niveles"
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-md bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900"
                >
                  Crear mueble
                </button>
              </div>
            </form>
          )}

          {/* Sections list */}
          {activeCab && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Secciones de {activeCab.name} ({cabSections.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddSec((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar sección
                </button>
              </div>

              {showAddSec && (
                <form onSubmit={handleAddSection} className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <input
                      type="text"
                      required
                      value={newSecCode}
                      onChange={(e) => setNewSecCode(e.target.value)}
                      placeholder="Código (ej. S7)"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    />
                    <input
                      type="text"
                      required
                      value={newSecName}
                      onChange={(e) => setNewSecName(e.target.value)}
                      placeholder="Nombre de la sección"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm sm:col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <input
                      type="number"
                      min={1}
                      value={newSecRow}
                      onChange={(e) => setNewSecRow(e.target.value)}
                      placeholder="Nivel (fila)"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      min={1}
                      value={newSecCol}
                      onChange={(e) => setNewSecCol(e.target.value)}
                      placeholder="Columna"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    />
                    <input
                      type="number"
                      min={20}
                      max={80}
                      value={newSecRatio}
                      onChange={(e) => setNewSecRatio(e.target.value)}
                      placeholder="Ancho %"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-md bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900"
                    >
                      Añadir
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-slate-200 rounded-md border border-slate-200">
                {cabSections.map((sec) => {
                  const count = folders.filter((f) => f.section_id === sec.id).length;
                  const isEditing = editingSec?.id === sec.id;
                  return (
                    <div key={sec.id} className="p-3.5">
                      {isEditing ? (
                        <form onSubmit={saveSectionEdit} className="space-y-3">
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                            <input
                              type="text"
                              required
                              value={secCode}
                              onChange={(e) => setSecCode(e.target.value)}
                              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono"
                            />
                            <input
                              type="text"
                              required
                              value={secName}
                              onChange={(e) => setSecName(e.target.value)}
                              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm sm:col-span-2"
                            />
                            <input
                              type="number"
                              min={20}
                              max={80}
                              value={secRatio}
                              onChange={(e) => setSecRatio(e.target.value)}
                              title="Porcentaje de ancho"
                              className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={secNotes}
                              onChange={(e) => setSecNotes(e.target.value)}
                              placeholder="Notas descriptivas del compartimento"
                              className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingSec(null)}
                              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              disabled={busy}
                              className="rounded-md bg-blue-800 px-3 py-1.5 text-xs font-medium text-white"
                            >
                              Guardar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              <span className="font-mono text-slate-600">{sec.code}</span> · {sec.name}
                            </p>
                            <p className="text-xs text-slate-500 tabular-nums">
                              Nivel {sec.row_index} · Columna {sec.col_index} · Ancho {sec.width_ratio}% · {count} carpeta(s)
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditSection(sec)}
                              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Editar
                            </button>
                            {count === 0 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSec(sec)}
                                disabled={busy}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                                title="Eliminar sección vacía"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
