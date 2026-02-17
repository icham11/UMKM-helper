import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import LogoutButton from "../login/LogoutButton"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="relative h-screen overflow-hidden bg-linear-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Blue background full width at the top */}
      <div className="absolute top-0 left-0 w-full h-72 bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 z-0 blur-[0.5px]" />
      <div className="flex h-full relative z-10">
        {/* Sidebar */}
        <aside
          className="w-72 bg-white flex flex-col justify-between py-8 px-7 shadow-2xl rounded-3xl border border-gray-200 transition-all duration-500 ease-in-out lg:w-64 md:w-60 sm:w-full sm:mx-0 sm:mt-4 sm:mb-4 sm:rounded-2xl overflow-y-auto custom-scroll"
          style={{
            height: '92vh',
            animation: 'sidebarFadeIn 0.7s',
            marginLeft: '20px',
            marginRight: '20px',
            marginTop: '24px',
            marginBottom: '24px'
          }}
        >
          <div>
            {/* Branding */}
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 rounded-full p-2 shadow-md">
                <span className="text-2xl font-black text-indigo-600">🏪</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-800">
                {session.user?.name || "UMKM Helper"}
              </span>
            </div>

            {/* Main navigation */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-gray-500 mb-2">MENU</div>
              <a href="/dashboard" className="flex items-center gap-2 py-2 px-4 rounded-lg bg-indigo-50 text-indigo-700 font-medium mb-2">
                <span>🏠</span>
                <span>Dashboard</span>
              </a>
            </div>

            {/* Pages section */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-gray-500 mb-2">PAGES</div>
              <a href="/dashboard/products" className="flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-indigo-50 text-gray-700 font-medium mb-2">
                <span>📦</span>
                <span>Produk</span>
              </a>
              <a href="/dashboard/sales" className="flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-indigo-50 text-gray-700 font-medium mb-2">
                <span>💸</span>
                <span>Penjualan</span>
              </a>
            </div>

            {/* Docs section */}
            <div className="mb-5">
              <div className="text-xs font-semibold text-gray-500 mb-2">DOCS</div>
              <a href="#" className="flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-indigo-50 text-gray-700 font-medium mb-2">
                <span>🚀</span>
                <span>Basic</span>
              </a>
              <a href="#" className="flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-indigo-50 text-gray-700 font-medium mb-2">
                <span>🧩</span>
                <span>Components</span>
              </a>
              <a href="#" className="flex items-center gap-2 py-2 px-4 rounded-lg hover:bg-indigo-50 text-gray-700 font-medium mb-2">
                <span>📄</span>
                <span>Changelog</span>
              </a>
            </div>
          </div>

          {/* User info & logout */}
          <div className="mt-8 text-sm bg-white/90 rounded-2xl p-5 border border-gray-200 flex flex-col items-center shadow-md">
            <div className="mb-3 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
                <span className="text-2xl font-bold text-indigo-600">
                  {session.user?.name?.[0] || 'U'}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-semibold mb-1">Masuk sebagai</p>
              <p className="font-bold text-gray-800 truncate">{session.user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
            </div>
            <LogoutButton />
          </div>
        </aside>

        <main className="flex-1 transition-all duration-500 ease-in-out px-2 md:px-6 lg:px-8 overflow-y-auto custom-scroll">
          <div className="max-w-6xl mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}