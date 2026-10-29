export type ProductionStatusTone = "pending" | "progress" | "done";

export function getProductionStatus(completed: number, target: number): ProductionStatusTone {
  if (completed <= 0) return "pending";
  if (target > 0 && completed >= target) return "done";
  return "progress";
}

export function getProductionProgress(completed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / target) * 100)));
}

export function getProductionStatusLabel(completed: number, target: number): string {
  const status = getProductionStatus(completed, target);
  return status === "pending" ? "Belum Dimulai" : status === "progress" ? "On Progress" : "Selesai";
}
