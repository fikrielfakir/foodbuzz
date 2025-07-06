import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList } from 'react-native';
import { supabase } from '../../lib/supabase';
import CommentItem from '../../components/CommentItem';
import Icon from 'react-native-vector-icons/MaterialIcons';

const PostDetailScreen = ({ route }) => {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPostData();
  }, [postId]);

  const fetchPostData = async () => {
    setLoading(true);
    try {
      // Fetch post details
      const { data: postData } = await supabase
        .from('posts')
        .select('*, profiles(*), restaurants(*)')
        .eq('id', postId)
        .single();
      setPost(postData);

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, profiles(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
      setComments(commentsData || []);
    } catch (error) {
      console.error('Error fetching post data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !post) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.postHeader}>
        <Image 
          source={{ uri: post.profiles.avatar_url }} 
          style={styles.avatar} 
        />
        <View>
          <Text style={styles.username}>{post.profiles.username}</Text>
          <Text style={styles.restaurant}>{post.restaurants.name}</Text>
        </View>
      </View>
      
      <Image source={{ uri: post.image_url }} style={styles.postImage} />
      
      <View style={styles.postActions}>
        <View style={styles.actionGroup}>
          <Icon name="favorite-border" size={24} color="#FF6B6B" />
          <Text style={styles.actionText}>Like</Text>
        </View>
        <View style={styles.actionGroup}>
          <Icon name="comment" size={24} color="#666" />
          <Text style={styles.actionText}>Comment</Text>
        </View>
      </View>
      
      <Text style={styles.caption}>{post.caption}</Text>
      
      <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
      <FlatList
        data={comments}
        renderItem={({ item }) => <CommentItem comment={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.commentsContainer}
        ListEmptyComponent={
          <Text style={styles.noComments}>No comments yet</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  username: {
    fontWeight: 'bold',
  },
  restaurant: {
    color: '#666',
    fontSize: 12,
  },
  postImage: {
    width: '100%',
    height: 350,
  },
  postActions: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    marginLeft: 5,
    color: '#666',
  },
  caption: {
    padding: 15,
    fontSize: 16,
  },
  commentsTitle: {
    padding: 15,
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentsContainer: {
    paddingBottom: 20,
  },
  noComments: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
  },
});

export default PostDetailScreen;