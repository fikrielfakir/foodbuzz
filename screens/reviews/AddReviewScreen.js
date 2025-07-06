import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function AddReviewScreen({ navigation }) {
  const route = useRoute();
  const { restaurantId } = route.params;
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert([
          {
            restaurant_id: restaurantId,
            user_id: user.id,
            rating,
            comment,
          }
        ]);

      if (error) throw error;
      navigation.goBack();
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
              <Icon 
                name={star <= rating ? 'star' : 'star-border'} 
                size={32} 
                color="#FFD700" 
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
        disabled={loading}
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
    backgroundColor: 'white',
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
    borderRadius: 5,
    padding: 15,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});