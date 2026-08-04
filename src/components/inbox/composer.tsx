"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Send } from "lucide-react";
import type { ConversationDto, TemplateDto } from "@/lib/types";
import { renderQuickReply, type QuickReplyDto } from "@/lib/quick-replies";
import { cn } from "@/lib/utils";
import { formatRemaining } from "./helpers";
import { SnippetMenu, type SnippetItem } from "./snippet-menu";
import { TemplateSender } from "./template-sender";

/** `#atajo` justo antes del cursor. El menú se abre solo en ese caso. */
const RE_DISPARADOR = /#([\w-]*)$/;

export function Composer({
  conversation,
  onSend,
  onSent,
}: {
  conversation: ConversationDto;
  onSend: (text: string) => Promise<string | null>;
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReplyDto[]>([]);
  const [query, setQuery] = useState<string | null>(null); // null = menú cerrado
  const [activeIndex, setActiveIndex] = useState(0);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetch("/api/templates")
        .then((r) => (r.ok ? r.json() : { templates: [] }))
        .catch(() => ({ templates: [] })),
      fetch("/api/quick-replies")
        .then((r) => (r.ok ? r.json() : { quickReplies: [] }))
        .catch(() => ({ quickReplies: [] })),
    ]).then(
      ([t, q]: [{ templates?: TemplateDto[] }, { quickReplies?: QuickReplyDto[] }]) => {
        if (cancelled) return;
        setTemplates((t.templates ?? []).filter((x) => x.status === "approved"));
        setQuickReplies(q.quickReplies ?? []);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Fuera de la ventana de 24 h se ocultan las respuestas rápidas: Meta solo
   * acepta plantillas aprobadas, así que ofrecerlas sería ofrecer un error.
   */
  const items = useMemo<SnippetItem[]>(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    const rapidas: SnippetItem[] = conversation.windowOpen
      ? quickReplies
          .filter((r) => r.shortcut.includes(q))
          .map((r) => ({
            kind: "quick" as const,
            id: r.id,
            label: r.shortcut,
            body: r.body,
            preview: r.body.replace(/\s+/g, " ").slice(0, 70),
          }))
      : [];
    const meta: SnippetItem[] = templates
      .filter((t) => t.name.toLowerCase().includes(q))
      .map((t) => ({
        kind: "meta" as const,
        id: t.id,
        label: t.name.replace(/_/g, " "),
        body: t.body,
        preview: t.body.replace(/\s+/g, " ").slice(0, 70),
        needsVariable: /\{\{\s*1\s*\}\}/.test(t.body),
      }));
    return [...rapidas, ...meta];
  }, [query, quickReplies, templates, conversation.windowOpen]);

  const menuOpen = query !== null && items.length > 0;

  function autogrow() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  function alEscribir(value: string) {
    setText(value);
    autogrow();
    const cursor = taRef.current?.selectionStart ?? value.length;
    const m = RE_DISPARADOR.exec(value.slice(0, cursor));
    setQuery(m ? m[1]! : null);
    setActiveIndex(0);
  }

  function cerrarMenu() {
    setQuery(null);
    setActiveIndex(0);
  }

  async function insertar(item: SnippetItem) {
    const el = taRef.current;
    const cursor = el?.selectionStart ?? text.length;
    const antes = text.slice(0, cursor);
    const m = RE_DISPARADOR.exec(antes);
    if (!m) {
      cerrarMenu();
      return;
    }

    if (item.kind === "meta") {
      // Las plantillas de Meta no se pegan como texto: se envían como plantilla,
      // que es lo único que Meta acepta fuera de la ventana de 24 h.
      cerrarMenu();
      setText(text.slice(0, m.index) + text.slice(cursor));
      const res = await fetch(
        `/api/conversations/${conversation.id}/messages/template`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            templateId: item.id,
            ...(item.needsVariable
              ? { variable: conversation.contact.name.split(" ")[0] ?? "" }
              : {}),
          }),
        }
      ).catch(() => null);
      if (!res?.ok) {
        const data = (await res?.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setError(data?.error?.message ?? "No se pudo enviar la plantilla");
        return;
      }
      setError(null);
      onSent();
      return;
    }

    const resuelto = renderQuickReply(item.body, {
      nombre: conversation.contact.name,
      telefono: conversation.contact.phone,
      etapa: conversation.stageName,
    });
    const nuevo = text.slice(0, m.index) + resuelto + text.slice(cursor);
    setText(nuevo);
    cerrarMenu();
    void fetch(`/api/quick-replies/${item.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ used: true }),
    }).catch(() => null);

    // El cursor queda después del texto insertado, listo para seguir escribiendo.
    requestAnimationFrame(() => {
      const pos = m.index + resuelto.length;
      taRef.current?.focus();
      taRef.current?.setSelectionRange(pos, pos);
      autogrow();
    });
  }

  async function submit() {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    const err = await onSend(value);
    setSending(false);
    if (err) {
      setError(err);
      return;
    }
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
  }

  if (!conversation.windowOpen) {
    return (
      <div className="shrink-0 border-t bg-background px-3 py-2.5">
        <div className="mb-2 flex items-start gap-2 rounded-md border border-warning-line bg-warning-surface p-2 text-sm text-warning-ink">
          <Clock3 className="mt-px h-[15px] w-[15px] shrink-0" strokeWidth={1.7} />
          <div>
            <p className="font-medium">La ventana de 24 horas está cerrada.</p>
            <p className="opacity-80">
              WhatsApp solo permite texto libre dentro de las 24 horas siguientes
              al último mensaje del cliente. Para retomar la conversación, envía
              una plantilla aprobada.
            </p>
          </div>
        </div>
        <TemplateSender conversationId={conversation.id} onSent={onSent} />
      </div>
    );
  }

  return (
    <div className="relative shrink-0 border-t bg-background px-3 pb-2 pt-2">
      {menuOpen && (
        <SnippetMenu
          items={items}
          activeIndex={activeIndex}
          windowOpen={conversation.windowOpen}
          onPick={(item) => void insertar(item)}
          onHover={setActiveIndex}
        />
      )}

      <div className="flex items-end gap-2 rounded-md border bg-background px-2.5 py-1.5 transition-shadow focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand-soft">
        <textarea
          ref={taRef}
          placeholder="Escribe una respuesta…  (# para plantillas)"
          value={text}
          rows={1}
          onChange={(e) => alEscribir(e.target.value)}
          onBlur={cerrarMenu}
          onKeyDown={(e) => {
            // ⚠️ Con el menú abierto, Enter INSERTA. Sin esta guarda se enviarían
            // mensajes a medias mientras se busca una plantilla.
            if (menuOpen) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % items.length);
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => (i - 1 + items.length) % items.length);
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                const item = items[activeIndex];
                if (item) void insertar(item);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cerrarMenu();
                return;
              }
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          className="max-h-[120px] w-full resize-none bg-transparent text-md leading-relaxed outline-none placeholder:text-text-3"
        />
        <button
          onClick={() => void submit()}
          disabled={sending || text.trim().length === 0}
          aria-label="Enviar"
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand text-white transition-opacity hover:bg-brand-hover",
            (sending || !text.trim()) && "opacity-40"
          )}
        >
          <Send className="h-[15px] w-[15px]" strokeWidth={1.7} />
        </button>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        {error ? (
          <p className="truncate text-2xs text-destructive">{error}</p>
        ) : (
          <p className="text-2xs text-text-4">
            Enter enviar · Shift+Enter salto · # plantillas
          </p>
        )}
        <p className="shrink-0 text-2xs text-text-3">
          quedan {formatRemaining(conversation.windowRemainingMs)}
        </p>
      </div>
    </div>
  );
}
