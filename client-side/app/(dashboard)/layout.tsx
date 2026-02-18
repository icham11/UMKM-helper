import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth/jwt"
import { redirect } from "next/navigation"
import { BusinessProvider } from "@/context/BusinessContext"
import LogoutButton from "@/components/LogoutButton"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const token = (await cookies()).get("token")?.value

  if (!token) {
    redirect("/login")
  }

  const decoded = verifyToken(token)

  if (!decoded) {
    redirect("/login")
  }

  return (
    <div className="relative h-screen overflow-hidden bg-linear-to-br from-slate-50 via-indigo-50 to-purple-50">
      <div className="absolute top-0 left-0 w-full h-72 bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 z-0 blur-[0.5px]" />

      <div className="flex h-full relative z-10">
        {/* Sidebar */}
        <aside
          className="w-72 bg-white flex flex-col justify-between py-8 px-7 shadow-2xl rounded-3xl border border-gray-200 overflow-y-auto"
          style={{
            height: "92vh",
            margin: "24px 20px",
          }}
        >
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 rounded-full p-2 shadow-md">
                <span className="text-2xl font-black text-indigo-600">🏪</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-800">
                UMKM Helper
              </span>
            </div>

            {/* Main navigation */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-gray-500 mb-2">
                MENU
              </div>

              <a
                href="/dashboard"
                className="flex items-center gap-2 py-2 px-4 rounded-lg bg-indigo-50 text-indigo-700 font-medium mb-2"
              >
                <span>🏠</span>
                <span>Dashboard</span>
              </a>

              <a
                href="/dashboard/ingredients"
                className="flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-indigo-50 text-gray-700 font-medium mb-2"
              >
                <span>🥬</span>
                <span>Ingredients</span>
              </a>

              <a
                href="/dashboard/recipes"
                className="flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-indigo-50 text-gray-700 font-medium mb-2"
              >
                <span>📖</span>
                <span>Recipes</span>
              </a>

              <a
                href="/dashboard/ai-analysis"
                className="flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-indigo-50 text-gray-700 font-medium mb-2"
              >
                <span>🤖</span>
                <span>AI Analysis</span>
              </a>
            </div>
          </div>

          {/* Footer user info placeholder */}
          <div className="mt-8 text-sm bg-white/90 rounded-2xl p-5 border border-gray-200 flex flex-col items-center shadow-md">
            <p className="text-xs text-gray-500 font-semibold mb-1">
              Logged In
            </p>
            <LogoutButton />
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 px-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto py-6">
            <BusinessProvider>{children}</BusinessProvider>
          </div>
        </main>
      </div>
    </div>
  )
}