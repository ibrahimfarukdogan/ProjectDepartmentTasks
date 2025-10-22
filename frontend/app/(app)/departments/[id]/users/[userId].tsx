import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../../../../../context/authcontext';
import { getUserById } from '../../../../../services/api';
import { User } from '@/types/user';

export default function UserDetail() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const [user, setUser] = useState<User>();

useEffect(() => {
  const fetchUser = async () => {
    try {
      //const user = await getUserById(id as string);
      //setUser(user);
      const usert: User= {id:1, name:"s", mail:"s", phone:"55", adress: "ss", role: "kaptan", role_id: 1, created_at: "", updated_at: "", permissions: []}
      setUser(usert);
    } catch (err) {
      console.error(err);
    }
  };

  fetchUser();
}, [id]);

  if (!user) {
    return <ActivityIndicator />;
  }

  return (
    <View style={{ padding: 20 }}>
      <Text>Name: {user.name}</Text>
      <Text>Email: {user.mail}</Text>
      <Text>Phone: {user.phone}</Text>
      <Text>Address: {user.adress}</Text>
    </View>
  );
}
