import { Permission } from "./permission";

export interface RoleWithPermissions {
  id: number;
  role_name: string;
  permissions: Permission[];
}
export interface Role {
  role_name: string;
  role_id: number;
}
