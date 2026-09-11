export type UserRole = "ADMIN" | "KITCHEN" | "DELIVERY" | "CUSTOMER";

export type InternalProfile = {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
};

export function getRoleHome(role: UserRole) {
  if (role === "ADMIN") return "/admin";
  if (role === "KITCHEN") return "/cozinha";
  if (role === "DELIVERY") return "/entregador";
  return "/";
}
