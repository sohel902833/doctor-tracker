import { AppShell } from "@/components/layout/app-shell";

// Static shell: the session is loaded in the browser, so this layout
// prerenders and every logged-in page opens instantly.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
