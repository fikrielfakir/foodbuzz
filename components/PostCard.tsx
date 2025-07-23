import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Profile {
  user_id: string;
  username: string;
  avatar_url?: string;
  role?: 'user' | 'owner';
}

interface Restaurant {
  id: string;
  name: string;
  image_url?: string;
}

interface Comment {
  id: number;
  content: string;
  user_id: string;
  created_at: string;
  profiles: Profile;
  parent_id?: number | null;
}

interface Post {
  id: string;
  caption?: string;
  image_url: string;
  created_at: string;
  profiles?: Profile;
  restaurant?: Restaurant;
  restaurant_id?: string;
  owner_id?: string;
  likes_count?: number;
  comments_count?: number;
  aspect_ratio?: number;
}

interface PostCardProps {
  post: Post;
  isInitialLoad?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, isInitialLoad = false }) => {
  const { user } = useAuth();
  const router = useRouter();
  
  // State management
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.comments_count || 0);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [restaurantData, setRestaurantData] = useState<Restaurant | null>(null);
  
  // Loading states - more granular control
  const [loadingStates, setLoadingStates] = useState({
    likes: false,
    bookmark: false,
    comments: false,
    restaurant: false,
    addComment: false
  });

  // Memoized values for better performance
  const displayName = useMemo(() => {
    if (post.restaurant_id) {
      return post.restaurant?.name || restaurantData?.name || 'Restaurant';
    }
    return post.profiles?.username || 'User';
  }, [post.restaurant_id, post.restaurant?.name, restaurantData?.name, post.profiles?.username]);

  const avatarUrl = useMemo(() => {
    if (post.restaurant_id) {
      return post.restaurant?.image_url || restaurantData?.image_url || 'https://via.placeholder.com/32';
    }
    return post.profiles?.avatar_url || 'https://via.placeholder.com/32';
  }, [post.restaurant_id, post.restaurant?.image_url, restaurantData?.image_url, post.profiles?.avatar_url]);

  // Optimized data fetching with batching
  const fetchInitialData = useCallback(async () => {
    if (!user) return;

    try {
      // Batch all initial queries
      const promises = [];

      // Check like status
      promises.push(
        supabase
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .maybeSingle()
      );

      // Check bookmark status
      promises.push(
        supabase
          .from('bookmarks')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .maybeSingle()
      );

      // Get comment count if not provided
      if (!post.comments_count) {
        promises.push(
          supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id)
        );
      }

      const results = await Promise.allSettled(promises);
      
      // Process results
      const likeResult = results[0];
      if (likeResult.status === 'fulfilled') {
        setIsLiked(!!likeResult.value.data);
      }

      const bookmarkResult = results[1];
      if (bookmarkResult.status === 'fulfilled') {
        setIsBookmarked(!!bookmarkResult.value.data);
      }

      if (!post.comments_count && results[2]) {
        const commentResult = results[2];
        if (commentResult.status === 'fulfilled') {
          setCommentCount(commentResult.value.count || 0);
        }
      }

    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  }, [post.id, post.comments_count, user]);

  // Fetch restaurant data separately and lazily
  const fetchRestaurantData = useCallback(async () => {
    if (!post.restaurant_id || post.restaurant || restaurantData) return;
    
    setLoadingStates(prev => ({ ...prev, restaurant: true }));
    
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, image_url')
        .eq('id', post.restaurant_id)
        .single();

      if (!error && data) {
        setRestaurantData(data);
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, restaurant: false }));
    }
  }, [post.restaurant_id, post.restaurant, restaurantData]);

  // Only fetch data when component mounts, not on every render
  useEffect(() => {
    if (!isInitialLoad) {
      fetchInitialData();
    }
    
    // Fetch restaurant data lazily
    if (post.restaurant_id && !post.restaurant) {
      fetchRestaurantData();
    }
  }, [isInitialLoad, fetchInitialData, fetchRestaurantData]);

  const navigateToProfile = useCallback(() => {
    if (post.restaurant_id) {
      router.push({
        pathname: '/restaurant/profile/[id]',
        params: { id: post.restaurant_id }
      });
    } else if (post.owner_id) {
      router.push({
        pathname: '/profile/[id]',
        params: { id: post.owner_id }
      });
    }
  }, [post.restaurant_id, post.owner_id, router]);

  const toggleLike = useCallback(async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (loadingStates.likes) return;

    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);
    
    setLoadingStates(prev => ({ ...prev, likes: true }));

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: user.id });

        if (error) throw error;
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
      console.error('Error toggling like:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, likes: false }));
    }
  }, [user, isLiked, post.id, loadingStates.likes, router]);

  const toggleBookmark = useCallback(async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (loadingStates.bookmark) return;

    // Optimistic update
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);
    
    setLoadingStates(prev => ({ ...prev, bookmark: true }));

    try {
      if (wasBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({ post_id: post.id, user_id: user.id });

        if (error) throw error;
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsBookmarked(wasBookmarked);
      console.error('Error toggling bookmark:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, bookmark: false }));
    }
  }, [user, isBookmarked, post.id, loadingStates.bookmark, router]);

  const fetchComments = useCallback(async () => {
    if (loadingStates.comments) return;
    
    setLoadingStates(prev => ({ ...prev, comments: true }));
    
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:user_id(
            username,
            avatar_url
          )
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setComments(data as Comment[]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, comments: false }));
    }
  }, [post.id, loadingStates.comments]);

  const handleAddComment = useCallback(async () => {
    if (!user || !newComment.trim() || loadingStates.addComment) {
      if (!user) router.push('/login');
      return;
    }

    const commentText = newComment.trim();
    setNewComment('');
    setLoadingStates(prev => ({ ...prev, addComment: true }));

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: commentText
        })
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:user_id(
            username,
            avatar_url
          )
        `)
        .single();

      if (!error && data) {
        setComments(prev => [data as Comment, ...prev]);
        setCommentCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setNewComment(commentText); // Restore comment on error
    } finally {
      setLoadingStates(prev => ({ ...prev, addComment: false }));
    }
  }, [user, newComment, post.id, loadingStates.addComment, router]);

  const openComments = useCallback(async () => {
    setShowComments(true);
    if (comments.length === 0) {
      await fetchComments();
    }
  }, [comments.length, fetchComments]);

  // Don't show loading for individual posts in feed
  if (isInitialLoad) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonUserInfo}>
            <View style={styles.skeletonUsername} />
            <View style={styles.skeletonBadge} />
          </View>
        </View>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonActions} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={navigateToProfile}
          disabled={loadingStates.restaurant}
        >
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.username}>{displayName}</Text>
            {post.profiles?.role === 'owner' && (
              <View style={styles.ownerBadge}>
                <MaterialIcons name="restaurant" size={14} color="white" />
                <Text style={styles.ownerBadgeText}>
                  {post.restaurant_id ? 'Restaurant' : 'Owner'}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity>
          <MaterialIcons name="more-vert" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Image */}
      <Link href={`/posts/${post.id}`} asChild>
        <TouchableOpacity activeOpacity={0.9}>
          <Image
            source={{ uri: post.image_url }}
            style={[styles.image, { aspectRatio: post.aspect_ratio || 1 }]}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </Link>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          <TouchableOpacity 
            onPress={toggleLike} 
            activeOpacity={0.7}
            disabled={loadingStates.likes}
          >
            {loadingStates.likes ? (
              <ActivityIndicator size="small" color="#ed4956" style={styles.actionIcon} />
            ) : (
              <MaterialIcons
                name={isLiked ? 'favorite' : 'favorite-border'}
                size={28}
                color={isLiked ? '#ed4956' : 'white'}
                style={styles.actionIcon}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={openComments} activeOpacity={0.7} style={styles.commentButton}>
            <MaterialIcons
              name="mode-comment"
              size={28}
              color="white"
              style={styles.actionIcon}
            />
            {commentCount > 0 && (
              <View style={styles.commentBadge}>
                <Text style={styles.commentBadgeText}>
                  {commentCount > 99 ? '99+' : commentCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}>
            <MaterialIcons name="send" size={28} color="white" style={styles.actionIcon} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          onPress={toggleBookmark} 
          activeOpacity={0.7}
          disabled={loadingStates.bookmark}
        >
          {loadingStates.bookmark ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <MaterialIcons
              name={isBookmarked ? 'bookmark' : 'bookmark-border'}
              size={28}
              color="white"
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Likes */}
      {likeCount > 0 && (
        <Text style={styles.likes}>{likeCount.toLocaleString()} likes</Text>
      )}

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text style={styles.username}>{displayName}</Text>
        <Text style={styles.caption}>{post.caption}</Text>
      </View>

      {/* View All Comments */}
      {commentCount > 0 && (
        <TouchableOpacity onPress={openComments}>
          <Text style={styles.viewAllComments}>
            View all {commentCount} comments
          </Text>
        </TouchableOpacity>
      )}

      {/* Timestamp */}
      <Text style={styles.timestamp}>
        {new Date(post.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })}
      </Text>

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowComments(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowComments(false)}
        >
          <Pressable style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            {loadingStates.comments ? (
              <View style={styles.commentsLoading}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading comments...</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <Image
                      source={{ uri: item.profiles.avatar_url || 'https://via.placeholder.com/32' }}
                      style={styles.commentAvatar}
                    />
                    <View style={styles.commentContent}>
                      <Text style={styles.commentUsername}>{item.profiles.username}</Text>
                      <Text style={styles.commentText}>{item.content}</Text>
                    </View>
                  </View>
                )}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.modalContent}
                showsVerticalScrollIndicator={false}
              />
            )}
            
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
            >
              <View style={styles.modalInputContainer}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#8E8E93"
                  value={newComment}
                  onChangeText={setNewComment}
                  onSubmitEditing={handleAddComment}
                  editable={!loadingStates.addComment}
                />
                <TouchableOpacity 
                  onPress={handleAddComment}
                  disabled={!newComment.trim() || loadingStates.addComment}
                >
                  {loadingStates.addComment ? (
                    <ActivityIndicator size="small" color="#007AFF" />
                  ) : (
                    <Text style={[styles.modalPostButton, !newComment.trim() && styles.disabledPostButton]}>
                      Post
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  // Skeleton loading styles
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  skeletonAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    marginRight: 12,
  },
  skeletonUserInfo: {
    flex: 1,
  },
  skeletonUsername: {
    width: 120,
    height: 14,
    backgroundColor: '#2C2C2E',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonBadge: {
    width: 80,
    height: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 4,
  },
  skeletonImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#2C2C2E',
  },
  skeletonActions: {
    height: 60,
    backgroundColor: '#1C1C1E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#2C2C2E',
  },
  username: {
    fontWeight: '600',
    fontSize: 14,
    color: 'white',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ownerBadgeText: {
    fontSize: 12,
    color: 'white',
    marginLeft: 4,
  },
  image: {
    width: '100%',
    backgroundColor: '#2C2C2E',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: 16,
  },
  commentButton: {
    position: 'relative',
  },
  commentBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#ed4956',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  commentBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  likes: {
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingBottom: 8,
    color: 'white',
  },
  captionContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  caption: {
    fontSize: 14,
    lineHeight: 18,
    color: 'white',
  },
  viewAllComments: {
    color: '#8E8E93',
    paddingHorizontal: 12,
    paddingBottom: 8,
    fontSize: 14,
  },
  timestamp: {
    color: '#8E8E93',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    textTransform: 'uppercase',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    paddingBottom: 16,
  },
  commentsLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#8E8E93',
    marginTop: 12,
    fontSize: 14,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    backgroundColor: '#2C2C2E',
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontWeight: '600',
    fontSize: 14,
    color: 'white',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: 'white',
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    paddingTop: 16,
  },
  modalInput: {
    flex: 1,
    backgroundColor: '#2C2C2E',
    color: 'white',
    borderRadius: 20,
    padding: 12,
    marginRight: 8,
  },
  modalPostButton: {
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledPostButton: {
    color: '#8E8E93',
  },
});

export default PostCard;