import type { Block } from "@/types/block";
import { supabase } from "./supabase";

type DbErrorLike = {
  message?: string;
  status?: number;
};

type SaveBlockResult = {
  success: boolean;
  data?: unknown;
  error?: unknown;
  status?: number;
};

export async function loadBlocksFromDB(userId: string): Promise<Block[]> {
  const { data, error } = await supabase
    .from("blocks")
    .select("*")
    .eq("user_id", userId);
  if (error) throw normalizeDatabaseError(error);
  return (data || []).map(mapDBRowToBlock);
}

export async function saveBlockToDB(
  block: Block,
  userId: string,
): Promise<SaveBlockResult> {
  try {
    const payload = {
      id: block.id,
      user_id: userId,
      day: block.day,
      starttime: block.startTime,
      endtime: block.endTime,
      title: block.title || "",
      description: block.description || "",
      color: block.color || "#3b82f6",
    };

    const { data, error, status } = await supabase
      .from("blocks")
      .upsert([payload])
      .select();

    if (error) {
      throw normalizeDatabaseError(error);
    }

    return { success: true, data, status };
  } catch (error: unknown) {
    return { success: false, error };
  }
}

export async function deleteBlockFromDB(blockId: string, userId: string) {
  try {
    const { data, error, status } = await supabase
      .from("blocks")
      .delete()
      .eq("id", blockId)
      .eq("user_id", userId)
      .select();

    if (error) {
      return { success: false, error, status };
    }

    return { success: true, data, status };
  } catch (error: unknown) {
    return { success: false, error };
  }
}

function normalizeDatabaseError(error: unknown): Error {
  const dbError = error as DbErrorLike;
  const message =
    typeof dbError?.message === "string" ? dbError.message : "Database error";

  if (
    message.includes("refresh") ||
    message.includes("JWT") ||
    dbError?.status === 401
  ) {
    return new Error(
      "Session expired. Please refresh the page and sign in again.",
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(message);
}

export function mapDBRowToBlock(r: Record<string, unknown>): Block {
  return {
    id: String(r.id),
    day: Number(r.day),
    startTime: Number(r.starttime),
    endTime: Number(r.endtime),
    title: String(r.title || ""),
    description: String(r.description || ""),
    color: String(r.color || "#3b82f6"),
  };
}

export function detectBlockOverlaps(blocks: Block[], newBlock: Block): Block[] {
  return blocks.filter(
    (b) =>
      b.id !== newBlock.id &&
      b.day === newBlock.day &&
      newBlock.startTime < b.endTime &&
      newBlock.endTime > b.startTime,
  );
}
