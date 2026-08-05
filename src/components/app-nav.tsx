"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FlaskConical,
  Inbox,
  Kanban,
  LogOut,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { APP_NAME } from "@/lib/branding";
import { cn, initials } from "@/lib/utils";
import { signOut } from "@/lib/auth/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEvents } from "@/components/use-events";

/**
 * Navegación agrupada por sección. Antes era una lista plana de cinco items y
 * Ajustes estaba duplicado a mano abajo; ahora todo sale de aquí.
 */
const GRUPOS = [
  {
    titulo: "Conversación",
    items: [
      { href: "/inbox", label: "Bandeja", icon: Inbox, badge: true },
      { href: "/pipeline", label: "Embudo", icon: Kanban, badge: false },
    ],
  },
  {
    titulo: "Gestión",
    items: [{ href: "/contacts", label: "Contactos", icon: Users, badge: false }],
  },
  {
    titulo: "Inteligencia",
    items: [
      { href: "/agent", label: "Agente", icon: Sparkles, badge: false },
      { href: "/lab", label: "Laboratorio", icon: FlaskConical, badge: false },
    ],
  },
] as const;

export function AppNav({
  userName,
  role,
}: {
  userName: string;
  role: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  async function refetchUnread() {
    const res = await fetch("/api/conversations").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as {
      conversations: { unreadCount: number }[];
    };
    setUnread(data.conversations.reduce((a, c) => a + c.unreadCount, 0));
  }

  useEffect(() => {
    void refetchUnread();
  }, []);

  useEvents({
    onMessageNew: () => void refetchUnread(),
    onConversationUpdated: () => void refetchUnread(),
  });

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r bg-subtle px-2 pb-2.5 pt-3">
      {/* Marca */}
      <div className="mb-3 flex items-center gap-2 px-1.5">
        <span
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-sm bg-brand text-md font-bold text-white"
          aria-hidden
        >
          {APP_NAME.charAt(0)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-md font-[650] leading-tight tracking-tight">
            {APP_NAME}
          </span>
          <span className="block text-2xs text-text-3">CRM · WhatsApp</span>
        </span>
      </div>

      <nav className="flex flex-col gap-2">
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo} className="flex flex-col gap-px">
            <span className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wider text-text-4">
              {grupo.titulo}
            </span>
            {grupo.items.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                active={
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                }
                badge={item.badge ? unread : 0}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="flex-1" />

      <NavItem
        href="/settings"
        label="Ajustes"
        Icon={Settings}
        active={pathname.startsWith("/settings")}
        badge={0}
      />

      <div className="mt-1.5 flex items-center justify-between px-2">
        <span className="text-2xs font-semibold uppercase tracking-wider text-text-4">
          Tema
        </span>
        <ThemeToggle compact />
      </div>

      <div className="mt-1 flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-accent">
        <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-brand-soft text-2xs font-semibold text-brand-text">
          {initials(userName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{userName}</span>
          <span className="block text-2xs text-text-3">
            {role === "owner" ? "Propietario" : "Equipo"} · En línea
          </span>
        </span>
        <button
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="rounded p-1 text-text-3 hover:text-foreground"
          onClick={async () => {
            await signOut();
            router.push("/login");
            router.refresh();
          }}
        >
          <LogOut className="h-[15px] w-[15px]" strokeWidth={1.7} />
        </button>
      </div>
    </aside>
  );
}

/** Item de navegación. Antes estaba duplicado: uno en el .map y otro a mano. */
function NavItem({
  href,
  label,
  Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  Icon: typeof Inbox;
  active: boolean;
  badge: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-sm px-2 py-[5px] text-sm font-medium transition-colors",
        active ? "bg-brand-tint font-semibold text-brand-text" : "text-text-2 hover:bg-accent"
      )}
    >
      <Icon
        className={cn("h-[15px] w-[15px] shrink-0", active ? "text-brand" : "text-text-3")}
        strokeWidth={1.8}
      />
      <span className="flex-1 truncate">{label}</span>
      {badge > 0 && (
        <span
          className={cn(
            "pastilla",
            active ? "bg-brand text-white" : "bg-border-strong text-text-2"
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
