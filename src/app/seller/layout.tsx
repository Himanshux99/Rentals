import { AppBar } from "@/components/app/app-bar";
import { requireRole } from "@/server/auth";

export default async function SellerLayout({ children }: LayoutProps<"/seller">) {
  await requireRole("seller");
  return (
    <>
      <AppBar signedIn home="/seller" />
      <main className="flex flex-1 flex-col px-4 pb-16 pt-6 sm:px-8">{children}</main>
    </>
  );
}
