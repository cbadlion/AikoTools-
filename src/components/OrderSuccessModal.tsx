import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  MessageSquare,
  Mail,
  ArrowRight,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { CommissionOrder } from '../types/commissions';
import { COMMISSION_TIERS, ARTIST_INFO } from '../data/commissionsData';
import {
  generateDiscordMessage,
  generateGmailMailtoUrl,
} from '../utils/orderStorage';

interface OrderSuccessModalProps {
  order: CommissionOrder | null;
  onClose: () => void;
  onViewInTracker: (orderId: string) => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
  onViewInTracker,
}) => {
  if (!order) return null;

  const [copiedDiscord, setCopiedDiscord] = useState(false);
  const tier = COMMISSION_TIERS.find((t) => t.id === order.tierId);

  const handleCopyDiscord = () => {
    const text = generateDiscordMessage(order);
    navigator.clipboard.writeText(text);
    setCopiedDiscord(true);
    setTimeout(() => setCopiedDiscord(false), 2500);
  };

  const mailtoUrl = generateGmailMailtoUrl(order);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-[#FAF7F2] rounded-3xl comic-border border-4 border-[#18181B] comic-shadow-lg max-w-lg w-full p-6 sm:p-8 animate-fade-in bg-notebook-grid my-8">
        {/* Confetti & Star badge */}
        <div className="flex justify-center -mt-12 mb-4">
          <div className="w-20 h-20 rounded-2xl bg-amber-400 comic-border text-stone-900 flex items-center justify-center comic-shadow rotate-3 animate-bounce">
            <Sparkles className="w-10 h-10 text-red-600" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full comic-border">
            ¡Solicitud Enviada con Éxito!
          </span>
          <h3 className="text-3xl font-black text-stone-900 mt-2">
            ¡Tu Pedido #{order.id} está Listo!
          </h3>
          <p className="text-stone-600 text-xs font-semibold mt-1">
            Ahora debes avisar a <strong className="text-red-600">Aiko</strong> en privado por
            Discord o Gmail para confirmar el pago en Volts e iniciar el boceto.
          </p>
        </div>

        {/* Order Ticket Card */}
        <div className="p-4 rounded-2xl bg-white comic-border comic-shadow-sm mb-6 space-y-2 text-xs">
          <div className="flex items-center justify-between border-b pb-2 border-stone-200">
            <span className="font-bold text-stone-500 uppercase">Formato</span>
            <span className="font-black text-stone-900 text-sm">
              {tier?.name || order.tierId}
            </span>
          </div>

          <div className="flex items-center justify-between border-b pb-2 border-stone-200">
            <span className="font-bold text-stone-500 uppercase">Personaje</span>
            <span className="font-bold text-stone-900">{order.characterName}</span>
          </div>

          <div className="flex items-center justify-between border-b pb-2 border-stone-200">
            <span className="font-bold text-stone-500 uppercase">Cliente</span>
            <span className="font-semibold text-stone-800">
              {order.clientName} ({order.discord})
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-stone-500 uppercase">Total en Volts</span>
            <span className="font-comic text-2xl font-black text-red-600">
              {order.totalVolts} Volts ⚡
            </span>
          </div>
        </div>

        {/* Instructions: "Call me in private! Discord | Gmail" */}
        <div className="p-3.5 rounded-xl bg-stone-900 text-white comic-border text-xs mb-6">
          <p className="font-black text-amber-300 mb-1 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" />
            Siguiente Paso: Envía la Ficha a Aiko
          </p>
          <p className="text-stone-300 leading-relaxed text-[11px]">
            Copia la ficha formateada y envíasela por mensaje directo a{' '}
            <strong className="text-white font-bold">@digitalzart</strong> en Discord o ábrela en
            Gmail con un solo clic.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* 1. Copy Discord button */}
          <button
            onClick={handleCopyDiscord}
            className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wide comic-border comic-shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            {copiedDiscord ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>¡Copiado! Ahora pégalo en el chat de Discord</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Ficha para Discord (@digitalzart)</span>
              </>
            )}
          </button>

          {/* 2. Direct Gmail button */}
          <a
            href={mailtoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wide comic-border comic-shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <Mail className="w-4 h-4" />
            <span>Abrir Correo Prellenado en Gmail</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* 3. View in Tracker button */}
          <button
            onClick={() => {
              onClose();
              onViewInTracker(order.id);
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-stone-900 font-black text-xs uppercase tracking-wide comic-border flex items-center justify-center gap-2 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Ver Progreso en el Rastreador</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="w-full text-center text-xs font-bold text-stone-500 hover:text-stone-800 py-1"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};
