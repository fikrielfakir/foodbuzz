import { Image, StyleSheet, Text, View } from 'react-native';

export type PostComment = {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  post_id: number;
  profiles: {
    username: string;
    avatar_url?: string;
  };
};

type CommentItemProps = {
  comment: PostComment;
};

export function CommentItem({ comment }: CommentItemProps) {
  return (
    <View style={styles.container}>
      <Image 
        source={{ uri: comment.profiles.avatar_url || 'https://via.placeholder.com/40' }} 
        style={styles.avatar} 
      />
      <View style={styles.commentContent}>
        <Text style={styles.username}>{comment.profiles.username}</Text>
        <Text style={styles.commentText}>{comment.content}</Text>
        <Text style={styles.timestamp}>
          {new Date(comment.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2C2C2E',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#2C2C2E',
  },
  commentContent: {
    flex: 1,
  },
  username: {
    fontWeight: '600',
    fontSize: 14,
    color: 'white',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: 'white',
    marginBottom: 4,
    lineHeight: 18,
  },
  timestamp: {
    color: '#8E8E93',
    fontSize: 12,
  },
});