"use client";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBar } from "@/components/layout/status-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Icon } from "@/components/ui/icon";
import { Avatar } from "@/components/ui/avatar";
import { MessageBubble } from "@/components/chat/message-bubble";
import { AntiLeakAlert } from "@/components/chat/anti-leak-alert";
import {
  acceptAgreementNegotiation,
  confirmJobCompletion,
  createAgreementProposal,
  fundProtectedPayment,
  getJobAgreementContext,
  markJobCompleted,
  type ApiJobAgreementContext,
  type ApiJobNegotiationEvent,
} from "@/lib/api/agreements";
import {
  getChatThread,
  sendChatMessage as sendRealChatMessage,
  type ApiChatThread,
} from "@/lib/api/chat";
import { getCurrentProfile, type ApiProfileRole } from "@/lib/api/profiles";
import { jobs, professionals, chatMessages } from "@/lib/data";
import {
  canAccessChat,
  canProposePrice,
  getActiveNegotiation,
  getAgreement,
  getEffectiveFinalPrice,
  hasAgreement,
  isProfessionalOperative,
} from "@/lib/domain/policies";
import { scanLeaks } from "@/lib/anti-leak";
import { redactLeaks } from "@/lib/anti-leak";
import {
  getAgreementByJobId,
  getChatForJob,
  getCurrentProfessionalId,
  getEffectiveAdminConfig,
  getEffectiveJobById,
  getMessagesForChat,
  getNegotiationByJobId,
  useSession,
} from "@/lib/store";
import type { AdminConfig, ChatMessage } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { isSupabaseMode } from "@/lib/supabase/config";
import { formatEuro } from "@/lib/utils";

interface Props {
  params: Promise<{ jobId: string }>;
}

function isLeakAllowed(type: ChatMessage["flagReason"] | "phone" | "email" | "url" | "whatsapp" | "telegram", adminConfig: AdminConfig) {
  if (!adminConfig.antiLeakEnabled) return false;
  if (type === "phone") return adminConfig.antiLeakRules.phones;
  if (type === "email") return adminConfig.antiLeakRules.emails;
  if (type === "url") return adminConfig.antiLeakRules.urls;
  return adminConfig.antiLeakRules.whatsapp;
}

function formatAgreementEventTime(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}

