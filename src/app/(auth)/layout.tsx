import { Brand } from "@/components/layout/brand";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="surface-grid grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        {children}
      </div>
    </main>
  );
}
