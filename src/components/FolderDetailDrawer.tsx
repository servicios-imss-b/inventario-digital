import React from 'react';
import { ArrowRightLeft, Crosshair, Edit3, MapPin, Trash2, X } from 'lucide-react';
import type { FolderRecord, MovementRecord } from '../types';

interface FolderDetailDrawerProps {
  folder: FolderRecord | null;
  movements: MovementRecord[];
  onClose: () => void;
  onLocateInCabinet: (folder: FolderRecord) => void;
  onEdit: (folder: FolderRecord) => void;
  onMove: (folder: FolderRecord) => void;
  onDelete: (folder: FolderRecord) => void;
}

function FieldRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-slate-100 py-2.5 sm:grid-cols-3">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 sm:col-span-2">
        {value !== undefined && value !== null && String(value).trim() !== '' ? (
          value
        ) : (
          <span className="text-slate-400 italic">No especificado</span>
        )}
      </dd>
    </div>
  );
}

export function FolderDetailDrawer({
  folder,
  movements,
  onClose,
  onLocateInCabinet,
  onEdit,
  onMove,
  onDelete,
}: FolderDetailDrawerProps) {
  if (!folder) return null;

  const folderMovements = movements.filter((m) => m.folder_id === folder.id);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div className="flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
              <span>{folder.uid}</span>
              {folder.consecutive_number && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Consecutivo {folder.consecutive_number}</span>
                </>
              )}
              {folder.documentary_year && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{folder.documentary_year}</span>
                </>
              )}
            </div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 leading-snug">
              {folder.expediente_name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Cerrar detalle"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Physical location summary */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">Ubicación física actual</p>
                {folder.section_id ? (
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {folder.cabinet_name} <span aria-hidden="true">→</span> {folder.section_code} · {folder.section_name}{' '}
                    <span aria-hidden="true">→</span>{' '}
                    <span className="font-mono tabular-nums">Posición {folder.position_index}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-medium text-amber-700">Sin ubicación asignada</p>
                )}
              </div>
              {folder.section_id && (
                <button
                  type="button"
                  onClick={() => onLocateInCabinet(folder)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 whitespace-nowrap shrink-0"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  Iluminar en mueble
                </button>
              )}
            </div>
          </div>

          {/* Cover fields */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Datos de la carátula
            </h3>
            <dl>
              <FieldRow label="ID de sistema" value={folder.uid} />
              <FieldRow label="Consecutivo" value={folder.consecutive_number} />
              <FieldRow label="Unidad administrativa" value={folder.administrative_unit_name} />
              <FieldRow label="Área productora" value={folder.producing_area_name} />
              <FieldRow label="Expediente" value={folder.expediente_name} />
              <FieldRow label="Número de expediente" value={folder.expediente_number} />
              <FieldRow label="Año o periodo documental" value={folder.documentary_year} />
              <FieldRow label="Fecha más antigua" value={folder.oldest_date} />
              <FieldRow label="Fecha más reciente" value={folder.newest_date} />
              <FieldRow label="Número de carpeta" value={folder.folder_number} />
              <FieldRow label="Observaciones" value={folder.observations} />
            </dl>
          </div>

          {/* Folder history */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Historial de movimientos ({folderMovements.length})
            </h3>
            {folderMovements.length === 0 ? (
              <p className="text-xs text-slate-500">No se han registrado movimientos para esta carpeta.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {folderMovements.map((mov) => (
                  <li key={mov.id} className="px-3.5 py-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800">{mov.action_type}</span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {new Date(mov.moved_at).toLocaleString('es-MX', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">
                      {mov.previous_section_name
                        ? `${mov.previous_cabinet_name} · ${mov.previous_section_name} (Pos. ${mov.previous_position})`
                        : 'Sin ubicación'}{' '}
                      <span aria-hidden="true">→</span>{' '}
                      {mov.new_section_name
                        ? `${mov.new_cabinet_name} · ${mov.new_section_name} (Pos. ${mov.new_position})`
                        : 'Sin ubicación'}
                    </p>
                    {mov.notes && <p className="mt-0.5 text-slate-500">{mov.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={() => onDelete(folder)}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 whitespace-nowrap shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onMove(folder)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              {folder.section_id ? <ArrowRightLeft className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              {folder.section_id ? 'Cambiar ubicación' : 'Asignar ubicación'}
            </button>
            <button
              type="button"
              onClick={() => onEdit(folder)}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-800 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-900 whitespace-nowrap shrink-0"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Editar ficha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
