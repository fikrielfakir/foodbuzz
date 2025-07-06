import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import PostCard from '../../components/PostCard';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    setRefreshing(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(*), restaurants(*)')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching posts:', error);
    else setPosts(data);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPosts();

    const subscription = supabase
      .channel('posts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <PostCard post={item} />}
      keyExtractor={(item) => item.id.toString()}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={fetchPosts} />
      }
    />
  );
}