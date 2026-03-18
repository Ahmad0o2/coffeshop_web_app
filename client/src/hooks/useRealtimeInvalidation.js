import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export default function useRealtimeInvalidation(bindings = []) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!bindings.length) return undefined
    const socket = io(socketUrl)
    const cleanups = bindings.map(({ event, queryKeys = [] }) => {
      const handler = () => {
        queryKeys.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey })
        })
      }
      socket.on(event, handler)
      return () => socket.off(event, handler)
    })

    return () => {
      cleanups.forEach((cleanup) => cleanup())
      socket.disconnect()
    }
  }, [bindings, queryClient])
}
