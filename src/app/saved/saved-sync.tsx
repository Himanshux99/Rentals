"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readSaved } from "@/lib/saved";

export function SavedSync({ current }: { current: string }) {
  const router = useRouter();
  useEffect(() => {
    const codes = readSaved().join(",");
    if (codes !== current) router.replace(codes ? `/saved?codes=${codes}` : "/saved");
  }, [current, router]);
  return null;
}
