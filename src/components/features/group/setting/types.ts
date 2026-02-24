export type Role = "owner" | "moderator" | "member" | "commenter";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
}