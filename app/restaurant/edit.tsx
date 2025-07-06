import { View, Text, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function EditRestaurantScreen() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (data) {
      setName(data.name);
      setAddress(data.address);
      setDescription(data.description);
      setCuisineType(data.cuisine_type?.join(', ') || '');
      setPhone(data.phone || '');
      setWebsite(data.website || '');
      setImage(data.image_url);
    }
  };

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
      .from('restaurant-images')
      .upload(filePath, blob);

    if (error) throw error;
    return filePath;
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Error', 'Restaurant name is required');
      return;
    }

    setLoading(true);
    try {
      let imagePath = null;
      if (image && !image.includes('supabase.co')) {
        imagePath = await uploadImage(image);
      }

      const { error } = await supabase
        .from('restaurants')
        .upsert({
          owner_id: user.id,
          name,
          address,
          description,
          cuisine_type: cuisineType.split(',').map(item => item.trim()),
          phone,
          website,
          image_url: imagePath
            ? supabase.storage.from('restaurant-images').getPublicUrl(imagePath).data.publicUrl
            : image,
        })
        .eq('owner_id', user.id);

      if (error) throw error;
      
      Alert.alert('Success', 'Restaurant updated successfully');
      router.back();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>Edit Restaurant</Text>
      
      <TouchableOpacity onPress={pickImage}>
        <Image
          source={{ uri: image || 'https://via.placeholder.com/150' }}
          style={{ width: '100%', height: 200, borderRadius: 10, marginBottom: 20 }}
        />
        <Text style={{ textAlign: 'center', color: '#FF6B6B', marginBottom: 20 }}>
          Change Image
        </Text>
      </TouchableOpacity>
      
      <TextInput
        placeholder="Restaurant Name"
        value={name}
        onChangeText={setName}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 10,
          padding: 15,
          marginBottom: 15,
        }}
      />
      
      <TextInput
        placeholder="Address"
        value={address}
        onChangeText={setAddress}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 10,
          padding: 15,
          marginBottom: 15,
        }}
      />
      
      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 10,
          padding: 15,
          marginBottom: 15,
          minHeight: 100,
        }}
      />
      
      <TextInput
        placeholder="Cuisine Type (comma separated)"
        value={cuisineType}
        onChangeText={setCuisineType}
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 10,
          padding: 15,
          marginBottom: 15,
        }}
      />
      
      <TextInput
        placeholder="Phone"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 10,
          padding: 15,
          marginBottom: 15,
        }}
      />
      
      <TextInput
        placeholder="Website"
        value={website}
        onChangeText={setWebsite}
        keyboardType="url"
        style={{
          borderWidth: 1,
          borderColor: '#ddd',
          borderRadius: 10,
          padding: 15,
          marginBottom: 20,
        }}
      />
      
      <TouchableOpacity
        onPress={handleSave}
        disabled={loading}
        style={{
          backgroundColor: '#FF6B6B',
          padding: 15,
          borderRadius: 10,
          alignItems: 'center',
          opacity: loading ? 0.7 : 1,
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}