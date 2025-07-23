import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { markStoryAsSeen } from '../../lib/stories';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

export default function StoryViewScreen() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress] = useState(new Animated.Value(0));

  useEffect(() => {
    const fetchStories = async () => {
      try {
        // Fetch stories with profile data
        const { data, error } = await supabase
          .from('stories')
          .select(`
            id,
            image_url,
            created_at,
            expires_at,
            user_id,
            profiles:user_id (
              username, 
              avatar_url,
              user_id
            )
          `)
          .eq('user_id', userId)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching stories:', error);
          throw error;
        }

        // Check if stories exist
        if (!data || data.length === 0) {
          // No stories found - redirect to create story if it's the current user
          if (userId === user?.id) {
            router.replace('/stories/create-story');
            return;
          } else {
            // If viewing someone else's stories and they have none, go back
            router.back();
            return;
          }
        }

        // Set stories data
        setStories(data);
        
        // Mark the first story as seen if user is logged in
        if (user?.id && data.length > 0) {
          await markStoryAsSeen(data[0].id, user.id);
        }
      } catch (error) {
        console.error('Error fetching stories:', error);
        // On error, check if it's current user and redirect to create
        if (userId === user?.id) {
          router.replace('/stories/create-story');
        } else {
          router.back();
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchStories();
    }
  }, [userId, user?.id]);

  useEffect(() => {
    if (stories.length > 0) {
      startProgressAnimation();
    }
  }, [currentIndex, stories]);

  const startProgressAnimation = () => {
    // Reset progress
    progress.setValue(0);
    
    Animated.timing(progress, {
      toValue: 1,
      duration: 5000, // 5 seconds per story
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        goToNextStory();
      }
    });
  };

  const goToNextStory = async () => {
    if (currentIndex < stories.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      
      // Mark next story as seen
      if (user?.id && stories[nextIndex]) {
        await markStoryAsSeen(stories[nextIndex].id, user.id);
      }
    } else {
      // Finished all stories, go back
      router.back();
    }
  };

  const goToPreviousStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleScreenPress = (evt: any) => {
    // Pause current animation
    progress.stopAnimation();
    
    const x = evt.nativeEvent.locationX;
    const screenWidth = Dimensions.get('window').width;
    
    if (x < screenWidth / 2) {
      // Left side - go to previous story
      goToPreviousStory();
    } else {
      // Right side - go to next story
      goToNextStory();
    }
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading stories...</Text>
        </View>
      </View>
    );
  }

  // If no stories after loading, this shouldn't happen due to redirect logic
  if (stories.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No stories available</Text>
        </View>
      </View>
    );
  }

  const currentStory = stories[currentIndex];
  const profileData = currentStory.profiles;

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={1}
      onPress={handleScreenPress}
    >
      {/* Story Image */}
      <Image 
        source={{ uri: currentStory.image_url }} 
        style={styles.image}
        defaultSource={require('../../assets/images/placeholder-image.png')} // Add a placeholder
      />
      
      {/* Progress Bars */}
      <View style={styles.progressBarContainer}>
        {stories.map((_, index) => (
          <View key={index} style={styles.progressBarBackground}>
            <Animated.View 
              style={[
                styles.progressBar,
                {
                  width: index === currentIndex ? 
                    progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }) : 
                    index < currentIndex ? '100%' : '0%'
                }
              ]}
            />
          </View>
        ))}
      </View>
      
      {/* Header with Profile Info */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image 
            source={{ 
              uri: profileData?.avatar_url || 'https://via.placeholder.com/40' 
            }} 
            style={styles.avatar}
            defaultSource={require('../../assets/images/default-avatar.png')} // Add default avatar
          />
          <View style={styles.userDetails}>
            <Text style={styles.username}>
              {profileData?.username || 'Unknown User'}
            </Text>
            <Text style={styles.timeAgo}>
              {getTimeAgo(currentStory.created_at)}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// Helper function to calculate time ago
const getTimeAgo = (dateString: string) => {
  const now = new Date();
  const storyDate = new Date(dateString);
  const diffInHours = Math.floor((now.getTime() - storyDate.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return 'now';
  } else if (diffInHours < 24) {
    return `${diffInHours}h`;
  } else {
    return `${Math.floor(diffInHours / 24)}d`;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    position: 'absolute',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
  progressBarContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    zIndex: 1,
  },
  progressBarBackground: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'white',
  },
  header: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'white',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  timeAgo: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});