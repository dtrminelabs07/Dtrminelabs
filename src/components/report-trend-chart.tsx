type StatusCounts = { COMPLETED: number; PENDING: number; UPLOADED: number; LIMIT: number; OUT_OF_STOCK: number; HOLIDAY: number };
type Point = { key: string } & StatusCounts;

const totalStatuses: Array<keyof StatusCounts> = ["COMPLETED", "PENDING", "UPLOADED", "LIMIT", "OUT_OF_STOCK", "HOLIDAY"];

export default function ReportTrendChart({ data, onSelect }: { data: Point[]; onSelect: (key: string) => void }) {
  if (data.length === 0) return null;
  const totals = data.map(row => totalStatuses.reduce((sum, status) => sum + row[status], 0));
  const max = Math.max(1, ...totals);
  const coords = data.map((row, index) => {
    const x = data.length === 1 ? 350 : 28 + index * (644 / (data.length - 1));
    return { row, total: totals[index], x, yTotal: 91 - totals[index] / max * 70, yDone: 91 - row.COMPLETED / max * 70 };
  });
  const totalLine = coords.map(point => `${point.x.toFixed(1)},${point.yTotal.toFixed(1)}`).join(" ");
  const doneLine = coords.map(point => `${point.x.toFixed(1)},${point.yDone.toFixed(1)}`).join(" ");
  const area = `M ${coords[0].x.toFixed(1)} 98 L ${coords.map(point => `${point.x.toFixed(1)} ${point.yTotal.toFixed(1)}`).join(" L ")} L ${coords.at(-1)!.x.toFixed(1)} 98 Z`;
  return <div className="report-line-wrap"><div className="report-line-legend"><span className="line-total-key">Semua aktivitas</span><span className="line-completed-key">Selesai</span></div><svg className="report-line-chart" viewBox="0 0 700 108" role="img" aria-label="Tren total aktivitas dan status selesai; pilih titik untuk membuka periode"><path className="report-line-area" d={area} /><polyline className="report-line-total" points={totalLine} /><polyline className="report-line-completed" points={doneLine} />{coords.map(({ row, total, x, yTotal }) => <circle key={row.key} cx={x} cy={yTotal} r="4" tabIndex={0} role="button" aria-label={`${row.key}: ${total} aktivitas; ${row.COMPLETED} selesai`} onClick={() => onSelect(row.key)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(row.key); } }}><title>{row.key}: {total} aktivitas; {row.COMPLETED} selesai</title></circle>)}</svg></div>;
}
