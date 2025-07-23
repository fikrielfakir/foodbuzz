import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 250;
const AVATAR_SIZE = 100;

// Types
type Restaurant = {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  description: string;
  cuisine_type: string[];
  phone: string | null;
  website: string | null;
  hours: Record<string, string> | null;
  image_url: string;
  created_at: string;
  updated_at: string;
  average_rating?: number;
  review_count?: number;
  profiles?: {
    username?: string;
    avatar_url?: string | null;
  };
};

type Review = {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  comment: string;
  created_at: string;
  profiles?: {
    username?: string;
    avatar_url?: string | null;
  };
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  image_url: string | null;
};

type TabType = 'about' | 'reviews' | 'menu' | 'map';

// Custom hooks
const useRestaurantData = (restaurantId: string) => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [actualRestaurantId, setActualRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurantData = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // First try to fetch by restaurant ID
      let { data, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .single();

      // If not found, try to fetch by owner ID
      if (fetchError?.code === 'PGRST116') {
        const { data: ownerData, error: ownerError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('owner_id', id)
          .single();

        if (ownerError) throw ownerError;
        data = ownerData;
      } else if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        throw new Error('Restaurant not found');
      }

      setActualRestaurantId(data.id);
      setRestaurant(data);
      return data.id;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { restaurant, actualRestaurantId, loading, error, fetchRestaurantData, setRestaurant };
};

const useReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReviews = useCallback(async (restaurantId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          user_id,
          profiles:user_id(username, avatar_url)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedReviews = data?.map(review => ({
        id: review.id,
        user_id: review.user_id,
        user_name: review.profiles?.username || 'Anonymous',
        user_avatar: review.profiles?.avatar_url || null,
        rating: review.rating,
        comment: review.comment || '',
        created_at: review.created_at
      })) || [];

      setReviews(formattedReviews);

      // Calculate average rating
      const averageRating = data?.length
        ? data.reduce((sum, review) => sum + review.rating, 0) / data.length
        : 0;

      return { reviews: formattedReviews, averageRating, reviewCount: data?.length || 0 };

    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
      return { reviews: [], averageRating: 0, reviewCount: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  return { reviews, loading, fetchReviews };
};

const useMenuItems = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMenuItems = useCallback(async (restaurantId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true });

      if (error) throw error;

      const processedItems = (data || []).map(item => ({
        ...item,
        price: typeof item.price === 'string' ? parseFloat(item.price) : item.price
      }));

      setMenuItems(processedItems);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { menuItems, loading, fetchMenuItems };
};

const useFollowStatus = () => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  const checkIfFollowing = useCallback(async (restaurantId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsFollowing(false);
        return;
      }

      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
      setIsFollowing(false);
    }
  }, []);

  const fetchFollowersCount = useCallback(async (restaurantId: string) => {
    try {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId);

      if (error) throw error;
      setFollowersCount(count || 0);
    } catch (error) {
      console.error('Error fetching followers count:', error);
      setFollowersCount(0);
    }
  }, []);

  const toggleFollow = useCallback(async (restaurantId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('user_id', user.id)
          .eq('restaurant_id', restaurantId);

        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            user_id: user.id,
            restaurant_id: restaurantId
          });

        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
      return true;
    } catch (error) {
      console.error('Error toggling follow:', error);
      return false;
    }
  }, [isFollowing]);

  return { isFollowing, followersCount, checkIfFollowing, fetchFollowersCount, toggleFollow };
};

// Components
const RatingStars = React.memo(({ 
  rating, 
  size = 16, 
  interactive = false, 
  onPress 
}: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onPress?: (rating: number) => void;
}) => (
  <View style={[styles.ratingContainer, { gap: size / 4 }]}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity 
        key={star} 
        onPress={interactive ? () => onPress?.(star) : undefined}
        activeOpacity={interactive ? 0.7 : 1}
      >
        <Ionicons
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color={star <= rating ? '#FFD700' : '#CCCCCC'}
        />
      </TouchableOpacity>
    ))}
  </View>
));

const ReviewItem = React.memo(({ item }: { item: Review }) => (
  <View style={styles.reviewItem}>
    <View style={styles.reviewHeader}>
      {item.user_avatar ? (
        <Image source={{ uri: item.user_avatar }} style={styles.reviewerAvatar} />
      ) : (
        <View style={[styles.reviewerAvatar, { backgroundColor: '#e1e1e1' }]}>
          <Ionicons name="person" size={24} color="#8E8E93" />
        </View>
      )}
      <View style={styles.reviewerInfo}>
        <Text style={styles.reviewerName}>{item.user_name}</Text>
        <View style={styles.reviewMeta}>
          <RatingStars rating={item.rating} />
          <Text style={styles.reviewDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
    <Text style={styles.reviewComment}>{item.comment}</Text>
  </View>
));

const MenuItem = React.memo(({ item }: { item: MenuItem }) => {
  const formattedPrice = useMemo(() => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    return price.toLocaleString('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    });
  }, [item.price]);

  return (
    <View style={styles.menuItem}>
      {item.image_url ? (
        <Image 
          source={{ uri: item.image_url }} 
          style={styles.menuItemImage} 
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.menuItemImage, styles.menuItemImagePlaceholder]}>
          <Ionicons name="fast-food-outline" size={32} color="#8E8E93" />
        </View>
      )}
      <View style={styles.menuItemDetails}>
        <Text style={styles.menuItemName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.menuItemDescription}>{item.description}</Text>
        )}
        <Text style={styles.menuItemPrice}>{formattedPrice}</Text>
      </View>
    </View>
  );
});

