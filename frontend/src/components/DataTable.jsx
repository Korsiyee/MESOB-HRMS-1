const DataTable = ({
  columns,
  rows,
  rowKey,
  loading,
  emptyText = "No records found.",
}) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="h-12 animate-pulse rounded-xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table
        className="min-w-full text-[14px] text-slate-700"
        style={{ fontFamily: "Inter, Roboto, 'Segoe UI', sans-serif" }}
      >
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/80"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-4 align-top">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
