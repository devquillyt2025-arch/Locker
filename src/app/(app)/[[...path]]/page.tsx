import { AppRoutes } from "@/components/app-routes";

// One catch-all page for every URL inside the shell ("/", "/cards",
// "/cards/new", "/cards/<id>", "/cards/<id>/edit"). It only exists so that
// hard loads and reloads of any of those URLs work; in-app navigation never
// reaches the server (see AppLink).
export default function AppPage() {
  return <AppRoutes />;
}
