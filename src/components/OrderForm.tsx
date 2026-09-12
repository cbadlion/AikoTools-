import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Zap,
  Sparkles,
  Upload,
  X,
  Plus,
  Check,
  AlertCircle,
  Film,
  Image as ImageIcon,
  Smile,
  FileText,
  MessageSquare,
  Mail,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  CommissionTierId,
  CommissionOrder,
  OrderReferenceFile,
} from '../types/commissions';
import {
  COMMISSION_TIERS,
  COMMISSION_ADDONS,
  ARTIST_INFO,
} from '../data/commissionsData';
import { saveOrder } from '../utils/orderStorage';

interface OrderFormProps {
  initialTierId?: CommissionTierId;
  initialAddons?: string[];
  onOrderSuccess: (order: CommissionOrder) => void;
  onOpenTos: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  initialTierId = 'frame_static',
  initialAddons = [],
  onOrderSuccess,
  onOpenTos,
}) => {
  // Form State
  const [tierId, setTierId] = useState<CommissionTierId>(initialTierId);
  const [selectedAddons, setSelectedAddons] = useState<string[]>(initialAddons);

  // Client Info
  const [clientName, setClientName] = useState('');
  const [discord, setDiscord] = useState('');
  const [gmail, setGmail] = useState('');
  const [socialHandle, setSocialHandle] = useState('');

  // Character Details
  const [characterName, setCharacterName] = useState('');
  const [characterDescription, setCharacterDescription] = useState('');
  const [poseAndExpression, setPoseAndExpression] = useState('');
  const [animationDetails, setAnimationDetails] = useState('');
  const [backgroundPreference, setBackgroundPreference] = useState<
    'transparent' | 'comic_pop' | 'custom_color' | 'detailed'
  >('comic_pop');
  const [backgroundNote, setBackgroundNote] = useState('');

  // References
  const [referenceLinks, setReferenceLinks] = useState('');
  const [referenceFiles, setReferenceFiles] = useState<OrderReferenceFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Terms
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync props when changed
  useEffect(() => {
    if (initialTierId) setTierId(initialTierId);
  }, [initialTierId]);

  useEffect(() => {
    if (initialAddons && initialAddons.length > 0) setSelectedAddons(initialAddons);
  }, [initialAddons]);

  const selectedTier =
    COMMISSION_TIERS.find((t) => t.id === tierId) || COMMISSION_TIERS[1];

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  // Live Total Volts
  const addonsTotal = selectedAddons.reduce((sum, id) => {
    const a = COMMISSION_ADDONS.find((item) => item.id === id);
    return sum + (a ? a.volts : 0);
  }, 0);
  const totalVolts = selectedTier.volts + addonsTotal;

  // Handle image files upload & preview
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 8 * 1024 * 1024) {
        alert(`El archivo ${file.name} supera el límite de 8MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setReferenceFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            dataUrl,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReferenceFile = (index: number) => {
    setReferenceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!clientName.trim()) errors.push('Por favor ingresa tu nombre o nickname.');
    if (!discord.trim()) errors.push('Tu usuario de Discord es indispensable para que Aiko te contacte.');
    if (!gmail.trim() || !gmail.includes('@')) errors.push('Por favor ingresa un correo de Gmail válido.');
    if (!characterName.trim()) errors.push('Indica el nombre de tu personaje u OC.');
    if (!characterDescription.trim()) errors.push('Describe brevemente la apariencia de tu personaje.');
    if (!poseAndExpression.trim()) errors.push('Especifica la pose o expresión que deseas.');
    if (tierId === 'frame_animation' && !animationDetails.trim()) {
      errors.push('Para el formato Frame Animation, describe qué partes deseas que tengan movimiento.');
    }
    if (!termsAccepted) errors.push('Debes aceptar los Términos del Servicio (TOS) para continuar.');

    if (errors.length > 0) {
      setFormErrors(errors);
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    setFormErrors([]);
    setIsSubmitting(true);

    // Generate unique order ID
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newOrder: CommissionOrder = {
      id: `AIKO-${randomCode}`,
      createdAt: new Date().toISOString(),
      clientName: clientName.trim(),
      discord: discord.trim(),
      gmail: gmail.trim(),
      socialHandle: socialHandle.trim() || undefined,
      tierId,
      characterName: characterName.trim(),
      characterDescription: characterDescription.trim(),
      poseAndExpression: poseAndExpression.trim(),
      animationDetails: tierId === 'frame_animation' ? animationDetails.trim() : undefined,
      backgroundPreference,
      backgroundNote: backgroundNote.trim() || undefined,
      addons: selectedAddons,
      referenceLinks: referenceLinks.trim() || undefined,
      referenceFiles,
      totalVolts,
      status: 'pending',
      artistNotes: 'Pedido recibido. Aiko lo revisará a la brevedad.',
      isPaid: false,
    };

    // Save to storage
    saveOrder(newOrder);

    // Trigger celebratory confetti
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#EF4444', '#F59E0B', '#10B981', '#6366F1', '#EC4899'],
    });

    setTimeout(() => {
      setIsSubmitting(false);
      onOrderSuccess(newOrder);
    }, 600);
  };

  return (
    <section id="order-form-section" className="max-w-4xl mx-auto mb-16">
      {/* Form Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-100 text-red-800 comic-border text-xs font-black uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4 text-red-600" />
          Formulario de Pedido de Comisión
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-[#18181B] tracking-tight">
          Pide tu Arte a Aiko (@digitalzart)
        </h2>
        <p className="text-stone-600 text-sm mt-1 max-w-lg mx-auto">
          Completa los datos de tu personaje y preferencias. Recibirás tu confirmación y ficha lista
          para contactar a Aiko en privado por Discord o Gmail.
        </p>
      </div>

      {/* Validation Errors Box */}
      {formErrors.length > 0 && (
        <div className="mb-8 p-5 rounded-2xl bg-red-50 comic-border border-red-500 comic-shadow-sm text-red-900 animate-fade-in">
          <div className="flex items-center gap-2 font-bold mb-2 text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Por favor revisa los siguientes campos:</span>
          </div>
          <ul className="list-disc list-inside text-xs font-semibold space-y-1">
            {formErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* STEP 1: SELECT TIER */}
        <div className="p-6 sm:p-7 rounded-3xl comic-border bg-white comic-shadow">
          <div className="flex items-center justify-between mb-4 border-b pb-3 border-stone-200">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-amber-400 comic-border flex items-center justify-center font-comic text-base font-bold text-[#18181B]">
                1
              </span>
              <h3 className="text-xl font-black text-[#18181B]">
                Selecciona el Formato de Comisión
              </h3>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
              Precios Oficiales
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {COMMISSION_TIERS.map((tier) => {
              const isSelected = tierId === tier.id;

              return (
                <div
                  key={tier.id}
                  onClick={() => setTierId(tier.id)}
                  className={`cursor-pointer p-4 rounded-2xl comic-border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-100/90 border-stone-900 comic-shadow ring-2 ring-amber-400'
                      : 'bg-stone-50 hover:bg-stone-100 opacity-90'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black uppercase text-stone-500">
                        {tier.badge}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                    </div>
                    <div className="text-lg font-black text-[#18181B] flex items-center gap-1.5">
                      {tier.name}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200 flex items-baseline justify-between">
                    <span className="font-comic text-3xl font-black text-red-600">
                      {tier.volts} <span className="text-base text-stone-800">Volts</span>
                    </span>
                    <Zap className="w-4 h-4 fill-amber-500 text-amber-600" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add-ons Checkboxes */}
          <div className="mt-6 pt-5 border-t border-stone-200">
            <h4 className="text-sm font-black text-[#18181B] mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-600" />
              Complementos Adicionales (Opcional):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {COMMISSION_ADDONS.map((addon) => {
                const isChecked = selectedAddons.includes(addon.id);

                return (
                  <label
                    key={addon.id}
                    className={`cursor-pointer flex items-center justify-between p-3 rounded-xl comic-border text-xs transition-all select-none ${
                      isChecked
                        ? 'bg-amber-100/80 border-stone-900 font-bold'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAddon(addon.id)}
                        className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-400"
                      />
                      <span>{addon.name}</span>
                    </div>
                    <span className="font-comic text-sm text-red-600 font-black">
                      +{addon.volts} ⚡
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* STEP 2: CLIENT INFO */}
        <div className="p-6 sm:p-7 rounded-3xl comic-border bg-white comic-shadow">
          <div className="flex items-center gap-2.5 mb-4 border-b pb-3 border-stone-200">
            <span className="w-7 h-7 rounded-full bg-amber-400 comic-border flex items-center justify-center font-comic text-base font-bold text-[#18181B]">
              2
            </span>
            <h3 className="text-xl font-black text-[#18181B]">
              Tus Datos de Contacto
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1">
                Tu Nombre o Nickname <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ej. KuroNeko / Alex"
                className="w-full px-4 py-2.5 rounded-xl comic-border bg-stone-50 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>Usuario de Discord</span> <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="Ej. alex_art o alex#1234"
                className="w-full px-4 py-2.5 rounded-xl comic-border bg-stone-50 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Aiko te contactará por mensaje privado de Discord.
              </p>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-red-600" />
                <span>Correo de Gmail</span> <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                value={gmail}
                onChange={(e) => setGmail(e.target.value)}
                placeholder="tu.correo@gmail.com"
                className="w-full px-4 py-2.5 rounded-xl comic-border bg-stone-50 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1">
                Red Social Adicional (Opcional)
              </label>
              <input
                type="text"
                value={socialHandle}
                onChange={(e) => setSocialHandle(e.target.value)}
                placeholder="Twitter / Instagram @tu_usuario"
                className="w-full px-4 py-2.5 rounded-xl comic-border bg-stone-50 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
        </div>

        {/* STEP 3: CHARACTER & COMMISSION DETAILS */}
        <div className="p-6 sm:p-7 rounded-3xl comic-border bg-white comic-shadow">
          <div className="flex items-center gap-2.5 mb-4 border-b pb-3 border-stone-200">
            <span className="w-7 h-7 rounded-full bg-amber-400 comic-border flex items-center justify-center font-comic text-base font-bold text-[#18181B]">
              3
            </span>
            <h3 className="text-xl font-black text-[#18181B]">
              Detalles del Personaje & Composición
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1">
                Nombre del Personaje u OC <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Ej. Kanna (Kitsune) / Hámster Espacial"
                className="w-full px-4 py-2.5 rounded-xl comic-border bg-stone-50 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1">
                Descripción Física & Personalidad <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={3}
                value={characterDescription}
                onChange={(e) => setCharacterDescription(e.target.value)}
                placeholder="Pelo, ojos, ropa, accesorios clave, paleta de colores y rasgos característicos..."
                className="w-full px-4 py-2.5 rounded-xl comic-border bg-stone-50 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1">
                Pose & Expresión Facial <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={2}
                value={poseAndExpression}
                onChange={(e) => setPoseAndExpression(e.target.value)}
                placeholder="Ej. Sonriendo confiada con la mano levantada haciendo el signo de paz, o gritando alegre comiendo ramen..."
                className="w-full px-4 py-2.5 rounded-xl comic-border bg-stone-50 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>

            {/* If Frame Animation is selected: Prompt for Motion */}
            {tierId === 'frame_animation' && (
              <div className="p-4 rounded-2xl bg-orange-50 comic-border border-orange-400">
                <label className="block text-xs font-black uppercase tracking-wider text-orange-950 mb-1 flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-red-600" />
                  <span>Detalles de Animación (Frame a Frame)</span> <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={2}
                  value={animationDetails}
                  onChange={(e) => setAnimationDetails(e.target.value)}
                  placeholder="Describe el movimiento en bucle: ej. parpadeo de ojos cada 2 segundos, movimiento sutil de pelo y orejitas, chispas mágicas flotando..."
                  className="w-full px-4 py-2.5 rounded-xl comic-border bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            )}

            {/* Background preference */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-2">
                Preferencia de Fondo
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'comic_pop', label: 'Estilo Cómic Pop' },
                  { id: 'transparent', label: 'Transparente (PNG)' },
                  { id: 'custom_color', label: 'Color / Degradado' },
                  { id: 'detailed', label: 'Detallado (+400⚡)' },
                ].map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setBackgroundPreference(bg.id as any)}
                    className={`py-2 px-3 rounded-xl comic-border font-bold transition-all ${
                      backgroundPreference === bg.id
                        ? 'bg-amber-400 text-stone-950 comic-shadow-sm'
                        : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <input
                type="text"
                value={backgroundNote}
                onChange={(e) => setBackgroundNote(e.target.value)}
                placeholder="Nota sobre el fondo (ej. colores amarillos y rojos, estrellas, flores de cerezo...)"
                className="w-full px-4 py-2 rounded-xl comic-border bg-stone-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
        </div>

        {/* STEP 4: VISUAL REFERENCES */}
        <div className="p-6 sm:p-7 rounded-3xl comic-border bg-white comic-shadow">
          <div className="flex items-center gap-2.5 mb-4 border-b pb-3 border-stone-200">
            <span className="w-7 h-7 rounded-full bg-amber-400 comic-border flex items-center justify-center font-comic text-base font-bold text-[#18181B]">
              4
            </span>
            <h3 className="text-xl font-black text-[#18181B]">
              Referencias Visuales
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1">
                Enlaces a Carpetas de Referencia (Google Drive / Pinterest / Imgur)
              </label>
              <input
                type="text"
                value={referenceLinks}
                onChange={(e) => setReferenceLinks(e.target.value)}
                placeholder="https://drive.google.com/... o https://pinterest.com/..."
                className="w-full px-4 py-2.5 rounded-xl comic-border bg-stone-50 text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Drag and Drop Image Dropzone */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-1">
                O Sube Imágenes de Referencia Directamente
              </label>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  isDragging
                    ? 'border-red-500 bg-red-50'
                    : 'border-stone-300 bg-stone-50 hover:bg-stone-100'
                }`}
              >
                <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-stone-700">
                  Arrastra imágenes de tu personaje aquí, o{' '}
                  <label className="text-red-600 underline cursor-pointer hover:text-red-700 font-black">
                    explora tus archivos
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                  </label>
                </p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Formatos soportados: PNG, JPG, WEBP (hasta 8MB por archivo)
                </p>
              </div>

              {/* Thumbnails of uploaded references */}
              {referenceFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {referenceFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-xl comic-border overflow-hidden bg-stone-100 aspect-square group comic-shadow-sm"
                    >
                      <img
                        src={file.dataUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeReferenceFile(idx)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-600 text-white comic-border shadow hover:scale-110 transition-transform"
                        title="Eliminar referencia"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-stone-950/75 p-1 text-[10px] text-white truncate px-2">
                        {file.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 5: RESUMEN, TOS Y ENVIAR */}
        <div className="p-6 sm:p-7 rounded-3xl comic-border bg-amber-50 comic-shadow">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-amber-200 pb-4 mb-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                Resumen de tu Solicitud
              </span>
              <h4 className="text-2xl font-black text-stone-900">
                {selectedTier.name} (
                <span className="text-red-600">{selectedTier.volts} ⚡</span>)
              </h4>
              {selectedAddons.length > 0 && (
                <p className="text-xs text-stone-600 font-semibold mt-0.5">
                  Extras: {selectedAddons.length} seleccionado(s) (+{addonsTotal} Volts)
                </p>
              )}
            </div>

            <div className="text-right flex items-baseline gap-2">
              <span className="text-xs font-bold text-stone-500 uppercase">Total:</span>
              <span className="font-comic text-5xl font-black text-red-600">
                {totalVolts}
              </span>
              <span className="font-comic text-2xl font-black text-stone-900">
                VOLTS ⚡
              </span>
            </div>
          </div>

          {/* Terms Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none text-xs font-semibold text-stone-700 mb-6">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-stone-400 mt-0.5"
            />
            <span>
              He leído y acepto los{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenTos();
                }}
                className="text-red-600 underline font-bold hover:text-red-700"
              >
                Términos del Servicio (TOS)
              </button>
              . Comprendo que el pago se coordina en privado por Discord o Gmail en Volts y que el
              arte es para uso personal (salvo licencia comercial adicional).
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-base uppercase tracking-wider comic-border comic-shadow hover:translate-x-0.5 hover:translate-y-0.5 hover:comic-shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Generando Ficha de Pedido...</span>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>Confirmar y Enviar Pedido a Aiko</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-stone-500 font-medium mt-3">
            Al confirmar, se generará una ficha oficial con código de seguimiento que podrás enviar a
            Aiko por mensaje privado de Discord (@digitalzart) o Gmail.
          </p>
        </div>
      </form>
    </section>
  );
};
