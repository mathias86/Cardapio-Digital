import { PublicHeader } from "@/components/layout/public-header";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t bg-card py-6 text-center text-sm text-muted-foreground">
        Cardápio Digital · Pedidos simples, rápidos e seguros.
      </footer>
    </div>
  );
}
