"use client";
import LogoutButton from "./LogoutButton";

export default function UserInfoFooter() {
  return (
    <div className="mt-8 text-sm bg-white/90 rounded-2xl p-5 border border-gray-200 flex flex-col items-center shadow-md">
      <p className="text-xs text-gray-500 font-semibold mb-1">
        Logged In
      </p>
      <LogoutButton />
    </div>
  );
}