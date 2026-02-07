import { useInfiniteQuery } from '@tanstack/react-query'
import {
  fetchDirectoryContentsPaginated,
  ITEMS_PER_PAGE,
} from '../api/directoryContents'

export function useDirectoryContents(directoryId: string | null, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['directory', directoryId],
    queryFn: ({ pageParam }) =>
      fetchDirectoryContentsPaginated(directoryId!, {
        cursor: pageParam as string | undefined,
        limit: ITEMS_PER_PAGE,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: enabled && directoryId != null,
    staleTime: 30000,
    gcTime: 300000,
  })
}
