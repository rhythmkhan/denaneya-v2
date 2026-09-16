'use client';

import React, { useState } from 'react';
import { useLanguage } from './LanguageContext';
import { API_ENDPOINTS, ApiEndpoint } from '../lib/apiDocsData';
import { 
  Code2, 
  Copy, 
  Check, 
  Terminal, 
  ShieldCheck, 
  Layers, 
  Key, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const ApiDocsViewer: React.FC = () => {
  const { t, language } = useLanguage();
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(API_ENDPOINTS[0].id);
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'nodejs' | 'python' | 'php'>('curl');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<'production' | 'sandbox'>('production');

  const currentEndpoint = API_ENDPOINTS.find(e => e.id === selectedEndpointId) || API_ENDPOINTS[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'POST': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'GET': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELETE': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-3 border border-indigo-100">
            <Terminal className="w-3.5 h-3.5 text-indigo-600" />
            <span>Developer Reference v2.0</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t.docs.title}
          </h1>
          <p className="mt-2 text-base text-slate-600">
            {t.docs.subtitle}
          </p>

          {/* Base URL selector */}
          <div className="mt-6 flex flex-wrap items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t.docs.baseUrls}:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setBaseUrl('production')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                  baseUrl === 'production'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                https://api.denaneya.com
              </button>
              <button
                onClick={() => setBaseUrl('sandbox')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                  baseUrl === 'sandbox'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                http://localhost:4000 (Local Sandbox)
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid: Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sidebar Endpoints List (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-4 shadow-sm space-y-2 sticky top-24">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
              {t.docs.endpointsTitle}
            </h3>
            {API_ENDPOINTS.map((ep) => {
              const isSelected = ep.id === selectedEndpointId;
              return (
                <button
                  key={ep.id}
                  onClick={() => setSelectedEndpointId(ep.id)}
                  className={`w-full text-left p-3 rounded-2xl transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md border ${getMethodColor(ep.method)}`}>
                      {ep.method}
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {ep.title}
                    </span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-400 ${isSelected ? 'text-indigo-600 translate-x-0.5' : ''} transition-transform`} />
                </button>
              );
            })}

            {/* Quick Auth Info Box */}
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t.docs.authHeaders}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Server-to-Server requests require <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-indigo-700">X-API-KEY</code> and <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-indigo-700">X-API-SECRET</code> generated in your Merchant Dashboard.
              </p>
            </div>
          </div>

          {/* Endpoint Detail & Code Snippets (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Main Endpoint Detail Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              
              {/* Endpoint Title & Path */}
              <div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono font-extrabold px-3 py-1 rounded-lg border ${getMethodColor(currentEndpoint.method)}`}>
                    {currentEndpoint.method}
                  </span>
                  <span className="text-base sm:text-lg font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-xl truncate">
                    {currentEndpoint.path}
                  </span>
                  <button
                    onClick={() => handleCopy(currentEndpoint.path, 'path')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                    title="Copy path"
                  >
                    {copiedKey === 'path' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mt-4">
                  {currentEndpoint.title}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {currentEndpoint.description}
                </p>
              </div>

              {/* Required Headers Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Request Headers
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 font-mono">Header</th>
                        <th className="px-4 py-2 font-mono">Example Value</th>
                        <th className="px-4 py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentEndpoint.headers.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2 font-mono font-bold text-indigo-600">{h.key}</td>
                          <td className="px-4 py-2 font-mono text-slate-700">{h.value}</td>
                          <td className="px-4 py-2 text-slate-500">{h.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Schema Table if present */}
              {currentEndpoint.requestBodySchema && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {t.docs.requestBody} Schema
                  </h4>
                  <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2 font-mono">Field</th>
                          <th className="px-4 py-2 font-mono">Type</th>
                          <th className="px-4 py-2">Required</th>
                          <th className="px-4 py-2">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentEndpoint.requestBodySchema.map((field, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 font-mono font-bold text-slate-800">{field.field}</td>
                            <td className="px-4 py-2 font-mono text-indigo-600">{field.type}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                field.required ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {field.required ? 'Required' : 'Optional'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-slate-500">{field.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Code Snippet Box with Tabs (cURL, Node.js, Python, PHP) */}
            <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-xl border border-slate-800">
              
              {/* Snippet Top Bar */}
              <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(['curl', 'nodejs', 'python', 'php'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                        selectedLanguage === lang
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {lang === 'curl' && t.docs.tabCurl}
                      {lang === 'nodejs' && t.docs.tabNode}
                      {lang === 'python' && t.docs.tabPython}
                      {lang === 'php' && t.docs.tabPhp}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleCopy(currentEndpoint.snippets[selectedLanguage], 'snippet')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                >
                  {copiedKey === 'snippet' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.common.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t.docs.copyCode}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Pre Block */}
              <div className="p-5 overflow-x-auto font-mono text-xs text-indigo-200 leading-relaxed">
                <pre>{currentEndpoint.snippets[selectedLanguage]}</pre>
              </div>

            </div>

            {/* Response Samples Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t.docs.responseBody}
              </h4>
              <div className="space-y-4">
                {currentEndpoint.responses.map((resp, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        resp.status < 300 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {resp.title}
                      </span>
                      <button
                        onClick={() => handleCopy(JSON.stringify(resp.body, null, 2), `resp_${i}`)}
                        className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                      >
                        {copiedKey === `resp_${i}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{t.common.copy}</span>
                      </button>
                    </div>
                    <div className="bg-slate-900 p-4 overflow-x-auto text-xs font-mono text-emerald-400">
                      <pre>{JSON.stringify(resp.body, null, 2)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
