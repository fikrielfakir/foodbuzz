import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const EditProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setUsername(data.username);
      setBio(data.bio || '');
      setAvatarUrl(data.avatar_url || '');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setAvatarUrl(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileExt = uri.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob);

    if (error) throw error;
    return filePath;
  };

  const handleSave = async () => {
    if (!username) {
      alert('Username is required');
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
          username,
          bio,
          avatar_url: avatarPath 
            ? supabase.storage.from('avatars').getPublicUrl(avatarPath).data.publicUrl 
            : avatarUrl
        })
        .eq('user_id', user.id);

      if (error) throw error;
      navigation.goBack();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickImage}>
        <Image
          source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }}
          style={styles.avatar}
        />
        <Text style={styles.changePhotoText}>Change Photo</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        style={[styles.input, styles.bioInput]}
        placeholder="Bio"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 5,
  },
  changePhotoText: {
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EditProfileScreen;