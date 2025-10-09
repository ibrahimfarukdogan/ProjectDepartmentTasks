export interface TaskStats {
  //total: number | null | undefined;
  open: number | null | undefined;
  inprogress: number | null | undefined;
  done: number | null | undefined;
  approved: number | null | undefined;
  cancelled: number | null | undefined;
  late: number | null | undefined;
  not_started: number | null | undefined;
  not_assigned?: number | null | undefined;
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

export const emptyTaskStats: DetailedDepartmentTaskStats = {
  total: 0,
  open: 0,
  inprogress: 0,
  done: 0,
  approved: 0,
  cancelled: 0,
  late: 0,
  not_started: 0,
  requester_milletvekili: 0,
  requester_kaymakamlik: 0,
  requester_muhtarlik: 0,
  requester_diger: 0,
  created_by_me: 0,
  authorized_by_me: 0,
  assigned_to_me: 0,
};

export const emptyUserStats: DetailedDepartmentTaskUsers = {
  totalUsers: 0,
  usersWithTasks: 0,
  usersWithoutTasks: 0,
  numberOfChildDepartments: 0,
};