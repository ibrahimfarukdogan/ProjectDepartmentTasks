import axios from 'axios';
import Constants from 'expo-constants';
import { Department, DepartmentGetResponse, DepartmentTaskStatsResponse, DetailedDepartmentStatsResponse } from '@/types/departments';
import { LoginResponse, User, UserFormData, UserList, UserTaskStatsResponse } from '@/types/user';
import { Platform } from 'react-native';
import { RoleWithPermissions } from '@/types/roles';


const extra = Constants.expoConfig?.extra || {};
const API_BASE_URL =
  Platform.OS === 'android'
    ? extra.API_URL_ANDROID
    : extra.API_URL_WEB;

if (!API_BASE_URL) {
  throw new Error('API base URL is not defined in app.config.ts');
}

const API = axios.create({
  baseURL: API_BASE_URL,
});

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

API.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export const login = async (mail: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await API.post('/login', { mail, password });
    console.log('Login success, token stored securely.');
    return response.data;
  } catch (err: any) {
    console.error('Login failed', err.response?.data || err.message);
    throw new Error('Yanlış mail veya şifre'); // Throw error to be caught by the caller
  }
};

// ----- USERS -----
export const getUsersForDepartment = async (departmentId: number): Promise<(User)[]> => {
  try {
    const response = await API.get(`api/departments/${departmentId}/users`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch departments:', error.response?.data || error.message);
    throw error;
  }
};

export const getUsers = async (departmentId: number): Promise<(User)[]> => {
  try {
    const response = await API.get(`api/departments/${departmentId}/users`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch users:', error.response?.data || error.message);
    throw error;
  }
};

export const getAllUsers = async (departmentId: number): Promise<(UserList)[]> => {
  try {
    const response = await API.get(`api/users/${departmentId}/allusers`);
    const userList: UserList[] = response.data.users;
    return userList;
  } catch (error: any) {
    console.error('Failed to fetch usersall:', error.response?.data || error.message);
    throw error;
  }
};

export const getVisibleUsers = async (): Promise<(UserList)[]> => {
  try {
    const response = await API.get(`api/users/visibleusers`);
    const userList: UserList[] = response.data.users;
    return userList;
  } catch (error: any) {
    console.error('Failed to fetch visible users:', error.response?.data || error.message);
    throw error;
  }
};

export const getUserById = async (id: string): Promise<User | null> => {
  const response = await API.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (departmentId: number, user: UserFormData): Promise<User | null> => {
  try {
    const response = await API.post(`/api/users/${departmentId}/users`, user);
    return response.data;
  } catch (error: any) {
    console.error('Failed to create user:', error.response?.data || error.message);
    throw error;
  }
};

export const deleteUser = async (departmentId: number, userId: number) => {
  try {
    const response = await API.delete(`/api/users/${departmentId}/users/${userId}`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to delete user:', error.response?.data || error.message);
    throw error;
  }
};

export const updateUser = async (departmentId: number, userId: number, user: UserFormData): Promise<User | null> => {
  try {
    console.log("user: ", user)
    const response = await API.put(`/api/users/${departmentId}/users/${userId}`, user);
    return response.data;
  } catch (error: any) {
    console.error('Failed to update user:', error.response?.data || error.message);
    throw error;
  }
};

export const savePushToken = async (push_token: string) => {
  return await API.post('/auth/push-token', { push_token });
};

// ----- DEPARTMENTS -----
export const getUserDepartments = async () => {
  try {
    const response = await API.get('/api/departments');
    return response.data; // { ownDepartments: [...], subDepartments: [...] }
  } catch (error: any) {
    console.error('Failed to fetch departments:', error.response?.data || error.message);
    throw error;
  }
};

export const fetchTaskStats = async (departmentId: number): Promise<DepartmentTaskStatsResponse | null> => {
  try {
    const res = await API.get(`api/departments/${departmentId}/task-stats`);
    const data: DepartmentTaskStatsResponse = res.data;
    return data;
  } catch (error) {
    console.error('Error fetching department stats:', error);
    throw error;
  }
};

export const fetchDepartmentStats = async (departmentId: number): Promise<DetailedDepartmentStatsResponse | null> => {
  try {
    const res = await API.get(`api/departments/${departmentId}/detailed-stats`);
    const data: DetailedDepartmentStatsResponse = res.data;
    return data;
  } catch (error) {
    console.error('Error fetching department stats:', error);
    throw error;
  }
};

export const createDepartment = async (dept_name: string, parent_id: number | null, manager_id: number | null): Promise<Department | null> => {
  try {
    const response = await API.post(`api/departments`, { dept_name, parent_id, manager_id });
    console.log('Department created');
    return response.data;
  } catch (err: any) {
    console.error('Error creating department:', err.response?.data || err.message);
    throw err;
  }
};

export const updateDepartment = async (departmentId: number, dept_name: string, parent_id: number | null, manager_id: number | null): Promise<Department | null> => {
  try {
    const response = await API.put(`api/departments/${departmentId}`, { dept_name, parent_id, manager_id });
    console.log('Department updated');
    return response.data;
  } catch (err: any) {
    console.error('Error updating department:', err.response?.data || err.message);
    throw err;
  }
};

export const getDepartment = async (departmentId: number): Promise<DepartmentGetResponse | null> => {
  try {
    const response = await API.get(`/api/departments/${departmentId}`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch department:', error.response?.data || error.message);
    throw error;
  }
};

export const fetchUserStats = async (userId: number): Promise<UserTaskStatsResponse | null> => {
  try {
    const res = await API.get(`api/users/${userId}/task-stats`);
    const data: UserTaskStatsResponse = res.data;
    return data;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;

  }
};

export const addUserInDepartment = async (departmentId: number, userId: number): Promise<User | null> => {
  try {
    const response = await API.post(`api/departments/${departmentId}/users/add`, { userId });
    console.log('User created in a department');
    return response.data;
  } catch (err: any) {
    console.error('Error creating a user:', err.response?.data || err.message);
    throw err;

  }
};

export const removeUserFromDepartment = async (departmentId: number, userId: number) => {
  try {
    const response = await API.delete(`/api/departments/${departmentId}/users/${userId}/remove`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to remove user from the department:', error.response?.data || error.message);
    throw error;
  }
};

export const deleteDepartment = async (departmentId: number) => {
  try {
    const response = await API.delete(`/api/departments/${departmentId}`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to delete user:', error.response?.data || error.message);
    throw error;
  }
};

// ----- ROLES -----
export const getRoles = async (): Promise<RoleWithPermissions[]> => {
  try {
    const response = await API.get<RoleWithPermissions[]>(`/api/roles`);
    console.log("roles: ", response);
    return response.data;
  } catch (error: any) {
    console.error('Failed to get roles:', error.response?.data || error.message);
    throw error;
  }
};