import { VaultLoader } from "@/components/shell/vault-loader";

// Only shows if a page takes a moment to arrive (the loader fades in after
// ~200ms, so fast navigations never flash it).
export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <VaultLoader size={104} />
    </div>
  );
}
