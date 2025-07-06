import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PostCard from '../../components/PostCard';
import ReviewItem from '../../components/ReviewItem';

export default function RestaurantProfileScreen() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch restaurant info
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .single();
      setRestaurant(restaurantData);

      // Fetch restaurant posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      setPosts(postsData || []);

      // Fetch restaurant reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, profiles(*)')
        .eq('restaurant_id', user.id);
      setReviews(reviewsData || []);
    };

    fetchData();
  }, [user]);

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.restaurantHeader}>
        <Image 
          source={{ uri: restaurant?.image_url || 'https://via.placeholder.com/150' }} 
          style={styles.restaurantImage} 
        />
        <View style={styles.restaurantInfo}>
          <Text style={styles.restaurantName}>{restaurant?.name || 'Your Restaurant'}</Text>
          <Text style={styles.restaurantAddress}>{restaurant?.address || 'No address provided'}</Text>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>{calculateAverageRating()}</Text>
            <Text style={styles.reviewCount}>({reviews.length} reviews)</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{posts.length}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{reviews.length}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your Posts</Text>
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.postsContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>You haven't posted anything yet</Text>
        }
      />

      <Text style={styles.sectionTitle}>Recent Reviews</Text>
      <FlatList
        data={reviews.slice(0, 3)}
        renderItem={({ item }) => <ReviewItem review={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.reviewsContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No reviews yet</Text>
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
  restaurantHeader: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  restaurantImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginRight: 15,
  },
  restaurantInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  restaurantAddress: {
    color: '#666',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginRight: 5,
  },
  reviewCount: {
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  statLabel: {
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    backgroundColor: 'white',
    marginBottom: 1,
  },
  postsContainer: {
    paddingBottom: 20,
  },
  reviewsContainer: {
    paddingBottom: 20,
    backgroundColor: 'white',
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
  },
});