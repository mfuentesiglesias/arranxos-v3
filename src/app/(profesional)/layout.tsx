"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";
import { useSession } from "@/lib/store";

export default function ProLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = useSession((s) => s.role);
  const proStatus = useSession((s) => s.proStatus);

  useEffect(() => {
    if (role !== "professional") return;
    if (proStatus === "pending") {
      router.replace("/profesional/pendiente");
      return;
    }
    if (proStatus === "blocked") {
      router.replace("/profesional/bloqueado");
    }
  }, [pathname, proStatus, role, router]);

  if (role === "professional" && (proStatus === "pending" || proStatus === "blocked")) {
    return null;
  }

  return (
    <div className="app-with-bottom-nav flex-1 min-h-0 flex flex-col bg-sand-50 overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col [&>*]:flex-1 [&>*]:min-h-0">{children}</div>
      <BottomNav variant="pro" />
    </div>
  );
}
