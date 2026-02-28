/**
 * lib/risk/flags.ts — Risk flag definitions for participant safety.
 *
 * Each flag has a unique key, severity weight, and human-readable label.
 * Weights are summed by the scorer to produce a composite risk score.
 * Add new flags here as the care coordination rules expand.
 */

export interface RiskFlag {
  key: string;
  label: string;
  weight: number;
  category: "safety" | "compliance" | "service_gap";
}

export const RISK_FLAGS: RiskFlag[] = [
  // Safety flags
  { key: "no_active_provider", label: "No active provider assigned", weight: 30, category: "safety" },
  { key: "transport_gap", label: "Transport gap in upcoming bookings", weight: 20, category: "service_gap" },
  { key: "plan_expiring_soon", label: "NDIS plan expiring within 30 days", weight: 25, category: "compliance" },
  { key: "missed_bookings", label: "3+ missed bookings in past 30 days", weight: 35, category: "safety" },
  { key: "provider_compliance_lapse", label: "Provider compliance check overdue", weight: 15, category: "compliance" },
];
