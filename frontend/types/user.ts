import { Permission } from "./permission";
import { Role } from "./roles";

export interface User {
  id: number;
  name?: string;
  mail: string;
  role: string;
  role_id: number;
  permissions: Permission[];
  phone?: string;
  adress?: string;
  created_at: string;
  updated_at: string;
}

export interface UserList {
  id: number;
  name?: string;
  role: Role
}

export type UserFormData = {
  name?: string;
  mail?: string;
  role_id?: number | null;
  adress?: string;
  phone?: string;
  password?: string; // only used on creation
};

export interface UserTaskStatsResponse {
  userId: number;
  stats: {
    open: number;
    inprogress: number;
    done: number;
    approved: number;
    cancelled: number;
    late: number;
    not_started: number;
  };
}

export type LoginResponse = {
  token: string;
  user: User;
};