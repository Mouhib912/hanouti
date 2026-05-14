import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (Platform.OS === "web") {
        const apiUser = await Api.getMe();
        setUser(apiUser);
        if (apiUser) await Auth.setUserInfo(apiUser);
        else await Auth.clearUserInfo();
        return;
      }

      const sessionToken = await Auth.getSessionToken();
      if (!sessionToken) {
        setUser(null);
        return;
      }

      const cached = await Auth.getUserInfo();
      if (cached) {
        setUser(cached);
      } else {
        const apiUser = await Api.getMe();
        setUser(apiUser);
        if (apiUser) await Auth.setUserInfo(apiUser);
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Failed to fetch user");
      setError(e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    setError(null);
    const u = await Api.login(phone, password);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (input: Api.RegisterInput) => {
    setError(null);
    const u = await Api.register(input);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch (err) {
      console.error("[Auth] Logout failed:", err);
    } finally {
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    if (!autoFetch) {
      setLoading(false);
      return;
    }
    if (Platform.OS === "web") {
      refresh();
    } else {
      Auth.getUserInfo().then((cached) => {
        if (cached) {
          setUser(cached);
          setLoading(false);
        } else {
          refresh();
        }
      });
    }
  }, [autoFetch, refresh]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh,
    login,
    register,
    logout,
  };
}
