export default function ProtectedLoading() {
  return <main className="route-skeleton" role="status" aria-label="Memuat halaman"><div className="skeleton-block skeleton-title"/><div className="skeleton-block skeleton-subtitle"/><div className="skeleton-stat-grid">{Array.from({ length: 4 }, (_, index) => <div className="skeleton-block skeleton-stat" key={index}/>)}</div><div className="skeleton-block skeleton-panel"/></main>;
}
