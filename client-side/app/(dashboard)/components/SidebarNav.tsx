"use client";

import Link from "next/link";
import {
  BarChart3,
  Bot,
  ShoppingCart,
  History,
  Boxes,
  Package,
  Building2,
  User,
  FileDown,
  Users,
  BookOpen,
  Clock,
  Factory,
} from "lucide-react";
import { useRole } from "@/context/RoleContext";

/**
 * Sidebar navigation links that respect RBAC.
 *
 * Owner: sees everything.
 * Cashier: only POS, Sales History, Kasbon (Debts). No analytics, no margin data, no export, no settings.
 */
export default function SidebarNav() {
  const { isOwner, isCashier, userName, loading } = useRole();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-6 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Kasir Mode Banner */}
      {isCashier && (
        <div className="mb-6 p-3 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <span className="text-xs font-bold text-amber-800">MODE KASIR</span>
          </div>
          {userName && <p className="text-[11px] text-amber-700 font-medium truncate pl-4.5">👤 {userName}</p>}
        </div>
      )}
      {/* Section: Dashboard — Owner only */}
      {isOwner && (
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 mb-2">Dashboard</div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
          >
            <BarChart3 className="w-5 h-5" /> Overview
          </Link>
          <Link
            href="/dashboard/analytics"
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition"
          >
            <BarChart3 className="w-4 h-4" /> Analytics
          </Link>
        </div>
      )}

      {/* Section: Analytics — consolidated single page */}
      {isOwner && (
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 mb-2">Analytics</div>
          <Link
            href="/analytics"
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-indigo-700 hover:bg-indigo-50 transition"
          >
            <BarChart3 className="w-4 h-4" /> Analytics
            <span className="ml-auto text-[10px] bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded-full font-bold">
              New
            </span>
          </Link>
        </div>
      )}

      {/* Section: AI Tools — Owner only */}
      {isOwner && (
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 mb-2">AI Tools</div>
          <Link
            href="/dashboard/ai-analysis"
            className="flex items-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-purple-700 bg-linear-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 transition"
          >
            <Bot className="w-5 h-5" /> AI Center

          </Link>
        </div>
      )}

      {/* Section: Sales — All roles */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-gray-400 mb-2">Sales</div>
        <Link
          href="/pos"
          className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition"
        >
          <ShoppingCart className="w-5 h-5" /> POS
        </Link>
        <Link
          href="/dashboard/sales-history"
          className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition"
        >
          <History className="w-4 h-4" /> Sales History
        </Link>
        <Link
          href="/dashboard/debts"
          className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-amber-50 transition"
        >
          <BookOpen className="w-4 h-4" /> Kasbon (Paylater)

        </Link>
        <Link
          href="/dashboard/shift-history"
          className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-emerald-50 transition"
        >
          <Clock className="w-4 h-4" /> Closing (Cashier)
        </Link>
        {isOwner && (
          <Link
            href="/dashboard/export"
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-green-50 transition"
          >
            <FileDown className="w-4 h-4" /> Export Data
          </Link>
        )}
      </div>

      {/* Section: Inventory — Owner only */}
      {isOwner && (
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 mb-2">Inventory</div>
          <Link
            href="/dashboard/products"
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition"
          >
            <Package className="w-5 h-5" /> Products
          </Link>
          <Link
            href="/dashboard/production"
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-emerald-50 transition"
          >
            <Factory className="w-4 h-4" /> Production
          </Link>
          <Link
            href="/dashboard/ingredients"
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition"
          >
            <Boxes className="w-4 h-4" /> Ingredients
          </Link>
        </div>
      )}

      {/* Section: Settings — Owner only */}
      {isOwner && (
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 mb-2">Settings</div>
          <Link
            href="/dashboard/business"
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition"
          >
            <Building2 className="w-5 h-5" /> Business
          </Link>
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition"
          >
            <User className="w-4 h-4" /> Profile
          </Link>
          <Link
            href="/dashboard/staff"
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition"
          >
            <Users className="w-4 h-4" /> Staff Management
          </Link>
        </div>
      )}
    </>
  );
}
