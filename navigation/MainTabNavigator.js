import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/home/HomeScreen';
import { CreatePostScreen } from '../screens/posts/CreatePostScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { RestaurantProfileScreen } from '../screens/restaurant/RestaurantProfileScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Create') {
            iconName = 'add-circle';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          } else if (route.name === 'Restaurant') {
            iconName = 'restaurant';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      {user?.role === 'owner' && (
        <Tab.Screen name="Create" component={CreatePostScreen} />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {user?.role === 'owner' && (
        <Tab.Screen name="Restaurant" component={RestaurantProfileScreen} />
      )}
    </Tab.Navigator>
  );
}