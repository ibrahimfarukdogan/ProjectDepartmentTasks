import { useAuth } from '../context/authcontext';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
   const { isAuthenticated, loading } = useAuth();

  if (loading) {
    console.log("Auth still loading...");
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAuthenticated) {
    console.log("Not authenticated, redirecting to login");
    return <Redirect href="/login" />;
  }

  return <>{children}</>;
}