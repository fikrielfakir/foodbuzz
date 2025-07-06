export type Post = {
  id: string;
  image_url: string;
  caption: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
  restaurants?: {
    name: string;
  };
  likes?: { count: number }[];
  comments?: Comment[]; // Use the Comment type here
  created_at?: string;
};