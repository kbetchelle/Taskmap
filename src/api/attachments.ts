import { supabase } from '../lib/supabase'
import type { TaskAttachment } from '../types'
import { MAX_ATTACHMENT_FILE_SIZE } from '../lib/constants'

const BUCKET_ID = 'task-attachments'
const SIGNED_URL_EXPIRY_SEC = 31536000 // 1 year

/** Remove special characters, keep extension; collapse underscores, lowercase. */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
}

export async function listAttachments(taskId: string): Promise<TaskAttachment[]> {
  const { data, error } = await supabase
    .from('task_attachments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as TaskAttachment[]) ?? []
}

/** Upload a single file to Supabase Storage and create DB record. */
async function uploadAttachment(
  taskId: string,
  userId: string,
  file: File
): Promise<TaskAttachment> {
  const timestamp = Date.now()
  const sanitized = sanitizeFileName(file.name)
  const filePath = `${userId}/${taskId}/${timestamp}-${sanitized}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_ID)
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  const { data: urlData, error: urlError } = await supabase.storage
    .from(BUCKET_ID)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY_SEC)

  if (urlError || !urlData?.signedUrl) {
    await supabase.storage.from(BUCKET_ID).remove([filePath])
    throw new Error('Failed to generate download URL')
  }

  const now = new Date().toISOString()
  const attachment: Omit<TaskAttachment, 'id'> & { id: string } = {
    id: crypto.randomUUID(),
    task_id: taskId,
    user_id: userId,
    file_name: file.name,
    file_path: filePath,
    file_size: file.size,
    file_type: file.type || null,
    storage_url: urlData.signedUrl,
    created_at: now,
  }

  const { error: dbError } = await supabase.from('task_attachments').insert(attachment)

  if (dbError) {
    await supabase.storage.from(BUCKET_ID).remove([filePath])
    throw new Error(`Database insert failed: ${dbError.message}`)
  }

  return attachment as TaskAttachment
}

/**
 * Upload files to Supabase Storage and create DB records.
 * Rejects files over MAX_ATTACHMENT_FILE_SIZE (50MB); caller should validate and show feedback.
 */
export async function addAttachments(
  taskId: string,
  userId: string,
  files: File[]
): Promise<TaskAttachment[]> {
  if (files.length === 0) return []

  const oversized = files.filter((f) => f.size > MAX_ATTACHMENT_FILE_SIZE)
  if (oversized.length > 0) {
    throw new Error(
      `These files are too large (max 50MB): ${oversized.map((f) => f.name).join(', ')}`
    )
  }

  const attachments: TaskAttachment[] = []
  for (const file of files) {
    const att = await uploadAttachment(taskId, userId, file)
    attachments.push(att)
  }
  return attachments
}

/**
 * Open attachment in new tab. Refreshes signed URL if expired or near expiry.
 * Legacy attachments (storage_url null, local file_path) fall back to opening file_path if it's a URL.
 */
export async function openAttachment(attachment: TaskAttachment): Promise<void> {
  const urlAge = Date.now() - new Date(attachment.created_at).getTime()
  const oneYearMs = SIGNED_URL_EXPIRY_SEC * 1000
  const refreshThreshold = oneYearMs * 0.9

  let downloadUrl: string | null = attachment.storage_url ?? null

  const isStoragePath = attachment.file_path.startsWith(attachment.user_id + '/')

  if (!downloadUrl || urlAge > refreshThreshold) {
    if (isStoragePath) {
      const { data } = await supabase.storage
        .from(BUCKET_ID)
        .createSignedUrl(attachment.file_path, SIGNED_URL_EXPIRY_SEC)

      if (data?.signedUrl) {
        downloadUrl = data.signedUrl
        await supabase
          .from('task_attachments')
          .update({ storage_url: downloadUrl })
          .eq('id', attachment.id)
      }
    } else if (
      attachment.file_path.startsWith('http') ||
      attachment.file_path.startsWith('blob:')
    ) {
      downloadUrl = attachment.file_path
    }
  }

  if (downloadUrl) {
    window.open(downloadUrl, '_blank')
  } else {
    throw new Error('Could not get download URL')
  }
}

/** Delete attachment from storage and database. */
export async function removeAttachment(attachmentId: string): Promise<void> {
  const { data: attachment, error: fetchError } = await supabase
    .from('task_attachments')
    .select('*')
    .eq('id', attachmentId)
    .single()

  if (fetchError || !attachment) {
    throw new Error('Attachment not found')
  }

  const att = attachment as TaskAttachment
  const isStoragePath = att.file_path.startsWith(att.user_id + '/')
  if (isStoragePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_ID)
      .remove([att.file_path])
    if (storageError) {
      console.error('Storage deletion failed:', storageError)
    }
  }

  const { error: dbError } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', attachmentId)

  if (dbError) {
    throw new Error(`Failed to delete attachment: ${dbError.message}`)
  }
}
