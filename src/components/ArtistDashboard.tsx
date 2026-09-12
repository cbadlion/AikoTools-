import React, { useState } from 'react';
import {
  Crown,
  Zap,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Trash2,
  Edit3,
  MessageSquare,
  Mail,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Download,
} from 'lucide-react';
import {
  CommissionOrder,
  OrderStatus,
  CommissionQueueStats,
} from '../types/commissions';
import {
  STATUS_CONFIG,
  COMMISSION_TIERS,
  ARTIST_INFO,
} from '../data/commissionsData';
import {
  updateOrderStatus,
  deleteOrder,
  resetOrdersToDefault,
  saveOrder,
  generateDiscordMessage,
} from '../utils/orderStorage';

interface ArtistDashboardProps {
  orders: CommissionOrder[];
  onOrdersChange: (updated: CommissionOrder[]) => void;
  stats: CommissionQueueStats;
  isCommsOpen: boolean;
  setIsCommsOpen: (open: boolean) => void;
}

export const ArtistDashboard: React.FC<ArtistDashboardProps> = ({
  orders,
  onOrdersChange,
  stats,
  isCommsOpen,
  setIsCommsOpen,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editDelivery, setEditDelivery] = useState('');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [showNewManualModal, setShowNewManualModal] = useState(false);

  // Quick manual order form state
  const [newClient, setNewClient] = useState('');
  const [newDiscord, setNewDiscord] = useState('');
  const [newChar, setNewChar] = useState('');
  const [newTier, setNewTier] = useState<'bubbles' | 'frame_static' | 'frame_animation'>('frame_static');

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === 'all') return true;
    return o.status === filterStatus;
  });

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const updated = updateOrderStatus(orderId, newStatus);
    onOrdersChange(updated);
  };

  const handleSaveNotes = (orderId: string) => {
    const updated = updateOrderStatus(orderId, orders.find((o) => o.id === orderId)?.status || 'pending', editNotes, editDelivery);
    onOrdersChange(updated);
    setEditingOrderId(null);
  };

  const handleDelete = (orderId: string) => {
    if (confirm(`¿Estás segura de eliminar el pedido #${orderId}?`)) {
      const updated = deleteOrder(orderId);
      onOrdersChange(updated);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('¿Restablecer pedidos a los ejemplos iniciales?')) {
      const reset = resetOrdersToDefault();
      onOrdersChange(reset);
    }
  };

  const handleCopyDiscordDM = (order: CommissionOrder) => {
    const text = generateDiscordMessage(order);
    navigator.clipboard.writeText(text);
    setCopiedOrderId(order.id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const handleCreateManualOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.trim() || !newDiscord.trim() || !newChar.trim()) {
      alert('Completa los campos requeridos');
      return;
    }

    const tierInfo = COMMISSION_TIERS.find((t) => t.id === newTier)!;
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const order: CommissionOrder = {
      id: `AIKO-${randomCode}`,
      createdAt: new Date().toISOString(),
      clientName: newClient.trim(),
      discord: newDiscord.trim(),
      gmail: 'manual@discord.dm',
      tierId: newTier,
      characterName: newChar.trim(),
      characterDescription: 'Pedido registrado directamente por Aiko.',
      poseAndExpression: 'A coordinar por chat privado de Discord.',
      backgroundPreference: 'comic_pop',
      addons: [],
      referenceFiles: [],
      totalVolts: tierInfo.volts,
      status: 'pending',
      artistNotes: 'Registrado manualmente por Aiko.',
      isPaid: true,
    };

    saveOrder(order);
    onOrdersChange([order, ...orders]);
    setShowNewManualModal(false);
    setNewClient('');
    setNewDiscord('');
    setNewChar('');
  };

  return (
    <section id="artist-dashboard-section" className="max-w-6xl mx-auto mb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl comic-border bg-[#FFFDF9] comic-shadow-lg mb-8">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl comic-border bg-purple-600 text-white flex items-center justify-center comic-shadow-sm">
            <Crown className="w-8 h-8 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black text-[#18181B]">
                Panel de Artista: Aiko
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-md font-bold comic-border bg-purple-100 text-purple-800">
                @digitalzart
              </span>
            </div>
            <p className="text-xs text-stone-600 font-semibold mt-0.5">
              Gestiona tu cola de comisiones, cambia estados y actualiza notas para tus clientes.
            </p>
          </div>
        </div>

        {/* Toggle Comms Switch & Add Order */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsCommsOpen(!isCommsOpen)}
            className={`px-4 py-2 rounded-xl comic-border text-xs font-black uppercase tracking-wide transition-all flex items-center gap-2 ${
              isCommsOpen
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>{isCommsOpen ? 'Comisiones ABIERTAS' : 'Comisiones CERRADAS'}</span>
          </button>

          <button
            onClick={() => setShowNewManualModal(true)}
            className="px-4 py-2 rounded-xl comic-border bg-amber-400 hover:bg-amber-500 text-stone-900 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 comic-shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Pedido Manual</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-2xl comic-border bg-white comic-shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Pedidos Activos</span>
          <div className="text-3xl font-comic font-black text-stone-900 mt-1">
            {stats.activeOrdersCount}
          </div>
          <span className="text-[11px] text-stone-400 font-semibold">
            {stats.openSlots} cupos disponibles
          </span>
        </div>

        <div className="p-4 rounded-2xl comic-border bg-white comic-shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Volts en Cola</span>
          <div className="text-3xl font-comic font-black text-red-600 mt-1 flex items-baseline gap-1">
            {stats.totalVoltsInQueue} <span className="text-base text-stone-700">⚡</span>
          </div>
          <span className="text-[11px] text-stone-400 font-semibold">
            (~${(stats.totalVoltsInQueue / 100).toFixed(0)} USD)
          </span>
        </div>

        <div className="p-4 rounded-2xl comic-border bg-white comic-shadow-sm">
          <span className="text-xs font-bold text-stone-500 uppercase">Capacidad Total</span>
          <div className="text-3xl font-comic font-black text-amber-600 mt-1">
            {ARTIST_INFO.slotsTotal} Slots
          </div>
          <span className="text-[11px] text-emerald-600 font-bold">
            {stats.openSlots > 0 ? 'Recibiendo pedidos' : 'Límite alcanzado'}
          </span>
        </div>

        <div className="p-4 rounded-2xl comic-border bg-white comic-shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-stone-500 uppercase">Herramientas</span>
          <button
            onClick={handleResetDefaults}
            className="mt-2 text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Ejemplos</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-2 mb-6">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-100 comic-border">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pending', label: 'Pendientes' },
            { id: 'sketch_review', label: 'Boceto' },
            { id: 'lineart_color', label: 'Color' },
            { id: 'animation_polish', label: 'Animación' },
            { id: 'completed', label: 'Entregados' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-stone-900 text-white comic-border'
                  : 'text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-bold text-stone-500 whitespace-nowrap">
          Mostrando {filteredOrders.length} pedido(s)
        </span>
      </div>

      {/* Orders List / Cards */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl comic-border p-6 text-stone-500">
            <p className="font-bold text-sm">No hay pedidos en esta categoría.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const tier = COMMISSION_TIERS.find((t) => t.id === order.tierId);
            const isEditing = editingOrderId === order.id;

            return (
              <div
                key={order.id}
                className="rounded-3xl comic-border bg-white comic-shadow p-5 sm:p-6 transition-all hover:comic-shadow-md"
              >
                {/* Header line */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-200 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-comic text-2xl font-black text-stone-900">
                      #{order.id}
                    </span>
                    <span
                      className={`text-xs font-black uppercase px-3 py-1 rounded-full comic-border ${statusConfig.badgeBg}`}
                    >
                      {statusConfig.label}
                    </span>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                      {tier?.name || order.tierId}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-comic text-2xl font-black text-red-600">
                      {order.totalVolts} ⚡
                    </span>

                    {/* Change Status Dropdown */}
                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value as OrderStatus)
                      }
                      className="text-xs font-bold px-3 py-1.5 rounded-xl comic-border bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="pending">🟡 Pendiente</option>
                      <option value="sketch_review">🟠 Boceto</option>
                      <option value="lineart_color">🟣 Lineart & Color</option>
                      <option value="animation_polish">🔵 Animación / Pulido</option>
                      <option value="completed">🟢 Listo Entrega</option>
                      <option value="delivered">✨ Entregado</option>
                    </select>

                    <button
                      onClick={() => handleDelete(order.id)}
                      title="Eliminar pedido"
                      className="p-1.5 rounded-xl hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mb-4">
                  {/* Client */}
                  <div className="p-3 rounded-xl bg-stone-50 comic-border">
                    <p className="font-bold text-stone-900 mb-1">Cliente & Contacto</p>
                    <p className="text-stone-700 font-semibold">{order.clientName}</p>
                    <p className="text-indigo-600 font-medium flex items-center gap-1 mt-0.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{order.discord}</span>
                    </p>
                    <p className="text-stone-500 truncate flex items-center gap-1 mt-0.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{order.gmail}</span>
                    </p>
                  </div>

                  {/* Character */}
                  <div className="p-3 rounded-xl bg-stone-50 comic-border">
                    <p className="font-bold text-stone-900 mb-1">Personaje & Pose</p>
                    <p className="font-bold text-red-600">{order.characterName}</p>
                    <p className="text-stone-600 line-clamp-2 mt-0.5">
                      {order.characterDescription}
                    </p>
                    <p className="text-stone-500 line-clamp-1 italic mt-0.5">
                      Pose: {order.poseAndExpression}
                    </p>
                  </div>

                  {/* Extras / Notes */}
                  <div className="p-3 rounded-xl bg-stone-50 comic-border">
                    <p className="font-bold text-stone-900 mb-1">Extras & Referencias</p>
                    <p className="text-stone-700">
                      Extras: {order.addons.length > 0 ? order.addons.join(', ') : 'Ninguno'}
                    </p>
                    <p className="text-stone-600">
                      Fondo: <span className="capitalize">{order.backgroundPreference}</span>
                    </p>
                    {order.referenceLinks && (
                      <p className="text-indigo-600 truncate underline mt-0.5">
                        Ref: {order.referenceLinks}
                      </p>
                    )}
                    {order.referenceFiles.length > 0 && (
                      <p className="text-emerald-700 font-semibold mt-0.5">
                        📎 {order.referenceFiles.length} imagen(es) adjunta(s)
                      </p>
                    )}
                  </div>
                </div>

                {/* Artist Notes / Editing section */}
                {isEditing ? (
                  <div className="p-4 rounded-2xl bg-amber-50 comic-border border-amber-300 space-y-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-amber-900">
                        Editar Nota para el Cliente
                      </span>
                      <button
                        onClick={() => setEditingOrderId(null)}
                        className="text-xs font-bold text-stone-500 hover:text-stone-800"
                      >
                        Cancelar
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Escribe una actualización para el cliente (aparecerá en su rastreador)..."
                      className="w-full p-2.5 rounded-xl comic-border bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />

                    <div className="flex items-center gap-3">
                      <input
                        type="date"
                        value={editDelivery}
                        onChange={(e) => setEditDelivery(e.target.value)}
                        className="px-3 py-1.5 rounded-xl comic-border bg-white text-xs font-bold"
                      />
                      <button
                        onClick={() => handleSaveNotes(order.id)}
                        className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 text-xs font-bold comic-border"
                      >
                        Guardar Nota
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 comic-border text-xs text-stone-700 mb-3">
                    <p className="truncate">
                      <strong>Nota al Cliente:</strong>{' '}
                      {order.artistNotes || 'Sin nota personalizada aún.'}
                      {order.estimatedDelivery && ` (Entrega: ${order.estimatedDelivery})`}
                    </p>
                    <button
                      onClick={() => {
                        setEditingOrderId(order.id);
                        setEditNotes(order.artistNotes || '');
                        setEditDelivery(order.estimatedDelivery || '');
                      }}
                      className="text-stone-600 hover:text-stone-900 font-bold underline shrink-0 ml-2"
                    >
                      Editar Nota
                    </button>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyDiscordDM(order)}
                      className="px-3 py-1.5 rounded-lg comic-border bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>
                        {copiedOrderId === order.id ? '¡Copiado para Discord!' : 'Copiar para Discord'}
                      </span>
                    </button>

                    <a
                      href={`mailto:${order.gmail}?subject=Tu Comisión con Aiko (#${order.id})`}
                      className="px-3 py-1.5 rounded-lg comic-border bg-red-50 hover:bg-red-100 text-red-900 text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Contactar por Gmail</span>
                    </a>
                  </div>

                  <span className="text-[11px] text-stone-400 font-semibold">
                    Registrado:{' '}
                    {new Date(order.createdAt).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Order Modal */}
      {showNewManualModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl comic-border comic-shadow-lg max-w-md w-full p-6 animate-fade-in">
            <h3 className="text-xl font-black text-stone-900 mb-3">
              Registrar Pedido Manual
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Añade un pedido recibido directamente por Discord o Gmail a tu cola de trabajo.
            </p>

            <form onSubmit={handleCreateManualOrder} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nombre del Cliente</label>
                <input
                  type="text"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  placeholder="Ej. KannaChan"
                  className="w-full p-2 rounded-xl comic-border bg-stone-50 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Usuario de Discord</label>
                <input
                  type="text"
                  value={newDiscord}
                  onChange={(e) => setNewDiscord(e.target.value)}
                  placeholder="kanna#9911"
                  className="w-full p-2 rounded-xl comic-border bg-stone-50 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Personaje / OC</label>
                <input
                  type="text"
                  value={newChar}
                  onChange={(e) => setNewChar(e.target.value)}
                  placeholder="Kanna (Chibi Dragón)"
                  className="w-full p-2 rounded-xl comic-border bg-stone-50 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Formato de Comisión</label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value as any)}
                  className="w-full p-2 rounded-xl comic-border bg-stone-50 font-bold"
                >
                  <option value="bubbles">Bubbles (500 Volts ⚡)</option>
                  <option value="frame_static">Frame Static (1500 Volts ⚡)</option>
                  <option value="frame_animation">Frame Animation (3000 Volts ⚡)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowNewManualModal(false)}
                  className="px-4 py-2 rounded-xl comic-border text-stone-600 font-bold hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl comic-border bg-amber-400 hover:bg-amber-500 font-black text-stone-900"
                >
                  Crear Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
