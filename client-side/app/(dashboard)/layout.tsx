import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { verifyToken } from "@/lib/auth/jwt"
import prisma from "@/lib/prisma"
import { BusinessProvider } from "@/context/BusinessContext"
import LogoutButton from "./components/LogoutButton"
import SidebarUserInfo from "@/app/(dashboard)/components/sidebar_user_info"

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
          <aside className="w-72 bg-white flex flex-col justify-between py-8 px-7 shadow-xl rounded-3xl border border-gray-200 mt-6 mb-6 ml-6 min-h-full overflow-y-auto">
            {/* Logo & Title */}
            <div>
              <div className="flex items-center gap-3 mb-8">
                <span className="bg-indigo-100 p-3 rounded-xl text-2xl text-indigo-600">
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#6366f1"/><text x="12" y="16" textAnchor="middle" fontSize="18" fill="#fff" fontFamily="monospace">:)</text></svg>
                </span>
                <span className="font-bold text-lg text-indigo-700 tracking-wide">UMKM Helper</span>
              </div>

              {/* Main Navigation */}
              <div className="mb-7">
                <div className="text-xs font-semibold text-gray-500 mb-2">DASHBOARD</div>
                <a href="/dashboard" className="flex items-center gap-2 py-2 px-3 rounded-xl font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition">
                  <span className="text-xl">🏠</span> Dashboard
                </a>
                <a href="/dashboard/sales-history" className="flex items-center gap-2 py-2 px-3 rounded-xl font-medium text-gray-700 hover:bg-blue-50 transition">
                  <span className="text-xl">📊</span> Sales History
                </a>
                <a href="/dashboard/ingredients" className="flex items-center gap-2 py-2 px-3 rounded-xl font-medium text-gray-700 hover:bg-blue-50 transition">
                  <span className="text-xl">🍎</span> Ingredients
                </a>
                <a href="/dashboard/recipes" className="flex items-center gap-2 py-2 px-3 rounded-xl font-medium text-gray-700 hover:bg-blue-50 transition">
                  <span className="text-xl">📖</span> Recipes
                </a>
                <a href="/dashboard/ai-analysis" className="flex items-center gap-2 py-2 px-3 rounded-xl font-medium text-gray-700 hover:bg-blue-50 transition">
                  <span className="text-xl">🤖</span> AI Analysis
                </a>
              </div>

              {/* Pages Section */}
              <div className="mb-7">
                <div className="text-xs font-semibold text-gray-500 mb-2">PAGES</div>
                <a href="/dashboard/pages" className="flex items-center gap-2 py-2 px-3 rounded-xl font-medium text-red-600 hover:bg-red-50 transition">
                  <span className="text-xl">📄</span> Pages
                </a>
                <a href="/dashboard/applications" className="flex items-center gap-2 py-2 px-3 rounded-xl font-medium text-cyan-600 hover:bg-cyan-50 transition">
                  <span className="text-xl">🧩</span> Applications
                </a>
                <a href="/dashboard/ecommerce" className="flex items-center gap-2 py-2 px-3 rounded-xl font-medium text-green-600 hover:bg-green-50 transition">
                  <span className="text-xl">🛍️</span> Ecommerce
                </a>
                <a href="/dashboard/authentication" className="flex items-center gap-2 py-2 px-3 rounded-xl font-medium text-pink-600 hover:bg-pink-50 transition">
                  <span className="text-xl">🔒</span> Authentication
                </a>
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="mt-8 flex flex-col items-center justify-end">
              <SidebarUserInfo
                jwtUserName={jwtUserName}
                jwtUserEmail={jwtUserEmail}
              />
            </div>
          </aside>

          <main className="flex-1 px-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto py-6">{children}</div>
          </main>
        </div>
      </div>
    </BusinessProvider>
  )
}