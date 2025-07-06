import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Linking,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../../../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 250;
const AVATAR_SIZE = 100;

type Restaurant = {
  id: string;
  name: string;
  address: string;
  description: string;
  cuisine_type: string[];
  phone: string;
  website: string;
  hours: any;
  image_url: string;
  cover_image_url: string;
  latitude?: number;
  longitude?: number;
  average_rating?: number;
  review_count?: number;
};

type Review = {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  rating: number;
  comment: string;
  created_at: string;
};

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
};

type ProfileData = {
  username: string;
  avatar_url: string;
} | null;

const RestaurantProfileScreen = () => {
  const { id } = useLocalSearchParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchRestaurantData();
  }, [id]);

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRestaurantWithRating(),
        fetchReviews(),
        fetchMenuItems(),
        checkIfFollowing(),
        fetchFollowersCount()
      ]);
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRestaurantWithRating = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        restaurant_ratings (
          average_rating,
          review_count
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    setRestaurant({
      ...data,
      average_rating: data.restaurant_ratings?.average_rating || 0,
      review_count: data.restaurant_ratings?.review_count || 0
    });
  };

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        user_id,
        profiles:user_id (username, avatar_url)
      `)
      .eq('restaurant_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedReviews = data.map(review => {
      // Handle case where profiles might be an array or object
      let profile: ProfileData = null;
      if (Array.isArray(review.profiles)) {
        profile = review.profiles[0] as ProfileData;
      } else {
        profile = review.profiles as ProfileData;
      }

      return {
        id: review.id,
        user_id: review.user_id,
        user_name: profile?.username || 'Anonymous',
        user_avatar: profile?.avatar_url || '',
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at
      };
    });

    setReviews(formattedReviews);
  };

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', id)
      .order('name', { ascending: true });

    if (error) throw error;
    setMenuItems(data || []);
  };

  const checkIfFollowing = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsFollowing(false);
      return;
    }

    const { data, error } = await supabase
      .from('follows')
      .select('*')
      .eq('user_id', user.id)
      .eq('restaurant_id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking follow status:', error);
      return;
    }

    setIsFollowing(!!data);
  };

  const fetchFollowersCount = async () => {
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', id);

    if (error) {
      console.error('Error fetching followers count:', error);
      return;
    }

    setFollowersCount(count || 0);
  };

  const handleFollow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('user_id', user.id)
          .eq('restaurant_id', id);

        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            user_id: user.id,
            restaurant_id: id
          });

        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error following restaurant:', error);
    }
  };

  const handleShare = async () => {
    if (!restaurant) return;

    try {
      await Share.share({
        message: `Check out ${restaurant.name} on our app!`,
        url: `https://yourapp.com/restaurant/${restaurant.id}`,
        title: `Share ${restaurant.name}`
      });
    } catch (error) {
      console.error('Error sharing restaurant:', error);
    }
  };

  const handleCall = () => {
    if (!restaurant?.phone) return;
    Linking.openURL(`tel:${restaurant.phone}`);
  };

  const handleVisitWebsite = () => {
    if (!restaurant?.website) return;
    WebBrowser.openBrowserAsync(restaurant.website);
  };

  const handleOpenMap = () => {
    if (!restaurant?.latitude || !restaurant?.longitude) return;
    
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${restaurant.latitude},${restaurant.longitude}`;
    const label = restaurant.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) Linking.openURL(url);
  };

  const handleAddReview = () => {
    router.push({
      pathname: '/restaurant/add-review',
      params: { restaurantId: id }
    });
  };

  const renderRatingStars = (rating: number) => {
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color="#FFD700"
          />
        ))}
      </View>
    );
  };

  const renderAboutTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>About</Text>
      <Text style={styles.descriptionText}>{restaurant?.description}</Text>
      
      <Text style={styles.sectionTitle}>Cuisine</Text>
      <View style={styles.cuisineContainer}>
        {restaurant?.cuisine_type?.map((cuisine, index) => (
          <View key={index} style={styles.cuisinePill}>
            <Text style={styles.cuisineText}>{cuisine}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Contact</Text>
      <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
        <MaterialIcons name="phone" size={24} color="#007AFF" />
        <Text style={styles.contactText}>{restaurant?.phone || 'Not available'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.contactItem} onPress={handleVisitWebsite}>
        <MaterialCommunityIcons name="web" size={24} color="#007AFF" />
        <Text style={styles.contactText}>
          {restaurant?.website ? 'Visit Website' : 'Website not available'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.contactItem} onPress={handleOpenMap}>
        <MaterialIcons name="location-on" size={24} color="#007AFF" />
        <Text style={styles.contactText}>{restaurant?.address}</Text>
      </TouchableOpacity>

      {restaurant?.hours && (
        <>
          <Text style={styles.sectionTitle}>Hours</Text>
          {Object.entries(restaurant.hours).map(([day, hours]) => (
            <View key={day} style={styles.hoursRow}>
              <Text style={styles.hoursDay}>{day}</Text>
              <Text style={styles.hoursTime}>{hours as string}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );

  const renderReviewsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.reviewsHeader}>
        <View style={styles.ratingSummary}>
          <Text style={styles.averageRating}>
            {restaurant?.average_rating?.toFixed(1) || '0.0'}
          </Text>
          {renderRatingStars(restaurant?.average_rating || 0)}
          <Text style={styles.reviewCount}>
            {restaurant?.review_count || 0} reviews
          </Text>
        </View>
        <TouchableOpacity style={styles.addReviewButton} onPress={handleAddReview}>
          <Ionicons name="create-outline" size={20} color="white" />
          <Text style={styles.addReviewButtonText}>Add Review</Text>
        </TouchableOpacity>
      </View>

      {reviews.length > 0 ? (
        <FlatList
          data={reviews}
          renderItem={({ item }) => (
            <View style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <Image
                  source={{ uri: item.user_avatar || 'https://via.placeholder.com/150' }}
                  style={styles.reviewerAvatar}
                />
                <View style={styles.reviewerInfo}>
                  <Text style={styles.reviewerName}>{item.user_name}</Text>
                  <View style={styles.reviewMeta}>
                    {renderRatingStars(item.rating)}
                    <Text style={styles.reviewDate}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.reviewComment}>{item.comment}</Text>
            </View>
          )}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyReviews}>
          <Ionicons name="restaurant-outline" size={48} color="#8E8E93" />
          <Text style={styles.emptyReviewsText}>No reviews yet</Text>
          <Text style={styles.emptyReviewsSubtext}>Be the first to review this restaurant</Text>
          <TouchableOpacity style={styles.addReviewButton} onPress={handleAddReview}>
            <Ionicons name="create-outline" size={20} color="white" />
            <Text style={styles.addReviewButtonText}>Add Review</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderMenuTab = () => (
    <View style={styles.tabContent}>
      {menuItems.length > 0 ? (
        <FlatList
          data={menuItems}
          renderItem={({ item }) => (
            <View style={styles.menuItem}>
              {item.image_url && (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.menuItemImage}
                />
              )}
              <View style={styles.menuItemDetails}>
                <Text style={styles.menuItemName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.menuItemDescription}>{item.description}</Text>
                )}
                <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyMenu}>
          <Ionicons name="fast-food-outline" size={48} color="#8E8E93" />
          <Text style={styles.emptyMenuText}>Menu not available</Text>
          <Text style={styles.emptyMenuSubtext}>Check back later or contact the restaurant</Text>
        </View>
      )}
    </View>
  );

  const renderMapTab = () => (
    <View style={styles.tabContent}>
      {restaurant?.latitude && restaurant?.longitude ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{
              latitude: restaurant.latitude,
              longitude: restaurant.longitude,
            }}
            title={restaurant.name}
            description={restaurant.address}
          />
        </MapView>
      ) : (
        <View style={styles.emptyMap}>
          <Ionicons name="map-outline" size={48} color="#8E8E93" />
          <Text style={styles.emptyMapText}>Location not available</Text>
        </View>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'about':
        return renderAboutTab();
      case 'reviews':
        return renderReviewsTab();
      case 'menu':
        return renderMenuTab();
      case 'map':
        return renderMapTab();
      default:
        return null;
    }
  };

  if (loading && !restaurant) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Restaurant not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchRestaurantData();
          }}
        />
      }
    >
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        {restaurant.cover_image_url ? (
          <Image
            source={{ uri: restaurant.cover_image_url }}
            style={styles.coverImage}
          />
        ) : (
          <View style={[styles.coverImage, styles.coverPlaceholder]}>
            <Ionicons name="restaurant" size={64} color="white" />
          </View>
        )}
      </View>

      {/* Restaurant Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {restaurant.image_url ? (
            <Image
              source={{ uri: restaurant.image_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="restaurant" size={40} color="white" />
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.name}>{restaurant.name}</Text>
          <View style={styles.ratingRow}>
            {renderRatingStars(restaurant.average_rating || 0)}
            <Text style={styles.ratingText}>
              {restaurant.average_rating?.toFixed(1) || '0.0'} ({restaurant.review_count || 0})
            </Text>
          </View>
          <Text style={styles.address}>{restaurant.address}</Text>
          <Text style={styles.followersText}>{followersCount} followers</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.followButton} onPress={handleFollow}>
            <Ionicons
              name={isFollowing ? 'heart' : 'heart-outline'}
              size={20}
              color={isFollowing ? 'red' : 'white'}
            />
            <Text style={styles.followButtonText}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.activeTab]}
            onPress={() => setActiveTab('about')}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={activeTab === 'about' ? '#007AFF' : '#8E8E93'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'about' && styles.activeTabText,
              ]}
            >
              About
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
            onPress={() => setActiveTab('reviews')}
          >
            <Ionicons
              name="star-outline"
              size={20}
              color={activeTab === 'reviews' ? '#007AFF' : '#8E8E93'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'reviews' && styles.activeTabText,
              ]}
            >
              Reviews
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'menu' && styles.activeTab]}
            onPress={() => setActiveTab('menu')}
          >
            <Ionicons
              name="fast-food-outline"
              size={20}
              color={activeTab === 'menu' ? '#007AFF' : '#8E8E93'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'menu' && styles.activeTabText,
              ]}
            >
              Menu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'map' && styles.activeTab]}
            onPress={() => setActiveTab('map')}
          >
            <Ionicons
              name="map-outline"
              size={20}
              color={activeTab === 'map' ? '#007AFF' : '#8E8E93'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'map' && styles.activeTabText,
              ]}
            >
              Map
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Tab Content */}
      {renderTabContent()}
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#8E8E93',
  },
  coverContainer: {
    height: COVER_HEIGHT,
    width: '100%',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 24,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  avatarContainer: {
    marginRight: 16,
    marginTop: -AVATAR_SIZE / 2,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  address: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  followersText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  actionButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 8,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  followButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,122,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,122,255,0.3)',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabsScroll: {
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#007AFF',
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1C1C1E',
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3A3A3C',
    marginBottom: 20,
  },
  cuisineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  cuisinePill: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  cuisineText: {
    fontSize: 14,
    color: '#3A3A3C',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactText: {
    fontSize: 15,
    color: '#3A3A3C',
    marginLeft: 12,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  hoursDay: {
    fontSize: 15,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  hoursTime: {
    fontSize: 15,
    color: '#8E8E93',
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingSummary: {
    alignItems: 'center',
  },
  averageRating: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  reviewCount: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addReviewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  reviewItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 8,
  },
  reviewComment: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3A3A3C',
  },
  emptyReviews: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyReviewsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
  },
  emptyReviewsSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  menuItemDetails: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    lineHeight: 20,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyMenu: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMenuText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
  },
  emptyMenuSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  map: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  emptyMap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMapText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
  },
});

export default RestaurantProfileScreen;