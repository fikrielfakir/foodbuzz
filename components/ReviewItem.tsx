import { View, Text, Image, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export const ReviewItem = ({ review }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: review.profiles?.avatar_url || 'https://via.placeholder.com/50' }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{review.profiles?.username}</Text>
          <View style={styles.ratingContainer}>
            {[...Array(5)].map((_, i) => (
              <MaterialIcons
                key={i}
                name={i < review.rating ? 'star' : 'star-border'}
                size={16}
                color="#FFD700"
              />
            ))}
          </View>
        </View>
        <Text style={styles.date}>
          {new Date(review.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.comment}>{review.comment}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginTop: 2,
  },
  date: {
    color: '#666',
    fontSize: 12,
  },
  comment: {
    color: '#333',
  },
});