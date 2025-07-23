import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
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
import { CommentItem, PostComment } from './CommentItem';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface Post {
  id: string;
  caption: string;
  image_url: string;
  created_at: string;
  profiles?: Profile;
  comments?: PostComment[];
  likes?: Array<{ count: number }>;
}

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes?.[0]?.count || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    const checkLike = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .single();

      setIsLiked(!!data);
    };

    const getCommentCount = async () => {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);

      setCommentCount(count || 0);
    };

    checkLike();
    getCommentCount();
  }, [user, post.id]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        post_id,
        profiles:user_id(
          username,
          avatar_url
        )
      `)
      .eq('post_id', post.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const postComments: PostComment[] = data.map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_id: comment.user_id,
        post_id: comment.post_id,
        profiles: {
          username: comment.profiles?.username || 'Unknown User',
          avatar_url: comment.profiles?.avatar_url || null
        }
      }));
      setComments(postComments);
    }
  };

  const toggleLike = async () => {
    if (!user) return;

    if (isLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);

      if (!error) {
        setIsLiked(false);
        setLikeCount(prev => prev - 1);
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: post.id, user_id: user.id });

      if (!error) {
        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }
    }
  };

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: post.id,
        user_id: user.id,
        content: newComment
      })
      .select(`
        id,
        content,
        created_at,
        user_id,
        post_id,
        profiles:user_id(
          username,
          avatar_url
        )
      `)
      .single();

    if (!error && data) {
      const newCommentData: PostComment = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        user_id: data.user_id,
        post_id: data.post_id,
        profiles: {
          username: (data as any).profiles?.username || 'Unknown User',
          avatar_url: (data as any).profiles?.avatar_url || null
        }
      };
      setComments([newCommentData, ...comments]);
      setCommentCount(prev => prev + 1);
      setNewComment('');
    }
  };

  const openComments = async () => {
    await fetchComments();
    setShowComments(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => router.push(`/restaurant/profile/${post.profiles?.id}`)}
        >
          <Image
            source={{ uri: post.profiles?.avatar_url || 'https://via.placeholder.com/32' }}
            style={styles.avatar}
          />
          <Text style={styles.username}>{post.profiles?.username || 'Unknown User'}</Text>
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
            style={styles.image}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </Link>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={toggleLike} activeOpacity={0.7}>
            <MaterialIcons
              name={isLiked ? 'favorite' : 'favorite-border'}
              size={28}
              color={isLiked ? '#ed4956' : 'white'}
              style={styles.actionIcon}
            />
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
        <TouchableOpacity onPress={toggleBookmark} activeOpacity={0.7}>
          <MaterialIcons
            name={isBookmarked ? 'bookmark' : 'bookmark-border'}
            size={28}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* Likes */}
      {likeCount > 0 && (
        <Text style={styles.likes}>{likeCount.toLocaleString()} likes</Text>
      )}

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text style={styles.caption}>
          <Text style={styles.username}>{post.profiles?.username || 'Unknown User'} </Text>
          {post.caption}
        </Text>
      </View>

      {/* View All Comments - Only show if there are comments */}
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
            
            <FlatList
              data={comments}
              renderItem={({ item }) => <CommentItem comment={item} />}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            />
            
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
                />
                <TouchableOpacity 
                  onPress={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  <Text style={[styles.modalPostButton, !newComment.trim() && styles.disabledPostButton]}>
                    Post
                  </Text>
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
  image: {
    width: '100%',
    aspectRatio: 1,
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