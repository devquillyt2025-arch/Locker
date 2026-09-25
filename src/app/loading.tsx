import { VaultLoader } from "@/components/shell/vault-loader";

// First load / hard refresh: covers the wait while the vault is fetched.
export default function RootLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <VaultLoader size={132} caption="Opening your vault" />
    </div>
  );
}
