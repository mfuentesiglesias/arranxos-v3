import { BottomNav } from "@/components/layout/bottom-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-with-bottom-nav flex-1 min-h-0 flex flex-col bg-ink-900 overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col bg-sand-50 [&>*]:flex-1 [&>*]:min-h-0">
        {children}
      </div>
      <BottomNav variant="admin" />
    </div>
  );
}
