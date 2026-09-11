"use client";

import { useEffect } from "react";

import { RouteError } from "@/components/layout/route-feedback";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <RouteError retry={retry} />;
}
