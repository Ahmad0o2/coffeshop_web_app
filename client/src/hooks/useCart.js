import { useContext } from 'react'
import { CartContext } from '../context/cart-context'

export default function useCart() {
  return useContext(CartContext)
}
