import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";

import { getSafePublicImageUrl } from "@/lib/images";

type ProductImageProps = {
  imageUrl: string | null;
  name: string;
  priority?: boolean;
};

export function ProductImage({
  imageUrl,
  name,
  priority = false,
}: ProductImageProps) {
  const safeImageUrl = getSafePublicImageUrl(imageUrl);

  if (!safeImageUrl) {
    return (
      <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_top_left,var(--color-accent),transparent_65%)] text-primary/65">
        <UtensilsCrossed className="size-12" strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  return (
    <Image
      src={safeImageUrl}
      alt={name}
      fill
      priority={priority}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-cover transition-transform duration-500 group-hover/card:scale-[1.03]"
    />
  );
}
