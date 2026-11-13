import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/server/db";
import { listAudit } from "@/server/services/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };

const ENTITIES = ["Shop", "Product", "ProductSize", "Design", "Report"];

export default async function AdminAudit({ searchParams }: PageProps<"/admin/audit">) {
  const sp = await searchParams;
  const entity = typeof sp.entity === "string" && ENTITIES.includes(sp.entity) ? sp.entity : undefined;
  const [t, rows] = await Promise.all([getTranslations("admin"), listAudit(entity)]);
  const actors = await db.user.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.actorId))] } }, select: { id: true, email: true } });
  const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

  return (
    <>
      <h1 className="text-4xl font-semibold">{t("navAudit")}</h1>
      <nav className="flex flex-wrap gap-2">
        {[undefined, ...ENTITIES].map((e) => (
          <Link
            key={e ?? "all"}
            href={e ? `/admin/audit?entity=${e}` : "/admin/audit"}
            className={cn("inline-flex h-12 items-center px-4 text-base", e === entity ? "bg-[var(--haldi)] text-[var(--haldi-ink)]" : "bg-card hover:bg-accent")}
          >
            {e ?? t("all")}
          </Link>
        ))}
      </nav>
      <div className="overflow-x-auto bg-card">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>{t("when")}</TableHead>
              <TableHead>{t("who")}</TableHead>
              <TableHead>{t("action")}</TableHead>
              <TableHead>{t("entity")}</TableHead>
              <TableHead>{t("change")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className="align-top">
                <TableCell className="whitespace-nowrap tabular-nums">{date.format(r.createdAt)}</TableCell>
                <TableCell>{actors.find((a) => a.id === r.actorId)?.email ?? r.actorId}</TableCell>
                <TableCell className="font-medium">{r.action}</TableCell>
                <TableCell>
                  {r.entity} <span className="text-muted-foreground">{r.entityId.slice(0, 10)}</span>
                </TableCell>
                <TableCell className="max-w-md">
                  {(r.before != null || r.after != null) && (
                    <details>
                      <summary className="cursor-pointer">{t("details")}</summary>
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify({ before: r.before, after: r.after }, null, 1)}</pre>
                    </details>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
