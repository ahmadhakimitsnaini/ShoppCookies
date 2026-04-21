import React from 'react';

export const Table = ({ columns, data, className = '' }) => {
  return (
    <div className={`overflow-x-auto w-full bg-white rounded-lg shadow-sm border border-gk-border ${className}`}>
      <table className="w-full text-left text-body text-gk-text-main whitespace-nowrap">
        <thead className="bg-gray-50 border-b border-gk-border text-small font-semibold text-gk-text-muted uppercase tracking-wider">
          <tr>
            {columns.map((col, index) => (
              <th key={index} className="px-6 py-4">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 transition-standard">
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    {col.accessor ? row[col.accessor] : col.cell ? col.cell(row) : null}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-gk-text-muted">
                Tidak ada data.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
