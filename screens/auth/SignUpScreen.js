import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const SignUpScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, username, isOwner ? 'owner' : 'user');
      navigation.navigate('Login');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <View style={styles.switchContainer}>
        <Text>Are you a restaurant owner?</Text>
        <Switch
          value={isOwner}
          onValueChange={setIsOwner}
          trackColor={{ false: '#767577', true: '#FF6B6B' }}
        />
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginText}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#FF6B6B',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  button: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginText: {
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default SignUpScreen;