// Main component
export default function RestaurantProfileScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [refreshing, setRefreshing] = useState(false);
  
  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Get restaurant ID from params
  const restaurantId = useMemo(() => {
    const rawId = params.id || params.restaurantId;
    return Array.isArray(rawId) ? rawId[0] : rawId;
  }, [params.id, params.restaurantId]);

  // Custom hooks
  const { restaurant, actualRestaurantId, loading, error, fetchRestaurantData, setRestaurant } = useRestaurantData(restaurantId || '');
  const { reviews, fetchReviews } = useReviews();
  const { menuItems, fetchMenuItems } = useMenuItems();
  const { isFollowing, followersCount, checkIfFollowing, fetchFollowersCount, toggleFollow } = useFollowStatus();

  // Load initial data
  useEffect(() => {
    if (restaurantId && restaurantId !== 'undefined') {
      loadData();
    }
  }, [restaurantId]);

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    
    try {
      const actualId = await fetchRestaurantData(restaurantId);
      
      const [reviewsData] = await Promise.all([
        fetchReviews(actualId),
        fetchMenuItems(actualId),
        fetchFollowersCount(actualId),
        checkIfFollowing(actualId)
      ]);

      // Update restaurant with review data
      setRestaurant(prev => prev ? {
        ...prev,
        average_rating: reviewsData.averageRating,
        review_count: reviewsData.reviewCount
      } : null);

    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [restaurantId, fetchRestaurantData, fetchReviews, fetchMenuItems, fetchFollowersCount, checkIfFollowing, setRestaurant]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleFollow = useCallback(async () => {
    if (!actualRestaurantId) return;
    
    const success = await toggleFollow(actualRestaurantId);
    if (!success) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      }
    }
  }, [actualRestaurantId, toggleFollow, router]);

  const handleShare = useCallback(async () => {
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
  }, [restaurant]);

  const handleCall = useCallback(() => {
    if (!restaurant?.phone) return;
    Linking.openURL(`tel:${restaurant.phone}`);
  }, [restaurant?.phone]);

  const handleVisitWebsite = useCallback(() => {
    if (!restaurant?.website) return;
    WebBrowser.openBrowserAsync(restaurant.website);
  }, [restaurant?.website]);

  const handleOpenMap = useCallback(() => {
    if (!restaurant?.address) return;
    
    const query = encodeURIComponent(restaurant.address);
    const scheme = Platform.select({ 
      ios: `maps:0,0?q=${query}`, 
      android: `geo:0,0?q=${query}` 
    });

    if (scheme) Linking.openURL(scheme);
  }, [restaurant?.address]);

  const handleSubmitReview = useCallback(async () => {
    if (!actualRestaurantId || reviewRating === 0) {
      Alert.alert('Please select a rating');
      return;
    }

    setIsSubmittingReview(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user already has a review
      const { data: existingReview, error: fetchError } = await supabase
        .from('reviews')
        .select('id')
        .eq('restaurant_id', actualRestaurantId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update({
            rating: reviewRating,
            comment: reviewComment.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReview.id);
        
        if (error) throw error;
      } else {
        // Create new review
        const { error } = await supabase
          .from('reviews')
          .insert({
            restaurant_id: actualRestaurantId,
            user_id: user.id,
            rating: reviewRating,
            comment: reviewComment.trim() || null
          });

        if (error) throw error;
      }

      // Update restaurant's average rating
      await supabase
        .rpc('update_restaurant_rating', { restaurant_id: actualRestaurantId });

      // Refresh reviews
      const reviewsData = await fetchReviews(actualRestaurantId);
      setRestaurant(prev => prev ? {
        ...prev,
        average_rating: reviewsData.averageRating,
        review_count: reviewsData.reviewCount
      } : null);

      // Close modal and reset form
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewComment('');

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  }, [actualRestaurantId, reviewRating, reviewComment, router, fetchReviews, setRestaurant]);

  // Tab content renderers
  const renderAboutTab = useCallback(() => (
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
              <Text style={styles.hoursTime}>{hours}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  ), [restaurant, handleCall, handleVisitWebsite, handleOpenMap]);

  const renderReviewsTab = useCallback(() => (
    <View style={styles.tabContent}>
      <View style={styles.reviewsHeader}>
        <View style={styles.ratingSummary}>
          <Text style={styles.averageRating}>
            {restaurant?.average_rating?.toFixed(1) || '0.0'}
          </Text>
          <RatingStars rating={restaurant?.average_rating || 0} />
          <Text style={styles.reviewCount}>
            {restaurant?.review_count || 0} reviews
          </Text>
        </View>
        <TouchableOpacity style={styles.addReviewButton} onPress={() => setShowReviewModal(true)}>
          <Ionicons name="create-outline" size={20} color="white" />
          <Text style={styles.addReviewButtonText}>Add Review</Text>
        </TouchableOpacity>
      </View>

      {reviews.length > 0 ? (
        <FlatList
          data={reviews}
          renderItem={({ item }) => <ReviewItem item={item} />}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      ) : (
        <View style={styles.emptyReviews}>
          <Ionicons name="restaurant-outline" size={48} color="#8E8E93" />
          <Text style={styles.emptyReviewsText}>No reviews yet</Text>
          <Text style={styles.emptyReviewsSubtext}>Be the first to review this restaurant</Text>
          <TouchableOpacity style={styles.addReviewButton} onPress={() => setShowReviewModal(true)}>
            <Ionicons name="create-outline" size={20} color="white" />
            <Text style={styles.addReviewButtonText}>Add Review</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  ), [restaurant, reviews]);

  const renderMenuTab = useCallback(() => (
    <View style={styles.tabContent}>
      {menuItems.length > 0 ? (
        <FlatList
          data={menuItems}
          renderItem={({ item }) => <MenuItem item={item} />}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      ) : (
        <View style={styles.emptyMenu}>
          <Ionicons name="fast-food-outline" size={48} color="#8E8E93" />
          <Text style={styles.emptyMenuText}>Menu not available</Text>
          <Text style={styles.emptyMenuSubtext}>Check back later or contact the restaurant</Text>
        </View>
      )}
    </View>
  ), [menuItems]);

  const renderMapTab = useCallback(() => (
    <View style={styles.tabContent}>
      <View style={styles.emptyMap}>
        <Ionicons name="map-outline" size={48} color="#8E8E93" />
        <Text style={styles.emptyMapText}>Map integration requires address or coordinates</Text>
        <Text style={styles.emptyMapSubtext}>Use the address to search in maps</Text>
        {restaurant?.address && (
          <TouchableOpacity style={styles.mapButton} onPress={handleOpenMap}>
            <Text style={styles.mapButtonText}>Open in Maps</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), [restaurant?.address, handleOpenMap]);

  const renderTabContent = useCallback(() => {
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
  }, [activeTab, renderAboutTab, renderReviewsTab, renderMenuTab, renderMapTab]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading restaurant...</Text>
      </View>
    );
  }

  // Error state
  if (error || !restaurant) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>
          {error || 'Restaurant not found'}
        </Text>
        <Text style={styles.errorSubtext}>
          ID: {restaurantId || 'No ID provided'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadData}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main render
  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Cover Image */}
        <View style={styles.coverContainer}>
          {restaurant.image_url ? (
            <Image
              source={{ uri: restaurant.image_url }}
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
              <RatingStars rating={restaurant.average_rating || 0} />
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
            {[
              { key: 'about', label: 'About', icon: 'information-circle-outline' },
              { key: 'reviews', label: 'Reviews', icon: 'star-outline' },
              { key: 'menu', label: 'Menu', icon: 'fast-food-outline' },
              { key: 'map', label: 'Map', icon: 'map-outline' }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                onPress={() => setActiveTab(tab.key as TabType)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={20}
                  color={activeTab === tab.key ? '#007AFF' : '#8E8E93'}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.key && styles.activeTabText,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>

      {/* Review Modal */}
      <Modal
        animationType={Platform.OS === 'ios' ? 'slide' : 'fade'}
        transparent={true}
        visible={showReviewModal}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Your Review</Text>
              <Pressable onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </Pressable>
            </View>

            <RatingStars 
              rating={reviewRating} 
              size={40} 
              interactive={true} 
              onPress={setReviewRating} 
            />

            <Text style={styles.modalLabel}>Your Review</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder="Share your experience..."
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={[
                styles.modalSubmitButton,
                isSubmittingReview && styles.modalSubmitButtonDisabled
              ]}
              onPress={handleSubmitReview}
              disabled={isSubmittingReview}
            >
              <Text style={styles.modalSubmitButtonText}>
                {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF3B30',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  menuItemImagePlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyMap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMapText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyMapSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  mapButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  mapButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontSize: 15,
  },
  modalSubmitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSubmitButtonDisabled: {
    backgroundColor: '#A7C7FF',
  },
  modalSubmitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});