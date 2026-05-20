"use client";
import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/input";
import {
  listAdminDisputes,
  resolveDispute as resolveRealDispute,
  type ApiDispute,
} from "@/lib/api/disputes";
import {
  getEffectiveDisputes,
  getEffectiveJobs,
  useSession,
} from "@/lib/store";
import { isSupabaseMode } from "@/lib/supabase/config";

function SupabaseAdminDisputasPage() {
  const [disputes, setDisputes] = useState<ApiDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadDisputes() {
      setLoading(true);
      setPageError(null);

      try {
        const nextDisputes = await listAdminDisputes();

        if (!isCancelled) {
          setDisputes(nextDisputes);
        }
      } catch (error) {
        if (!isCancelled) {
          setDisputes([]);
          setPageError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar las disputas reales.",
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadDisputes();

    return () => {
      isCancelled = true;
    };
  }, [reloadKey]);

  const resolveDispute = async (
    disputeId: string,
    action: "release_to_professional" | "refund_to_client",
  ) => {
    const key = `${disputeId}:${action}`;
    if (resolvingKey) {
      return;
    }

    setActionError(null);
    setActionNotice(null);
    setResolvingKey(key);

    try {
      await resolveRealDispute(disputeId, action, resolutionNotes[disputeId] ?? "");
      setActionNotice(
        action === "release_to_professional"
          ? "Disputa resuelta a favor del profesional."
          : "Disputa resuelta a favor del cliente.",
      );
      setReloadKey((currentValue) => currentValue + 1);
    } catch (error) {
      setActionError(
        error instanceof Error && error.message
          ? error.message
          : "No pudimos resolver la disputa. Inténtalo de nuevo.",
      );
    } finally {
      setResolvingKey(null);
    }
  };

  const getResolutionCopy = (status: ApiDispute["status"]) => {
    if (status === "resolved_client") {
      return "Resuelta a favor del cliente";
    }
    if (status === "resolved_professional") {
      return "Resuelta a favor del profesional";
    }
    if (status === "under_review") {
      return "En revisión";
    }
    return status === "cancelled" ? "Cancelada" : "Abierta";
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Disputas" subtitle={`${disputes.length} registradas`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        {loading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Estamos cargando las disputas reales.
          </Card>
        )}

        {pageError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {pageError}
          </Card>
        )}

        {actionError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {actionError}
          </Card>
        )}

        {actionNotice && (
          <Card className="mb-3 bg-teal-50 border-teal-100 text-[12px] text-teal-700 leading-snug">
            {actionNotice}
          </Card>
        )}

        <div className="flex flex-col gap-2">
          {disputes.map((d) => {
            const isOpen = d.status === "open" || d.status === "under_review";
            return (
              <div key={d.id} data-testid={`admin-dispute-${d.jobId}`}>
                <Card>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {getResolutionCopy(d.status)}
                    </span>
                    <span className="text-[10.5px] text-ink-400 ml-auto">
                      Trabajo {d.jobId} · abre por {d.openedByRole}
                    </span>
                  </div>
                  <div className="font-bold text-[14px] text-ink-800 mb-1 leading-tight">
                    {d.reason}
                  </div>
                  {d.description && (
                    <div className="text-[12px] text-ink-500 leading-snug mb-3 bg-sand-50 rounded-xl p-3 border border-sand-200/70">
                      {d.description}
                    </div>
                  )}
                  <div className="mb-3 text-[11.5px] text-ink-500">
                    Estado actual: <strong className="text-ink-700">{d.status}</strong> · Abierta {new Date(d.openedAt).toLocaleString("es-ES")}
                  </div>
                  {isOpen ? (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        label="Nota de resolución (opcional)"
                        value={resolutionNotes[d.id] ?? ""}
                        onChange={(event) =>
                          setResolutionNotes((currentValue) => ({
                            ...currentValue,
                            [d.id]: event.target.value,
                          }))
                        }
                        rows={3}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          full
                          variant="outline"
                          onClick={() => void resolveDispute(d.id, "refund_to_client")}
                          disabled={Boolean(resolvingKey)}
                        >
                          {resolvingKey === `${d.id}:refund_to_client`
                            ? "Resolviendo..."
                            : "Resolver a favor del cliente"}
                        </Button>
                        <Button
                          size="sm"
                          full
                          variant="outline"
                          onClick={() => void resolveDispute(d.id, "release_to_professional")}
                          disabled={Boolean(resolvingKey)}
                        >
                          {resolvingKey === `${d.id}:release_to_professional`
                            ? "Resolviendo..."
                            : "Resolver a favor del profesional"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11.5px] text-teal-700 font-semibold bg-teal-50 rounded-xl px-3 py-2">
                      {getResolutionCopy(d.status)}
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
          {!loading && disputes.length === 0 && (
            <div className="text-center py-16 text-ink-400 text-[12.5px]">
              No hay disputas activas.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

function MockAdminDisputasPage() {
  const session = useSession();
  const list = useSession(getEffectiveDisputes);
  const jobs = useMemo(() => getEffectiveJobs(session), [session]);
  const resolveDispute = useSession((s) => s.resolveDispute);

  const getResolutionCopy = (status: (typeof list)[number]["status"], jobStatus?: string) => {
    if (status === "resolved_client") {
      return jobStatus === "cancelled"
        ? "Resuelta a favor del cliente · trabajo cancelado en la demo"
        : "Resuelta a favor del cliente";
    }
    if (status === "resolved_pro") {
      return jobStatus === "completed"
        ? "Resuelta a favor del profesional · trabajo completado en la demo"
        : "Resuelta a favor del profesional";
    }
    if (status === "split") {
      return jobStatus === "completed"
        ? "Resolución dividida · trabajo completado en la demo"
        : "Resolución dividida";
    }
    return status === "reviewing" ? "En revisión" : "Abierta";
  };

  return (
    <div className="flex-1 flex flex-col bg-sand-50">
      <StatusBar />
      <TopBar title="Disputas" subtitle={`${list.length} registradas`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <div className="flex flex-col gap-2">
          {list.map((d) => {
            const job = jobs.find((j) => j.id === d.jobId);
            const isOpen = d.status === "open" || d.status === "reviewing";
            return (
              <div key={d.id} data-testid={`admin-dispute-${d.jobId}`}>
              <Card>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {d.status === "open"
                      ? "Abierta"
                      : d.status === "reviewing"
                      ? "En revisión"
                      : d.status === "resolved_client"
                      ? "A favor cliente"
                      : d.status === "resolved_pro"
                      ? "A favor pro"
                      : "Dividida"}
                  </span>
                  <span className="text-[10.5px] text-ink-400 ml-auto">
                    Trabajo {d.jobId} · abre por {d.openedBy === "client" ? "cliente" : "profesional"}
                  </span>
                </div>
                <div className="font-bold text-[14px] text-ink-800 mb-1 leading-tight">
                  {job?.title ?? d.reason}
                </div>
                <div className="text-[12.5px] text-ink-600 leading-snug mb-2">
                  <strong>Motivo:</strong> {d.reason}
                </div>
                <div className="text-[12px] text-ink-500 leading-snug mb-3 bg-sand-50 rounded-xl p-3 border border-sand-200/70">
                  {d.description}
                </div>
                {job && (
                  <div className="mb-3 text-[11.5px] text-ink-500">
                    Estado actual del trabajo: <strong className="text-ink-700">{job.status}</strong>
                  </div>
                )}
                {d.evidence && d.evidence.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-3 text-[11.5px] text-ink-500">
                    <Icon name="image" size={14} />
                    {d.evidence.length} evidencia
                    {d.evidence.length === 1 ? "" : "s"} adjunta
                    {d.evidence.length === 1 ? "" : "s"}
                  </div>
                )}
                {isOpen ? (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        full
                        variant="outline"
                        onClick={() => resolveDispute(d.id, "resolved_client")}
                      >
                        A favor cliente
                      </Button>
                      <Button
                        size="sm"
                        full
                        variant="outline"
                        onClick={() => resolveDispute(d.id, "resolved_pro")}
                      >
                        A favor pro
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      full
                      onClick={() => resolveDispute(d.id, "split")}
                    >
                      Dividir responsabilidad
                    </Button>
                  </div>
                ) : (
                  <div className="text-[11.5px] text-teal-700 font-semibold bg-teal-50 rounded-xl px-3 py-2">
                    {getResolutionCopy(d.status, job?.status)}
                  </div>
                )}
              </Card>
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="text-center py-16 text-ink-400 text-[12.5px]">
              No hay disputas activas.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

export default function AdminDisputasPage() {
  if (isSupabaseMode()) {
    return <SupabaseAdminDisputasPage />;
  }

  return <MockAdminDisputasPage />;
}
