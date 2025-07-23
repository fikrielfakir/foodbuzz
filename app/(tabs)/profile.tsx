import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  SafeAreaView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 100;
const AVATAR_SIZE = 120;

type Post = {
  id: string;
  image_url: string;
  caption: string;
  created_at: string;
  restaurants?: { name: string };
};

type Review = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

type Restaurant = {
  id: string;
  name: string;
  image_url?: string;
};

type UserRole = 'user' | 'restaurant' | 'admin' | 'owner';

type Profile = {
  id?: string;
  username: string;
  avatar_url?: string;
  role?: UserRole;
  bio?: string;
};

type Stats = {
  post_count: number;
  follower_count: number;
  following_count: number;
  review_count: number;
};

export default function ProfileScreen() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [scrollY] = useState(new Animated.Value(0));
  const [activeTab, setActiveTab] = useState('posts');
  const [stats, setStats] = useState<Stats>({
    post_count: 0,
    follower_count: 0,
    following_count: 0,
    review_count: 0
  });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const router = useRouter();

  const isOwner = (profile?: Profile | null): boolean => {
    return profile?.role === 'owner';
  };

  useEffect(() => {
    if (user) {
      fetchUserData();
      if (isOwner(profile)) {
        fetchUserRestaurants();
      }
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUserPosts(),
        fetchUserReviews(),
        fetchUserStats()
      ]);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRestaurants = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, image_url')
        .eq('owner_id', user.id);

      if (error) throw error;
      setRestaurants(data || []);
      if (data && data.length > 0) {
        setSelectedRestaurant(data[0]);
      }
    } catch (error) {
      console.error('Error fetching user restaurants:', error);
    }
  };

  const fetchUserPosts = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('posts')
        .select('*, restaurants(name)')
        .order('created_at', { ascending: false });

      if (isOwner(profile) && selectedRestaurant) {
        query = query.eq('restaurant_id', selectedRestaurant.id);
      } else {
        query = query.eq('owner_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      const validatedPosts = (data || []).map(post => ({
        ...post,
        caption: post.caption || '',
        image_url: post.image_url || ''
      }));
      setPosts(validatedPosts);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    }
  };

  const fetchUserReviews = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, restaurants(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const validatedReviews = (data || []).map(review => ({
        ...review,
        restaurant_name: review.restaurants?.name || 'Unknown',
        comment: review.comment || ''
      }));
      setReviews(validatedReviews);
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Get post count
      let postCountQuery = supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

      if (isOwner(profile) && selectedRestaurant) {
        postCountQuery = postCountQuery.eq('restaurant_id', selectedRestaurant.id);
      } else {
        postCountQuery = postCountQuery.eq('owner_id', user.id);
      }

      const { count: postCount } = await postCountQuery;

      // Get follower count (people following this user/restaurant)
      let followerCountQuery = supabase
        .from('follows')
        .select('*', { count: 'exact', head: true });

      if (isOwner(profile) && selectedRestaurant) {
        followerCountQuery = followerCountQuery.eq('restaurant_id', selectedRestaurant.id);
      } else {
        followerCountQuery = followerCountQuery.eq('user_id', user.id);
      }

      const { count: followerCount } = await followerCountQuery;

      // Get following count (people this user is following)
      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

      // Get review count
      const { count: reviewCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        post_count: postCount || 0,
        follower_count: followerCount || 0,
        following_count: followingCount || 0,
        review_count: reviewCount || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);

              if (error) throw error;

              setPosts(posts.filter(post => post.id !== postId));
              setStats(prev => ({
                ...prev,
                post_count: prev.post_count - 1
              }));
              Alert.alert('Success', 'Post deleted successfully');
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          }
        }
      ]
    );
  };

  const handleRestaurantChange = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    fetchUserData(); // Refetch data for the selected restaurant
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out ${profile?.username}'s profile on our app!`,
        url: 'https://yourapp.com/profile',
        title: `Share ${profile?.username}'s Profile`
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const handleChangeAvatar = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'We need access to your photos to change your profile picture.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled) return;

      if (!pickerResult.assets || !pickerResult.assets[0].uri) {
        throw new Error('No image selected');
      }

      const imageUri = pickerResult.assets[0].uri;
      const imageName = `${user?.id}-${Date.now()}.jpg`;
      const imagePath = `avatars/${imageName}`;

      // Upload the image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(imagePath, {
          uri: imageUri,
          type: 'image/jpeg',
          name: imageName,
        } as any, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(imagePath);

      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      // Update local profile state
      if (profile) {
        updateProfile({ ...profile, avatar_url: publicUrl });
      }

      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error changing avatar:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const avatarScale = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  const RestaurantSelector = () => (
    <View style={styles.restaurantSelector}>
      <Text style={styles.restaurantSelectorLabel}>Current Restaurant:</Text>
      <View style={styles.restaurantDropdown}>
        {selectedRestaurant ? (
          <Text style={styles.restaurantName}>{selectedRestaurant.name}</Text>
        ) : (
          <Text style={styles.restaurantName}>No restaurant selected</Text>
        )}
        <Ionicons name="chevron-down" size={16} color="#007AFF" />
      </View>
      {restaurants.length > 0 && (
        <View style={styles.restaurantList}>
          {restaurants.map(restaurant => (
            <TouchableOpacity
              key={restaurant.id}
              style={styles.restaurantItem}
              onPress={() => handleRestaurantChange(restaurant)}
            >
              <Text style={[
                styles.restaurantItemText,
                selectedRestaurant?.id === restaurant.id && styles.selectedRestaurantItem
              ]}>
                {restaurant.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Link href="/restaurant/settings" asChild>
        <TouchableOpacity style={styles.restaurantSettingsButton}>
          <Ionicons name="settings-outline" size={20} color="#007AFF" />
          <Text style={styles.restaurantSettingsText}>Restaurant Settings</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );

  const ProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.gradientBackground}>
        <SafeAreaView style={styles.headerContent}>
          <View style={styles.headerActions}>
            <Link href="/profile/settings" asChild>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="settings-outline" size={24} color="white" />
              </TouchableOpacity>
            </Link>
            <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: avatarScale }] }]}>
            <View style={styles.avatarGlow}>
              <Image
                source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
              />
              <View style={styles.avatarBorder} />
              <TouchableOpacity 
                style={styles.avatarEditButton}
                onPress={handleChangeAvatar}
              >
                <Ionicons name="camera-outline" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </Animated.View>
          
          <Text style={styles.username}>{profile?.username || 'User'}</Text>
          <Text style={styles.userRole}>
            {isOwner(profile) ? '🏪 Restaurant Owner' : '🍽️ Food Enthusiast'}
          </Text>
          
          <View style={styles.statusIndicator}>
            <View style={styles.onlineStatus} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );

  const StatsCard = () => (
    <View style={styles.statsCard}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.post_count}</Text>
        <Text style={styles.statLabel}>Posts</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.follower_count}</Text>
        <Text style={styles.statLabel}>Followers</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.following_count}</Text>
        <Text style={styles.statLabel}>Following</Text>
      </View>
    </View>
  );

  const ActionButtons = () => (
    <View style={styles.actionButtons}>
      <Link href="/profile/edit" asChild>
        <TouchableOpacity style={styles.primaryButton}>
          <Ionicons name="create-outline" size={20} color="white" />
          <Text style={styles.primaryButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </Link>
      <TouchableOpacity 
        style={styles.secondaryButton}
        onPress={handleShareProfile}
      >
        <Ionicons name="share-outline" size={20} color="#007AFF" />
        <Text style={styles.secondaryButtonText}>Share</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconButton}>
        <Ionicons name="ellipsis-horizontal" size={20} color="#8E8E93" />
      </TouchableOpacity>
    </View>
  );

  const TabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'posts' && styles.activeTab]}
        onPress={() => setActiveTab('posts')}
      >
        <Ionicons 
          name={activeTab === 'posts' ? 'grid' : 'grid-outline'} 
          size={24} 
          color={activeTab === 'posts' ? '#007AFF' : '#8E8E93'} 
        />
        <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
          Posts
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'favorites' && styles.activeTab]}
        onPress={() => setActiveTab('favorites')}
      >
        <Ionicons 
          name={activeTab === 'favorites' ? 'heart' : 'heart-outline'} 
          size={24} 
          color={activeTab === 'favorites' ? '#007AFF' : '#8E8E93'} 
        />
        <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>
          Favorites
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'reviews' && styles.activeTab]}
        onPress={() => setActiveTab('reviews')}
      >
        <Ionicons 
          name={activeTab === 'reviews' ? 'star' : 'star-outline'} 
          size={24} 
          color={activeTab === 'reviews' ? '#007AFF' : '#8E8E93'} 
        />
        <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
          Reviews
        </Text>
      </TouchableOpacity>
    </View>
  );

  const PostGrid = () => (
    <FlatList
      data={posts}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.postItem}>
          <Image source={{ uri: item.image_url }} style={styles.postImage} />
          <View style={styles.postOverlay}>
            <View style={styles.postStats}>
              <View style={styles.postStat}>
                <Ionicons name="heart" size={16} color="white" />
                <Text style={styles.postStatText}>24</Text>
              </View>
              <View style={styles.postStat}>
                <Ionicons name="chatbubble" size={16} color="white" />
                <Text style={styles.postStatText}>5</Text>
              </View>
            </View>
            {isOwner(profile) && (
              <TouchableOpacity 
                style={styles.deletePostButton}
                onPress={() => handleDeletePost(item.id)}
              >
                <Ionicons name="trash-outline" size={16} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id}
      numColumns={3}
      contentContainerStyle={styles.postsGrid}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={fetchUserData}
          colors={['#007AFF']}
          tintColor="#007AFF"
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="camera-outline" size={64} color="#48484A" />
          </View>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySubtitle}>
            Start sharing your culinary adventures!
          </Text>
          <Link href="/create-post" asChild>
            <TouchableOpacity style={styles.createPostButton}>
              <Ionicons name="add" size={24} color="white" />
              <Text style={styles.createPostButtonText}>Create Post</Text>
            </TouchableOpacity>
          </Link>
        </View>
      }
    />
  );

  const ReviewList = () => (
    <FlatList
      data={reviews}
      renderItem={({ item }) => (
        <View style={styles.reviewItem}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewRestaurant}>{item.restaurant_name}</Text>
            <View style={styles.reviewRating}>
              {[...Array(5)].map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < item.rating ? 'star' : 'star-outline'}
                  size={16}
                  color="#FFD700"
                />
              ))}
            </View>
          </View>
          <Text style={styles.reviewComment}>{item.comment}</Text>
          <Text style={styles.reviewDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.reviewsList}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={fetchUserData}
          colors={['#007AFF']}
          tintColor="#007AFF"
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="star-outline" size={64} color="#48484A" />
          </View>
          <Text style={styles.emptyTitle}>No reviews yet</Text>
          <Text style={styles.emptySubtitle}>
            Share your dining experiences
          </Text>
        </View>
      }
    />
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'posts':
        return isOwner(profile) ? <PostGrid /> : null;
      case 'favorites':
        return (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="heart-outline" size={64} color="#48484A" />
            </View>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptySubtitle}>
              Save posts you love to see them here
            </Text>
          </View>
        );
      case 'reviews':
        return <ReviewList />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ProfileHeader />
        <View style={styles.content}>
          {isOwner(profile) && restaurants.length > 0 && <RestaurantSelector />}
          <StatsCard />
          <ActionButtons />
          <TabBar />
          {renderContent()}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    height: 320,
    overflow: 'hidden',
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    position: 'relative',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerActions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 40,
    right: 20,
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(20px)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGlow: {
    position: 'relative',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#2C2C2E',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarBorder: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: (AVATAR_SIZE + 12) / 2,
    borderWidth: 2,
    borderColor: 'rgba(0,122,255,0.3)',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  username: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  userRole: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
    fontWeight: '500',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backdropFilter: 'blur(20px)',
  },
  onlineStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#30D158',
  },
  statusText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 20,
    marginTop: -30,
  },
  restaurantSelector: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  restaurantSelectorLabel: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 8,
  },
  restaurantDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  restaurantName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  restaurantList: {
    marginTop: 8,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  restaurantItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  restaurantItemText: {
    color: 'white',
    fontSize: 16,
  },
  selectedRestaurantItem: {
    color: '#007AFF',
    fontWeight: '600',
  },
  restaurantSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 12,
  },
  restaurantSettingsText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(0,122,255,0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.3)',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  activeTab: {
    backgroundColor: 'rgba(0,122,255,0.15)',
  },
  tabText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#007AFF',
  },
  postsGrid: {
    paddingBottom: 40,
  },
  postItem: {
    width: (SCREEN_WIDTH - 60) / 3,
    height: (SCREEN_WIDTH - 60) / 3,
    margin: 2,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#2C2C2E',
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2C2C2E',
  },
  postOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    justifyContent: 'flex-end',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  postStats: {
    flexDirection: 'row',
    gap: 12,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  deletePostButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,59,48,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewsList: {
    paddingBottom: 40,
  },
  reviewItem: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewRestaurant: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewComment: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    lineHeight: 22,
  },
  reviewDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  createPostButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createPostButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
});