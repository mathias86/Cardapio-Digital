const storageHostname = "agwzimokjevwrznjiscn.supabase.co";

export function getSafePublicImageUrl(imageUrl: string | null) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const isAllowedStorageUrl =
      url.protocol === "https:" &&
      url.hostname === storageHostname &&
      url.pathname.startsWith("/storage/v1/object/public/");

    return isAllowedStorageUrl ? url.toString() : null;
  } catch {
    return null;
  }
}
