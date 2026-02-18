import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import LogoutButton from "../login/LogoutButton"
import Link from "next/link"

export default async function DashboardLayout({
                                               children,
                                              }: {
  children: React.ReactNode
}) {
    
  const session = await getServerSession(authOptions)

  // SEMENTARA: matikan redirect ke login biar dashboard bisa dibuka tanpa session
  // if (!session) {
  //   redirect("/login")
  // }

  const menuItems = [
    {
      href: "/dashboard",
      icon: "📊",
      label: "Dashboard",
      description: "Overview & Analytics"
    },
    {
      href: "/dashboard/ingredients",
      icon: "🥬",
      label: "Ingredients",
      description: "Manage Inventory"
    },
    {
      href: "/dashboard/recipes",
      icon: "📖",
      label: "Recipes",
      description: "Product Recipes"
    },
    {
      href: "/dashboard/ai-analysis",
      icon: "🤖",
      label: "AI Analysis",
      description: "Image & Data Analysis",
      badge: "NEW"
    },
  ];

  return (
      <div className="relative h-screen overflow-hidden bg-linear-to-br from-slate-50 via-indigo-50 to-purple-50">
        <div className="absolute top-0 left-0 w-full h-72 bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 z-0 blur-[0.5px]" />
        <div className="flex h-full relative z-10">
          <aside
              className="w-72 bg-white flex flex-col justify-between py-8 px-7 shadow-2xl rounded-3xl border border-gray-200 transition-all duration-500 ease-in-out lg:w-64 md:w-60 sm:w-full sm:mx-0 sm:mt-4 sm:mb-4 sm:rounded-2xl overflow-y-auto custom-scroll"
              style={{
                height: "92vh",
                animation: "sidebarFadeIn 0.7s",
                marginLeft: "20px",
                marginRight: "20px",
                marginTop: "24px",
                marginBottom: "24px",
              }}
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-100 rounded-full p-2 shadow-md">
                  <span className="text-2xl font-black text-indigo-600">🏪</span>
                </div>
                <span className="text-lg font-bold tracking-tight text-gray-800">
                {session?.user?.name ?? "UMKM Helper"}
              </span>
              </div>

              {/* Navigation Menu */}
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-50 transition-all duration-200 group relative"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 group-hover:text-indigo-600">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{item.description}</span>
                    </div>
                  </Link>
                ))}
              </nav>

              {/* Feature Info */}
              <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                <div className="flex items-start gap-2">
                  <span className="text-xl">✨</span>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-800">Auto-Cleanup</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Gambar AI terhapus otomatis setelah 1 menit
                    </p>
                  </div>
                </div>
              </div>

              {/* ... existing code ... */}

            </div>

            <div className="mt-8 text-sm bg-white/90 rounded-2xl p-5 border border-gray-200 flex flex-col items-center shadow-md">
              <div className="mb-3 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
                <span className="text-2xl font-bold text-indigo-600">
                  {session?.user?.name?.[0] ?? "U"}
                </span>
                </div>
                <p className="text-xs text-gray-500 font-semibold mb-1">Masuk sebagai</p>
                <p className="font-bold text-gray-800 truncate">
                  {session?.user?.name ?? "-"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {session?.user?.email ?? "-"}
                </p>
              </div>

              {session ? <LogoutButton /> : null}
            </div>
          </aside>

          <main className="flex-1 transition-all duration-500 ease-in-out px-2 md:px-6 lg:px-8 overflow-y-auto custom-scroll">
            <div className="max-w-6xl mx-auto p-6">{children}</div>
          </main>
        </div>
      </div>
  )
}