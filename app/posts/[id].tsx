// app/posts/[id].tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { CommentItem } from '../../components/CommentItem';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Comment {
  id: number;
  content: string;
  user_id: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url?: string;
  };
  parent_id?: number | null;
}

export default function PostCommentsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [post, setPost] = useState<any>(null);

  useEffect(() => {
    const fetchPostAndComments = async () => {
      // Fetch post
      const { data: postData } = await supabase
        .from('posts')
        .select('*, profiles:owner_id(username, avatar_url)')
        .eq('id', id)
        .single();

      if (postData) {
        setPost(postData);
      }

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, profiles:user_id(username, avatar_url)')
        .eq('post_id', id)
        .order('created_at', { ascending: false });

      if (commentsData) {
        setComments(commentsData);
      }
    };

    fetchPostAndComments();

    // Subscribe to new comments
    const subscription = supabase
      .channel('comments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setComments(prev => [payload.new as Comment, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: id,
        user_id: user.id,
        content: newComment,
        parent_id: replyingTo?.id || null
      })
      .select('*, profiles:user_id(username, avatar_url)')
      .single();

    if (!error && data) {
      setComments([data, ...comments]);
      setNewComment('');
      setReplyingTo(null);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comments</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Post Preview */}
      {post && (
        <View style={styles.postPreview}>
          <Image
            source={{ uri: post.image_url }}
            style={styles.postImage}
            resizeMode="cover"
          />
          <Text style={styles.postCaption}>
            <Text style={styles.postUsername}>{post.profiles.username}</Text> {post.caption}
          </Text>
        </View>
      )}

      {/* Comments List */}
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <CommentItem 
            comment={item} 
            onReply={() => handleReply(item)}
          />
        )}
        contentContainerStyle={styles.commentsList}
        ListEmptyComponent={
          <Text style={styles.noComments}>No comments yet</Text>
        }
      />

      {/* Add Comment */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        <View style={styles.commentInputContainer}>
          {replyingTo && (
            <View style={styles.replyingTo}>
              <Text style={styles.replyingToText}>
                Replying to @{replyingTo.profiles.username}
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close" size={16} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          )}
          <TextInput
            style={styles.commentInput}
            placeholder={replyingTo ? `Reply to ${replyingTo.profiles.username}...` : "Add a comment..."}
            placeholderTextColor="#8E8E93"
            value={newComment}
            onChangeText={setNewComment}
            onSubmitEditing={handleAddComment}
          />
          <TouchableOpacity 
            onPress={handleAddComment}
            disabled={!newComment.trim()}
          >
            <Text style={[styles.postButton, !newComment.trim() && styles.disabledPostButton]}>
              Post
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  postPreview: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  postImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  postCaption: {
    flex: 1,
    color: 'white',
    fontSize: 14,
  },
  postUsername: {
    fontWeight: '600',
  },
  commentsList: {
    paddingBottom: 16,
  },
  noComments: {
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 32,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2C2C2E',
    backgroundColor: '#1C1C1E',
  },
  commentInput: {
    flex: 1,
    color: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    marginRight: 8,
  },
  postButton: {
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledPostButton: {
    color: '#8E8E93',
  },
  replyingTo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    padding: 8,
    marginBottom: 8,
    borderRadius: 8,
  },
  replyingToText: {
    color: '#8E8E93',
    fontSize: 12,
    marginRight: 8,
  },
});