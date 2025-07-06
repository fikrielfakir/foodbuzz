import { supabase } from '../lib/supabase';

class SupabaseService {
  async isPostLikedByUser(postId: string, userId: string) {
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error checking like:', error);
      return false;
    }

    return !!data;
  }

  // Add more methods as needed
}

export const supabaseService = new SupabaseService();
