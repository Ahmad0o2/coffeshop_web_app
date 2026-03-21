import { useEffect, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { connectSocket } from '../services/socketClient'

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export default function useRealtimeInvalidation(bindings = []) {
  const queryClient = useQueryClient()
  const bindingsRef = useRef(bindings)
  const bindingsSignatureRef = useRef(JSON.stringify(bindings))
  const bindingsSignature = useMemo(() => JSON.stringify(bindings), [bindings])

  useEffect(() => {
    if (bindingsSignatureRef.current === bindingsSignature) return

    bindingsRef.current = bindings
    bindingsSignatureRef.current = bindingsSignature
  }, [bindings, bindingsSignature])

  useEffect(() => {
    const currentBindings = bindingsRef.current

    if (!currentBindings.length) return undefined

    const socket = connectSocket(socketUrl)
    const cleanups = currentBindings.map(({ event, queryKeys = [] }) => {
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
    }
  }, [bindingsSignature, queryClient])
}
