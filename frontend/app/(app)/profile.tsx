import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/authcontext";
import { getUsers } from "../../services/api";
import { User } from "@/types/user";

export default function Home() {
  const { logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    /*getUsers()
      .then(setUsers)
      .catch((err: any) => console.error(err))
      .finally(() => setLoading(false));*/
      setLoading(false);
  }, []);

  if (loading) return <ActivityIndicator />;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ marginBottom: 10 }} onPress={logout}>Logout</Text>
      {users.length === 0 ? (
        <Text>No users found.</Text>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/user/${item.id}`)} style={{ padding: 10 }}>
              <Text>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
