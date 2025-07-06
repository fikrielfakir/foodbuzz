import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function EditProfileScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploading(true);
        setAvatarUrl(result.assets[0].uri);
        setUploading(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      setUploading(false);
    }
  };

  const uploadAvatar = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileExt = uri.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    return filePath;
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }

    setLoading(true);
    try {
      let avatarPath = null;
      if (avatarUrl && !avatarUrl.includes('supabase.co')) {
        avatarPath = await uploadAvatar(avatarUrl);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          bio: bio.trim(),
          avatar_url: avatarPath
            ? supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl
            : avatarUrl
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      await refreshProfile();
      router.back();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={loading}
            style={styles.saveButton}
          >
            {loading ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              <Text style={styles.saveButtonText}>Done</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity 
            onPress={pickImage} 
            style={styles.avatarContainer}
            disabled={uploading}
          >
            {uploading ? (
              <View style={styles.avatarUploading}>
                <ActivityIndicator color="white" />
              </View>
            ) : (
              <>
                <Image
                  source={{ 
                    uri: avatarUrl || 'https://via.placeholder.com/150',
                    cache: 'force-cache'
                  }}
                  style={styles.avatar}
                />
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera" size={16} color="white" />
                </View>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Change Profile Photo</Text>
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              placeholder="Enter your username"
              placeholderTextColor="#8E8E93"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              autoCapitalize="none"
              maxLength={30}
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput
              placeholder="Tell us about yourself"
              placeholderTextColor="#8E8E93"
              value={bio}
              onChangeText={setBio}
              multiline
              style={[styles.input, styles.bioInput]}
              maxLength={150}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarUploading: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1C1C1E',
  },
  changePhotoText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '500',
  },
  formSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  inputContainer: {
    marginBottom: 24,
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
  bioInput: {
    minHeight: 100,
    paddingTop: 16,
  },
  charCount: {
    color: '#8E8E93',
    fontSize: 13,
    textAlign: 'right',
    marginTop: 4,
  },
});