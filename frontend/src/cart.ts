import '../styles/styles.css';
import type { CheckoutItem } from '../../shared/src/validation/checkout';

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
}

// Callback único que se dispara cuando cualquier ítem es eliminado
type OnRemoveCallback = (itemId: string, itemName: string) => void;

export class ShoppingCart {
  private items: CartItem[] = [];
  private storageKey = 'vanilla-cart';
  private onItemRemove?: OnRemoveCallback;
  private overlay!: HTMLDivElement;
  private appShell!: HTMLElement;
  private isAuthenticated: () => boolean;

  private cacheDOMElements(): void {
    this.appShell = document.getElementById('app-shell')!;
  }

  /**
   * @param onItemRemove - callback único que se ejecuta cuando cualquier ítem es eliminado.
   * Recibe el id y nombre del producto eliminado.
   */
  constructor(onItemRemove?: OnRemoveCallback, isAuthenticated = () => true) {
	this.isAuthenticated = isAuthenticated;
    this.onItemRemove = onItemRemove;
    this.loadFromStorage();
    this.createOverlay();
    this.cacheDOMElements();
    this.setupRouting();
  }

  // ---------- Persistencia ----------
  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.items = JSON.parse(stored);
      } catch {
        this.items = [];
      }
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
  }

  // ========== API pública ==========
  
  async checkout(): Promise<void> {
    if (this.items.length === 0) {
      alert('El carrito está vacío.');
      return;
    }

    const payload: CheckoutItem[] = this.items.map(item => ({
      cod_stock: item.id,
      quantity: item.quantity,
    }));

    try {
      const response = await fetch('/api/cart/checkout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || errorData.message || 'Error al procesar la compra';
        alert(message);
        return;
      }

      const result = await response.json();
      alert(result.message ?? 'Compra realizada con éxito.');

      // Vaciar carrito local solo si el backend respondió éxito
      this.items = [];
      this.saveToStorage();
      this.goHome();
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Error de conexión al procesar la compra.');
    }
  }
  addItem(product: { id: string; name: string }): void {
    const existing = this.items.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.items.push({ id: product.id, name: product.name, quantity: 1 });
    }
    this.saveToStorage();
    this.renderCartIfActive();
  }

  removeOneItem(itemId: string): void {
    const item = this.items.find(item => item.id === itemId);
    if (!item) return;
    item.quantity -= 1;
    if (item.quantity <= 0) {
      const itemName = item.name;
      this.items = this.items.filter(i => i.id !== itemId);
      this.onItemRemove?.(itemId, itemName);
    }
    this.saveToStorage();
    this.renderCartIfActive();
  }

  removeEntireItem(itemId: string): void {
    const itemToRemove = this.items.find(item => item.id === itemId);
    if (!itemToRemove) return;
    const itemName = itemToRemove.name;
    this.items = this.items.filter(item => item.id !== itemId);
    this.onItemRemove?.(itemId, itemName);
    this.saveToStorage();
    this.renderCartIfActive();
  }

  updateQuantity(itemId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeOneItem(itemId);
      return;
    }
    const item = this.items.find(item => item.id === itemId);
    if (item) {
      item.quantity = quantity;
      this.saveToStorage();
      this.renderCartIfActive();
    }
  }

  getItems(): CartItem[] {
    return [...this.items];
  }

  // ========== Navegación ==========
  goCartPage(): void {
    window.location.hash = '#/cart';
    this.showCartOverlay();
  }

  goHome(): void {
    this.hideCartOverlay();
    const cleanUrl = window.location.pathname + window.location.search;
	  history.replaceState(null, '', cleanUrl);  
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  // ========== UI (overlay) ==========
  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.id = 'cart-overlay';
    this.overlay.innerHTML = '<div id="cart-page"></div>';
    document.body.appendChild(this.overlay);
  }

  private setupRouting(): void {
    window.addEventListener('hashchange', () => this.handleRouting());
    //this.handleRouting(); // LO COMENTO PORQUE SINO TE ACTIVA EL APP-SHELL SIN ESTAR LOGGEADO
  }

  private handleRouting(): void {
    if (window.location.hash === '#/cart') {
      if (!this.isAuthenticated()) {
        this.goHome();
        return;
      }
      console.log("Mostrando carrito")
      this.showCartOverlay();
    } else {
      console.log("Ocultando carrito");
      this.hideCartOverlay();
    }
  }

  private showCartOverlay(): void {
    this.appShell.style.display = 'none';
    this.overlay.style.display = 'flex';
    this.renderCartPage();
  }

  private hideCartOverlay(): void {
    this.overlay.style.display = 'none';
    this.appShell.style.display='block';
  }

  private renderCartIfActive(): void {
    if (window.location.hash === '#/cart') {
      this.renderCartPage();
    }
  }

  private renderCartPage(): void {
    const container = document.getElementById('cart-page')!;
    const items = this.getItems();

    let itemsHtml = '';
    if (items.length === 0) {
      itemsHtml = '<p>El carrito está vacío.</p>';
    } else {
      itemsHtml = '<ul class="cart-list">';
      items.forEach(item => {
        itemsHtml += `
          <li class="cart-item">
            <span>${item.name} (${item.quantity})</span>
            <div class="quantity-control">
              <button class="qty-dec" data-id="${item.id}">-</button>
              <span>${item.quantity}</span>
              <button class="qty-inc" data-id="${item.id}">+</button>
            </div>
            <button class="btn-remove" data-id="${item.id}">Eliminar</button>
          </li>
        `;
      });
      itemsHtml += '</ul>';
    }

    container.innerHTML = `
      <h1>Carrito de Compras</h1>
      ${itemsHtml}
      <div class="cart-actions">
        <button id="checkout-btn" class="btn-checkout" ${items.length === 0 ? 'disabled' : ''}>Comprar</button>
        <button id="back-btn" class="btn-back">Volver a la página principal</button>
      </div>
    `;

    // Eventos de cantidad
    container.querySelectorAll('.qty-dec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.id!;
        const item = this.items.find(i => i.id === id);
        if (item) this.updateQuantity(id, item.quantity - 1);
      });
    });

    container.querySelectorAll('.qty-inc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.id!;
        const item = this.items.find(i => i.id === id);
        if (item) this.updateQuantity(id, item.quantity + 1);
      });
    });

    container.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).dataset.id!;
        this.removeEntireItem(id);
      });
    });

    document.getElementById('checkout-btn')?.addEventListener('click', () => this.checkout());
    document.getElementById('back-btn')?.addEventListener('click', () => this.goHome());
  }
}
