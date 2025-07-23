import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function CreateScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [location, setLocation] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.replace('/login');
    };
    checkAuth();
  }, []);

  // Fetch user's restaurants
  useEffect(() => {
    const fetchRestaurants = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('id, name')
          .eq('owner_id', user.id);

        if (error) {
          console.error('Error fetching restaurants:', error);
          Alert.alert('Error', 'Failed to load restaurants');
        } else {
          setRestaurants(data || []);
        }
      } catch (error) {
        console.error('Network error fetching restaurants:', error);
        Alert.alert('Network Error', 'Please check your internet connection');
      }
    };

    fetchRestaurants();
  }, [user]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera roll access is needed to upload photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
        if (result.assets[0].width && result.assets[0].height) {
          setAspectRatio(result.assets[0].width / result.assets[0].height);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    try {
      if (!uri || !uri.startsWith('file://')) {
        throw new Error('Invalid image URI');
      }

      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication session expired. Please log in again.');
      }

      console.log('Starting image upload for URI:', uri);
      
      const formData = new FormData();
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${user?.id}/${Date.now()}.${fileExt}`;
      
      formData.append('file', {
        uri: uri,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        name: filename,
      } as any);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filename, formData, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return await uploadImageFallback(uri);
      }

      if (!uploadData?.path) {
        throw new Error('No upload path returned from Supabase');
      }

      console.log('Image uploaded successfully:', uploadData.path);
      return uploadData.path;
      
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const uploadImageFallback = async (uri: string): Promise<string> => {
    try {
      console.log('Using fallback upload method');
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to read image: ${response.status}`);
      }

      const blob = await response.blob();
      console.log('Blob size:', blob.size);
      
      if (blob.size > 10 * 1024 * 1024) {
        throw new Error('Image too large (max 10MB)');
      }

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${user?.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filename, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Fallback upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      if (!uploadData?.path) {
        throw new Error('No upload path returned from fallback upload');
      }

      return uploadData.path;
    } catch (error) {
      console.error('Fallback upload error:', error);
      throw error;
    }
  };

  const handleCreatePost = async () => {
    if (!image) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }
    if (!selectedRestaurant) {
      Alert.alert('Error', 'Please select a restaurant to tag');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      setUploadProgress(10);
      console.log('Starting post creation process...');
      
      setUploadProgress(25);
      const imagePath = await uploadImage(image);
      
      setUploadProgress(60);
      console.log('Image uploaded, getting public URL...');
      
      const { data: { publicUrl }, error: urlError } = supabase.storage
        .from('post-images')
        .getPublicUrl(imagePath);

      if (urlError) {
        console.error('URL error:', urlError);
        throw new Error(`Failed to get public URL: ${urlError.message}`);
      }

      if (!publicUrl) {
        throw new Error('No public URL returned');
      }

      setUploadProgress(80);
      console.log('Public URL obtained, creating post record...');

      const postData = {
        owner_id: user.id,
        restaurant_id: selectedRestaurant,
        image_url: publicUrl,
        caption: caption.trim() || null,
        location: location.trim() || null,
        aspect_ratio: aspectRatio,
        created_at: new Date().toISOString(),
      };

      console.log('Post data:', postData);

      const { data: postResult, error: insertError } = await supabase
        .from('posts')
        .insert(postData)
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Failed to create post: ${insertError.message}`);
      }

      setUploadProgress(100);
      console.log('Post created successfully:', postResult);

      setImage(null);
      setCaption('');
      setLocation('');
      setSelectedRestaurant(null);
      setUploadProgress(0);
      
      Alert.alert('Success', 'Post created successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
      
    } catch (error) {
      setUploadProgress(0);
      
      let errorMessage = 'Failed to create post';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error('Create post error:', error);
      
      if (errorMessage.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorMessage.includes('Authentication')) {
        errorMessage = 'Authentication error. Please log out and log back in.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="close" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={handleCreatePost} 
            disabled={!image || loading || !selectedRestaurant}
            style={styles.headerButton}
          >
            {loading ? (
              <ActivityIndicator color="#007AFF" size="small" />
            ) : (
              <Text style={[styles.shareButton, (!image || !selectedRestaurant) && styles.disabledButton]}>
                Share
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Section */}
        <View style={styles.imageSection}>
          {image ? (
            <>
              <Image 
                source={{ uri: image }} 
                style={[styles.imagePreview, { aspectRatio }]} 
                resizeMode="cover"
              />
              <TouchableOpacity 
                style={styles.changeImageButton}
                onPress={pickImage}
              >
                <Text style={styles.changeImageText}>Change Image</Text>
              </TouchableOpacity>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
                  <Text style={styles.progressText}>{uploadProgress}%</Text>
                </View>
              )}
            </>
          ) : (
            <TouchableOpacity 
              style={styles.imagePlaceholder} 
              onPress={pickImage}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={50} color="#8E8E93" />
              <Text style={styles.placeholderText}>Select Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Caption Section */}
        <View style={styles.captionSection}>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor="#8E8E93"
            multiline
            value={caption}
            onChangeText={setCaption}
            maxLength={2200}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{caption.length}/2,200</Text>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <MaterialIcons name="location-on" size={24} color="#007AFF" />
          <TextInput
            style={styles.locationInput}
            placeholder="Add location"
            placeholderTextColor="#8E8E93"
            value={location}
            onChangeText={setLocation}
            maxLength={100}
          />
        </View>

        {/* Restaurant Tagging - Now Required */}
        {restaurants.length > 0 ? (
          <View style={styles.section}>
            <MaterialIcons name="restaurant" size={24} color="#007AFF" />
            <View style={styles.restaurantContainer}>
              <Text style={styles.sectionTitle}>Choose Restaurant *</Text>
              <Text style={styles.requiredText}>Required</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.restaurantScroll}
              >
                {restaurants.map(restaurant => (
                  <TouchableOpacity
                    key={restaurant.id}
                    style={[
                      styles.restaurantPill,
                      selectedRestaurant === restaurant.id && styles.selectedPill,
                      !selectedRestaurant && styles.errorPill
                    ]}
                    onPress={() => setSelectedRestaurant(restaurant.id)}
                  >
                    <Text style={selectedRestaurant === restaurant.id ? 
                      styles.selectedPillText : styles.pillText}>
                      {restaurant.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <MaterialIcons name="warning" size={24} color="#FF3B30" />
            <Text style={styles.errorText}>
              You need to create a restaurant first before posting
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  headerButton: {
    padding: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 17,
    color: 'white',
  },
  shareButton: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 17,
  },
  disabledButton: {
    color: '#8E8E93',
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  imageSection: {
    padding: 16,
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
  },
  changeImageButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  changeImageText: {
    color: '#007AFF',
    fontWeight: '500',
    fontSize: 15,
  },
  progressBarContainer: {
    width: '100%',
    height: 20,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    marginTop: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
  },
  placeholderText: {
    marginTop: 12,
    color: '#8E8E93',
    fontSize: 16,
  },
  captionSection: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  captionInput: {
    fontSize: 16,
    minHeight: 100,
    maxHeight: 200,
    color: 'white',
  },
  charCount: {
    textAlign: 'right',
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 8,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  locationInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: 'white',
  },
  restaurantContainer: {
    flex: 1,
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 16,
    color: 'white',
  },
  requiredText: {
    color: '#FF3B30',
    fontSize: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#FF3B30',
    marginLeft: 12,
    fontSize: 14,
  },
  restaurantScroll: {
    paddingBottom: 8,
  },
  restaurantPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    marginRight: 12,
    backgroundColor: '#1C1C1E',
  },
  selectedPill: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  errorPill: {
    borderColor: '#FF3B30',
  },
  pillText: {
    color: 'white',
  },
  selectedPillText: {
    color: 'white',
    fontWeight: '600',
  },
});