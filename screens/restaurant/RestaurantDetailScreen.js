import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import PostCard from '../../components/PostCard';
import ReviewItem from '../../components/ReviewItem';
import Icon from 'react-native-vector-icons/MaterialIcons';

const RestaurantDetailScreen = ({ route, navigation }) => {
  const { restaurantId } = route.params;
  const [restaurant, setRestaurant] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRestaurantData();
  }, [restaurantId]);

  const fetchRestaurantData = async () => {
    setLoading(true);
    try {
      // Fetch restaurant details
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();
      setRestaurant(restaurantData);

      // Fetch restaurant posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      setPosts(postsData || []);

      // Fetch restaurant reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, profiles(*)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const handleAddReview = () => {
    navigation.navigate('AddReview', { restaurantId });
  };

  return (
    <View style={styles.container}>
      {restaurant && (
        <>
          <View style={styles.header}>
            <Image 
              source={{ uri: restaurant.image_url || 'https://via.placeholder.com/150' }} 
              style={styles.restaurantImage} 
            />
            <View style={styles.restaurantInfo}>
              <Text style={styles.name}>{restaurant.name}</Text>
              <Text style={styles.cuisine}>{restaurant.cuisine_type?.join(' • ')}</Text>
              <Text style={styles.address}>{restaurant.address}</Text>
              <View style={styles.ratingContainer}>
                <Icon name="star" size={20} color="#FFD700" />
                <Text style={styles.rating}>{calculateAverageRating()}</Text>
                <Text style={styles.reviewCount}>({reviews.length} reviews)</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.reviewButton}
              onPress={handleAddReview}
            >
              <Text style={styles.reviewButtonText}>Write a Review</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Menu Posts</Text>
          <FlatList
            horizontal
            data={posts}
            renderItem={({ item }) => <PostCard post={item} />}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.postsContainer}
            showsHorizontalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No posts yet</Text>
            }
          />

          <Text style={styles.sectionTitle}>Reviews</Text>
          <FlatList
            data={reviews}
            renderItem={({ item }) => <ReviewItem review={item} />}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.reviewsContainer}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No reviews yet</Text>
            }
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 15,
    flexDirection: 'row',
  },
  restaurantImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginRight: 15,
  },
  restaurantInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cuisine: {
    color: '#666',
    marginBottom: 5,
  },
  address: {
    color: '#666',
    marginBottom: 10,
    fontSize: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 5,
  },
  reviewCount: {
    color: '#666',
  },
  actionButtons: {
    padding: 15,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  reviewButton: {
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    backgroundColor: 'white',
  },
  postsContainer: {
    padding: 15,
    backgroundColor: 'white',
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

export default RestaurantDetailScreen;