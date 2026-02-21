"use client";

import { DateRangeProvider } from "@/context/DateRangeContext";

export default function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DateRangeProvider>{children}</DateRangeProvider>;
}