"use client";
import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { ScreenBody } from "@/components/layout/screen-body";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import {
  getAdminUsers,
  type ApiAdminUserListItem,
} from "@/lib/api/adminUsers";
import { currentClient } from "@/lib/data";
import { isSupabaseMode } from "@/lib/supabase/config";
import {
  getEffectiveDisputes,
  getEffectiveJobs,
  getEffectiveModerationFlags,
  getEffectiveReviews,
  useSession,
} from "@/lib/store";

type ClientActivityRow = {
  id: string;
  name: string;
  avatar: string;
  roleLabel: "Cliente";
  email?: string;
  location?: string;
  jobsPublished: number;
  disputes: number;
  moderationFlags: number;
  reviewsReceived: number;
  lastActivityAt?: string;
  lastActivityLabel: string;
};

type UserRoleFilter = "all" | "client" | "professional" | "admin";

const USER_ROLE_FILTERS: { id: UserRoleFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "client", label: "Clientes" },
  { id: "professional", label: "Pros" },
  { id: "admin", label: "Admins" },
];

function formatUserCreatedAt(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getShortId(value: string) {
  return value.slice(0, 8);
}

function getRoleLabel(role: ApiAdminUserListItem["role"]) {
  if (role === "professional") {
    return "Profesional";
  }

  if (role === "admin") {
    return "Admin";
  }

  return "Cliente";
}

function getProfessionalStatusLabel(status: ApiAdminUserListItem["professionalStatus"]) {
  if (status === "approved") {
    return "Aprobado";
  }

  if (status === "blocked") {
    return "Bloqueado";
  }

  if (status === "pending") {
    return "Pendiente";
  }

  return null;
}

function SupabaseAdminUsuariosPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<UserRoleFilter>("all");
  const [users, setUsers] = useState<ApiAdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadUsers() {
      setLoading(true);
      setPageError(null);

      try {
        const nextUsers = await getAdminUsers();

        if (!isCancelled) {
          setUsers(nextUsers ?? []);
        }
      } catch (error) {
        if (!isCancelled) {
          setUsers([]);
          setPageError(
            error instanceof Error && error.message
              ? error.message
              : "No pudimos cargar los perfiles reales.",
          );
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      isCancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = filter === "all" || user.role === filter;
      const query = q.trim().toLowerCase();
      const haystack = [
        user.fullName,
        user.id,
        user.role,
        user.professionalStatus ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return matchesRole && (!query || haystack.includes(query));
    });
  }, [filter, q, users]);

  return (
    <div className="flex-1 flex flex-col bg-sand-50" data-testid="admin-users-page">
      <StatusBar />
      <TopBar title="Usuarios" subtitle={loading ? "Cargando perfiles reales..." : `${users.length} perfiles reales`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <Card className="mb-3 border-teal-100 bg-teal-50/40">
          <div className="font-bold text-[13px] text-teal-700 mb-1">Perfiles reales Supabase</div>
          <div className="text-[11.5px] text-teal-700/80 leading-snug">
            Solo lectura · sin emails ni teléfonos.
          </div>
        </Card>

        {loading && (
          <Card className="mb-3 text-[12px] text-ink-600 leading-snug">
            Estamos cargando los perfiles reales.
          </Card>
        )}

        {pageError && (
          <Card className="mb-3 bg-rose-50 border-rose-100 text-[12px] text-rose-700 leading-snug">
            {pageError}
          </Card>
        )}

        <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 mb-3 border border-sand-200/70">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, id o rol..."
            data-testid="admin-users-search"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>

        <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
          {USER_ROLE_FILTERS.map((option) => {
            const selected = filter === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border-[1.5px] whitespace-nowrap ${
                  selected
                    ? "border-coral-500 bg-coral-50 text-coral-700"
                    : "border-sand-200 text-ink-500 bg-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map((user) => {
            const professionalStatusLabel = getProfessionalStatusLabel(user.professionalStatus);

            return (
              <Card key={user.id} className="!p-3" testId={`admin-user-row-${user.id}`}>
                <div className="flex items-center gap-3">
                  <Avatar initials={user.avatarInitials ?? user.fullName.slice(0, 2).toUpperCase()} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13.5px] text-ink-800 truncate">
                      {user.fullName}
                    </div>
                    <div className="text-[11.5px] text-ink-500 truncate">
                      {getRoleLabel(user.role)} · {getShortId(user.id)}
                      {professionalStatusLabel ? ` · ${professionalStatusLabel}` : ""}
                    </div>
                    <div className="mt-1 text-[11px] text-ink-400 truncate">
                      Alta: {formatUserCreatedAt(user.createdAt)}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-10 text-ink-400 text-[12.5px]">
              Sin resultados.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

function MockAdminUsuariosPage() {
  const [q, setQ] = useState("");
  const session = useSession();
  const effectiveJobs = useMemo(() => getEffectiveJobs(session), [session]);
  const effectiveDisputes = useMemo(() => getEffectiveDisputes(session), [session]);
  const effectiveReviews = useMemo(() => getEffectiveReviews(session), [session]);
  const effectiveModerationFlags = useMemo(() => getEffectiveModerationFlags(session), [session]);

  const users = useMemo<ClientActivityRow[]>(() => {
    const clientIds = new Set<string>([currentClient.id]);
    effectiveJobs.forEach((job) => clientIds.add(job.clientId));

    return Array.from(clientIds)
      .map((clientId) => {
        const clientJobs = effectiveJobs.filter((job) => job.clientId === clientId);
        const latestJob = clientJobs
          .slice()
          .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())[0];
        const clientDisputes = effectiveDisputes.filter((dispute) =>
          clientJobs.some((job) => job.id === dispute.jobId),
        );
        const clientReviews = effectiveReviews.filter(
          (review) => review.targetType === "client" && review.targetId === clientId,
        );
        const clientModerationFlags = effectiveModerationFlags.filter(
          (flag) => flag.senderRole === "client" && flag.senderId === clientId,
        );
        const activityDates = [
          ...clientJobs.map((job) => job.postedAt),
          ...clientDisputes.map((dispute) => dispute.openedAt),
          ...clientModerationFlags.map((flag) => flag.createdAt),
          ...clientReviews
            .map((review) => review.createdAt)
            .filter((createdAt): createdAt is string => Boolean(createdAt)),
        ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const lastActivityAt = activityDates[0];

        return {
          id: clientId,
          name: clientId === currentClient.id ? currentClient.name : latestJob?.clientName ?? clientId,
          avatar: clientId === currentClient.id ? currentClient.avatar : latestJob?.clientAvatar ?? "??",
          roleLabel: "Cliente",
          email: clientId === currentClient.id ? currentClient.email : undefined,
          location: clientId === currentClient.id ? currentClient.location : latestJob?.location,
          jobsPublished: clientJobs.length,
          disputes: clientDisputes.length,
          moderationFlags: clientModerationFlags.length,
          reviewsReceived: clientReviews.length,
          lastActivityAt,
          lastActivityLabel: latestJob
            ? `Trabajo · ${latestJob.title}`
            : clientDisputes[0]
              ? `Disputa · ${clientDisputes[0].reason}`
              : clientModerationFlags[0]
                ? "Moderación en chat"
                : clientReviews[0]
                  ? `Valoración · ${clientReviews[0].date}`
                  : "Sin actividad derivada",
        } satisfies ClientActivityRow;
      })
      .sort((a, b) => {
        if (!a.lastActivityAt && !b.lastActivityAt) return a.name.localeCompare(b.name);
        if (!a.lastActivityAt) return 1;
        if (!b.lastActivityAt) return -1;
        return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
      });
  }, [effectiveDisputes, effectiveJobs, effectiveModerationFlags, effectiveReviews]);

  const filtered = users.filter(
    (user) =>
      !q ||
      user.name.toLowerCase().includes(q.toLowerCase()) ||
      user.id.toLowerCase().includes(q.toLowerCase()) ||
      (user.location ?? "").toLowerCase().includes(q.toLowerCase()) ||
      user.lastActivityLabel.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="flex-1 flex flex-col bg-sand-50" data-testid="admin-users-page">
      <StatusBar />
      <TopBar title="Usuarios" subtitle={`${users.length} clientes efectivos`} />
      <ScreenBody className="px-4 pt-3 pb-6">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-3.5 py-2.5 mb-3 border border-sand-200/70">
          <Icon name="search" size={16} stroke={2.2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente…"
            data-testid="admin-users-search"
            className="flex-1 bg-transparent outline-none text-[14px] text-ink-800 placeholder:text-ink-400"
          />
        </div>
        <div className="flex flex-col gap-2">
          {filtered.map((u) => (
            <Card key={u.id} className="!p-3" testId={`admin-user-row-${u.id}`}>
              <div className="flex items-center gap-3">
                <Avatar initials={u.avatar} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13.5px] text-ink-800 truncate">
                    {u.name}
                  </div>
                  <div className="text-[11.5px] text-ink-500 truncate">
                    {u.roleLabel} · {u.id} · {u.email ?? "—"} · {u.location ?? "—"}
                  </div>
                  <div
                    className="mt-1 text-[11px] text-ink-400 truncate"
                    data-testid={`admin-user-activity-${u.id}`}
                  >
                    {u.lastActivityLabel}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-ink-400" data-testid={`admin-user-jobs-${u.id}`}>
                    {u.jobsPublished} trabajos
                  </div>
                  {(u.disputes > 0 || u.moderationFlags > 0 || u.reviewsReceived > 0) && (
                    <div className="text-[11px] text-amber-700 font-bold">
                      {u.disputes} disputa{u.disputes === 1 ? "" : "s"} · {u.moderationFlags} flag{u.moderationFlags === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-ink-400 text-[12.5px]">
              Sin resultados.
            </div>
          )}
        </div>
      </ScreenBody>
    </div>
  );
}

export default function AdminUsuariosPage() {
  return isSupabaseMode() ? <SupabaseAdminUsuariosPage /> : <MockAdminUsuariosPage />;
}
