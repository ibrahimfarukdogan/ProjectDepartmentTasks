import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { login as apiLogin, setAuthToken } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Platform, View } from "react-native";
import {jwtDecode} from 'jwt-decode';
import { Permission } from "@/types/permission";
import { User } from "@/types/user";

type AuthContextType = {
  token: string | null;
  user: User | null;
  login: (mail: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  hasPermission: (category: string, level: number) => boolean;
};

const AuthContext = createContext<AuthContextType>({
  token: null,
  user: null,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
  loading: true,
  hasPermission: () => false,
});

export const useAuth = () => useContext(AuthContext);

type JWTPayload = {
  exp: number;
  iat: number;
  id: number;
  mail: string;
};

const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      setLoading(true);
      let storedToken: string | null = null;
      let storedUser: string | null = null;

      if (Platform.OS === "web") {
        storedToken = await AsyncStorage.getItem("token");
        storedUser = await AsyncStorage.getItem("user");
      } else {
        storedToken = await SecureStore.getItemAsync("token");
        storedUser = await SecureStore.getItemAsync("user");
      }

      if (storedToken && !isTokenExpired(storedToken)) {
        setToken(storedToken);
        setAuthToken(storedToken);

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } else {
        setToken(null);
        setUser(null);
        setAuthToken(null);
        if (Platform.OS === "web") {
          await AsyncStorage.multiRemove(["token", "user"]);
        } else {
          await SecureStore.deleteItemAsync("token");
          await SecureStore.deleteItemAsync("user");
        }
      }

      setLoading(false);
    };

    loadAuth();
  }, []);

  const login = async (mail: string, password: string) => {
    const response = await apiLogin(mail, password); // expected to return { token, user }
    const { token: newToken, user: userData } = response;

    if (Platform.OS === "web") {
      await AsyncStorage.setItem("token", newToken);
      await AsyncStorage.setItem("user", JSON.stringify(userData));
    } else {
      await SecureStore.setItemAsync("token", newToken);
      await SecureStore.setItemAsync("user", JSON.stringify(userData));
    }

    setToken(newToken);
    setUser(userData);
    setAuthToken(newToken);
  };

  const logout = async () => {
    if (Platform.OS === "web") {
      await AsyncStorage.multiRemove(["token", "user"]);
    } else {
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("user");
    }

    setToken(null);
    setUser(null);
    setAuthToken(null);
  };

  const hasPermission = (category: string, level: number): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.some(
      (perm:Permission) => perm.category === category && perm.level >= level
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        isAuthenticated: !!token,
        loading,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};