import { notFound } from "next/navigation";
import { AppRoutes } from "@/components/app-routes";
import { matchAppRoute } from "@/lib/app-routes";

// One catch-all page for every URL inside the shell ("/", "/cards",
// "/cards/new", "/cards/<id>", "/cards/<id>/edit", "/documents",
// "/recents", "/structure", "/reports", "/trash"). It only exists so that hard loads and reloads of any of
// those URLs work; in-app navigation never reaches the server (see AppLink).
//
// Because it matches everything, it must reject what isn't a real page —
// otherwise any typo'd URL would answer 200 with the whole app in it.
export default async function AppPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  let parts: string[];
  try {
    parts = path.map(decodeURIComponent);
  } catch {
    notFound(); // malformed %-escape
  }
  if (!matchAppRoute(parts)) notFound();
  return <AppRoutes />;
}
