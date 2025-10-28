import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../../../../../context/authcontext';
import { UserList } from '@/types/user';
import { Role } from '@/types/roles';

export default function UserDetail() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();
  const [user, setUser] = useState<UserList>();

useEffect(() => {
  const fetchUser = async () => {
    try {
      //const user = await getUserById(id as string);
      //setUser(user);
      const role: Role= {role_id:1,role_name:"afrt"}
      const usert: UserList= {id:1, name:"s",role:role}
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
    </View>
  );
}
