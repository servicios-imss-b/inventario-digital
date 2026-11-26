import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { MovementRecord } from '../types';

interface HistoryViewProps {
  movements: MovementRecord[];
}

export function HistoryView({ movements }: HistoryViewProps) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return movements.filter((m) => {
      if (typeFilter && m.action_type !== typeFilter) return false;
      if (!q) return true;
      return [
        m.folder_uid,
        m.expediente_name,
        m.previous_section_name || '',
        m.new_section_name || '',
        m.notes,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [movements, query, typeFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Historial de Movimientos
        </h1>
        <p className="mt-1 text-sm text-slate-500 tabular-nums">
          Registro cronológico de asignaciones, reubicaciones y retiros ({movements.length} evento(s)).
        </p>
      </div>

      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar por carpeta, ID, sección o nota..."
            className="w-full border-0 border-b border-slate-300 bg-transparent py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border-0 border-b border-slate-300 bg-transparent px-3 py-2 text-xs font-medium text-slate-700 sm:w-52 focus:border-blue-700 focus:outline-none"
        >
          <option value="">Todos los movimientos</option>
          <option value="Asignación">Asignación</option>
          <option value="Reubicación">Reubicación</option>
          <option value="Reordenamiento">Reordenamiento</option>
          <option value="Retiro">Retiro</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No hay movimientos registrados con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Fecha y hora</th>
                  <th className="px-4 py-3 font-semibold">Carpeta</th>
                  <th className="px-4 py-3 font-semibold">Acción</th>
                  <th className="px-4 py-3 font-semibold">Ubicación anterior</th>
                  <th className="px-4 py-3 font-semibold">Nueva ubicación</th>
                  <th className="px-4 py-3 font-semibold">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {new Date(mov.moved_at).toLocaleString('es-MX', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-slate-500">{mov.folder_uid}</span>{' '}
                      <span className="font-medium text-slate-900">· {mov.expediente_name}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {mov.action_type}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {mov.previous_section_name
                        ? `${mov.previous_cabinet_name} · ${mov.previous_section_name} (Pos. ${mov.previous_position})`
                        : 'Sin ubicación'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {mov.new_section_name
                        ? `${mov.new_cabinet_name} · ${mov.new_section_name} (Pos. ${mov.new_position})`
                        : 'Sin ubicación'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{mov.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
