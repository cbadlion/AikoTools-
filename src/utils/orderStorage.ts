import { CommissionOrder, OrderStatus, CommissionQueueStats } from '../types/commissions';
import { INITIAL_ORDERS, ARTIST_INFO } from '../data/commissionsData';

const STORAGE_KEY = 'aiko_digital_commissions_v1';
const STATS_KEY = 'aiko_comms_stats_v1';

export function getStoredOrders(): CommissionOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ORDERS));
      return INITIAL_ORDERS;
    }
    return parsed;
  } catch (e) {
    console.error('Error reading orders from localStorage', e);
    return INITIAL_ORDERS;
  }
}

export function saveOrder(order: CommissionOrder): void {
  try {
    const orders = getStoredOrders();
    const updated = [order, ...orders.filter((o) => o.id !== order.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving order', e);
  }
}

export function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  artistNotes?: string,
  estimatedDelivery?: string
): CommissionOrder[] {
  try {
    const orders = getStoredOrders();
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status: newStatus,
          ...(artistNotes !== undefined ? { artistNotes } : {}),
          ...(estimatedDelivery !== undefined ? { estimatedDelivery } : {}),
        };
      }
      return o;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error updating order status', e);
    return getStoredOrders();
  }
}

export function deleteOrder(orderId: string): CommissionOrder[] {
  try {
    const orders = getStoredOrders();
    const updated = orders.filter((o) => o.id !== orderId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting order', e);
    return getStoredOrders();
  }
}

export function resetOrdersToDefault(): CommissionOrder[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  } catch {
    return INITIAL_ORDERS;
  }
}

export function getQueueStats(orders: CommissionOrder[]): CommissionQueueStats {
  const activeOrders = orders.filter((o) => o.status !== 'delivered');
  const totalVolts = activeOrders.reduce((sum, o) => sum + o.totalVolts, 0);
  const totalSlots = ARTIST_INFO.slotsTotal;
  const openSlots = Math.max(0, totalSlots - activeOrders.length);

  return {
    openSlots,
    totalSlots,
    isCommsOpen: openSlots > 0,
    activeOrdersCount: activeOrders.length,
    totalVoltsInQueue: totalVolts,
  };
}

export function generateDiscordMessage(order: CommissionOrder): string {
  const tierNames: Record<string, string> = {
    bubbles: '⚡ Bubbles (500 Volts)',
    frame_static: '⚡ Frame Static (1500 Volts)',
    frame_animation: '⚡ Frame Animation (3000 Volts)',
  };

  const bgLabels: Record<string, string> = {
    transparent: 'Fondo Transparente',
    comic_pop: 'Estilo Cómic Pop',
    custom_color: 'Color Personalizado',
    detailed: 'Fondo Detallado (+400 Volts)',
  };

  const addonsList = order.addons.length > 0 ? order.addons.join(', ') : 'Ninguno';

  return `✨ **PEDIDO DE COMISIÓN - @digitalzart** ✨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 **Código de Pedido:** #${order.id}
👤 **Cliente:** ${order.clientName}
💬 **Discord:** ${order.discord}
📧 **Gmail:** ${order.gmail}
${order.socialHandle ? `🔗 **Redes:** ${order.socialHandle}\n` : ''}
🎨 **Categoría:** ${tierNames[order.tierId] || order.tierId}
⚡ **TOTAL:** ${order.totalVolts} Volts

📝 **Personaje:** ${order.characterName}
🔍 **Descripción:** ${order.characterDescription}
🎭 **Pose y Expresión:** ${order.poseAndExpression}
${order.animationDetails ? `🎬 **Detalles Animación:** ${order.animationDetails}\n` : ''}
🖼️ **Fondo:** ${bgLabels[order.backgroundPreference] || order.backgroundPreference}
${order.backgroundNote ? `💬 **Nota Fondo:** ${order.backgroundNote}\n` : ''}
➕ **Extras:** ${addonsList}
${order.referenceLinks ? `📎 **Enlaces Referencia:** ${order.referenceLinks}\n` : ''}
${order.referenceFiles.length > 0 ? `📁 **Archivos adjuntos:** ${order.referenceFiles.length} imagen(es)\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*(Enviado desde Aiko Comms Manager)*`;
}

export function generateGmailMailtoUrl(order: CommissionOrder): string {
  const subject = encodeURIComponent(
    `[Comisión Digital] Pedido #${order.id} - ${order.characterName} (${order.clientName})`
  );
  const body = encodeURIComponent(
    `Hola Aiko (@digitalzart),\n\nHe realizado mi solicitud de comisión digital a través de tu app:\n\n` +
      generateDiscordMessage(order) +
      `\n\nQuedo a la espera de tu respuesta en privado para coordinar el pago y el boceto.\n\n¡Muchas gracias!\n${order.clientName}`
  );
  return `mailto:${ARTIST_INFO.gmail}?subject=${subject}&body=${body}`;
}
