import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
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
import PostCard from '../../components/PostCard'; // Changed from { PostCard } to default import
import { Post } from '../../components/types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type Story = {
  id: string;
  username: string;
  avatar: string;
  isYou?: boolean;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock stories data
  const [stories, setStories] = useState<Story[]>([
    { id: user?.id || '1', username: 'Your Story', avatar: user?.user_metadata?.avatar_url || 'https://via.placeholder.com/80', isYou: true },
    { id: '2', username: 'restaurant1', avatar: 'https://via.placeholder.com/80' },
    { id: '3', username: 'foodlover', avatar: 'https://via.placeholder.com/80' },
    { id: '4', username: 'chef_special', avatar: 'https://via.placeholder.com/80' },
    { id: '5', username: 'tastebuds', avatar: 'https://via.placeholder.com/80' },
  ]);

  const fetchPosts = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:owner_id (username, avatar_url),
          restaurants:restaurant_id (name),
          likes:likes(count),
          comments:comments!post_id (
            *,
            profiles:user_id (username, avatar_url)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts();

      const subscription = supabase
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

      return () => {
        supabase.removeChannel(subscription);
      };
    }, [])
  );

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

  const renderStories = () => (
    <View style={styles.storiesContainer}>
      <FlatList
        data={stories}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContent}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.storyItem} key={item.id}>
            <View style={[
              styles.storyAvatarContainer,
              !item.isYou && styles.storyUnseen
            ]}>
              <Image
                source={{ uri: item.avatar }}
                style={styles.storyAvatar}
              />
            </View>
            <Text style={styles.storyUsername} numberOfLines={1}>
              {item.isYou ? 'Your Story' : item.username}
            </Text>
          </TouchableOpacity>
        )}
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
  },
  storyUnseen: {
    borderColor: '#007AFF',
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
});