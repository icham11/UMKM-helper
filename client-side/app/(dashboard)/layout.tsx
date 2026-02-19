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
          <aside className="w-72 bg-white flex flex-col justify-between py-8 px-7 shadow-2xl rounded-3xl border border-gray-200">
            <div>
              <div className="mb-5">
                <div className="text-xs font-semibold text-gray-500 mb-2">
                  MENU
                </div>

                <a href="/dashboard" className="block py-2">Dashboard</a>
                <a href="/dashboard/ingredients" className="block py-2">Ingredients</a>
                <a href="/dashboard/recipes" className="block py-2">Recipes</a>
                <a href="/dashboard/ai-analysis" className="block py-2">AI Analysis</a>
              </div>
            </div>

            <div className="mt-8">
              <SidebarUserInfo
                jwtUserName={jwtUserName}
                jwtUserEmail={jwtUserEmail}
              />
              <LogoutButton />
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