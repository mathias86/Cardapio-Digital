import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-96 animate-pulse rounded-2xl border bg-card" />}><LoginForm /></Suspense>;
}
