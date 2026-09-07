import React from 'react';
import { ShieldCheck, Zap, Ban, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const FeatureBar: React.FC = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Zap,
      title: t('feature.local.title', 'Procesamiento en tu móvil'),
      desc: t('feature.local.desc', 'Todo se ejecuta directamente en el navegador de tu celular con aceleración gráfica.'),
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20'
    },
    {
      icon: Ban,
      title: t('feature.noads.title', '0% Publicidad'),
      desc: t('feature.noads.desc', 'Sin banners invasivos, anuncios emergentes ni cuentas regresivas.'),
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20'
    },
    {
      icon: ShieldCheck,
      title: t('feature.data.title', 'Ahorro de datos móviles'),
      desc: t('feature.data.desc', 'Al no subir tus fotos a la nube, no gastas megas de tu plan telefónico.'),
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      icon: Sparkles,
      title: t('feature.quality.title', 'Máxima resolución'),
      desc: t('feature.quality.desc', 'Tus fotos y videos mantienen la nitidez y calidad nativa de tu cámara.'),
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20'
    }
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${feat.bg} ${feat.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">{feat.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
