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
import { ShoppingCart } from "lucide-react";
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
        <div className="relative min-h-screen bg-linear-to-br from-slate-50 via-indigo-50 to-purple-50">
          <div className="flex flex-col md:flex-row h-full relative z-10">
            <aside
              className="w-full md:w-72 flex flex-col py-6 px-4 md:px-7 shadow-xl rounded-3xl border border-gray-200 mt-4 md:mt-6 mb-4 md:mb-6 mx-0 md:ml-20 min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-3rem)] bg-white relative md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:overflow-y-auto custom-scrollbar"
              style={{ background: "linear-gradient(135deg, #f5f7fa 60%, #e0e7ff 100%)" }}
            >
              {/* Sidebar Modern Style */}
              <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                  <span className="bg-indigo-100 p-3 rounded-xl text-2xl text-indigo-600">
                    <ShoppingCart className="w-7 h-7" />
                  </span>
                  <span className="font-bold text-lg text-indigo-700 tracking-wide">{jwtUserName || "User"}</span>
                </div>
              {/* ...existing sidebar sections — now RBAC-aware... */}
                <SidebarNav />
              </div>
              {/* User Info & Logout */}
              <div className="flex flex-col items-center justify-end pt-4 pb-8">
                <SidebarUserInfo jwtUserName={jwtUserName} jwtUserEmail={jwtUserEmail} />
              </div>
            </aside>
            <main className="flex-1 px-2 md:px-6 overflow-y-auto">
              <div className="max-w-6xl mx-auto py-6">{children}</div>
            </main>
          </div>
          {/* Floating AI Chat Widget - available on all dashboard pages */}
          <AIChatWidgetLoader />
        </div>
      </DashboardClientLayout>
    </BusinessProvider>
  );
}