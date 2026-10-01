import type { ReactNode } from "react";

export function StatusCard({
  title,
  value,
  icon,
  tone = "default",
}: {
  title: string;
  value: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className={`status-card ${tone}`}>
      <div className="status-icon">{icon}</div>
      <div><span>{title}</span><strong>{value}</strong></div>
    </div>
  );
}