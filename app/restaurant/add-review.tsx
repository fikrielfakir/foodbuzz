import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AddReviewModalProps {
  visible: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  onReviewAdded?: (review: any) => void;
}

const AddReviewModal: React.FC<AddReviewModalProps> = ({
  visible,
  onClose,
  restaurantId,
  restaurantName,
  onReviewAdded,
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStarPress = (starRating: number) => {
    setRating(starRating);
  };

  const handleSubmitReview = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a review');
      return;
    }

    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    if (!reviewText.trim()) {
      Alert.alert('Error', 'Please write a review');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          restaurant_id: restaurantId,
          user_id: user.id,
          rating: rating,
          comment: reviewText.trim(),
        })
        .select(`
          id,
          rating,
          comment,
          created_at,
          user_id,
          profiles:user_id(
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Reset form
      setRating(0);
      setReviewText('');
      
      // Notify parent component
      if (onReviewAdded && data) {
        onReviewAdded(data);
      }

      Alert.alert(
        'Success', 
        'Your review has been added successfully!',
        [{ text: 'OK', onPress: onClose }]
      );

    } catch (error) {
      console.error('Error adding review:', error);
      Alert.alert('Error', 'Failed to add review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    
    if (rating > 0 || reviewText.trim()) {
      Alert.alert(
        'Discard Review?',
        'Are you sure you want to discard your review?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => {
              setRating(0);
              setReviewText('');
              onClose();
            }
          }
        ]
      );
    } else {
      onClose();
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i)}
          style={styles.starButton}
          disabled={isSubmitting}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={32}
            color={i <= rating ? '#FFD700' : '#8E8E93'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const getRatingText = () => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Tap to rate';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <Pressable style={styles.modalContainer} onPress={() => {}}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              <Text style={styles.headerTitle}>Add Review</Text>
              <View style={styles.headerRight}>
                <TouchableOpacity
                  onPress={handleSubmitReview}
                  disabled={isSubmitting || rating === 0 || !reviewText.trim()}
                  style={[
                    styles.submitButton,
                    (isSubmitting || rating === 0 || !reviewText.trim()) && styles.submitButtonDisabled
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={[
                      styles.submitButtonText,
                      (rating === 0 || !reviewText.trim()) && styles.submitButtonTextDisabled
                    ]}>
                      Post
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Restaurant Name */}
              <View style={styles.restaurantInfo}>
                <MaterialIcons name="restaurant" size={20} color="#8E8E93" />
                <Text style={styles.restaurantName}>{restaurantName}</Text>
              </View>

              {/* Rating Section */}
              <View style={styles.ratingSection}>
                <Text style={styles.sectionTitle}>How was your experience?</Text>
                <View style={styles.starsContainer}>
                  {renderStars()}
                </View>
                <Text style={styles.ratingText}>{getRatingText()}</Text>
              </View>

              {/* Review Text Section */}
              <View style={styles.reviewSection}>
                <Text style={styles.sectionTitle}>Tell us more about your experience</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Share your thoughts about the food, service, ambiance..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={6}
                  value={reviewText}
                  onChangeText={setReviewText}
                  editable={!isSubmitting}
                  maxLength={500}
                />
                <Text style={styles.characterCount}>
                  {reviewText.length}/500
                </Text>
              </View>

              {/* Guidelines */}
              <View style={styles.guidelines}>
                <Text style={styles.guidelinesTitle}>Review Guidelines</Text>
                <Text style={styles.guidelinesText}>
                  • Be honest and constructive{'\n'}
                  • Focus on your experience{'\n'}
                  • Avoid offensive language{'\n'}
                  • Keep it relevant to the restaurant
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  headerLeft: {
    width: 60,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#2C2C2E',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButtonTextDisabled: {
    color: '#8E8E93',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginLeft: 8,
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  starButton: {
    marginHorizontal: 4,
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  reviewSection: {
    paddingVertical: 16,
  },
  reviewInput: {
    backgroundColor: '#2C2C2E',
    color: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
  },
  guidelines: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});

export default AddReviewModal;