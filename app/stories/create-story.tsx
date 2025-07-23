import { Ionicons } from '@expo/vector-icons';
import * as NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function CreateStoryScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Request permissions
    const requestPermissions = async () => {
      const [mediaStatus, cameraStatus] = await Promise.all([
        ImagePicker.requestMediaLibraryPermissionsAsync(),
        ImagePicker.requestCameraPermissionsAsync()
      ]);

      if (mediaStatus.status !== 'granted') {
        Alert.alert(
          'Permission required', 
          'We need access to your photos to upload stories'
        );
      }

      if (cameraStatus.status !== 'granted') {
        Alert.alert(
          'Permission required', 
          'We need access to your camera to take photos for stories'
        );
      }
    };

    requestPermissions();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Keep original for compatibility
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    try {
      console.log('Starting upload for URI:', uri);
      
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      console.log('Network state:', networkState);
      
      if (!networkState.isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      // Verify authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication session expired. Please log in again.');
      }
      
      console.log('Session verified, user ID:', session.user.id);

      // Extract file extension
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${user?.id}/${Date.now()}.${fileExt}`;
      
      console.log('Uploading as filename:', filename);

      // Method 1: Try with fetch and blob
      let uploadData, uploadError;
      
      try {
        const response = await fetch(uri);
        console.log('Fetch response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to read image: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        console.log('Blob created, size:', blob.size, 'type:', blob.type);

        // Upload with Supabase
        const result = await supabase.storage
          .from('story-images')
          .upload(filename, blob, {
            contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
            upsert: false,
            cacheControl: '3600',
          });
        
        uploadData = result.data;
        uploadError = result.error;
        
      } catch (blobError) {
        console.log('Blob method failed, trying alternative method:', blobError);
        
        // Method 2: Try with ArrayBuffer
        try {
          const response = await fetch(uri);
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          console.log('ArrayBuffer created, size:', uint8Array.length);
          
          const result = await supabase.storage
            .from('story-images')
            .upload(filename, uint8Array, {
              contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
              upsert: false,
              cacheControl: '3600',
            });
          
          uploadData = result.data;
          uploadError = result.error;
          
        } catch (arrayBufferError) {
          console.error('ArrayBuffer method also failed:', arrayBufferError);
          throw new Error('Failed to process image file for upload');
        }
      }

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        
        // Handle specific Supabase errors
        if (uploadError.message?.includes('JWT')) {
          throw new Error('Authentication expired. Please log out and log back in.');
        } else if (uploadError.message?.includes('bucket')) {
          throw new Error('Storage bucket not found. Please check Supabase configuration.');
        } else if (uploadError.message?.includes('size')) {
          throw new Error('Image file is too large. Please try a smaller image.');
        } else if (uploadError.message?.includes('RLS')) {
          throw new Error('Storage permissions error. Please check bucket policies.');
        } else {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }
      }

      if (!uploadData?.path) {
        throw new Error('No upload path returned from Supabase');
      }

      console.log('Upload successful, path:', uploadData.path);
      return uploadData.path;
      
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleCreateStory = async () => {
    if (!image || !user?.id) {
      Alert.alert('Error', 'No image selected or user not authenticated');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Check network before starting
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      setUploadProgress(25);
      
      // Upload image
      const imagePath = await uploadImage(image);
      
      setUploadProgress(60);
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('story-images')
        .getPublicUrl(imagePath);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      console.log('Public URL generated:', publicUrl);
      setUploadProgress(80);

      // Create the story record
      const { error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      if (storyError) {
        console.error('Story creation error:', storyError);
        throw new Error(`Failed to create story: ${storyError.message}`);
      }

      setUploadProgress(100);
      
      Alert.alert('Success', 'Your story has been posted!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (error) {
      console.error('Story creation failed:', error);
      
      let errorMessage = 'Failed to upload story';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Enhanced error message handling
      if (errorMessage.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (errorMessage.includes('Authentication') || errorMessage.includes('JWT')) {
        errorMessage = 'Authentication error. Please log out and log back in.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Upload timed out. Please try again with a smaller image.';
      } else if (errorMessage.includes('size')) {
        errorMessage = 'Image file is too large. Please try a smaller image.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (uploading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Uploading your story...</Text>
        {uploadProgress > 0 && uploadProgress < 100 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
            <Text style={styles.progressText}>{uploadProgress}%</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {image ? (
        <>
          <Image 
            source={{ uri: image }} 
            style={styles.previewImage} 
            accessibilityLabel="Selected story image"
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => setImage(null)}
              disabled={uploading}
              accessibilityLabel="Cancel and select different image"
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]} 
              onPress={handleCreateStory}
              disabled={uploading}
              accessibilityLabel="Share your story"
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title}>Add to Your Story</Text>
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={styles.option} 
              onPress={pickImage}
              disabled={uploading}
              accessibilityLabel="Select photo from gallery"
            >
              <Ionicons name="image" size={40} color="#007AFF" />
              <Text style={styles.optionText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.option} 
              onPress={takePhoto}
              disabled={uploading}
              accessibilityLabel="Take photo with camera"
            >
              <Ionicons name="camera" size={40} color="#007AFF" />
              <Text style={styles.optionText}>Camera</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  progressContainer: {
    width: '80%',
    height: 20,
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    marginTop: 20,
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
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 40,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    position: 'absolute',
  },
  buttonRow: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: 'white',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
  },
  option: {
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
  },
  optionText: {
    color: 'white',
    marginTop: 8,
    fontSize: 16,
    fontWeight: '500',
  },
});