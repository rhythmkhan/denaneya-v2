'use client';

import React from 'react';
import { useLanguage } from './LanguageContext';
import { 
  Percent, 
  Smartphone, 
  ShieldAlert, 
  Globe2, 
  ArrowUpRight 
} from 'lucide-react';

export const ValueProps: React.FC = () => {
  const { t } = useLanguage();

  const props = [
    {
      icon: Percent,
      title: t.valueProps.prop1Title,
      desc: t.valueProps.prop1Desc,
      color: 'from-emerald-500 to-teal-600',
      tag: '100% Revenue Kept'
    },
    {
      icon: Smartphone,
      title: t.valueProps.prop2Title,
      desc: t.valueProps.prop2Desc,
      color: 'from-blue-500 to-indigo-600',
      tag: '< 800ms Sync'
    },
    {
      icon: ShieldAlert,
      title: t.valueProps.prop3Title,
      desc: t.valueProps.prop3Desc,
      color: 'from-purple-500 to-pink-600',
      tag: '13 Audited Hardened'
    },
    {
      icon: Globe2,
      title: t.valueProps.prop4Title,
      desc: t.valueProps.prop4Desc,
      color: 'from-amber-500 to-orange-600',
      tag: '52+ Channels'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t.valueProps.title}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            {t.valueProps.subtitle}
          </p>
        </div>

        {/* 4 Value Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {props.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="group relative p-7 rounded-3xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${p.color} text-white flex items-center justify-center shadow-md`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-200/60 text-slate-700">
                      {p.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {p.title}
                  </h3>
                  <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                    {p.desc}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-indigo-600">
                  <span>{t.common.learnMore}</span>
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