function getAgreementEventLabel(event: ApiJobNegotiationEvent): string {
  const actor = event.byRole === "client" ? "Cliente" : "Profesional";

  if (event.eventType === "accepted") {
    return `${actor} aceptó la oferta`;
  }

  if (event.eventType === "counteroffer") {
    return `${actor} envió una contraoferta`;
  }

  if (event.eventType === "cancelled") {
    return `${actor} canceló la negociación`;
  }

  return `${actor} propuso presupuesto`;
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente de pago",
  protected: "Pago protegido",
  released: "Pago liberado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

function SupabaseInner({ jobId }: { jobId: string }) {
  const [thread, setThread] = useState<ApiChatThread | null>(null);
  const [agreementContext, setAgreementContext] = useState<ApiJobAgreementContext | null>(null);
  const [loadingThread, setLoadingThread] = useState(true);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState<ApiProfileRole | null>(null);
  const [input, setInput] = useState("");
  const [proposalAmount, setProposalAmount] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [fundingPayment, setFundingPayment] = useState(false);
  const [markingCompleted, setMarkingCompleted] = useState(false);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const [agreementActionError, setAgreementActionError] = useState<string | null>(null);
  const [agreementActionNotice, setAgreementActionNotice] = useState<string | null>(null);
  const [supabaseReloadKey, setSupabaseReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadThread() {
      setLoadingThread(true);
      setThreadError(null);

      try {
        const currentProfile = await getCurrentProfile();

        if (!isCancelled) {
          setProfileRole(currentProfile?.role ?? null);
        }

        const [nextThread, nextAgreementContext] = await Promise.all([
          getChatThread(jobId),
          getJobAgreementContext(jobId),
        ]);

        if (!isCancelled) {
          setThread(nextThread);
          setAgreementContext(nextAgreementContext);
        }
      } catch (error) {
        if (!isCancelled) {
          setThread(null);
          setAgreementContext(null);
          setThreadError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar el chat real.",
          );
        }
      } finally {
        if (!isCancelled) {
          setLoadingThread(false);
        }
      }
    }

    void loadThread();

    return () => {
      isCancelled = true;
    };
  }, [jobId, supabaseReloadKey]);

  useEffect(() => {
    if (agreementContext?.status !== "ready") {
      return;
    }

    if (agreementContext.negotiation?.lastAmount) {
      setProposalAmount(String(agreementContext.negotiation.lastAmount));
      return;
    }

    if (
      agreementContext.job?.priceMin !== null &&
      agreementContext.job?.priceMin !== undefined &&
      agreementContext.job?.priceMax !== null &&
      agreementContext.job?.priceMax !== undefined
    ) {
      setProposalAmount(
        String(Math.round((agreementContext.job.priceMin + agreementContext.job.priceMax) / 2)),
      );
      return;
    }

    setProposalAmount("");
  }, [
    agreementContext?.status,
    agreementContext?.negotiation?.lastAmount,
    agreementContext?.job?.priceMin,
    agreementContext?.job?.priceMax,
  ]);

  const role = profileRole === "professional" ? "pro" : "client";
  const backHref =
    profileRole === "professional"
      ? `/profesional/trabajos/${jobId}`
      : profileRole === "admin"
        ? "/admin/chats"
        : `/cliente/trabajos/${jobId}`;
  const canSendRealMessage =
    thread?.status === "ready" && Boolean(thread.chat) && profileRole !== "admin";
  const currentJob = agreementContext?.status === "ready" ? agreementContext.job : null;
  const currentNegotiation = agreementContext?.status === "ready" ? agreementContext.negotiation : null;
  const currentAgreement = agreementContext?.status === "ready" ? agreementContext.agreement : null;
  const canProposeAgreement =
    agreementContext?.status === "ready" &&
    !currentAgreement &&
    (profileRole === "client" || profileRole === "professional") &&
    (agreementContext.job?.status === "in_progress" ||
      agreementContext.job?.status === "agreement_pending");
  const currentParticipantRole =
    profileRole === "professional"
      ? "professional"
      : profileRole === "client"
        ? "client"
        : null;
  const currentRoleAccepted =
    currentParticipantRole === "client"
      ? currentNegotiation?.clientAccepted
      : currentParticipantRole === "professional"
        ? currentNegotiation?.professionalAccepted
        : false;
  const canAcceptCurrentOffer = Boolean(
    currentNegotiation &&
      currentNegotiation.status === "active" &&
      currentParticipantRole &&
      currentNegotiation.proposedByRole &&
      currentNegotiation.proposedByRole !== currentParticipantRole &&
      !currentRoleAccepted,
  );
  const canFundProtectedPayment = Boolean(
    profileRole === "client" &&
      currentJob?.status === "agreed" &&
      currentAgreement &&
      currentAgreement.acceptedByClient &&
      currentAgreement.acceptedByProfessional &&
      currentAgreement.paymentStatus === "pending",
  );
  const isAwaitingProtectedPayment = Boolean(
    currentJob?.status === "agreed" &&
      currentAgreement &&
      currentAgreement.paymentStatus === "pending",
  );
  const canMarkCompleted = Boolean(
    profileRole === "professional" &&
      currentJob?.status === "escrow_funded" &&
      currentAgreement &&
      currentAgreement.paymentStatus === "protected",
  );
  const canConfirmCompletion = Boolean(
    profileRole === "client" &&
      currentJob?.status === "completed_pending_confirmation" &&
      currentAgreement &&
      currentAgreement.paymentStatus === "protected",
  );
  const isAwaitingClientConfirmation = Boolean(
    profileRole === "professional" &&
      currentJob?.status === "completed_pending_confirmation" &&
      currentAgreement &&
      currentAgreement.paymentStatus === "protected",
  );
  const isCompletedAndReleased = Boolean(
    currentJob?.status === "completed" &&
      currentAgreement &&
      currentAgreement.paymentStatus === "released",
  );
  const isProfessionalView = profileRole === "professional";
  const parsedProposalAmount = Number(proposalAmount);
  const isProposalAmountValid =
    Number.isFinite(parsedProposalAmount) &&
    Number.isInteger(parsedProposalAmount) &&
    parsedProposalAmount > 0;

  const send = async () => {
    const chatId = thread?.chat?.id;
    const text = input.trim();

    if (!chatId || !text || sendingMessage) {
      return;
    }

    setSendError(null);
    setSendNotice(null);
    setSendingMessage(true);

    try {
      const createdMessage = await sendRealChatMessage(chatId, text);

      setThread((currentThread) => {
        if (!currentThread || currentThread.status !== "ready" || !currentThread.chat) {
          return currentThread;
        }

        return {
          ...currentThread,
          statusMessage: "",
          chat: {
            ...currentThread.chat,
            lastMessageAt: createdMessage.timestamp,
          },
          messages: [...currentThread.messages, createdMessage],
        };
      });

      setInput("");
      setSendNotice(
        createdMessage.flagged
          ? "Protegimos posibles datos de contacto en este mensaje antes de guardarlo."
          : null,
      );
    } catch (error) {
      setSendError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos enviar el mensaje. Inténtalo de nuevo.",
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const submitAgreementProposal = async () => {
    const amount = Number(proposalAmount);

    if (!canProposeAgreement || !Number.isFinite(amount) || amount <= 0 || submittingProposal) {
      return;
    }

    setAgreementActionError(null);
    setAgreementActionNotice(null);
    setSubmittingProposal(true);

    try {
      await createAgreementProposal(jobId, amount);
      setAgreementActionNotice(
        currentNegotiation
          ? "Contraoferta enviada. La negociación se ha actualizado."
          : "Presupuesto enviado. El trabajo pasa a negociación.",
      );
      setSupabaseReloadKey((currentValue) => currentValue + 1);
    } catch (error) {
      setAgreementActionError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos registrar la propuesta. Inténtalo de nuevo.",
      );
    } finally {
      setSubmittingProposal(false);
    }
  };

  const acceptCurrentOffer = async () => {
    if (!currentNegotiation?.id || !canAcceptCurrentOffer || acceptingOffer) {
      return;
    }

    setAgreementActionError(null);
    setAgreementActionNotice(null);
    setAcceptingOffer(true);

    try {
      const result = await acceptAgreementNegotiation(currentNegotiation.id);
      setAgreementActionNotice(
        result.agreementId
          ? "Acuerdo alcanzado. El presupuesto final ha quedado registrado."
          : "Tu aceptación ha quedado registrada. Falta la confirmación de la otra parte.",
      );
      setSupabaseReloadKey((currentValue) => currentValue + 1);
    } catch (error) {
      setAgreementActionError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos aceptar el presupuesto. Inténtalo de nuevo.",
      );
    } finally {
      setAcceptingOffer(false);
    }
  };

  const protectPayment = async () => {
    if (!canFundProtectedPayment || fundingPayment) {
      return;
    }

    setAgreementActionError(null);
    setAgreementActionNotice(null);
    setFundingPayment(true);

    try {
      await fundProtectedPayment(jobId);
      setAgreementActionNotice("Pago protegido. Los fondos han quedado retenidos en esta fase fake.");
      setSupabaseReloadKey((currentValue) => currentValue + 1);
    } catch (error) {
      setAgreementActionError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos proteger el pago. Inténtalo de nuevo.",
      );
    } finally {
      setFundingPayment(false);
    }
  };

  const completeJob = async () => {
    if (!canMarkCompleted || markingCompleted) {
      return;
    }

    setAgreementActionError(null);
    setAgreementActionNotice(null);
    setMarkingCompleted(true);

    try {
      await markJobCompleted(jobId);
      setAgreementActionNotice("Trabajo marcado como terminado. Esperando confirmación del cliente.");
      setSupabaseReloadKey((currentValue) => currentValue + 1);
    } catch (error) {
      setAgreementActionError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos marcar el trabajo como terminado. Inténtalo de nuevo.",
      );
    } finally {
      setMarkingCompleted(false);
    }
  };

  const releasePayment = async () => {
    if (!canConfirmCompletion || confirmingCompletion) {
      return;
    }

    setAgreementActionError(null);
    setAgreementActionNotice(null);
    setConfirmingCompletion(true);

    try {
      await confirmJobCompletion(jobId);
      setAgreementActionNotice("Trabajo completado. El pago ha quedado liberado en esta fase fake.");
      setSupabaseReloadKey((currentValue) => currentValue + 1);
    } catch (error) {
      setAgreementActionError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos confirmar la finalización. Inténtalo de nuevo.",
      );
    } finally {
      setConfirmingCompletion(false);
    }
  };

  if (loadingThread) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-sand-50">
        <StatusBar />
        <div className="bg-white border-b border-sand-200/70 px-4 pt-2 pb-3 flex items-center gap-3">
          <Link
            href={backHref}
            className="w-9 h-9 rounded-full bg-sand-100 inline-flex items-center justify-center text-ink-700"
          >
            <Icon name="back" size={18} stroke={2.2} />
          </Link>
          <div className="font-bold text-[14px] text-ink-800">Cargando chat real</div>
        </div>
        <ScreenBody className="px-4 pt-4 pb-6">
          <div className="rounded-2xl border border-sand-200/70 bg-white p-4 text-[13px] text-ink-600 leading-relaxed">
            Estamos cargando el chat real de este trabajo.
          </div>
        </ScreenBody>
      </div>
    );
  }

  if (threadError) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-sand-50">
        <StatusBar />
        <div className="bg-white border-b border-sand-200/70 px-4 pt-2 pb-3 flex items-center gap-3">
          <Link
            href={backHref}
            className="w-9 h-9 rounded-full bg-sand-100 inline-flex items-center justify-center text-ink-700"
          >
            <Icon name="back" size={18} stroke={2.2} />
          </Link>
          <div className="font-bold text-[14px] text-ink-800">Chat no disponible</div>
        </div>
        <ScreenBody className="px-4 pt-4 pb-6">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700 leading-relaxed">
            {threadError}
          </div>
        </ScreenBody>
      </div>
    );
  }

  if (!thread || thread.status !== "ready") {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-sand-50">
        <StatusBar />
        <div className="bg-white border-b border-sand-200/70 px-4 pt-2 pb-3 flex items-center gap-3">
          <Link
            href={backHref}
            className="w-9 h-9 rounded-full bg-sand-100 inline-flex items-center justify-center text-ink-700"
          >
            <Icon name="back" size={18} stroke={2.2} />
          </Link>
          <div className="font-bold text-[14px] text-ink-800">Chat no disponible</div>
        </div>
        <ScreenBody className="px-4 pt-4 pb-6">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-[13px] text-amber-700 leading-relaxed">
            {thread?.statusMessage ?? "No tienes acceso a este chat o todavía no está disponible."}
          </div>
        </ScreenBody>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-sand-50">
      <StatusBar />
      <div className="bg-white border-b border-sand-200/70 px-4 pt-2 pb-3 flex items-center gap-3">
        <Link
          href={backHref}
          className="w-9 h-9 rounded-full bg-sand-100 inline-flex items-center justify-center text-ink-700"
        >
          <Icon name="back" size={18} stroke={2.2} />
        </Link>
        <Avatar initials={profileRole === "professional" ? "CL" : "PA"} size={38} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[14px] text-ink-800 truncate">
            {thread.headerTitle}
          </div>
          <div className="text-[11px] text-ink-400 truncate">{thread.headerSubtitle}</div>
        </div>
        {thread.job && <StatusBadge status={thread.job.status} />}
        <button
          type="button"
          onClick={() => setSupabaseReloadKey((k) => k + 1)}
          className="text-[11px] font-semibold text-coral-600 flex-shrink-0"
        >
          Actualizar
        </button>
      </div>

      <ScreenBody className="px-4 pt-4 pb-2 flex flex-col">
        {thread.job && (
          <Link
            href={backHref}
            className="rounded-2xl border border-sand-200/70 bg-white px-3 py-2.5 mb-3 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-sand-100 flex items-center justify-center">
              <Icon name="briefcase" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[12.5px] text-ink-800 truncate">
                {thread.job.title}
              </div>
              <div className="text-[11px] text-ink-400">
                {thread.job.priceMin !== null && thread.job.priceMax !== null
                  ? `${formatEuro(thread.job.priceMin)}-${formatEuro(thread.job.priceMax)}`
                  : "Rango por definir"}
              </div>
            </div>
            <Icon name="forward" size={14} className="text-ink-400" />
          </Link>
        )}

        {agreementActionError && (
          <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[12.5px] text-rose-700">
            {agreementActionError}
          </div>
        )}

        {agreementActionNotice && (
          <div className="mb-3 rounded-2xl border border-teal-100 bg-teal-50 px-3.5 py-3 text-[12.5px] text-teal-700">
            {agreementActionNotice}
          </div>
        )}

        <div className="mb-3 rounded-2xl border border-sand-200/70 bg-white px-3.5 py-3">
          <div className="font-bold text-[13px] text-ink-800">Presupuesto y acuerdo</div>
          <div className="mt-1 text-[12px] text-ink-500 leading-snug">
            El rango orientativo del trabajo solo sirve como referencia. El precio final se acuerda aqui, dentro de Dersux.
          </div>
        </div>

        {currentAgreement ? (
          <>
            <div className="mb-3 rounded-2xl border border-teal-100 bg-teal-50 px-3.5 py-3">
              <div className="font-bold text-[13px] text-teal-700">Acuerdo alcanzado</div>
              <div className="mt-1 text-[12px] text-teal-700/80">
                El precio final acordado es <strong>{formatEuro(currentAgreement.finalPrice)}</strong> y sustituye al rango orientativo del trabajo.
              </div>
            </div>

            {canFundProtectedPayment && (
              <div className="mb-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-3.5 py-3">
                <div className="font-bold text-[13px] text-sky-800">Pago protegido interno</div>
                <div className="mt-1 text-[11.5px] text-sky-700/80 leading-snug">
                  Tras acordar el precio final, el siguiente paso logico es registrar el pago protegido dentro del flujo interno de Dersux.
                </div>
                <div className="mt-2 text-[11px] text-sky-600/80 leading-snug">
                  Este paso no realiza un cobro real con Stripe. Es una fase logica interna de la plataforma.
                </div>
                <button
                  type="button"
                  onClick={() => void protectPayment()}
                  disabled={fundingPayment}
                  className="mt-3 rounded-full bg-coral-500 px-4 py-3 text-[13px] font-bold text-white disabled:opacity-40"
                >
                  {fundingPayment ? "Protegiendo pago..." : "Registrar pago protegido interno"}
                </button>
              </div>
            )}

            {canMarkCompleted && (
              <div className="mb-3 rounded-2xl border border-teal-100 bg-teal-50/60 px-3.5 py-3">
                <div className="font-bold text-[13px] text-teal-700">Finalizacion del trabajo</div>
                <div className="mt-1 text-[11.5px] text-teal-700/80 leading-snug">
                  Cuando el pago protegido interno este registrado, puedes marcar el trabajo como terminado al finalizar el servicio.
                </div>
                <button
                  type="button"
                  onClick={() => void completeJob()}
                  disabled={markingCompleted}
                  className="mt-3 rounded-full bg-coral-500 px-4 py-3 text-[13px] font-bold text-white disabled:opacity-40"
                >
                  {markingCompleted ? "Marcando terminado..." : "Marcar trabajo terminado"}
                </button>
              </div>
            )}

            {canConfirmCompletion && (
              <div className="mb-3 rounded-2xl border border-teal-100 bg-teal-50/60 px-3.5 py-3">
                <div className="font-bold text-[13px] text-teal-700">Finalizacion del trabajo</div>
                <div className="mt-1 text-[11.5px] text-teal-700/80 leading-snug">
                  El profesional ha marcado el trabajo como terminado. Confirma la finalizacion si todo esta correcto.
                </div>
                <button
                  type="button"
                  onClick={() => void releasePayment()}
                  disabled={confirmingCompletion}
                  className="mt-3 rounded-full bg-coral-500 px-4 py-3 text-[13px] font-bold text-white disabled:opacity-40"
                >
                  {confirmingCompletion ? "Liberando pago..." : "Confirmar finalizacion"}
                </button>
              </div>
            )}

            {isCompletedAndReleased && (
              <div className="mb-3 rounded-2xl border border-teal-100 bg-teal-50 px-3.5 py-3">
                <div className="font-bold text-[13px] text-teal-700">Trabajo completado</div>
                <div className="mt-1 text-[11.5px] text-teal-700/80 leading-snug">
                  El ciclo del acuerdo quedo cerrado. Todas las fases internas se completaron correctamente.
                </div>
              </div>
            )}
          </>
        ) : currentNegotiation ? (
          <div className="mb-3 rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3">
            <div className="font-bold text-[13px] text-amber-800">Oferta y negociacion</div>
            <div className="mt-1 text-[12px] text-amber-700">
              {currentNegotiation.proposedByRole === "professional"
                ? "El profesional envio la ultima propuesta final."
                : "El cliente envio la ultima contraoferta."}
            </div>
            <div className="mt-2 text-[15px] font-extrabold text-amber-800">
              {currentNegotiation.lastAmount !== null
                ? formatEuro(currentNegotiation.lastAmount)
                : "Sin importe"}
            </div>
            <div className="mt-2 text-[11.5px] text-amber-700/80 leading-snug">
              El rango orientativo del trabajo solo sirve como referencia. El precio final se acuerda aqui, dentro de Dersux.
            </div>
            <div className="mt-2 text-[11.5px] text-amber-700/80">
              Cliente: {currentNegotiation.clientAccepted ? "aceptado" : "pendiente"} · Profesional: {currentNegotiation.professionalAccepted ? "aceptado" : "pendiente"}
            </div>
          </div>
        ) : agreementContext?.status === "ready" ? (
          <div className="mb-3 rounded-2xl border border-sky-100 bg-sky-50 px-3.5 py-3 text-[12px] text-sky-800">
            <div className="font-bold text-[13px] text-sky-800">Sin presupuesto propuesto todavia</div>
            <div className="mt-1 leading-snug">
              El rango orientativo del trabajo solo sirve como referencia. El precio final se acuerda aqui, dentro de Dersux.
            </div>
          </div>
        ) : null}

        {profileRole === "professional" && isAwaitingProtectedPayment && (
          <div className="mb-3 rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-[12px] text-amber-800">
            <div className="font-bold text-[13px] text-amber-800">Pago protegido interno</div>
            <div className="mt-1 leading-snug">
              El acuerdo ya esta cerrado. Esperando que el cliente registre el pago protegido interno desde su panel de chat.
            </div>
          </div>
        )}

        {isAwaitingClientConfirmation && (
          <div className="mb-3 rounded-2xl border border-violet-100 bg-violet-50 px-3.5 py-3 text-[12px] text-violet-800">
            <div className="font-bold text-[13px] text-violet-800">Finalizacion pendiente</div>
            <div className="mt-1 leading-snug">
              El trabajo ya esta marcado como terminado. Esperando que el cliente confirme la finalizacion.
            </div>
          </div>
        )}

        {agreementContext?.status === "ready" && agreementContext.events.length > 0 && (
          <div className="mb-3 rounded-2xl border border-sand-200/70 bg-white px-3.5 py-3">
            <div className="font-bold text-[13px] text-ink-800">Historial de negociacion</div>
            <div className="mt-3 flex flex-col gap-2">
              {agreementContext.events.map((event) => (
                <div key={event.id} className="rounded-xl border border-sand-200/70 bg-sand-50 px-3 py-2">
                  <div className="text-[12px] font-semibold text-ink-800">
                    {getAgreementEventLabel(event)}
                    {event.amount !== null ? ` · ${formatEuro(event.amount)}` : ""}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-400">
                    {formatAgreementEventTime(event.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {canProposeAgreement && (
          <div className="mb-3 rounded-2xl border border-sand-200/70 bg-white p-3.5">
            <div className="font-bold text-[13px] text-ink-800">
              {currentNegotiation ? "Enviar contraoferta" : "Enviar presupuesto"}
            </div>
            <div className="mt-1 text-[12px] text-ink-500 leading-snug">
              {isProfessionalView
                ? "Envia un presupuesto final para que el cliente pueda aceptarlo o responder con una contraoferta."
                : "Puedes aceptar la oferta o enviar una contraoferta. El acuerdo final quedara registrado en la app."}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <label className="text-[12px] font-semibold text-ink-500">Importe propuesto (EUR)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={proposalAmount}
                onChange={(event) => setProposalAmount(event.target.value)}
                className="input-base"
                placeholder="Introduce el importe"
                disabled={submittingProposal || acceptingOffer}
              />
              {proposalAmount.trim() !== "" && !isProposalAmountValid && (
                <div className="text-[11px] text-rose-600">
                  Introduce un importe entero positivo en euros.
                </div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void submitAgreementProposal()}
                disabled={!isProposalAmountValid || submittingProposal || acceptingOffer}
                className="rounded-full bg-coral-500 px-4 py-3 text-[13px] font-bold text-white disabled:opacity-40"
              >
                {submittingProposal
                  ? "Guardando..."
                  : currentNegotiation
                    ? "Enviar contraoferta"
                    : "Enviar presupuesto"}
              </button>
              {canAcceptCurrentOffer && (
                <button
                  type="button"
                  onClick={() => void acceptCurrentOffer()}
                  disabled={acceptingOffer || submittingProposal}
                  className="rounded-full border-[1.5px] border-sand-200 bg-white px-4 py-3 text-[13px] font-bold text-ink-700 disabled:opacity-40"
                >
                  {acceptingOffer ? "Aceptando..." : "Aceptar oferta"}
                </button>
              )}
            </div>
          </div>
        )}

        {sendError && (
          <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[12.5px] text-rose-700">
            {sendError}
          </div>
        )}

        {sendNotice && (
          <div className="mb-3 rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-700">
            {sendNotice}
          </div>
        )}

        {thread.messages.length === 0 ? (
          <div className="rounded-2xl border border-sand-200/70 bg-white p-4 text-[13px] text-ink-600 leading-relaxed">
            {thread.statusMessage || "Todavía no hay mensajes en este chat."}
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            {thread.messages.map((message) => (
              <MessageBubble key={message.id} msg={message} selfRole={role} />
            ))}
          </div>
        )}
      </ScreenBody>

      {profileRole === "admin" ? (
        <div className="app-bottom-bar-compact px-4 pt-2 pb-3 bg-white border-t border-sand-200/70 text-[12px] text-ink-500">
          Vista de solo lectura para admin en esta fase.
        </div>
      ) : (
        <div className="app-bottom-bar-compact px-3 pt-2 pb-3 bg-white border-t border-sand-200/70">
          <div className="flex items-end gap-2">
            <div className="flex-1 flex items-center gap-1 bg-sand-100 rounded-3xl px-3 py-2">
              <textarea
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Escribe un mensaje…"
                className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 resize-none max-h-24"
                disabled={!canSendRealMessage || sendingMessage}
              />
            </div>
            <button
              onClick={() => void send()}
              disabled={!canSendRealMessage || !input.trim() || sendingMessage}
              data-testid="chat-send-message"
              className="w-10 h-10 rounded-full bg-coral-500 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            >
              <Icon name="send" size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Inner({ jobId }: { jobId: string }) {
  const session = useSession();
  const currentProfessionalId = getCurrentProfessionalId(session);
  const adminConfig = useSession(getEffectiveAdminConfig);
  const agreement = useSession((s) => getAgreementByJobId(s, jobId));
  const negotiation = useSession((s) => getNegotiationByJobId(s, jobId));
  const submitNegotiationProposal = useSession((s) => s.submitNegotiationProposal);
  const acceptNegotiation = useSession((s) => s.acceptNegotiation);
  const sessionRole = useSession((s) => s.role);
  const proStatus = useSession((s) => s.proStatus);
  const ensureChatForAcceptedJob = useSession((s) => s.ensureChatForAcceptedJob);
  const sendChatMessage = useSession((s) => s.sendChatMessage);
  const recordModerationFlag = useSession((s) => s.recordModerationFlag);
  const effectiveJob = getEffectiveJobById(session, jobId);
  const role = sessionRole === "professional" ? "pro" : "client";
  const job = effectiveJob ?? jobs[0];
  const jobChat = getChatForJob(session, jobId);
  const persistedMessages = jobChat ? getMessagesForChat(session, jobChat.id) : [];
  const resolvedAgreement = getAgreement(agreement);
  const activeNegotiation = getActiveNegotiation(negotiation);
  const agreementExists = hasAgreement(resolvedAgreement);
  const pro = job.assignedProId
    ? professionals.find((p) => p.id === job.assignedProId) ?? professionals[0]
    : professionals[0];
  const chatEnabled = canAccessChat({
    role: sessionRole,
    proStatus,
    jobStatus: job.status,
    assignedProId: job.assignedProId,
    currentProfessionalId,
  });
  const other =
    role === "pro"
      ? { name: job.clientName, avatar: job.clientAvatar, subtitle: "Cliente" }
      : { name: pro.name, avatar: pro.avatar, subtitle: pro.specialty };
  const canPropose = canProposePrice({
    role: sessionRole,
    jobStatus: job.status,
    hasAgreement: agreementExists,
    chatEnabled,
  });

  useEffect(() => {
    if (chatEnabled) {
      ensureChatForAcceptedJob(jobId);
    }
  }, [chatEnabled, ensureChatForAcceptedJob, jobId]);

  const seed = useMemo(
    () => chatMessages.filter((m) => m.jobId === jobId),
    [jobId],
  );
  const [input, setInput] = useState("");
  const [showProposal, setShowProposal] = useState(false);
  const [blockedNotice, setBlockedNotice] = useState<string | null>(null);
  const [proposal, setProposal] = useState(
    String(Math.round((job.priceMin + job.priceMax) / 2)),
  );

  const liveLeaks = (input ? scanLeaks(input) : []).filter((leak) =>
    isLeakAllowed(leak.type, adminConfig),
  );
  const canAcceptCurrentOffer = Boolean(
    activeNegotiation?.lastAmount &&
      ((role === "client" && !activeNegotiation.clientAccepted) ||
        (role === "pro" && !activeNegotiation.proAccepted)),
  );

  const derivedMessages = useMemo<ChatMessage[]>(() => {
    const historyMessages = (negotiation?.history ?? []).map((entry, index) => {
      const author = entry.by === "pro" ? pro.name.split(" ")[0] : "El cliente";
      const text =
        entry.type === "accept"
          ? `${author} aceptó la propuesta`
          : entry.type === "counteroffer"
            ? `${author} envió una contraoferta`
            : `${author} envió una propuesta`;

      return {
        id: `neg-${jobId}-${index}`,
        jobId,
        from: "system",
        text,
        time: "ahora",
        timestamp: entry.at,
        type: entry.type === "accept" ? "system" : "proposal",
        proposalAmount: entry.amount,
      } satisfies ChatMessage;
    });

    if (!resolvedAgreement) return historyMessages;

    return [
      ...historyMessages,
      {
        id: `agr-${jobId}`,
        jobId,
        from: "system",
        text: `Acuerdo creado · comisión ${resolvedAgreement.commissionPct}%`,
        time: "ahora",
        timestamp: resolvedAgreement.createdAt,
        type: "agreement",
        proposalAmount: resolvedAgreement.finalPrice,
      },
    ];
  }, [jobId, negotiation, pro.name, resolvedAgreement]);

  const history = [
    ...(seed.length > 0
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
          } satisfies ChatMessage,
        ]),
    ...derivedMessages,
    ...persistedMessages,
  ];

  const send = () => {
    const text = input.trim();
    if (!text) return;
    if (liveLeaks.length > 0 || !jobChat) {
      if (liveLeaks.length > 0) {
        recordModerationFlag({
          jobId,
          chatId: jobChat?.id,
          senderRole: sessionRole === "professional" ? "professional" : "client",
          senderId: sessionRole === "professional" ? session.currentProfessionalId : session.currentClientId,
          text,
          redactedText: redactLeaks(text),
          leakTypes: Array.from(new Set(liveLeaks.map((leak) => leak.type))),
        });
      }

      setBlockedNotice(
        liveLeaks.length > 0
          ? "Bloqueamos este mensaje porque contiene datos de contacto o enlaces externos."
          : "El chat todavía no está listo para este trabajo en la demo.",
      );
      return;
    }

    const sent = sendChatMessage(
      jobChat.id,
      text,
      sessionRole === "professional" ? "professional" : "client",
    );
    if (!sent) {
      setBlockedNotice("No se pudo enviar el mensaje en esta demo.");
      return;
    }

    setBlockedNotice(null);
    setInput("");
  };

  const sendProposal = () => {
    const amount = Number(proposal || 0);
    if (!amount || !canPropose) return;
    submitNegotiationProposal(jobId, role, amount);
    setShowProposal(false);
  };

  const acceptCurrentOffer = () => {
    if (!canAcceptCurrentOffer) return;
    acceptNegotiation(jobId, role);
  };

  if (!chatEnabled) {
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
            {sessionRole === "professional" && !isProfessionalOperative(sessionRole, proStatus)
              ? "Tu cuenta profesional todavía no puede operar. Necesitas aprobación para acceder al chat."
              : "El chat solo se abre cuando el cliente acepta al profesional."}
          </div>
        </ScreenBody>
      </div>
    );
  }

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

        {resolvedAgreement && (
          <div className="mb-3 rounded-2xl border border-teal-100 bg-teal-50 px-3.5 py-3 text-[12.5px] text-teal-700">
            <div className="font-bold">Acuerdo cerrado</div>
            <div className="mt-1">
              Precio final {formatEuro(resolvedAgreement.finalPrice)} · comisión snapshot {resolvedAgreement.commissionPct}%
            </div>
          </div>
        )}

        {!resolvedAgreement && activeNegotiation?.lastAmount && (
          <div className="mb-3 rounded-2xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-700">
            <div className="font-bold">Oferta actual</div>
            <div className="mt-1 mb-3">
              {formatEuro(activeNegotiation.lastAmount)} · {activeNegotiation.proposedBy === "pro" ? pro.name.split(" ")[0] : "Cliente"}
            </div>
            <div className="flex gap-2">
              {canAcceptCurrentOffer && (
                <button
                  onClick={acceptCurrentOffer}
                  className="flex-1 rounded-full bg-white px-4 py-2 text-[12px] font-bold text-amber-700 border border-amber-200"
                >
                  Aceptar propuesta
                </button>
              )}
              {canPropose && (
                <button
                  onClick={() => {
                    setProposal(String(activeNegotiation.lastAmount));
                    setShowProposal((value) => !value);
                  }}
                  className="flex-1 rounded-full bg-amber-500 px-4 py-2 text-[12px] font-bold text-white"
                >
                  Hacer contraoferta
                </button>
              )}
            </div>
          </div>
        )}

          <div className="flex-1 min-h-0 flex flex-col">
            {history.map((m) => (
              <MessageBubble key={m.id} msg={m} selfRole={role} />
            ))}
          </div>
        </ScreenBody>

      {(liveLeaks.length > 0 || blockedNotice) && (
        <div>
          {liveLeaks.length > 0 && <AntiLeakAlert leaks={liveLeaks} />}
          {blockedNotice && (
            <div
              className="border-t border-sand-200/70 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-700"
              data-testid="chat-leak-blocked-message"
            >
              {blockedNotice}
            </div>
          )}
        </div>
      )}

      {showProposal && canPropose && (
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
            onClick={() => {
              if (!canPropose) return;
              setProposal(String(activeNegotiation?.lastAmount ?? Math.round((job.priceMin + job.priceMax) / 2)));
              setShowProposal(!showProposal);
            }}
            disabled={!canPropose}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              showProposal
                ? "bg-coral-500 text-white"
                : "bg-sand-100 text-ink-600"
            } disabled:opacity-40`}
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
            data-testid="chat-send-message"
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

  if (isSupabaseMode()) {
    return <SupabaseInner jobId={jobId} />;
  }

  return <Inner jobId={jobId} />;
}
