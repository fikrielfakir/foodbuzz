import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

const AddReviewScreen = () => {
  const { restaurantId } = useLocalSearchParams();
  const router = useRouter();
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { error } = await supabase.from('reviews').insert({
        restaurant_id: restaurantId,
        user_id: user.id,
        rating,
        comment,
      });

      if (error) throw error;

      // Success - go back and refresh the restaurant data
      router.back();
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity 
            key={star} 
            onPress={() => setRating(star)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={40}
              color={star <= rating ? '#FFD700' : '#CCCCCC'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      animationType={Platform.OS === 'ios' ? 'slide' : 'fade'}
      transparent={true}
      visible={true}
      onRequestClose={() => router.back()}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Your Review</Text>
            <Pressable onPress={() => router.back()}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </Pressable>
          </View>

          {renderStars()}

          <Text style={styles.label}>Your Review</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={4}
            placeholder="Share your experience..."
            value={comment}
            onChangeText={setComment}
          />

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Text style={styles.submitButtonText}>Submitting...</Text>
            ) : (
              <Text style={styles.submitButtonText}>Submit Review</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontSize: 15,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A7C7FF',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddReviewScreen;