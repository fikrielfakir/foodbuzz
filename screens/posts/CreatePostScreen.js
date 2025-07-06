import React, { useState } from 'react';
import { View, Text, Button, Image, TextInput, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function CreatePostScreen() {
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileExt = uri.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from('post-images')
      .upload(filePath, blob);

    if (error) throw error;
    return filePath;
  };

  const handlePost = async () => {
    if (!image || !caption) {
      Alert.alert('Error', 'Please select an image and write a caption');
      return;
    }

    setLoading(true);
    try {
      const imagePath = await uploadImage(image);
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(imagePath);

      const { error } = await supabase
        .from('posts')
        .insert([
          { 
            owner_id: user.id,
            image_url: publicUrl,
            caption,
            restaurant_id: user.id // Assuming owner is linked to restaurant
          }
        ]);

      if (error) throw error;
      Alert.alert('Success', 'Post created successfully!');
      setImage(null);
      setCaption('');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Button title="Pick an image" onPress={pickImage} />
      {image && <Image source={{ uri: image }} style={{ width: 200, height: 200 }} />}
      <TextInput
        placeholder="Write a caption..."
        value={caption}
        onChangeText={setCaption}
        multiline
        style={{ marginVertical: 10, padding: 10, borderWidth: 1, borderColor: '#ccc' }}
      />
      <Button 
        title={loading ? 'Posting...' : 'Post'} 
        onPress={handlePost} 
        disabled={loading} 
      />
    </View>
  );
}