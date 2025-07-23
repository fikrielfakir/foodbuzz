import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import PostCard from '../../components/PostCard';
import { Post } from '../../components/types';
import { useAuth } from '../../contexts/AuthContext';
import { checkUnseenStories, getFollowingStories } from '../../lib/stories';
import { supabase } from '../../lib/supabase';

type Story = {
  id: string;
  username: string;
  avatar: string;
  isYou?: boolean;
  hasUnseenStory?: boolean;
  userId?: string;
  hasActiveStory?: boolean;
};

export default function HomeScreen() {
  const { user,profile } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkUserHasActiveStory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking user stories:', error);
      return false;
    }
  };

  const fetchStories = async () => {
    try {
      // Check if current user has active stories
      const userHasStory = await checkUserHasActiveStory(user?.id || '');
      
      // Start with the user's own story
      const userStory: Story = {
        id: user?.id || '1',
        userId: user?.id,
        username: 'Your Story',
        avatar: user?.user_metadata?.avatar_url || 'https://via.placeholder.com/80',
        isYou: true,
        hasActiveStory: userHasStory
      };

      // Get stories from people you follow
      const followingStories = await getFollowingStories(user?.id || '');
      
      // Check which stories are unseen
      const unseenMap = await checkUnseenStories(user?.id || '');

      // Transform stories data
      const transformedStories: Story[] = [userStory];

      // Group stories by user to avoid duplicates
      const userStoriesMap = new Map();
      
      followingStories.forEach(story => {
        // Skip if it's your own story (already added)
        if (story.user_id === user?.id) return;

        // If we haven't seen this user yet, add them
        if (!userStoriesMap.has(story.user_id)) {
          userStoriesMap.set(story.user_id, {
            id: story.id,
            userId: story.user_id,
            username: story.profiles?.username || 'Unknown',
            avatar: story.profiles?.avatar_url || 'https://via.placeholder.com/80',
            hasUnseenStory: unseenMap[story.user_id] || false,
            hasActiveStory: true
          });
        }
      });

      // Add all unique user stories
      userStoriesMap.forEach(story => {
        transformedStories.push(story);
      });

      setStories(transformedStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
      // Fallback with just user story
      setStories([
        { 
          id: user?.id || '1', 
          username: 'Your Story', 
          avatar: user?.user_metadata?.avatar_url || 'https://via.placeholder.com/80', 
          isYou: true,
          hasActiveStory: false
        }
      ]);
    }
  };

  const fetchPosts = async () => {
    setRefreshing(true);
    try {
      const [postsResponse] = await Promise.all([
        supabase
          .from('posts')
          .select(`
            *,
            profiles:owner_id (username, avatar_url, user_id),
            restaurants:restaurant_id (name),
            likes:likes(count),
            comments:comments!post_id (
              *,
              profiles:user_id (username, avatar_url, user_id)
            )
          `)
          .order('created_at', { ascending: false }),
        
        fetchStories()
      ]);

      if (postsResponse.error) throw postsResponse.error;
      
      // Transform the data to match the expected Post type
      const transformedPosts: Post[] = (postsResponse.data || []).map(post => ({
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles,
        comments: post.comments.map((comment: any) => ({
          ...comment,
          profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles
        }))
      }));
      
      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts();

      // Set up real-time subscriptions
      const postsSubscription = supabase
        .channel('posts_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'posts',
          },
          () => fetchPosts()
        )
        .subscribe();

      const storiesSubscription = supabase
        .channel('stories_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'stories',
          },
          () => fetchStories()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(postsSubscription);
        supabase.removeChannel(storiesSubscription);
      };
    }, [])
  );

  const handleStoryPress = (story: Story) => {
    if (story.isYou) {
      // Check if user has active stories
      if (story.hasActiveStory) {
        // User has stories, navigate to view them
        router.push(`/stories/${story.userId}`);
      } else {
        // User has no stories, navigate to create story screen
        router.push('/stories/create-story');
      }
    } else {
      // Navigate to view other user's story
      router.push(`/stories/${story.userId}`);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.logo}>FoodieBuzz</Text>
      <View style={styles.headerIcons}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="heart-outline" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStoryItem = ({ item }: { item: Story }) => (
    
    <TouchableOpacity 
      style={styles.storyItem} 
      onPress={() => handleStoryPress(item)}
    >
      <View style={[
        styles.storyAvatarContainer,
        item.hasUnseenStory && styles.storyUnseen,
        item.isYou && !item.hasActiveStory && styles.storyCreate
      ]}>
        <Image
          source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/32' }}
          style={styles.storyAvatar}
          defaultSource={require('../../assets/images/default-avatar.png')}
        />
        {item.isYou && !item.hasActiveStory && (
          <View style={styles.addStoryIcon}>
            <Ionicons name="add" size={16} color="white" />
          </View>
        )}
      </View>
      <Text style={styles.storyUsername} numberOfLines={1}>
        {item.isYou ? 'Your Story' : item.username}
      </Text>
    </TouchableOpacity>
  );

  const renderStories = () => (
    <View style={styles.storiesContainer}>
      <FlatList
        data={stories}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContent}
        renderItem={renderStoryItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="photo-camera" size={64} color="#8E8E93" />
      <Text style={styles.emptyTitle}>No Posts Yet</Text>
      <Text style={styles.emptyText}>
        When you follow restaurants, you'll see their posts here.
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        {renderHeader()}
        {renderLoadingState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}
      {renderStories()}
      
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={fetchPosts}
            tintColor="#007AFF"
          />
        }
        contentContainerStyle={[
          styles.listContainer,
          posts.length === 0 && styles.emptyListContainer
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState()}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={3}
      />
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 36,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  logo: {
    fontSize: 28,
    fontWeight: '600',
    color: 'white',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  storiesContent: {
    paddingHorizontal: 12,
  },
  storyItem: {
    width: 80,
    alignItems: 'center',
    marginRight: 16,
  },
  storyAvatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  storyUnseen: {
    borderColor: '#007AFF',
  },
  storyCreate: {
    borderColor: '#8E8E93',
  },
  storyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  storyUsername: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
  },
  addStoryIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
});