'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type Nokta = {
  id: string
  isim: string
  koordinat_lat: number
  koordinat_lng: number
  mitolojik_gecmis: string
  fiziksel_gecmis: string
  durum: 'uyku' | 'aktif' | 'kapali'
  tip: 'gecit' | 'gorev' | 'etkinlik' | 'tehlike' | 'kesfet'
  simge: string
  gorsel_url: string | null
}

type Profil = {
  is_admin: boolean
}

type GorevKabulu = {
  gorev_id: string
  durum: string
}

const tipStil: Record<string, { renk: string; glow: string; etiket: string; bg: string; rgb: string }> = {
  gecit:    { renk: '#a855f7', glow: '0 0 14px rgba(168,85,247,0.7)',   etiket: 'RUH GEÇİDİ',   bg: 'rgba(168,85,247,0.1)',  rgb: '168,85,247'  },
  gorev:    { renk: '#22d3ee', glow: '0 0 14px rgba(34,211,238,0.7)',   etiket: 'GÖREV',         bg: 'rgba(34,211,238,0.1)',  rgb: '34,211,238'  },
  etkinlik: { renk: '#f0c040', glow: '0 0 14px rgba(240,192,64,0.7)',   etiket: 'ETKİNLİK',     bg: 'rgba(240,192,64,0.1)',  rgb: '240,192,64'  },
  tehlike:  { renk: '#ef4444', glow: '0 0 14px rgba(239,68,68,0.7)',    etiket: 'TEHLİKE',      bg: 'rgba(239,68,68,0.1)',   rgb: '239,68,68'   },
  kesfet:   { renk: '#34d399', glow: '0 0 14px rgba(52,211,153,0.7)',   etiket: 'KEŞFEDİLECEK', bg: 'rgba(52,211,153,0.1)', rgb: '52,211,153'  },
}

const durumEtiket = { aktif: 'AKTİF', uyku: 'UYKU', kapali: 'KAPALI' }

