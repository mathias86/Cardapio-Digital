"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  ChefHat,
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  Truck,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { InternalProfile } from "@/types/auth";

const adminLinks = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
] as const;

function linksForRole(role: InternalProfile["role"]) {
  if (role === "ADMIN") {
    return [
      ...adminLinks,
      { href: "/cozinha", label: "Cozinha", icon: ChefHat },
      { href: "/entregador", label: "Entregas", icon: Truck },
    ];
  }
  if (role === "KITCHEN") return [{ href: "/cozinha", label: "Cozinha", icon: ChefHat }];
  return [{ href: "/entregador", label: "Entregas", icon: Truck }];
}

function InternalLinks({
  profile,
  mobile = false,
  onNavigate,
}: {
  profile: InternalProfile;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const links = linksForRole(profile.role);

  return (
    <nav className="space-y-1" aria-label="Navegação interna">
      {links.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition",
              mobile
                ? isActive
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
                : isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DesktopInternalNavigation({ profile }: { profile: InternalProfile }) {
  return <InternalLinks profile={profile} />;
}

export function MobileInternalNavigation({ profile }: { profile: InternalProfile }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button type="button" variant="outline" size="icon" aria-label="Abrir menu" />}>
        <Menu aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[19rem]">
        <SheetHeader className="border-b px-5 py-5">
          <SheetTitle><Brand compact /></SheetTitle>
          <SheetDescription>{profile.name} · {profile.role}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <InternalLinks profile={profile} mobile onNavigate={() => setOpen(false)} />
        </div>
        <div className="border-t p-4">
          <SignOutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
