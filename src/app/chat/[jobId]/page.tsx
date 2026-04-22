"use client";
import { use, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { AntiLeakAlert } from "@/components/chat/anti-leak-alert";
import { jobs, professionals, chatMessages } from "@/lib/data";
import { scanLeaks } from "@/lib/anti-leak";
import { useSession } from "@/lib/store";
import type { ChatMessage } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { formatEuro } from "@/lib/utils";

interface Props {
  params: Promise<{ jobId: string }>;
}

function Inner({ jobId }: { jobId: string }) {
  const sessionRole = useSession((s) => s.role);
  const proStatus = useSession((s) => s.proStatus);
  const role = sessionRole === "professional" ? "pro" : "client";
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];
  const pro = job.assignedProId
    ? professionals.find((p) => p.id === job.assignedProId) ?? professionals[0]
    : professionals[0];
  const chatOpenStatuses = ["agreed", "escrow_funded", "in_progress", "completed_pending_confirmation", "completed"];
  const isAcceptedChat = chatOpenStatuses.includes(job.status);
  const canAccessChat =
    sessionRole === "admin" ||
    (sessionRole === "client" && isAcceptedChat && Boolean(job.assignedProId)) ||
    (sessionRole === "professional" && proStatus === "approved" && isAcceptedChat && job.assignedProId === "p1");
  const other =
    role === "pro"
      ? { name: job.clientName, avatar: job.clientAvatar, subtitle: "Cliente" }
      : { name: pro.name, avatar: pro.avatar, subtitle: pro.specialty };

  if (!canAccessChat) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-sand-50">
        <StatusBar />
        <div className="bg-white border-b border-sand-200/70 px-4 pt-2 pb-3 flex items-center gap-3">
          <Link
            href={sessionRole === "professional" ? `/profesional/trabajos/${jobId}` : `/cliente/trabajos/${jobId}`}
            className="w-9 h-9 rounded-full bg-sand-100 inline-flex items-center justify-center text-ink-700"
          >
            <Icon name="back" size={18} stroke={2.2} />
          </Link>
          <div className="font-bold text-[14px] text-ink-800">Chat no disponible</div>
        </div>
        <ScreenBody className="px-4 pt-4 pb-6">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-[13px] text-amber-700 leading-relaxed">
            {sessionRole === "professional" && proStatus !== "approved"
              ? "Tu cuenta profesional todavía no puede operar. Necesitas aprobación para acceder al chat."
              : "El chat solo se abre cuando el cliente acepta al profesional."}
          </div>
        </ScreenBody>
      </div>
    );
  }

  const seed = useMemo(
    () => chatMessages.filter((m) => m.jobId === jobId),
    [jobId],
  );
  const [history, setHistory] = useState<ChatMessage[]>(
    seed.length > 0
      ? seed
      : [
          {
            id: "welcome",
            jobId,
            from: "system",
            text: "Chat abierto. Recuerda: sin teléfonos, emails o enlaces externos.",
            time: "ahora",
            timestamp: new Date().toISOString(),
            type: "system",
          },
        ],
  );
  const [input, setInput] = useState("");
  const [showProposal, setShowProposal] = useState(false);
  const [proposal, setProposal] = useState(
    String(Math.round((job.priceMin + job.priceMax) / 2)),
  );

  const liveLeaks = input ? scanLeaks(input) : [];

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const flagged = liveLeaks.length > 0;
    const next: ChatMessage = {
      id: `local-${Date.now()}`,
      jobId,
      from: role,
      text,
      time: new Date().toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      timestamp: new Date().toISOString(),
      type: "text",
      flagged,
      flagReason: flagged ? "anti-leak" : undefined,
    };
    setHistory((h) => [...h, next]);
    setInput("");
    if (flagged) {
      // DEMO: in prod, send strike to moderation queue via server action
      setTimeout(() => {
        setHistory((h) => [
          ...h,
          {
            id: `sys-${Date.now()}`,
            jobId,
            from: "system",
            text: "Mensaje revisado: detectamos datos de contacto. Este intento quedó registrado.",
            time: "ahora",
            timestamp: new Date().toISOString(),
            type: "warning",
          },
        ]);
      }, 350);
    }
  };

  const sendProposal = () => {
    const amount = Number(proposal || 0);
    if (!amount) return;
    setHistory((h) => [
      ...h,
      {
        id: `sys-prop-${Date.now()}`,
        jobId,
        from: "system",
        text: `${role === "pro" ? pro.name.split(" ")[0] : "El cliente"} envió una propuesta`,
        time: "ahora",
        timestamp: new Date().toISOString(),
        type: "proposal",
        proposalAmount: amount,
      },
    ]);
    setShowProposal(false);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-sand-50">
      <StatusBar />
      <div className="bg-white border-b border-sand-200/70 px-4 pt-2 pb-3 flex items-center gap-3">
        <Link
          href={role === "pro" ? `/profesional/trabajos/${jobId}` : `/cliente/trabajos/${jobId}`}
          className="w-9 h-9 rounded-full bg-sand-100 inline-flex items-center justify-center text-ink-700"
        >
          <Icon name="back" size={18} stroke={2.2} />
        </Link>
        <Avatar initials={other.avatar} size={38} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[14px] text-ink-800 truncate">
            {other.name}
          </div>
          <div className="text-[11px] text-ink-400 truncate">
            {other.subtitle} · trabajo {jobId}
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <ScreenBody className="px-4 pt-4 pb-2 flex flex-col">
        {/* job header mini */}
        <Link
          href={
            role === "pro"
              ? `/profesional/trabajos/${jobId}`
              : `/cliente/trabajos/${jobId}`
          }
          className="rounded-2xl border border-sand-200/70 bg-white px-3 py-2.5 mb-3 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-sand-100 flex items-center justify-center">
            <Icon name="briefcase" size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[12.5px] text-ink-800 truncate">
              {job.title}
            </div>
            <div className="text-[11px] text-ink-400">
              {job.category} · {formatEuro(job.priceMin)}–
              {formatEuro(job.priceMax)}
            </div>
          </div>
          <Icon name="forward" size={14} className="text-ink-400" />
        </Link>

          <div className="flex-1 min-h-0 flex flex-col">
            {history.map((m) => (
              <MessageBubble key={m.id} msg={m} selfRole={role} />
            ))}
          </div>
        </ScreenBody>

      {liveLeaks.length > 0 && <AntiLeakAlert leaks={liveLeaks} />}

      {showProposal && (
        <div className="app-bottom-bar-compact px-4 pt-2 pb-2 bg-white border-t border-sand-200/70">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 bg-sand-100 rounded-full px-3 py-2">
              <Icon name="euro" size={14} />
              <input
                type="number"
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[14px] text-ink-800"
                placeholder="Importe"
              />
            </div>
            <button
              onClick={sendProposal}
              className="bg-coral-500 text-white text-[12.5px] font-bold px-4 py-2 rounded-full"
            >
              Enviar propuesta
            </button>
          </div>
        </div>
      )}

      <div className="app-bottom-bar-compact px-3 pt-2 pb-3 bg-white border-t border-sand-200/70">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowProposal(!showProposal)}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              showProposal
                ? "bg-coral-500 text-white"
                : "bg-sand-100 text-ink-600"
            }`}
          >
            <Icon name="euro" size={16} />
          </button>
          <div className="flex-1 flex items-center gap-1 bg-sand-100 rounded-3xl px-3 py-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje…"
              className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 resize-none max-h-24"
            />
          </div>
          <button
            onClick={send}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full bg-coral-500 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40"
          >
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Page({ params }: Props) {
  const { jobId } = use(params);
  return <Inner jobId={jobId} />;
}
