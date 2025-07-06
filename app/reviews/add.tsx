import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';

export default function AddReviewScreen() {
  const { restaurantId } = useLocalSearchParams();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert([{
          restaurant_id: restaurantId,
          user_id: user.id,
          rating,
          comment,
        }]);

      if (error) throw error;
      
      router.back();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Your Review</Text>
      
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingLabel}>Rating:</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <MaterialIcons
                name={star <= rating ? 'star' : 'star-border'}
                size={32}
                color={star <= rating ? '#FFD700' : '#ccc'}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <TextInput
        style={styles.input}
        placeholder="Write your review..."
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={4}
      />
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading || rating === 0}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Submitting...' : 'Submit Review'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingLabel: {
    marginRight: 10,
    fontSize: 16,
  },
  stars: {
    flexDirection: 'row',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});