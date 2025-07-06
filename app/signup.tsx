import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isRestaurantOwner, setIsRestaurantOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSignUp = async () => {
    if (!email || !password || !username || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    if (!/^\w+$/.test(username)) {
      alert('Username can only contain letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    try {
      // Changed from 'restaurant' to 'owner' to match database constraints
      const role = isRestaurantOwner ? 'owner' : 'user';
      await signUp(email, password, username, role);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.innerContainer}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>Join our foodie community</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#8e8e8e"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={30}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8e8e8e"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor="#8e8e8e"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#8e8e8e"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>Restaurant Owner Account</Text>
            <Switch
              trackColor={{ false: '#dbdbdb', true: '#0095f6' }}
              thumbColor={isRestaurantOwner ? '#fff' : '#f4f3f4'}
              onValueChange={setIsRestaurantOwner}
              value={isRestaurantOwner}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </Link>
          </View>
          
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By signing up, you agree to our {' '}
              <Text style={styles.termsLink}>Terms of Service</Text>, {' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>, and {' '}
              <Text style={styles.termsLink}>Cookie Policy</Text>.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  innerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logo: {
    height: 80,
    width: 200,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#262626',
  },
  subtitle: {
    color: '#8e8e8e',
    textAlign: 'center',
    marginBottom: 32,
    fontSize: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fafafa',
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  switchText: {
    color: '#262626',
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    height: 50,
    backgroundColor: '#0095f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#b2dffc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#262626',
    fontSize: 14,
    marginRight: 4,
  },
  loginLink: {
    color: '#0095f6',
    fontWeight: '600',
    fontSize: 14,
  },
  termsContainer: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  termsText: {
    color: '#8e8e8e',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
  termsLink: {
    color: '#0095f6',
    fontWeight: '500',
  },
});