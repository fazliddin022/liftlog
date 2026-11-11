import { Suspense } from "react";
import AuthGate from "@/components/AuthGate";
import AppNav from "@/components/AppNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Suspense fallback={null}>
        <AppNav />
      </Suspense>
      <main className="md:pl-60 pb-28 md:pb-10">
        <div className="max-w-3xl mx-auto px-4 pt-6 md:pt-10">
          <Suspense fallback={<div className="py-20 text-center text-gray-400">Loading...</div>}>
            <AuthGate>{children}</AuthGate>
          </Suspense>
        </div>
      </main>
    </div>
  );
}