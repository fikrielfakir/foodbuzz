import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import RestaurantCard from '../../components/RestaurantCard';

const RestaurantListScreen = ({ navigation }) => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*, reviews!left( rating )')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate average ratings
      const restaurantsWithRatings = data.map(restaurant => {
        const ratings = restaurant.reviews?.map(r => r.rating) || [];
        const avg_rating = ratings.length > 0 
          ? (ratings.reduce((a, b) => a + b, 0) / ratings.length 
          : null;
        return { ...restaurant, avg_rating };
      });

      setRestaurants(restaurantsWithRatings);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantPress = (restaurant) => {
    navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discover Restaurants</Text>
      <FlatList
        data={restaurants}
        renderItem={({ item }) => (
          <RestaurantCard 
            restaurant={item} 
            onPress={() => handleRestaurantPress(item)} 
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        refreshing={loading}
        onRefresh={fetchRestaurants}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default RestaurantListScreen;