import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTaskStore } from '../stores/taskStore'
import type { Task } from '../types'

interface UpdateTaskVariables {
  taskId: string
  updates: Partial<
    Pick<
      Task,
      | 'title'
      | 'priority'
      | 'start_date'
      | 'due_date'
      | 'background_color'
      | 'category'
      | 'tags'
      | 'description'
      | 'is_completed'
      | 'completed_at'
      | 'position'
      | 'directory_id'
    >
  >
  directoryId: string
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  const updateTask = useTaskStore((s) => s.updateTask)

  return useMutation({
    mutationFn: async ({ taskId, updates }: UpdateTaskVariables) => {
      await updateTask(taskId, updates)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['directory', variables.directoryId] })
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] })
    },
  })
}
