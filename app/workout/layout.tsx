import { Suspense } from "react";
import AuthGate from "@/components/AuthGate";

export default function WorkoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}