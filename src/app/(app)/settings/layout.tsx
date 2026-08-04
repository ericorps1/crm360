import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-4 py-2">
        <h2 className="font-semibold">Configuración</h2>
      </header>
      <div className="flex min-h-0 flex-1">
        <SettingsNav />
        <div className="min-w-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
