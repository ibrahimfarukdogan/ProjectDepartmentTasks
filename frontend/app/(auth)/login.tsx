// app/(auth)/login.tsx
import React from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/authcontext';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { showToast } from '@/utils/utils';

const schema = z.object({
  mail: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // react-hook-form + TextInput combo handling
  React.useEffect(() => {
    register('mail');
    register('password');
  }, [register]);

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.mail, data.password);
      router.replace('/'); // navigate to home after login
    } catch (error: any) {
      showToast('error',"Hata!", "Giriş Başarısız")
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={(text) => setValue('mail', text)}
        style={styles.input}
      />
      {errors.mail && <Text style={styles.error}>{errors.mail.message}</Text>}

      <TextInput
        placeholder="Password"
        secureTextEntry
        onChangeText={(text) => setValue('password', text)}
        style={styles.input}
      />
      {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}

      <Button title={isSubmitting ? 'Logging in...' : 'Login'} onPress={handleSubmit(onSubmit)} disabled={isSubmitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#121212', // dark background
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#f1f1f1', // light text
  },
  input: {
    borderWidth: 1,
    borderColor: '#555', // darker border
    backgroundColor: '#1e1e1e', // dark input background
    color: '#f1f1f1', // input text color
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
});
