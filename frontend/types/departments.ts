export interface Department {
  id: number;
  dept_name: string;
  parent_id?: number | null;
  created_at?: string;
  updated_at?: string;
  parent?: {
    dept_name: string;
  } | null;
}

export interface DepartmentWithType extends Department {
  isOwn: boolean;
}

export interface DepartmentTaskStatsResponse {
  departmentId: number;
  stats: {
    total: number;
    open: number;
    inprogress: number;
    done: number;
    approved: number;
    cancelled: number;
    late: number;
    not_started: number;
    not_assigned?: number; // optional, because it's hidden unless permission level >= 3
  };
}

export interface DetailedDepartmentTaskStats {
  total: number;
  open: number;
  inprogress: number;
  done: number;
  approved: number;
  cancelled: number;
  late: number;
  not_started: number;
  requester_milletvekili: number;
  requester_kaymakamlik: number;
  requester_muhtarlik: number;
  requester_diger: number;
  created_by_me: number;
  authorized_by_me: number;
  assigned_to_me: number;
}

export interface DetailedDepartmentTaskUsers {
  totalUsers: number;
  usersWithTasks: number;
  usersWithoutTasks: number;
  numberOfChildDepartments: number;
}

export interface DetailedDepartmentStatsResponse {
  departmentId: number;
  taskStats: DetailedDepartmentTaskStats;
  userStats: DetailedDepartmentTaskUsers;
}