export default function Harita() {
  const [noktalar, setNoktalar] = useState<Nokta[]>([])
  const [secili, setSecili] = useState<Nokta | null>(null)
  const [tab, setTab] = useState<'mitolojik' | 'fiziksel'>('mitolojik')
  const [filtre, setFiltre] = useState<string | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [editingNokta, setEditingNokta] = useState<Partial<Nokta> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [gorevKabulleri, setGorevKabulleri] = useState<GorevKabulu[]>([])
  const [isListOpen, setIsListOpen] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<any>(null)
  const markersRef = useRef<Record<string, any>>({})

  const handleFilterClick = (tip: string | null) => {
    if (isListOpen && filtre === tip) {
      setIsListOpen(false)
    } else {
      setFiltre(tip)
      setIsListOpen(true)
    }
  }

  function noktaySec(nokta: Nokta) {
    setSecili(nokta)
    setTab('mitolojik')
    setEditingNokta(null)
    if (leafletRef.current) {
      leafletRef.current.flyTo([nokta.koordinat_lat, nokta.koordinat_lng], 12, { duration: 1.2 })
    }
  }

  useEffect(() => {
    const supabase = createClient()
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
        setProfil(p)
      }
      const { data: noktalarData } = await supabase.from('gecit_noktalari').select('*').order('tip')
      setNoktalar(noktalarData ?? [])
      const { data: kabullerData } = await supabase.from('gorev_kabulleri').select('gorev_id, durum')
      setGorevKabulleri(kabullerData ?? [])
    }
    yukle()
  }, [])

  async function handleSave() {
    if (!editingNokta) return
    setIsSaving(true)
    const supabase = createClient()
    const noktaData = {
      isim: editingNokta.isim,
      koordinat_lat: editingNokta.koordinat_lat,
      koordinat_lng: editingNokta.koordinat_lng,
      mitolojik_gecmis: editingNokta.mitolojik_gecmis,
      fiziksel_gecmis: editingNokta.fiziksel_gecmis,
      durum: editingNokta.durum,
      tip: editingNokta.tip,
      simge: editingNokta.simge,
      gorsel_url: editingNokta.gorsel_url ?? null,
    }
    const { data, error } = editingNokta.id
      ? await supabase.from('gecit_noktalari').update(noktaData).eq('id', editingNokta.id).select().single()
      : await supabase.from('gecit_noktalari').insert(noktaData).select().single()
    if (error) {
      alert('Hata: ' + error.message)
    } else if (data) {
      const yeni = data as Nokta
      if (editingNokta.id) {
        setNoktalar(prev => prev.map(n => n.id === yeni.id ? yeni : n))
      } else {
        setNoktalar(prev => [...prev, yeni])
      }
      setEditingNokta(null)
    }
    setIsSaving(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu noktayı haritadan silmek istediğinizden emin misiniz?')) return
    const supabase = createClient()
    const { error } = await supabase.from('gecit_noktalari').delete().eq('id', id)
    if (error) {
      alert('Hata: ' + error.message)
    } else {
      setNoktalar(prev => prev.filter(n => n.id !== id))
      setEditingNokta(null)
      if (secili?.id === id) setSecili(null)
    }
  }

  // Harita başlatma
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      const L = (window as any).L
      const map = L.map(mapRef.current, {
        center: [38.2, 27.2], zoom: 8,
        zoomControl: true, attributionControl: false,
      })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18 }).addTo(map)
      leafletRef.current = map
    }
    document.head.appendChild(script)

    return () => {
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null }
    }
  }, [])

  // Marker yönetimi
  useEffect(() => {
    if (!leafletRef.current || !noktalar) return
    const L = (window as any).L
    if (!L) return

    const currentIds = Object.keys(markersRef.current)
    const noktaIds = noktalar.map(n => n.id)

    currentIds.forEach(id => {
      if (!noktaIds.includes(id)) {
        leafletRef.current.removeLayer(markersRef.current[id].marker)
        delete markersRef.current[id]
      }
    })

    noktalar.forEach(nokta => {
      const stil = tipStil[nokta.tip]
      const seciliMi = secili?.id === nokta.id
      const aktifFiltre = !filtre || nokta.tip === filtre
      const boyut = seciliMi ? 30 : (nokta.durum === 'aktif' ? 22 : 16)
      const sinyal = aktifFiltre && nokta.tip === filtre
      const opaklık = secili ? (seciliMi ? 1 : 0.35) : 1

      const icon = L.divIcon({
        html: `
          <div style="position:relative;width:${boyut + 20}px;height:${boyut + 20}px;display:flex;align-items:center;justify-content:center;opacity:${opaklık};transition:all 0.4s;">
            ${sinyal || seciliMi ? `
              <div style="
                position:absolute;
                width:${boyut + 20}px;height:${boyut + 20}px;
                border-radius:50%;
                border:2px solid ${stil.renk};
                animation:sinyal_${nokta.tip} 1.5s ease-out infinite;
                opacity:0;
              "></div>
              <div style="
                position:absolute;
                width:${boyut + 10}px;height:${boyut + 10}px;
                border-radius:50%;
                border:1px solid ${stil.renk};
                animation:sinyal_${nokta.tip} 1.5s ease-out 0.5s infinite;
                opacity:0;
              "></div>
            ` : ''}
            <div style="
              width:${boyut}px;height:${boyut}px;
              background:${aktifFiltre ? stil.renk + (seciliMi ? '55' : '33') : '#ffffff08'};
              border-radius:50%;
              border:${seciliMi ? '3px' : '2px'} solid ${aktifFiltre ? stil.renk : '#ffffff15'};
              display:flex;align-items:center;justify-content:center;
              font-size:${boyut * 0.55}px;
              cursor:pointer;
              transition:all 0.4s;
              box-shadow:${seciliMi ? `0 0 25px ${stil.renk}, ${stil.glow}` : aktifFiltre ? stil.glow : 'none'};
              filter:${aktifFiltre ? 'none' : 'grayscale(1) brightness(0.3)'};
            ">${aktifFiltre ? nokta.simge : '·'}</div>
          </div>
        `,
        className: '',
        iconSize: [boyut + 20, boyut + 20],
        iconAnchor: [(boyut + 20) / 2, (boyut + 20) / 2],
      })

      if (markersRef.current[nokta.id]) {
        markersRef.current[nokta.id].marker.setLatLng([nokta.koordinat_lat, nokta.koordinat_lng])
        markersRef.current[nokta.id].marker.setIcon(icon)
        markersRef.current[nokta.id].nokta = nokta
      } else {
        const marker = L.marker([nokta.koordinat_lat, nokta.koordinat_lng], { icon })
          .addTo(leafletRef.current)
          .on('click', () => noktaySec(nokta))
        markersRef.current[nokta.id] = { marker, nokta }
      }
    })
  }, [filtre, noktalar, secili])

  const filtrelenmis = filtre ? noktalar.filter(n => n.tip === filtre) : noktalar

  return (
    <main className="min-h-screen bg-black flex flex-col"
      style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="fixed inset-0 bg-black/90" />
      <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent z-20" />

      <div className="relative z-10 flex flex-col h-screen">

        {/* Başlık */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-fuchsia-500/10 shrink-0">
          <div className="flex flex-col gap-0.5">
            <p className="text-fuchsia-400/40 text-xs tracking-[0.4em] uppercase">Theia Kabilesi</p>
            <h1 className="text-white text-lg tracking-widest uppercase">Geçit Enerji Haritası</h1>
          </div>
          <div className="flex items-center gap-4">
            {profil?.is_admin && !editingNokta && (
              <button
                onClick={() => {
                  setEditingNokta({
                    isim: '',
                    tip: 'kesfet',
                    durum: 'uyku',
                    simge: '✦',
                    koordinat_lat: leafletRef.current?.getCenter().lat || 38.2,
                    koordinat_lng: leafletRef.current?.getCenter().lng || 27.2,
                  })
                  setSecili(null)
                }}
                className="border border-emerald-500/50 text-emerald-400/80 px-3 py-1.5 text-xs tracking-widest uppercase hover:bg-emerald-500/10 transition-all"
              >
                + Yeni Nokta
              </button>
            )}
            <Link href="/arsiv" className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all">
              ← Arşiv
            </Link>
          </div>
        </div>

        {/* Filtre bar */}
        <div className="shrink-0 border-b border-white/10 bg-black/20">
          <div className="grid grid-cols-3 lg:grid-cols-6">
            <button
              onClick={() => handleFilterClick(null)}
              className="py-4 px-3 text-xs tracking-widest uppercase transition-all flex flex-col items-center gap-1.5 hover:bg-white/10"
              style={{
                backgroundColor: !filtre ? '#4a4a4a' : 'rgba(255,255,255,0.05)',
                color: !filtre ? 'white' : 'rgba(255,255,255,0.6)',
              }}
            >
              <span className="text-base">◎</span>
              <span>Tümü</span>
              <span className="opacity-60 text-xs">({noktalar.length})</span>
            </button>

            {Object.entries(tipStil).map(([tip, stil]) => (
              <button
                key={tip}
                onClick={() => handleFilterClick(tip)}
                className="py-4 px-3 text-xs tracking-widest uppercase transition-all flex flex-col items-center gap-1.5 hover:bg-white/10"
                style={{
                  backgroundColor: filtre === tip ? stil.renk : 'rgba(255,255,255,0.05)',
                  color: filtre === tip ? (tip === 'etkinlik' ? '#333' : 'white') : 'rgba(255,255,255,0.6)',
                }}
              >
                <span className="text-base">
                  {tip === 'gecit' ? '◈' : tip === 'gorev' ? '⬡' : tip === 'etkinlik' ? '◉' : tip === 'tehlike' ? '⚠' : '✦'}
                </span>
                <span>{stil.etiket}</span>
                <span className="opacity-60" style={{ fontSize: '10px' }}>
                  ({noktalar.filter(n => n.tip === tip).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Ana içerik */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* Harita alanı */}
          <div className="flex-1 relative">
            <div ref={mapRef} className="w-full h-full" />

            <style>{`
              .leaflet-container { background: #000 !important; }
              .leaflet-control-zoom { border: 1px solid rgba(255,255,255,0.1) !important; background: rgba(0,0,0,0.8) !important; }
              .leaflet-control-zoom a { background: transparent !important; color: rgba(255,255,255,0.4) !important; border-color: rgba(255,255,255,0.1) !important; }
              .leaflet-control-zoom a:hover { color: white !important; }
              @keyframes sinyal_gecit    { 0% { transform:scale(0.5);opacity:0.8; } 100% { transform:scale(2);opacity:0; } }
              @keyframes sinyal_gorev    { 0% { transform:scale(0.5);opacity:0.8; } 100% { transform:scale(2);opacity:0; } }
              @keyframes sinyal_etkinlik { 0% { transform:scale(0.5);opacity:0.8; } 100% { transform:scale(2);opacity:0; } }
              @keyframes sinyal_tehlike  { 0% { transform:scale(0.5);opacity:0.8; } 100% { transform:scale(2);opacity:0; } }
              @keyframes sinyal_kesfet   { 0% { transform:scale(0.5);opacity:0.8; } 100% { transform:scale(2);opacity:0; } }
              .nokta-liste::-webkit-scrollbar { width: 4px; }
              .nokta-liste::-webkit-scrollbar-track { background: transparent; }
              .nokta-liste::-webkit-scrollbar-thumb {
                background: linear-gradient(to bottom, #a855f7, #7c3aed);
                border-radius: 4px;
                box-shadow: 0 0 8px rgba(168,85,247,0.8);
              }
            `}</style>

            {/* Sol liste */}
            <div
              className={`nokta-liste absolute top-0 left-0 bottom-0 flex-col gap-1 z-[999] p-3 overflow-y-auto ${isListOpen ? 'flex' : 'hidden'}`}
              style={{ maxWidth: '260px', paddingBottom: '12px', background: 'linear-gradient(to right, rgba(0,0,0,0.7) 60%, transparent)' }}
            >
              {filtrelenmis.map(nokta => {
                const stil = tipStil[nokta.tip]
                return (
                  <button
                    key={nokta.id}
                    onClick={() => noktaySec(nokta)}
                    className="text-left px-3 py-2.5 text-xs tracking-wider border transition-all backdrop-blur-sm flex items-center gap-2.5 shrink-0"
                    style={{
                      borderColor: secili?.id === nokta.id ? stil.renk : 'rgba(255,255,255,0.08)',
                      background: secili?.id === nokta.id ? `rgba(${stil.rgb},0.12)` : 'rgba(0,0,0,0.65)',
                      color: secili?.id === nokta.id ? 'white' : 'rgba(255,255,255,0.4)',
                      boxShadow: secili?.id === nokta.id ? `inset 0 0 12px rgba(${stil.rgb},0.1)` : 'none',
                    }}
                  >
                    <span style={{ color: stil.renk, fontSize: '14px' }}>{nokta.simge}</span>
                    <div className="flex flex-col gap-0.5">
                      <span>{nokta.isim}</span>
                      <span className="text-xs opacity-40 uppercase tracking-widest">{stil.etiket}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sağ panel */}
          {(secili || editingNokta) && (
            <div className="absolute inset-0 z-[1001] flex flex-col bg-black/80 backdrop-blur-md lg:static lg:w-96 lg:border-l lg:border-white/10 lg:shrink-0">

              {editingNokta ? (
                <div className="flex flex-col gap-4 p-6 overflow-y-auto">
                  <h2 className="text-white tracking-widest uppercase">
                    {editingNokta.id ? 'Noktayı Düzenle' : 'Yeni Nokta Ekle'}
                  </h2>
                  <input
                    value={editingNokta.isim || ''}
                    onChange={e => setEditingNokta({ ...editingNokta, isim: e.target.value })}
                    placeholder="İsim"
                    className="bg-black/30 border border-white/20 p-2 text-white"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number" step="any"
                      value={editingNokta.koordinat_lat || ''}
                      onChange={e => setEditingNokta({ ...editingNokta, koordinat_lat: parseFloat(e.target.value) || 0 })}
                      placeholder="Enlem (Lat)"
                      className="bg-black/30 border border-white/20 p-2 text-white"
                    />
                    <input
                      type="number" step="any"
                      value={editingNokta.koordinat_lng || ''}
                      onChange={e => setEditingNokta({ ...editingNokta, koordinat_lng: parseFloat(e.target.value) || 0 })}
                      placeholder="Boylam (Lng)"
                      className="bg-black/30 border border-white/20 p-2 text-white"
                    />
                  </div>
                  <select
                    value={editingNokta.tip || 'kesfet'}
                    onChange={e => setEditingNokta({ ...editingNokta, tip: e.target.value as Nokta['tip'] })}
                    className="bg-black/30 border border-white/20 p-2 text-white"
                  >
                    {Object.keys(tipStil).map(tip => (
                      <option key={tip} value={tip}>{tipStil[tip].etiket}</option>
                    ))}
                  </select>
                  <select
                    value={editingNokta.durum || 'uyku'}
                    onChange={e => setEditingNokta({ ...editingNokta, durum: e.target.value as Nokta['durum'] })}
                    className="bg-black/30 border border-white/20 p-2 text-white"
                  >
                    {Object.keys(durumEtiket).map(durum => (
                      <option key={durum} value={durum}>{durumEtiket[durum as keyof typeof durumEtiket]}</option>
                    ))}
                  </select>
                  <input
                    value={editingNokta.simge || ''}
                    onChange={e => setEditingNokta({ ...editingNokta, simge: e.target.value })}
                    placeholder="Simge (Emoji veya sembol)"
                    className="bg-black/30 border border-white/20 p-2 text-white"
                  />
                  <input
  value={editingNokta.gorsel_url || ''}
  onChange={e => setEditingNokta({ ...editingNokta, gorsel_url: e.target.value })}
  placeholder="Görsel URL (Supabase Storage)"
  className="bg-black/30 border border-white/20 p-2 text-white"
/>
                  <textarea
                    value={editingNokta.mitolojik_gecmis || ''}
                    onChange={e => setEditingNokta({ ...editingNokta, mitolojik_gecmis: e.target.value })}
                    placeholder="Mitolojik Geçmiş"
                    rows={5}
                    className="bg-black/30 border border-white/20 p-2 text-white w-full resize-y"
                  />
                  <textarea
                    value={editingNokta.fiziksel_gecmis || ''}
                    onChange={e => setEditingNokta({ ...editingNokta, fiziksel_gecmis: e.target.value })}
                    placeholder="Fiziksel Geçmiş"
                    rows={3}
                    className="bg-black/30 border border-white/20 p-2 text-white w-full resize-y"
                  />
                  <div className="flex gap-2 justify-end mt-4">
                    {editingNokta.id && (
                      <button
                        onClick={() => handleDelete(editingNokta.id!)}
                        disabled={isSaving}
                        className="border border-rose-500/50 text-rose-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        Sil
                      </button>
                      
                    )}
                    <button
                      onClick={() => setEditingNokta(null)}
                      disabled={isSaving}
                      className="border border-white/20 text-white/60 px-4 py-2 text-xs tracking-widest uppercase hover:bg-white/10"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      {isSaving ? '...' : 'Kaydet'}
                    </button>
                  </div>
                </div>

              ) : secili ? (
                <>
                  <div
                    className="p-6 border-b border-white/10 flex flex-col gap-3"
                    style={{ background: tipStil[secili.tip].bg }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-2 flex-1">
                        <span
                          className="text-xs tracking-widest uppercase flex items-center gap-2"
                          style={{ color: tipStil[secili.tip].renk }}
                        >
                          {secili.simge} {tipStil[secili.tip].etiket}
                        </span>
                        <h2 className="text-white text-base tracking-wider leading-snug">{secili.isim}</h2>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {profil?.is_admin && (
                          <button
                            onClick={() => { setEditingNokta(secili); setSecili(null) }}
                            className="text-cyan-400/60 hover:text-cyan-400 text-xs uppercase tracking-widest"
                          >
                            Düzenle
                          </button>
                        )}
                        <button
                          onClick={() => setSecili(null)}
                          className="text-white/20 hover:text-white/60 transition-all text-xl"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs tracking-widest uppercase px-2 py-1 border w-fit ${
                        secili.durum === 'aktif' ? 'text-emerald-400 border-emerald-400/30' :
                        secili.durum === 'kapali' ? 'text-white/20 border-white/10' :
                        'text-amber-400 border-amber-400/30'
                      }`}>
                        {durumEtiket[secili.durum]}
                      </span>
                      {secili.tip === 'gorev' && (() => {
                        const sayi = gorevKabulleri.filter(k => k.gorev_id === secili.id && k.durum === 'aktif').length
                        return sayi > 0 ? (
                          <span className="text-cyan-400/50 text-xs tracking-wider">{sayi} kullanıcı için aktif</span>
                        ) : null
                      })()}
                    </div>
                  </div>

                  <div className="flex border-b border-white/10">
                    {(['mitolojik', 'fiziksel'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-3 text-xs tracking-widest uppercase transition-all border-b ${
                          tab === t ? 'text-white border-white/40' : 'text-white/20 border-transparent hover:text-white/40'
                        }`}
                      >
                        {t === 'mitolojik' ? '✦ Mitolojik' : '◈ Fiziksel'}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto">
                    <p className="text-white/60 text-sm leading-relaxed tracking-wide">
                      {tab === 'mitolojik' ? secili.mitolojik_gecmis : secili.fiziksel_gecmis}
                    </p>
                  </div>

                  {secili.gorsel_url && (
                    <div className="px-6 pb-6 shrink-0">
                      <div className="relative overflow-hidden border border-white/10"
                        style={{ boxShadow: `inset 0 0 20px ${tipStil[secili.tip].renk}15` }}>
                        <div className="absolute inset-0 z-10"
                          style={{ background: `linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.6) 100%)` }} />
                        <img
                          src={secili.gorsel_url}
                          alt={secili.isim}
                          className="w-full object-cover"
                          style={{ maxHeight: '220px' }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 z-20 p-3">
                          <div className="w-8 h-px"
                            style={{ background: `linear-gradient(90deg, ${tipStil[secili.tip].renk}80, transparent)` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 border-t border-white/5 shrink-0">
                    <p className="text-white/15 text-xs tracking-wider text-center font-mono">
                      {secili.koordinat_lat.toFixed(4)}° K &nbsp;·&nbsp; {secili.koordinat_lng.toFixed(4)}° D
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}