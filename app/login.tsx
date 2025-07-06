import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureEntry, setSecureEntry] = useState(true);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(
        'Login Failed', 
        error instanceof Error ? error.message : 'An unexpected error occurred',
        [{ text: 'OK', style: 'cancel' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#8E8E93"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                textContentType="emailAddress"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Enter your password"
                  placeholderTextColor="#8E8E93"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureEntry}
                  textContentType="password"
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setSecureEntry(!secureEntry)}
                >
                  <Ionicons 
                    name={secureEntry ? 'eye-off' : 'eye'} 
                    size={20} 
                    color="#8E8E93" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.forgotPasswordButton}
              onPress={() => router.push('/forgot-password')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-apple" size={20} color="white" />
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialButton, styles.facebookButton]}>
              <Ionicons name="logo-facebook" size={20} color="white" />
              <Text style={styles.socialButtonText}>Continue with Facebook</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Link href="/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 16,
    color: 'white',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  passwordInputContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loginButtonDisabled: {
    backgroundColor: '#007AFF80',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2C2C2E',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
  },
  socialButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  socialButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2C2C2E',
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#8E8E93',
    fontSize: 14,
    marginRight: 4,
  },
  footerLink: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
});