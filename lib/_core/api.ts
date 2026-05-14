import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "./auth";

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const sessionToken = await Auth.getSessionToken();
  if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;

  const baseUrl = getApiBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${cleanBaseUrl}${cleanEndpoint}` : endpoint;

  const response = await fetch(url, { ...options, headers, credentials: "include" });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorText;
    } catch {
      // Not JSON
    }
    throw new Error(errorMessage || `API call failed: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

type AuthResponse = {
  sessionToken: string;
  user: {
    id: number;
    phone: string;
    name: string | null;
    role: string;
    lastSignedIn: string;
    userType: "provider" | "buyer" | null;
    businessName: string | null;
    avatarUrl: string | null;
  };
};

export type RegisterInput = {
  phone: string;
  password: string;
  name: string;
  userType: "provider" | "buyer";
  businessName: string;
  location?: string;
  avatarUrl?: string;
};

function toAuthUser(raw: AuthResponse["user"]): Auth.User {
  return {
    id: raw.id,
    phone: raw.phone,
    name: raw.name,
    role: raw.role,
    lastSignedIn: new Date(raw.lastSignedIn),
    userType: raw.userType,
    businessName: raw.businessName,
    avatarUrl: raw.avatarUrl,
  };
}

export async function register(input: RegisterInput): Promise<Auth.User> {
  const result = await apiCall<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  await Auth.setSessionToken(result.sessionToken);
  const user = toAuthUser(result.user);
  await Auth.setUserInfo(user);
  return user;
}

export async function login(phone: string, password: string): Promise<Auth.User> {
  const result = await apiCall<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
  await Auth.setSessionToken(result.sessionToken);
  const user = toAuthUser(result.user);
  await Auth.setUserInfo(user);
  return user;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiCall<{ success: true }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function deleteAccount(password: string): Promise<void> {
  await apiCall<{ success: true }>("/api/auth/delete-account", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  await Auth.removeSessionToken();
  await Auth.clearUserInfo();
}

export async function logout(): Promise<void> {
  try {
    await apiCall<void>("/api/auth/logout", { method: "POST" });
  } finally {
    await Auth.removeSessionToken();
    await Auth.clearUserInfo();
  }
}

export async function getMe(): Promise<Auth.User | null> {
  try {
    const result = await apiCall<{ user: AuthResponse["user"] | null }>("/api/auth/me");
    return result.user ? toAuthUser(result.user) : null;
  } catch (error) {
    console.error("[API] getMe failed:", error);
    return null;
  }
}

export type UploadedImage = { url: string };

/**
 * Avatar upload — no auth required (used during signup before a session exists).
 */
export async function uploadAvatar(
  uri: string,
  fileName: string,
  mimeType: string,
): Promise<UploadedImage> {
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, fileName);
  } else {
    form.append("file", {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
  }

  const baseUrl = getApiBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const url = baseUrl ? `${cleanBaseUrl}/api/uploads/avatar` : "/api/uploads/avatar";

  const response = await fetch(url, {
    method: "POST",
    body: form,
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      message = JSON.parse(text).error ?? text;
    } catch {}
    throw new Error(message || `Upload failed: ${response.statusText}`);
  }

  return (await response.json()) as UploadedImage;
}

export async function uploadProductImage(
  uri: string,
  fileName: string,
  mimeType: string,
): Promise<UploadedImage> {
  const headers: Record<string, string> = {};
  const sessionToken = await Auth.getSessionToken();
  if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;

  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, fileName);
  } else {
    form.append("file", {
      uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
  }

  const baseUrl = getApiBaseUrl();
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const url = baseUrl ? `${cleanBaseUrl}/api/uploads/product-image` : "/api/uploads/product-image";

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: form,
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      message = JSON.parse(text).error ?? text;
    } catch {
      // not JSON
    }
    throw new Error(message || `Upload failed: ${response.statusText}`);
  }

  return (await response.json()) as UploadedImage;
}

export function resolveImageUrl(relativeOrAbsolute: string | null | undefined): string | null {
  if (!relativeOrAbsolute) return null;
  if (/^https?:\/\//i.test(relativeOrAbsolute)) return relativeOrAbsolute;
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return relativeOrAbsolute;
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = relativeOrAbsolute.startsWith("/")
    ? relativeOrAbsolute
    : `/${relativeOrAbsolute}`;
  return `${cleanBase}${cleanPath}`;
}
