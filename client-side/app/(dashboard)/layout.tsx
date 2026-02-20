import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { verifyToken } from "@/lib/auth/jwt"
import prisma from "@/lib/prisma"
import { BusinessProvider } from "@/context/BusinessContext"
import SidebarUserInfo from "@/app/(dashboard)/components/sidebar_user_info"
import LogoutButton from "@/app/(dashboard)/components/LogoutButton"
import AIChatWidget from "./components/ai/AIChatWidget"
import {
  LayoutDashboard,
  BarChart3,
  Bot,
  ShoppingCart,
  History,
  Boxes,
  Soup,
  Settings,
  Building2,
  User,
} from "lucide-react"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 🔐 1. Check NextAuth session
  const session = await getServerSession(authOptions)

  // 🔐 2. Check custom JWT (email/password)
  const token = (await cookies()).get("token")?.value
  const jwtDecoded = token ? verifyToken(token) : null

  if (!session && !jwtDecoded) {
    redirect("/login")
  }

  // 🔎 3. Get userId from either auth system
  let userId: number | null = null

  if (session?.user?.id) {
    userId = Number(session.user.id)
  }

  if (
    !userId &&
    jwtDecoded &&
    typeof jwtDecoded === "object" &&
    "userId" in jwtDecoded
  ) {
    userId = Number((jwtDecoded as { userId: number }).userId)
  }

  if (!userId) {
    redirect("/login")
  }

  // 🔥 4. CHECK BUSINESS (SERVER SIDE)
  const businesses = await prisma.business.findMany({
    where: { userId },
  })

  if (!businesses.length) {
    redirect("/onboarding")
  }

  const jwtUserName =
    jwtDecoded && typeof jwtDecoded === "object" && "name" in jwtDecoded
      ? String((jwtDecoded as { name?: unknown }).name ?? "")
      : undefined

  const jwtUserEmail =
    jwtDecoded && typeof jwtDecoded === "object" && "email" in jwtDecoded
      ? String((jwtDecoded as { email?: unknown }).email ?? "")
      : undefined

  return (
    <BusinessProvider>
      <div className="relative h-screen overflow-hidden bg-linear-to-br from-slate-50 via-indigo-50 to-purple-50">
        <div className="flex h-full relative z-10">
          <aside
            className="w-72 flex flex-col py-8 px-7 shadow-xl rounded-3xl border border-gray-200 mt-6 mb-6 ml-20 min-h-[calc(100vh-3rem)] bg-white relative"
            style={{
              background:
                "linear-gradient(135deg, #f5f7fa 60%, #e0e7ff 100%)",
            }}
          >
            {/* Sidebar Modern Style */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-center gap-3 mb-8">
                <span className="bg-indigo-100 p-3 rounded-xl text-2xl text-indigo-600">
                  <ShoppingCart className="w-7 h-7" />
                </span>
                <span className="font-bold text-lg text-indigo-700 tracking-wide">
                  Code
                </span>
              </div>

              {/* Section: Dashboard */}
              <div className="mb-6">
                <div className="text-xs font-semibold text-gray-400 mb-2">
                  Dashboard
                </div>
                <a
                  href="/dashboard"
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                >
                  <BarChart3 className="w-5 h-5" /> Overview
                </a>
                <a
                  href="/dashboard/analytics"
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition ml-6"
                >
                  <BarChart3 className="w-4 h-4" /> Analytics
                </a>
              </div>

              {/* Section: AI Tools */}
              <div className="mb-6">
                <div className="text-xs font-semibold text-gray-400 mb-2">
                  AI Tools
                </div>
                <a
                  href="/dashboard/ai-analysis"
                  className="flex items-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-purple-700 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 transition"
                >
                  <Bot className="w-5 h-5" /> AI Center
                  <span className="ml-auto text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full font-bold">
                    NEW
                  </span>
                </a>
              </div>

              {/* Section: Sales */}
              <div className="mb-6">
                <div className="text-xs font-semibold text-gray-400 mb-2">
                  Sales
                </div>
                <a
                  href="/pos"
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition"
                >
                  <ShoppingCart className="w-5 h-5" /> POS
                </a>
                <a
                  href="/dashboard/sales-history"
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition ml-6"
                >
                  <History className="w-4 h-4" /> Sales History
                </a>
              </div>

              {/* Section: Inventory */}
              <div className="mb-6">
                <div className="text-xs font-semibold text-gray-400 mb-2">
                  Inventory
                </div>
                <a
                  href="/dashboard/ingredients"
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition"
                >
                  <Boxes className="w-5 h-5" /> Ingredients
                </a>
                <a
                  href="/dashboard/recipes"
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition ml-6"
                >
                  <Soup className="w-4 h-4" /> Recipes
                </a>
              </div>

              {/* Section: Settings */}
              <div className="mb-6">
                <div className="text-xs font-semibold text-gray-400 mb-2">
                  Settings
                </div>
                <a
                  href="/dashboard/business"
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition"
                >
                  <Building2 className="w-5 h-5" /> Business
                </a>
                <a
                  href="/dashboard/profile"
                  className="flex items-center gap-2 py-1.5 px-3 rounded-lg font-medium text-gray-700 hover:bg-blue-50 transition ml-6"
                >
                  <User className="w-4 h-4" /> Profile
                </a>
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="flex flex-col items-center justify-end pt-4 pb-8">
              <SidebarUserInfo
                jwtUserName={jwtUserName}
                jwtUserEmail={jwtUserEmail}
              />
              <div className="w-full mt-4">
                <LogoutButton />
              </div>
            </div>
          </aside>

          <main className="flex-1 px-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto py-6">{children}</div>
          </main>
        </div>

        {/* Floating AI Chat Widget - available on all dashboard pages */}
        <AIChatWidget />
      </div>
    </BusinessProvider>
  )
}