import { Construction } from "lucide-react";

type SectionPlaceholderProps = {
  description: string;
  eyebrow: string;
  title: string;
};

export function SectionPlaceholder({
  description,
  eyebrow,
  title,
}: SectionPlaceholderProps) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-4xl items-center">
      <div className="w-full rounded-2xl border bg-card p-8 shadow-sm sm:p-12">
        <span className="mb-6 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Construction className="size-6" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}
