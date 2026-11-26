import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { FolderRecord } from '../types';

interface DeleteConfirmModalProps {
  folder: FolderRecord | null;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void>;
}

export function DeleteConfirmModal({ folder, onClose, onConfirm }: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!folder) return null;

  async function handleConfirm() {
    if (!folder) return;
    setDeleting(true);
    try {
      await onConfirm(folder.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Eliminar registro de carpeta</h3>
            <p className="mt-1 text-sm text-slate-600">
              ¿Confirma que desea eliminar permanentemente la carpeta{' '}
              <span className="font-semibold text-slate-900">{folder.expediente_name}</span> ({folder.uid}) del inventario?
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Esta acción retirará también su ubicación física e historial asociado.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleConfirm}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
          >
            {deleting ? 'Eliminando...' : 'Sí, eliminar carpeta'}
          </button>
        </div>
      </div>
    </div>
  );
}
