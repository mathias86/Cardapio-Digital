import { redirect } from "next/navigation";

import { InternalShell } from "@/components/layout/internal-shell";
import { getCurrentInternalProfile } from "@/services/auth";

export default async function InternalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const profile = await getCurrentInternalProfile();

  if (!profile) redirect("/login");

  return <InternalShell profile={profile}>{children}</InternalShell>;
}
