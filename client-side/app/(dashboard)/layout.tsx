import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyToken } from "@/lib/auth/jwt";
import prisma from "@/lib/prisma";
import { BusinessProvider } from "@/context/BusinessContext";
import SidebarUserInfo from "@/app/(dashboard)/components/sidebar_user_info";
import SidebarNav from "@/app/(dashboard)/components/SidebarNav";
import AIChatWidgetLoader from "./components/ai/AIChatWidgetLoader";
import MobileNavLoader from "./components/MobileNavLoader";
import { TrendingUp } from "lucide-react";
import DashboardClientLayout from "./DashboardClientLayout";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // 🔐 1. Check NextAuth session
  const session = await getServerSession(authOptions);

  // 🔐 2. Check custom JWT (email/password)
  const token = (await cookies()).get("token")?.value;
  const jwtDecoded = token ? verifyToken(token) : null;

  if (!session && !jwtDecoded) {
    redirect("/login");
  }

  // 🔎 3. Get userId from either auth system
  let userId: number | null = null;

  if (session?.user?.id) {
    userId = Number(session.user.id);
  }

  if (!userId && jwtDecoded && typeof jwtDecoded === "object" && "userId" in jwtDecoded) {
    userId = Number((jwtDecoded as { userId: number }).userId);
  }

  if (!userId) {
    redirect("/login");
  }

  // 🔥 4. CHECK BUSINESS (SERVER SIDE) — owned or member
  const businesses = await prisma.business.findMany({
    where: { userId },
  });

  // If not a business owner, check if they're a staff member
  if (!businesses.length) {
    const membership = await prisma.businessMember.findFirst({
      where: { userId },
      include: { business: true },
    });

    if (!membership) {
      redirect("/onboarding");
    }
    // Staff member — let them through, the RoleContext handles permissions
  }

  const jwtUserName =
    jwtDecoded && typeof jwtDecoded === "object" && "name" in jwtDecoded
      ? String((jwtDecoded as { name?: unknown }).name ?? "")
      : undefined;

  const jwtUserEmail =
    jwtDecoded && typeof jwtDecoded === "object" && "email" in jwtDecoded
      ? String((jwtDecoded as { email?: unknown }).email ?? "")
      : undefined;

  return (
    <BusinessProvider>
      <DashboardClientLayout>
        <div className="relative min-h-screen bg-white">
          <div className="flex h-full relative z-10">
            {/* ═══ Desktop Sidebar — visible from md (768px) ═══ */}
            <aside
              className="hidden md:flex w-60 lg:w-64 xl:w-72 flex-col py-5 px-4 lg:px-5 xl:px-7 shrink-0 border-r border-indigo-100/60 min-h-screen sticky top-0 h-screen overflow-y-auto custom-scrollbar"
              style={{ background: "linear-gradient(180deg, #f8faff 0%, #eef2ff 50%, #e8e0ff 100%)" }}
            >
              {/* Logo */}
              <div className="flex items-center gap-2.5 mb-8 px-1">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/50">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-lg bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent tracking-tight leading-tight">
                    Cuanify
                  </span>
                  <span className="text-[10px] text-indigo-400 font-medium leading-tight">
                    {jwtUserName || "User"}
                  </span>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex-1">
                <SidebarNav />
              </div>

              {/* User Info & Logout */}
              <div className="pt-4 border-t border-indigo-100/60">
                <SidebarUserInfo jwtUserName={jwtUserName} jwtUserEmail={jwtUserEmail} />
              </div>
            </aside>

            {/* ═══ Main Content ═══ */}
            <main className="flex-1 min-w-0 pb-20 md:pb-0">
              <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6">
                {children}
              </div>
            </main>
          </div>

          {/* Floating AI Chat Widget */}
          <AIChatWidgetLoader />

          {/* Mobile bottom nav + drawer — only on mobile (<md) */}
          <MobileNavLoader jwtUserName={jwtUserName} jwtUserEmail={jwtUserEmail} />
        </div>
      </DashboardClientLayout>
    </BusinessProvider>
  );
}