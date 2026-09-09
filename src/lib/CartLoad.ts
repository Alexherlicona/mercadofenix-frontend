import { writable } from 'svelte/store';

interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
}

interface Cart {
    items: CartItem[];
    total: number;
}

async function loadCart(): Promise<Cart> {
    const response = await fetch('/api/carrito/mi-carrito');
    if (!response.ok) throw new Error('Failed to load cart');
    return response.json();
}

export const cart = writable<Cart>({ items: [], total: 0 });

export async function initializeCart() {
    const data = await loadCart();
    cart.set(data);
}