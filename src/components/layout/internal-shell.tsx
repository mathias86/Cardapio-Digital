import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Brand } from "@/components/layout/brand";
import {
  DesktopInternalNavigation,
  MobileInternalNavigation,
} from "@/components/layout/internal-navigation";
import type { InternalProfile } from "@/types/auth";

export function InternalShell({ children, profile }: Readonly<{ children: React.ReactNode; profile: InternalProfile }>) {
  return (
    <div className="min-h-screen bg-muted/55 md:grid md:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r bg-sidebar p-5 text-sidebar-foreground md:flex md:flex-col">
        <Link href="/admin" aria-label="Ir para o painel">
          <Brand inverse />
        </Link>
        <div className="mt-10"><DesktopInternalNavigation profile={profile} /></div>
        <div className="mt-auto border-t border-sidebar-border pt-4">
          <div className="mb-3 px-3"><p className="truncate text-sm font-semibold">{profile.name}</p><p className="mt-0.5 text-xs text-sidebar-foreground/55">{profile.role}</p></div>
          <SignOutButton />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur md:static md:px-8">
          <div className="md:hidden"><MobileInternalNavigation profile={profile} /></div>
          <div className="md:hidden"><Brand compact /></div>
          <p className="ml-auto max-w-[45vw] truncate text-sm text-muted-foreground">Olá, {profile.name}</p>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
