import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Zap,
  MessageSquare,
  Mail,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Film,
  Image as ImageIcon,
  Smile,
} from 'lucide-react';
import { CommissionOrder, OrderStatus } from '../types/commissions';
import { STATUS_CONFIG, ARTIST_INFO, COMMISSION_TIERS } from '../data/commissionsData';
import { getStoredOrders } from '../utils/orderStorage';

interface OrderTrackerProps {
  initialOrderId?: string;
  onGoToOrderForm: () => void;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({
  initialOrderId = '',
  onGoToOrderForm,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialOrderId);
  const [activeOrder, setActiveOrder] = useState<CommissionOrder | null>(() => {
    const all = getStoredOrders();
    if (initialOrderId) {
      const clean = initialOrderId.trim().toUpperCase().replace('#', '');
      return all.find((o) => o.id === clean || o.id === `AIKO-${clean}`) || all[0] || null;
    }
    return all[0] || null;
  });
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const allOrders = getStoredOrders();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase().replace('#', '');
    if (!query) return;

    const found = allOrders.find(
      (o) =>
        o.id.toLowerCase() === query ||
        o.id.toLowerCase() === `aiko-${query}` ||
        o.clientName.toLowerCase().includes(query) ||
        o.discord.toLowerCase().includes(query)
    );

    if (found) {
      setActiveOrder(found);
      setSearchFeedback(null);
    } else {
      setSearchFeedback(`No encontramos pedidos con "${searchQuery}". Comprueba tu código.`);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(`#${id}`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const statusInfo = activeOrder
    ? STATUS_CONFIG[activeOrder.status] || STATUS_CONFIG.pending
    : null;

  const currentTier = activeOrder
    ? COMMISSION_TIERS.find((t) => t.id === activeOrder.tierId)
    : null;

  const pipelineSteps = [
    { key: 'pending', label: '1. Recibido', icon: Clock },
    { key: 'sketch_review', label: '2. Boceto', icon: Smile },
    { key: 'lineart_color', label: '3. Lineart & Color', icon: ImageIcon },
    { key: 'animation_polish', label: '4. Animación / Pulido', icon: Film },
    { key: 'completed', label: '5. Entrega', icon: CheckCircle2 },
  ];

  const getStepProgress = (currentStatus: OrderStatus): number => {
    switch (currentStatus) {
      case 'pending':
        return 1;
      case 'sketch_review':
        return 2;
      case 'lineart_color':
        return 3;
      case 'animation_polish':
        return 4;
      case 'completed':
      case 'delivered':
        return 5;
      default:
        return 1;
    }
  };

  const currentStepNum = activeOrder ? getStepProgress(activeOrder.status) : 1;

  return (
    <section id="order-tracker-section" className="max-w-4xl mx-auto mb-16">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-900 text-white comic-border text-xs font-black uppercase tracking-wider mb-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Rastreador de Estado en Vivo
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-[#18181B] tracking-tight">
          Consulta el Progreso de tu Comisión
        </h2>
        <p className="text-stone-600 text-sm mt-1 max-w-lg mx-auto">
          Ingresa tu código de pedido (ej. <strong className="text-stone-900">AIKO-9412</strong>) o
          tu usuario de Discord para ver la fase actual del arte.
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escribe tu Código de Pedido (#AIKO-XXXX) o tu Discord..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl comic-border bg-white text-base font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 comic-shadow-sm"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-[#18181B] font-black text-sm uppercase tracking-wide comic-border comic-shadow-sm transition-all shrink-0 flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Consultar</span>
          </button>
        </div>

        {/* Quick chip examples */}
        <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-stone-600">
          <span className="font-bold">Pedidos de prueba activos:</span>
          {allOrders.slice(0, 3).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                setActiveOrder(o);
                setSearchQuery(o.id);
                setSearchFeedback(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 comic-border text-[11px] font-bold text-stone-800 transition-colors"
            >
              #{o.id} ({o.clientName})
            </button>
          ))}
        </div>

        {searchFeedback && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 text-amber-900 comic-border text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{searchFeedback}</span>
          </div>
        )}
      </form>

      {/* Active Order Card */}
      {activeOrder && statusInfo && (
        <div className="rounded-3xl comic-border bg-white comic-shadow-lg p-6 sm:p-8 space-y-6">
          {/* Top Banner with ID and Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-comic text-3xl font-black text-[#18181B] tracking-wide">
                  #{activeOrder.id}
                </span>
                <button
                  onClick={() => handleCopyId(activeOrder.id)}
                  title="Copiar código"
                  className="p-1.5 rounded-lg hover:bg-stone-100 comic-border text-stone-600 transition-colors"
                >
                  {copiedCode ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              <p className="text-xs text-stone-500 font-semibold mt-0.5">
                Cliente: <strong className="text-stone-900">{activeOrder.clientName}</strong> (
                <span className="text-indigo-600">{activeOrder.discord}</span>)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider comic-border ${statusInfo.badgeBg}`}
              >
                ● {statusInfo.label}
              </span>

              <div className="flex items-center gap-1 font-comic text-2xl font-black text-red-600">
                <span>{activeOrder.totalVolts}</span>
                <span className="text-sm font-sans font-bold text-stone-800">Volts ⚡</span>
              </div>
            </div>
          </div>

          {/* 5-Step Visual Progress Bar */}
          <div className="py-2">
            <div className="relative">
              {/* Connector line */}
              <div className="absolute top-5 inset-x-4 h-1.5 bg-stone-200 rounded-full -z-0" />
              <div
                className="absolute top-5 left-4 h-1.5 bg-emerald-500 rounded-full transition-all duration-500 -z-0"
                style={{
                  width: `${((currentStepNum - 1) / (pipelineSteps.length - 1)) * 92}%`,
                }}
              />

              <div className="relative z-10 flex items-center justify-between">
                {pipelineSteps.map((step, idx) => {
                  const isDone = idx + 1 < currentStepNum;
                  const isCurrent = idx + 1 === currentStepNum;
                  const Icon = step.icon;

                  return (
                    <div key={step.key} className="flex flex-col items-center text-center">
                      <div
                        className={`w-10 h-10 rounded-full comic-border flex items-center justify-center transition-all ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                            ? 'bg-amber-400 text-stone-900 ring-4 ring-amber-200 comic-shadow-sm scale-110'
                            : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {isDone ? (
                          <Check className="w-5 h-5 stroke-[3]" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`text-[11px] mt-2 font-black max-w-[70px] sm:max-w-none leading-tight ${
                          isCurrent
                            ? 'text-stone-900 underline decoration-amber-400'
                            : isDone
                            ? 'text-emerald-700'
                            : 'text-stone-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Current Status Message Box from Aiko */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 comic-border border-amber-300">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden comic-border bg-amber-300 shrink-0">
                <img
                  src="/aiko_avatar.jpg"
                  alt="Aiko"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <span>Mensaje de Aiko (@digitalzart)</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  </h4>
                  {activeOrder.estimatedDelivery && (
                    <span className="text-[11px] font-bold text-stone-600">
                      Entrega estimada: {activeOrder.estimatedDelivery}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-stone-800 mt-1">
                  "{activeOrder.artistNotes || statusInfo.text}"
                </p>
              </div>
            </div>
          </div>

          {/* Character & Order Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-stone-50 comic-border space-y-2">
              <h5 className="font-black text-stone-900 uppercase tracking-wider border-b pb-1.5 border-stone-200">
                Ficha del Personaje
              </h5>
              <p>
                <strong className="text-stone-700">Nombre / OC:</strong>{' '}
                <span className="font-bold text-stone-900">{activeOrder.characterName}</span>
              </p>
              <p className="text-stone-600">
                <strong className="text-stone-700">Descripción:</strong>{' '}
                {activeOrder.characterDescription}
              </p>
              <p className="text-stone-600">
                <strong className="text-stone-700">Pose & Actitud:</strong>{' '}
                {activeOrder.poseAndExpression}
              </p>
              {activeOrder.animationDetails && (
                <p className="text-red-700 font-medium">
                  <strong>Animación:</strong> {activeOrder.animationDetails}
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 comic-border space-y-2">
              <h5 className="font-black text-stone-900 uppercase tracking-wider border-b pb-1.5 border-stone-200">
                Formato & Especificaciones
              </h5>
              <p>
                <strong className="text-stone-700">Categoría:</strong>{' '}
                <span className="font-bold text-red-600">
                  {currentTier?.name || activeOrder.tierId} (
                  {currentTier?.volts || activeOrder.totalVolts} Volts)
                </span>
              </p>
              <p>
                <strong className="text-stone-700">Fondo:</strong>{' '}
                <span className="capitalize">{activeOrder.backgroundPreference}</span>
              </p>
              <p>
                <strong className="text-stone-700">Extras:</strong>{' '}
                {activeOrder.addons.length > 0 ? activeOrder.addons.join(', ') : 'Sin extras'}
              </p>
              <p>
                <strong className="text-stone-700">Fecha de Registro:</strong>{' '}
                {new Date(activeOrder.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Quick Contact & Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500">¿Dudas sobre tu pedido?</span>
              <a
                href={`mailto:${ARTIST_INFO.gmail}?subject=Consulta Pedido #${activeOrder.id}`}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-bold comic-border flex items-center gap-1.5 text-stone-800"
              >
                <Mail className="w-3.5 h-3.5 text-red-600" />
                <span>Escribir a Aiko</span>
              </a>
            </div>

            <button
              onClick={onGoToOrderForm}
              className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-xs font-black uppercase tracking-wider comic-border flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Hacer Otro Pedido</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
