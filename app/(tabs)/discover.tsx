import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Restaurant {
  id: string;
  name: string;
  image_url: string;
  cuisine_type: string[];
  description?: string;
  rating?: number;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          id,
          name,
          image_url,
          cuisine_type,
          description,
          reviews:reviews(
            rating
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20); // Limit to 20 restaurants initially

      if (error) throw error;

      // Calculate average ratings
      const restaurantsWithRatings = data.map(restaurant => ({
        ...restaurant,
        rating: restaurant.reviews?.length 
          ? restaurant.reviews.reduce((sum, review) => sum + review.rating, 0) / restaurant.reviews.length
          : null
      }));

      setRestaurants(restaurantsWithRatings);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRestaurants();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Discover</Text>
          <TouchableOpacity>
            <MaterialIcons name="tune" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <TouchableOpacity>
          <MaterialIcons name="tune" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={restaurants}
        numColumns={2}
        columnWrapperStyle={styles.gridContainer}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push(`/restaurants/${item.id}`)}
          >
            <Image 
              source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} 
              style={styles.cardImage} 
            />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={styles.cuisineContainer}>
                {item.cuisine_type?.slice(0, 2).map((cuisine, index) => (
                  <Text key={index} style={styles.cardCuisine}>
                    {cuisine}{index < item.cuisine_type.length - 1 && index < 1 ? ' • ' : ''}
                  </Text>
                ))}
              </View>
              {item.rating && (
                <View style={styles.ratingContainer}>
                  <MaterialIcons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No restaurants found</Text>
          </View>
        }
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  contentContainer: {
    padding: 16,
    flexGrow: 1,
  },
  gridContainer: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
    marginBottom: 16,
  },
  cardImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#2C2C2E',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  cuisineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardCuisine: {
    color: '#8E8E93',
    fontSize: 14,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
  },
});