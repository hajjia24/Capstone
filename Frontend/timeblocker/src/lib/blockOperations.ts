import { supabase } from './supabase';
import { Block } from '@/types/block';

export async function loadBlocksFromDB(userId: string) {
  console.debug('Loading blocks for user', userId);
  
  try {
    const res = await supabase.from('blocks').select('*').eq('user_id', userId);
    const { data, error, status } = res as any;

    if (error) {
      console.error('Error loading blocks:', { error, status, data });
      
      // Check for auth errors
      if (error.message?.includes('refresh') || error.message?.includes('JWT') || status === 401) {
        throw new Error('Session expired. Please refresh the page and sign in again.');
      }
      
      return [];
    }

    // Map database rows to Block shape
    const mapped = (data || []).map((r: any) => ({
      id: String(r.id),
      day: Number(r.day),
      startTime: Number(r.starttime),
      endTime: Number(r.endtime),
      title: r.title || '',
      description: r.description || '',
      color: r.color || r.colour || '#3b82f6',
    }));
    
    console.debug('Mapped blocks:', mapped);
    return mapped as Block[];
  } catch (error) {
    console.error('Error loading blocks:', error);
    throw error;
  }
}

export async function saveBlockToDB(block: Block, userId: string): Promise<{ success: boolean; data?: any; error?: any; status?: number }> {
  try {
    const payload = {
      id: block.id,
      user_id: userId,
      day: block.day,
      starttime: block.startTime,
      endtime: block.endTime,
      title: block.title || '',
      description: block.description || '',
      color: block.color || '#3b82f6',
    };

    const res = await supabase.from('blocks').upsert([payload]).select();
    const { data, error, status } = res as any;

    if (error) {
      console.error('Error saving block:', { error, status, data, payload });
      
      // Check for auth errors
      if (error.message?.includes('refresh') || error.message?.includes('JWT') || status === 401) {
        throw new Error('Session expired. Please refresh the page and sign in again.');
      }
      
      return { success: false, error, status };
    }

    console.debug('Saved block to DB:', data);
    return { success: true, data, status };
  } catch (error) {
    console.error('Error saving block (exception):', error);
    return { success: false, error };
  }
}

export async function deleteBlockFromDB(blockId: string, userId: string) {
  try {
    const res = await supabase.from('blocks').delete().eq('id', blockId).eq('user_id', userId).select();
    const { data, error, status } = res as any;
    
    if (error) {
      console.error('Error deleting block:', { error, status, data });
      return { success: false, error, status };
    }
    
    console.debug('Deleted block from DB:', { data });
    return { success: true, data, status };
  } catch (error) {
    console.error('Error deleting block:', error);
    return { success: false, error };
  }
}

export function mapDBRowToBlock(r: any): Block {
  return {
    id: String(r.id),
    day: Number(r.day),
    startTime: Number(r.starttime),
    endTime: Number(r.endtime),
    title: r.title || '',
    description: r.description || '',
    color: r.color || r.colour || '#3b82f6',
  };
}

export function detectBlockOverlaps(blocks: Block[], newBlock: Block): Block[] {
  return blocks.filter(
    (b) =>
      b.id !== newBlock.id &&
      b.day === newBlock.day &&
      newBlock.startTime < b.endTime &&
      newBlock.endTime > b.startTime
  );
}
