import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, profile } = useAuth();

  if (!user) return <Redirect href="/login" />;

  if (!profile) return null; // Wait for profile to load

  // Redirect based on role
  if (profile.role === 'owner') {
    return <Redirect href="/(tabs)" />;
  }

  if (profile.role === 'user') {
    return <Redirect href="/(tabs)" />;
  }

  // Fallback just in case
  return <Redirect href="/(tabs)" />;
}
