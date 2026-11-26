import React, { useState } from 'react';
import { Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import type { ExcelImportRow } from '../api';
import { downloadExcelTemplate, parseExcelFile } from '../utils/excel';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportConfirm: (rows: ExcelImportRow[]) => Promise<number>;
}

export function ExcelImportModal({ isOpen, onClose, onImportConfirm }: ExcelImportModalProps) {
  const [rows, setRows] = useState<ExcelImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setFileName(file.name);
    try {
      const parsed = await parseExcelFile(file);
      if (parsed.length === 0) {
        setError('No se encontraron filas con "Nombre del Expediente" válido en el archivo.');
        setRows([]);
        return;
      }
      setRows(parsed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo Excel.');
      setRows([]);
    }
  }

  async function handleConfirm() {
    if (rows.length === 0) return;
    setImporting(true);
    setError('');
    try {
      await onImportConfirm(rows);
      setRows([]);
      setFileName('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al importar las carpetas.');
    } finally {
      setImporting(false);
    }
  }

  function handleResetAndClose() {
    setRows([]);
    setFileName('');
    setError('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Importar inventario desde Excel</h2>
            <p className="text-xs text-slate-500">
              Cargue un archivo .xlsx, .xls o .csv con los datos de las carátulas.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-emerald-700 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900">Plantilla oficial de columnas</p>
                <p className="text-xs text-slate-500">
                  Incluye Consecutivo, Unidad, Área, Expediente, Año, Fechas extremas, Carpeta y Sección (S1–S6).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              Descargar plantilla .xlsx
            </button>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white px-6 py-8 text-center transition-colors hover:border-blue-600 hover:bg-blue-50/30">
            <Upload className="h-7 w-7 text-slate-400" />
            <span className="mt-2 text-sm font-medium text-slate-800">
              {fileName ? `Archivo seleccionado: ${fileName}` : 'Seleccione un archivo Excel (.xlsx, .xls, .csv)'}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Solo se registrarán los campos existentes; las celdas vacías se respetarán sin alterar.
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {rows.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Vista previa de carpetas detectadas ({rows.length})
                </h3>
                <span className="text-xs text-slate-500">Mostrando hasta las primeras 50 filas</span>
              </div>
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Consec.</th>
                      <th className="px-3 py-2 font-medium">Expediente</th>
                      <th className="px-3 py-2 font-medium">Unidad Adm.</th>
                      <th className="px-3 py-2 font-medium">Año</th>
                      <th className="px-3 py-2 font-medium">Sección</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono tabular-nums text-slate-600">
                          {r.consecutive_number || '—'}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-900">{r.expediente_name}</td>
                        <td className="px-3 py-2 text-slate-600">{r.administrative_unit_name || '—'}</td>
                        <td className="px-3 py-2 font-mono tabular-nums text-slate-600">
                          {r.documentary_year || '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600">{r.section_ref || 'Sin ubicación'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={handleResetAndClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={rows.length === 0 || importing}
            onClick={handleConfirm}
            className="rounded-md bg-blue-800 px-5 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-50"
          >
            {importing ? 'Importando...' : `Importar ${rows.length} carpeta(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
