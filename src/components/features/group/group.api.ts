import type { paths } from "@/api/types";
import type { Group, GroupsPageData, GroupRole } from "./types";

type GetGroupsResponse =
  | paths["/api/group"]["get"]["responses"][200]["content"]["application/json"]
  | paths["/api/group"]["get"]["responses"][200]["content"]["text/json"]
  | paths["/api/group"]["get"]["responses"][200]["content"]["text/plain"];

type GroupListResponse = NonNullable<GetGroupsResponse["data"]>;
type GroupSections = NonNullable<GroupListResponse["sections"]>;
type SubscriptionInfo = NonNullable<GroupListResponse["subscription"]>;
type GroupCardDto = NonNullable<NonNullable<GroupSections["favorites"]>[number]>;

function getToken() {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

function toInitials(firstName?: string | null, lastName?: string | null) {
  const f = (firstName || "").trim();
  const l = (lastName || "").trim();
  const a = f ? f[0].toUpperCase() : "";
  const b = l ? l[0].toUpperCase() : "";
  const res = `${a}${b}`.trim();
  return res || "U";
}

function toShortCode(name: string) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function mapRole(role?: string | null): GroupRole {
  const r = (role || "").toLowerCase().trim();
  if (r.includes("owner")) return "owner";
  if (r.includes("moderator")) return "moderator";
  if (r.includes("member")) return "member";
  if (r === "admin") return "owner";
  return "member";
}

function mapGroup(item: GroupCardDto): Group {
  const name = item.name || "";
  const preview = item.membersPreview || [];

  return {
    id: item.id || "",
    title: name,
    description: item.description || "",
    role: mapRole(item.role),
    membersCount: item.memberCount ?? 0,
    tasksCount: item.taskCount ?? 0,
    createdByInitials: toInitials(item.createdBy?.firstName, item.createdBy?.lastName),
    memberInitials: preview.map((u) => toInitials(u.firstName, u.lastName)),
    isStarred: !!item.isFavorite,
    tag: item.studio?.name || undefined,
    shortCode: toShortCode(name)
  };
}

export async function fetchGroupsPageData(): Promise<GroupsPageData> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
  const token = getToken();

  const res = await fetch(`${baseUrl}/group`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? "Unauthorized: thiếu token hoặc token hết hạn"
        : `Request failed: ${res.status}`
    );
  }

  const json = (await res.json()) as GetGroupsResponse;

  const data = json.data;
  const subscription = data?.subscription as SubscriptionInfo | undefined;
  const sections = data?.sections as GroupSections | undefined;

  return {
    usage: {
      current: subscription?.groupCreated ?? 0,
      max: subscription?.groupLimit ?? 0
    },
    favorites: (sections?.favorites || []).map((x) => mapGroup(x as GroupCardDto)),
    managed: (sections?.studioGroups || []).map((x) => mapGroup(x as GroupCardDto)),
    independent: (sections?.independentGroups || []).map((x) => mapGroup(x as GroupCardDto))
  };
}

async function apiFetch(path: string, method: "POST" | "DELETE", body: any) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api";
  const token = getToken();

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      res.status === 401
        ? "Unauthorized: thiếu token hoặc token hết hạn"
        : text || `Request failed: ${res.status}`
    );
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return null;
}

export async function addFavourite(groupId: string) {
  return apiFetch("/favourite/add", "POST", { groupId });
}

export async function removeFavourite(groupId: string) {
  return apiFetch("/favourite/remove", "DELETE", { groupId });
}