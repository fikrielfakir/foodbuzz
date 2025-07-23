import { supabase } from './supabase';

export const markStoryAsSeen = async (storyId: string, userId: string) => {
  try {
    const { error } = await supabase
      .from('seen_stories')
      .upsert(
        { story_id: storyId, user_id: userId },
        { onConflict: 'story_id,user_id' }
      );
    
    if (error) throw error;
  } catch (error) {
    console.error('Error marking story as seen:', error);
  }
};

export const getFollowingStories = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        id,
        user_id,
        image_url,
        created_at,
        expires_at,
        profiles:user_id (
          username,
          avatar_url,
          user_id
        )
      `)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching following stories:', error);
    return [];
  }
};

export const checkUnseenStories = async (userId: string) => {
  try {
    // Get all active stories
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select('id, user_id')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (storiesError) throw storiesError;

    // Get stories that the user has seen
    const { data: seenStories, error: seenError } = await supabase
      .from('seen_stories')
      .select('story_id')
      .eq('user_id', userId);

    if (seenError) throw seenError;

    // Create a set of seen story IDs for faster lookup
    const seenStoryIds = new Set(seenStories?.map(s => s.story_id) || []);

    // Create a map of user IDs to whether they have unseen stories
    const unseenMap: { [key: string]: boolean } = {};
    
    stories?.forEach(story => {
      if (!seenStoryIds.has(story.id)) {
        unseenMap[story.user_id] = true;
      }
    });

    return unseenMap;
  } catch (error) {
    console.error('Error checking unseen stories:', error);
    return {};
  }
};

export const getUserStories = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        id,
        image_url,
        created_at,
        expires_at,
        user_id,
        profiles:user_id (
          username,
          avatar_url,
          user_id
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user stories:', error);
    return [];
  }
};

export const hasActiveStories = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (error) throw error;
    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking active stories:', error);
    return false;
  }
};

export const createStory = async (userId: string, imageUrl: string) => {
  try {
    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: userId,
        image_url: imageUrl,
        is_active: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating story:', error);
    throw error;
  }
};

export const deleteStory = async (storyId: string, userId: string) => {
  try {
    const { error } = await supabase
      .from('stories')
      .update({ is_active: false })
      .eq('id', storyId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting story:', error);
    throw error;
  }
};