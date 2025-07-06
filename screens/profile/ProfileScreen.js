import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PostCard from '../../components/PostCard';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [posts, setPosts] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setProfile(profileData);

      // Fetch user posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*, restaurants(*)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      setPosts(postsData || []);
    };

    fetchData();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }} 
          style={styles.avatar} 
        />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{profile?.username || 'User'}</Text>
          <Text style={styles.role}>{user?.role === 'owner' ? 'Restaurant Owner' : 'Food Enthusiast'}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {user?.role === 'owner' && (
        <Text style={styles.sectionTitle}>Your Posts</Text>
      )}

      <FlatList
        data={posts}
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.postsContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {user?.role === 'owner' 
              ? 'You haven\'t posted anything yet' 
              : 'No saved posts'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  role: {
    color: '#666',
  },
  signOutButton: {
    padding: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 5,
  },
  signOutText: {
    color: 'white',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    backgroundColor: 'white',
  },
  postsContainer: {
    paddingBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});