// types.ts or types/index.ts
export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

export interface Comment {
  id: string;
  content: string;
  profiles: Profile;
  created_at: string;
}

export interface Post {
  id: string;
  caption: string;
  image_url: string;
  created_at: string;
  profiles?: Profile;
  comments?: Comment[];
  likes?: Array<{ count: number }>;
}

export interface User {
  id: string;
  email: string;
  profile?: Profile;
}