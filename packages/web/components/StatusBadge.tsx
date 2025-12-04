interface Props {
  status: "PENDING" | "PREPARING" | "READY" | "DONE";
}

const COLORS: Record<Props["status"], string> = {
  PENDING: "bg-neutral-100 text-neutral-600",
  PREPARING: "bg-amber-100 text-amber-700",
  READY: "bg-emerald-100 text-emerald-700",
  DONE: "bg-blue-100 text-blue-700"
};

export function StatusBadge({ status }: Props) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${COLORS[status]}`}>{status}</span>;
}

