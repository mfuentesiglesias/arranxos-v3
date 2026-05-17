import type { Session, User } from "@supabase/supabase-js";

import { getDataMode, isSupabaseMode } from "@/lib/supabase/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  createServerSupabaseClient,
  type ServerSupabaseClientOptions,
} from "@/lib/supabase/server";

export interface ApiAuthUser {
  id: string;
  email: string | null;
}

export interface ApiAuthSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  user: ApiAuthUser;
}

export interface SignInWithPasswordInput {
  email: string;
  password: string;
}

export interface AuthRequestOptions extends ServerSupabaseClientOptions {}

function mapAuthUser(user: User): ApiAuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
  };
}

function mapAuthSession(session: Session): ApiAuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token ?? null,
    expiresAt: session.expires_at ?? null,
    user: mapAuthUser(session.user),
  };
}

function getAuthDisabledMessage(feature: string): string {
  return `${feature} is unavailable while NEXT_PUBLIC_DATA_MODE=${getDataMode()}.`;
}

export async function getCurrentSession(
  options: AuthRequestOptions = {},
): Promise<ApiAuthSession | null> {
  if (!isSupabaseMode()) {
    return null;
  }

  if (typeof window !== "undefined" && !options.accessToken) {
    const client = getBrowserSupabaseClient();
    const { data, error } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    return data.session ? mapAuthSession(data.session) : null;
  }

  if (!options.accessToken) {
    return null;
  }

  const client = createServerSupabaseClient(options);
  const { data, error } = await client.auth.getUser(options.accessToken);

  if (error) {
    throw error;
  }

  if (!data.user) {
    return null;
  }

  return {
    accessToken: options.accessToken,
    refreshToken: null,
    expiresAt: null,
    user: mapAuthUser(data.user),
  };
}

export async function getCurrentUser(
  options: AuthRequestOptions = {},
): Promise<ApiAuthUser | null> {
  const session = await getCurrentSession(options);
  return session?.user ?? null;
}

export async function signInWithPassword(
  input: SignInWithPasswordInput,
): Promise<ApiAuthSession> {
  if (!isSupabaseMode()) {
    throw new Error(getAuthDisabledMessage("signInWithPassword()"));
  }

  const client =
    typeof window !== "undefined"
      ? getBrowserSupabaseClient()
      : createServerSupabaseClient();

  const { data, error } = await client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error("Supabase sign-in did not return a session.");
  }

  return mapAuthSession(data.session);
}

export async function signOut(options: AuthRequestOptions = {}): Promise<void> {
  if (!isSupabaseMode()) {
    return;
  }

  const client =
    typeof window !== "undefined" && !options.accessToken
      ? getBrowserSupabaseClient()
      : createServerSupabaseClient(options);

  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}
