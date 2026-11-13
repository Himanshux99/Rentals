import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { OPTION_LISTS } from "@/server/services/admin";

export const metadata: Metadata = { title: "Option lists" };

export default async function AdminOptions() {
  const t = await getTranslations("admin");
  return (
    <>
      <h1 className="text-4xl font-semibold">{t("navOptions")}</h1>
      <ul className="flex max-w-md flex-col gap-px bg-border">
        {[...OPTION_LISTS, "synonym" as const].map((l) => (
          <li key={l}>
            <Link href={`/admin/options/${l}`} className="flex h-14 items-center justify-between bg-card px-4 text-lg hover:bg-accent">
              {t(`list_${l}`)}
              <ChevronRight className="size-5" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
