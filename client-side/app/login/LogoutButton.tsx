"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full py-2 rounded-lg bg-red-500 text-white font-bold text-base shadow hover:bg-red-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 mt-4"
    >
      Logout
    </button>
  );
}
