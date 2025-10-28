export type TaskStatus = 'open' | 'inprogress' | 'done' | 'approved' | 'cancelled';
export type RequesterRank = 'milletvekili' | 'kaymakamlik' | 'muhtarlik' | 'diger';

export interface Task {
  id: number;
  creator_id: number;
  authorized_user_id: number;
  assigned_dept_id: number;
  assigned_user_id?: number;

  title: string;
  description?: string;
  status: TaskStatus;

  start_date?: string; // or Date if you parse them in frontend
  finish_date?: string;
  created_at?: string;
  updated_at?: string;

  requester_name: string;
  requester_mail?: string;
  requester_phone?: number;
  requester_rank: RequesterRank;
}

export interface DepartmentTask {
  id: number;
  title: string;
  status: TaskStatus;
  requester_rank: RequesterRank;
  department: string | null;
  assigned_user: string | null;
  authorizator: string | null;
  creator: string | null;
  secondaryStatus: SecondaryTaskStatus; 

  // Only included if user has high permission (admin etc.)
  description?: string;
  requester_name?: string;
  requester_mail?: string;
  requester_phone?: number;
  created_at?: string | null;
  start_date?: string | null;
  finish_date?: string | null;
}

export interface SecondaryTaskStatus {
  late: boolean;
  not_started: boolean;
  not_assigned: boolean;
  created_by_me: boolean;
  authorized_by_me: boolean;
  assigned_to_me: boolean;
  requester_milletvekili: boolean;
  requester_kaymakamlik: boolean;
  requester_muhtarlik: boolean;
  requester_diger: boolean;
}