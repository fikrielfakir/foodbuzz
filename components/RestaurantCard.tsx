import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const RestaurantCard = ({ restaurant, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image 
        source={{ uri: restaurant.image_url || 'https://via.placeholder.com/150' }} 
        style={styles.image} 
      />
      <View style={styles.details}>
        <Text style={styles.name}>{restaurant.name}</Text>
        <View style={styles.ratingContainer}>
          <Icon name="star" size={16} color="#FFD700" />
          <Text style={styles.rating}>{restaurant.avg_rating || 'New'}</Text>
          <Text style={styles.cuisine}>{restaurant.cuisine_type?.join(' • ')}</Text>
        </View>
        <Text style={styles.address} numberOfLines={1}>{restaurant.address}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 150,
  },
  details: {
    padding: 15,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  rating: {
    marginLeft: 5,
    marginRight: 10,
    color: '#666',
  },
  cuisine: {
    color: '#666',
    fontSize: 12,
  },
  address: {
    color: '#666',
    fontSize: 12,
  },
});

export default RestaurantCard;