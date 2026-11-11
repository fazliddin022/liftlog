import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-config";

export default async function AuthGate({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await auth();
  if (!session) redirect("/login");
  return <>{children}</>;
}