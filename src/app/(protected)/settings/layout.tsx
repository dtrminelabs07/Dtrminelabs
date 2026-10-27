import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function SettingsAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return children;
}
