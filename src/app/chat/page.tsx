'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type Kanal = {
  id: string
  isim: string
  aciklama: string
  tip: string
  min_rol: string
  simge: string
}

type Mesaj = {
  id: string
  kanal_id: string
  kullanici_id: string
  kullanici_email: string
  kullanici_rol: string
  karakter_adi: string
  icerik: string
  created_at: string
}

type PrivateMesaj = {
  id: string
  gonderen_id: string
  alici_id: string
  gonderen_email: string
  gonderen_karakter: string
  icerik: string
  okundu: boolean
  created_at: string
}

type Kullanici = {
  id: string
  email: string
  rol: string
  karakter_adi?: string
}

type KanalOkunmamis = {
  kanal_id: string
  sayi: number
}

const rolRenk: Record<string, string> = {
  kabileli: '#e879f9',
  oyun_arkadasi: '#22d3ee',
  aday: '#f59e0b',
  ziyaretci: '#6b7280',
}

const rolEtiket: Record<string, string> = {
  kabileli: '✦ Kabileli',
  oyun_arkadasi: 'Oyun Arkadaşı',
  aday: 'Aday',
  ziyaretci: 'Ziyaretçi',
}

export default function Chat() {
  const [kanallar, setKanallar] = useState<Kanal[]>([])
  const [aktifKanal, setAktifKanal] = useState<Kanal | null>(null)
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([])
  const [yeniMesaj, setYeniMesaj] = useState('')
  const [kullanici, setKullanici] = useState<Kullanici | null>(null)
  const [mod, setMod] = useState<'kanal' | 'private'>('kanal')
  const [privateHedef, setPrivateHedef] = useState<Kullanici | null>(null)
  const [privateMesajlar, setPrivateMesajlar] = useState<PrivateMesaj[]>([])
  const [ozelMesaj, setOzelMesaj] = useState('')
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([])
  const [okunmamis, setOkunmamis] = useState(0)
  const [gonderiyor, setGonderiyor] = useState(false)
  const mesajSonuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const [kanalOkunmamis, setKanalOkunmamis] = useState<KanalOkunmamis[]>([])

  useEffect(() => {
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/giris'; return }

      const { data: profil } = await supabase
        .from('profiles').select('rol, email').eq('id', user.id).single()

      const { data: karakter } = await supabase
        .from('karakterler').select('karakter_adi').eq('kullanici_id', user.id).single()

      setKullanici({
        id: user.id,
        email: profil?.email ?? user.email ?? '',
        rol: profil?.rol ?? 'ziyaretci',
        karakter_adi: karakter?.karakter_adi ?? undefined,
      })

      const { data: kanallarData } = await supabase
        .from('chat_kanallari').select('*').eq('aktif', true).order('created_at')
      setKanallar(kanallarData ?? [])

      // Kanal bazlı okunmamış — son görülen mesajı localStorage'da tut
const { data: sonMesajlar } = await supabase
  .from('chat_mesajlari')
  .select('kanal_id, id, created_at')
  .order('created_at', { ascending: false })

if (sonMesajlar) {
  const okunmamislar: KanalOkunmamis[] = []
  const kanalIds = [...new Set(sonMesajlar.map(m => m.kanal_id))]
  
  kanalIds.forEach(kanalId => {
    const sonGorulme = localStorage.getItem(`kanal_gorulme_${kanalId}`)
    const kanalMesajlari = sonMesajlar.filter(m => m.kanal_id === kanalId)
    
    if (!sonGorulme) {
      okunmamislar.push({ kanal_id: kanalId, sayi: kanalMesajlari.length })
    } else {
      const yeniMesajlar = kanalMesajlari.filter(m => 
        new Date(m.created_at) > new Date(sonGorulme) &&
        m.id !== kullanici?.id
      )
      if (yeniMesajlar.length > 0) {
        okunmamislar.push({ kanal_id: kanalId, sayi: yeniMesajlar.length })
      }
    }
  })
  setKanalOkunmamis(okunmamislar)
}
      // Okunmamış private mesaj sayısı
      const { count } = await supabase
        .from('private_mesajlar')
        .select('*', { count: 'exact', head: true })
        .eq('alici_id', user.id)
        .eq('okundu', false)
      setOkunmamis(count ?? 0)

      // Diğer kullanıcılar (private için)
      const { data: profillerData } = await supabase
        .from('profiles').select('id, email, rol').neq('id', user.id)
      const { data: karakterlerData } = await supabase
        .from('karakterler').select('kullanici_id, karakter_adi')

      const birlesik = (profillerData ?? []).map(p => ({
        ...p,
        karakter_adi: karakterlerData?.find(k => k.kullanici_id === p.id)?.karakter_adi
      }))
      setKullanicilar(birlesik)
    }
    yukle()
  }, [])

  // Kanal mesajlarını çek ve realtime abone ol
  useEffect(() => {
    if (!aktifKanal) return
    setMesajlar([])

    const fetchMesajlar = async () => {
      const { data } = await supabase
        .from('chat_mesajlari')
        .select('*')
        .eq('kanal_id', aktifKanal.id)
        .order('created_at', { ascending: true })
        .limit(100)
      setMesajlar(data ?? [])
    }
    fetchMesajlar()

    const kanal = supabase
      .channel(`chat:${aktifKanal.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_mesajlari',
        filter: `kanal_id=eq.${aktifKanal.id}`,
      }, (payload) => {
        setMesajlar(prev => [...prev, payload.new as Mesaj])
      })
      .subscribe()

    return () => { supabase.removeChannel(kanal) }
  }, [aktifKanal])

  // Private mesajlar
  useEffect(() => {
    if (!privateHedef || !kullanici) return
    setPrivateMesajlar([])

    const fetchPrivate = async () => {
      const { data } = await supabase
        .from('private_mesajlar')
        .select('*')
        .or(`and(gonderen_id.eq.${kullanici.id},alici_id.eq.${privateHedef.id}),and(gonderen_id.eq.${privateHedef.id},alici_id.eq.${kullanici.id})`)
        .order('created_at', { ascending: true })
        .limit(100)
      setPrivateMesajlar(data ?? [])

      // Okunmamışları okundu yap
      await supabase
        .from('private_mesajlar')
        .update({ okundu: true })
        .eq('gonderen_id', privateHedef.id)
        .eq('alici_id', kullanici.id)
        .eq('okundu', false)
    }
    fetchPrivate()

    const kanal = supabase
      .channel(`private:${kullanici.id}:${privateHedef.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'private_mesajlar',
      }, (payload) => {
        const m = payload.new as PrivateMesaj
        if (
          (m.gonderen_id === kullanici.id && m.alici_id === privateHedef.id) ||
          (m.gonderen_id === privateHedef.id && m.alici_id === kullanici.id)
        ) {
          setPrivateMesajlar(prev => [...prev, m])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(kanal) }
  }, [privateHedef, kullanici])

  // Scroll to bottom
  useEffect(() => {
    mesajSonuRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mesajlar, privateMesajlar])

  async function mesajGonder() {
    if (!yeniMesaj.trim() || !aktifKanal || !kullanici || gonderiyor) return
    setGonderiyor(true)
    await supabase.from('chat_mesajlari').insert({
      kanal_id: aktifKanal.id,
      kullanici_id: kullanici.id,
      kullanici_email: kullanici.email,
      kullanici_rol: kullanici.rol,
      karakter_adi: kullanici.karakter_adi ?? null,
      icerik: yeniMesaj.trim(),
    })
    setYeniMesaj('')
    setGonderiyor(false)
  }

  async function privateMesajGonder() {
    if (!ozelMesaj.trim() || !privateHedef || !kullanici || gonderiyor) return
    setGonderiyor(true)
    await supabase.from('private_mesajlar').insert({
      gonderen_id: kullanici.id,
      alici_id: privateHedef.id,
      gonderen_email: kullanici.email,
      gonderen_karakter: kullanici.karakter_adi ?? null,
      icerik: ozelMesaj.trim(),
    })
    setOzelMesaj('')
    setGonderiyor(false)
  }

  function kanalErisimi(kanal: Kanal): boolean {
    if (!kullanici) return false
    const sira = ['ziyaretci', 'aday', 'oyun_arkadasi', 'kabileli']
    return sira.indexOf(kullanici.rol) >= sira.indexOf(kanal.min_rol)
  }

  function zaman(tarih: string) {
    return new Date(tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  function tarih(tarih: string) {
    return new Date(tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
  }

  return (
    <main className="h-screen bg-black flex flex-col overflow-hidden">
      <div className="fixed inset-0 opacity-10"
        style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover' }} />
      <div className="fixed inset-0 bg-black/88" />
      <div className="fixed top-0 left-0 right-0 h-px z-30"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)' }} />

      <div className="relative z-10 flex h-full overflow-hidden">

        {/* SOL SIDEBAR */}
        <div className="w-64 shrink-0 flex flex-col border-r border-white/5 bg-black/40">

          {/* Başlık */}
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-fuchsia-400/40 text-xs tracking-[0.4em] uppercase mb-1">İletişim</p>
            <h1 className="text-white text-sm tracking-widest uppercase">Kabile Sesleri</h1>
          </div>

          {/* Kanallar */}
          <div className="flex flex-col gap-1 p-3 border-b border-white/5">
            <p className="text-white/20 text-xs tracking-widest uppercase px-2 py-1">Kanallar</p>
            {kanallar.map(kanal => {
              const erisim = kanalErisimi(kanal)
              return (
                <button
                  key={kanal.id}
                  onClick={() => { if (erisim) { setAktifKanal(kanal); setMod('kanal'); setPrivateHedef(null); localStorage.setItem(`kanal_gorulme_${kanal.id}`, new Date().toISOString())
setKanalOkunmamis(prev => prev.filter(k => k.kanal_id !== kanal.id))} }}
                  className="flex items-center gap-3 px-3 py-2.5 text-left transition-all rounded"
                  style={{
                    background: aktifKanal?.id === kanal.id ? 'rgba(168,85,247,0.15)' : 'transparent',
                    borderLeft: aktifKanal?.id === kanal.id ? '2px solid rgba(168,85,247,0.6)' : '2px solid transparent',
                    opacity: erisim ? 1 : 0.3,
                    cursor: erisim ? 'pointer' : 'not-allowed',
                  }}
                >
                  <span className="text-base">{kanal.simge}</span>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-white/70 text-xs tracking-wider truncate">{kanal.isim}</span>
                    <div className="flex items-center gap-2 min-w-0">
  <span className="text-white/70 text-xs tracking-wider truncate">{kanal.isim}</span>
  {(() => {
    const sayi = kanalOkunmamis.find(k => k.kanal_id === kanal.id)?.sayi
    return sayi && sayi > 0 ? (
      <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: '#a855f7', color: '#fff', fontSize: '9px', boxShadow: '0 0 6px rgba(168,85,247,0.7)' }}>
        {sayi > 9 ? '9+' : sayi}
      </span>
    ) : null
  })()}
</div>
                    <span className="text-white/20 text-xs truncate">{kanal.aciklama}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Private mesajlar */}
          <div className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-white/20 text-xs tracking-widest uppercase">Özel Mesajlar</p>
              {okunmamis > 0 && (
                <span className="text-xs bg-fuchsia-500/30 text-fuchsia-300 px-1.5 py-0.5 rounded">
                  {okunmamis}
                </span>
              )}
            </div>
            {kullanicilar.map(k => (
              <button
                key={k.id}
                onClick={() => { setPrivateHedef(k); setMod('private'); setAktifKanal(null) }}
                className="flex items-center gap-3 px-3 py-2 text-left transition-all rounded"
                style={{
                  background: privateHedef?.id === k.id ? 'rgba(34,211,238,0.1)' : 'transparent',
                  borderLeft: privateHedef?.id === k.id ? '2px solid rgba(34,211,238,0.5)' : '2px solid transparent',
                }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
                  style={{ background: `${rolRenk[k.rol]}20`, border: `1px solid ${rolRenk[k.rol]}40`, color: rolRenk[k.rol] }}>
                  {(k.karakter_adi ?? k.email)[0].toUpperCase()}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-white/60 text-xs truncate">{k.karakter_adi ?? k.email}</span>
                  <span className="text-xs" style={{ color: rolRenk[k.rol] + '80', fontSize: '10px' }}>
                    {rolEtiket[k.rol]}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Alt — portal'a dön */}
          <div className="px-5 py-3 border-t border-white/5">
            <Link href="/portal" className="text-white/15 text-xs tracking-widest uppercase hover:text-white/40 transition-all">
              ← Portal
            </Link>
          </div>
        </div>

        {/* SAĞ — Mesaj alanı */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Kanal başlığı */}
          {(aktifKanal || privateHedef) ? (
            <>
              <div className="px-6 py-4 border-b border-white/5 shrink-0 flex items-center gap-3">
                {aktifKanal ? (
                  <>
                    <span className="text-xl">{aktifKanal.simge}</span>
                    <div>
                      <h2 className="text-white text-sm tracking-widest uppercase">{aktifKanal.isim}</h2>
                      <p className="text-white/20 text-xs">{aktifKanal.aciklama}</p>
                    </div>
                  </>
                ) : privateHedef ? (
                  <>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ background: `${rolRenk[privateHedef.rol]}20`, border: `1px solid ${rolRenk[privateHedef.rol]}40`, color: rolRenk[privateHedef.rol] }}>
                      {(privateHedef.karakter_adi ?? privateHedef.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-white text-sm tracking-widest">{privateHedef.karakter_adi ?? privateHedef.email}</h2>
                      <p className="text-xs" style={{ color: rolRenk[privateHedef.rol] + '80' }}>{rolEtiket[privateHedef.rol]}</p>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Mesaj listesi */}
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(168,85,247,0.4) transparent' }}>

                {(mod === 'kanal' ? mesajlar : privateMesajlar).map((m, i) => {
                  const onceki = i > 0 ? (mod === 'kanal' ? mesajlar : privateMesajlar)[i - 1] : null
                  const benimMi = mod === 'kanal'
                    ? (m as Mesaj).kullanici_id === kullanici?.id
                    : (m as PrivateMesaj).gonderen_id === kullanici?.id

                  const gonderenAdi = mod === 'kanal'
                    ? ((m as Mesaj).karakter_adi || (m as Mesaj).kullanici_email)
                    : ((m as PrivateMesaj).gonderen_karakter || (m as PrivateMesaj).gonderen_email)

                  const gonderenRol = mod === 'kanal' ? (m as Mesaj).kullanici_rol : 'oyun_arkadasi'

                  const oncekiGonderen = onceki
                    ? mod === 'kanal'
                      ? (onceki as Mesaj).kullanici_id
                      : (onceki as PrivateMesaj).gonderen_id
                    : null

                  const suankiGonderen = mod === 'kanal'
                    ? (m as Mesaj).kullanici_id
                    : (m as PrivateMesaj).gonderen_id

                  const ayniGonderen = oncekiGonderen === suankiGonderen

                  // Tarih ayracı
                  const oncekiTarih = onceki ? tarih(onceki.created_at) : null
                  const buTarih = tarih(m.created_at)
                  const yeniGun = oncekiTarih !== buTarih

                  return (
                    <div key={m.id}>
                      {yeniGun && (
                        <div className="flex items-center gap-4 my-4">
                          <div className="flex-1 h-px bg-white/5" />
                          <span className="text-white/20 text-xs tracking-wider">{buTarih}</span>
                          <div className="flex-1 h-px bg-white/5" />
                        </div>
                      )}
                      <div className={`flex gap-3 ${benimMi ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        {!ayniGonderen && (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-1"
                            style={{
                              background: `${rolRenk[gonderenRol] ?? '#6b7280'}20`,
                              border: `1px solid ${rolRenk[gonderenRol] ?? '#6b7280'}40`,
                              color: rolRenk[gonderenRol] ?? '#6b7280',
                            }}>
                            {gonderenAdi[0]?.toUpperCase()}
                          </div>
                        )}
                        {ayniGonderen && <div className="w-7 shrink-0" />}

                        <div className={`flex flex-col gap-0.5 max-w-md ${benimMi ? 'items-end' : 'items-start'}`}>
                          {!ayniGonderen && (
                            <div className={`flex items-baseline gap-2 ${benimMi ? 'flex-row-reverse' : ''}`}>
                              <span className="text-xs font-medium" style={{ color: rolRenk[gonderenRol] ?? '#6b7280' }}>
                                {gonderenAdi}
                              </span>
                              <span className="text-white/15 text-xs">{zaman(m.created_at)}</span>
                            </div>
                          )}
                          <div
                            className="px-4 py-2.5 text-sm leading-relaxed max-w-full break-words"
                            style={{
                              background: benimMi
                                ? `rgba(168,85,247,0.15)`
                                : 'rgba(255,255,255,0.05)',
                              border: benimMi
                                ? '1px solid rgba(168,85,247,0.25)'
                                : '1px solid rgba(255,255,255,0.06)',
                              color: 'rgba(255,255,255,0.8)',
                              borderRadius: benimMi ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                            }}
                          >
                            {m.icerik}
                          </div>
                          {ayniGonderen && (
                            <span className="text-white/10 text-xs px-1">{zaman(m.created_at)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={mesajSonuRef} />
              </div>

              {/* Mesaj giriş alanı */}
              <div className="px-6 py-4 border-t border-white/5 shrink-0">
                <div className="flex items-end gap-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px' }}>
                  <textarea
                    value={mod === 'kanal' ? yeniMesaj : ozelMesaj}
                    onChange={e => mod === 'kanal' ? setYeniMesaj(e.target.value) : setOzelMesaj(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        mod === 'kanal' ? mesajGonder() : privateMesajGonder()
                      }
                    }}
                    placeholder={
                      mod === 'kanal'
                        ? `${aktifKanal?.isim} kanalına yaz...`
                        : `${privateHedef?.karakter_adi ?? privateHedef?.email}'e özel mesaj...`
                    }
                    rows={1}
                    className="flex-1 bg-transparent text-white/80 text-sm placeholder-white/20 resize-none focus:outline-none leading-relaxed"
                    style={{ maxHeight: '120px' }}
                  />
                  <button
                    onClick={mod === 'kanal' ? mesajGonder : privateMesajGonder}
                    disabled={gonderiyor || !(mod === 'kanal' ? yeniMesaj.trim() : ozelMesaj.trim())}
                    className="shrink-0 px-4 py-2 text-xs tracking-widest uppercase transition-all disabled:opacity-30"
                    style={{
                      border: '1px solid rgba(168,85,247,0.4)',
                      color: 'rgba(168,85,247,0.8)',
                      background: 'rgba(168,85,247,0.08)',
                    }}
                  >
                    {gonderiyor ? '...' : '→'}
                  </button>
                </div>
                <p className="text-white/10 text-xs mt-2 pl-1">Enter ile gönder · Shift+Enter yeni satır</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="text-5xl opacity-10">◈</span>
                <p className="text-white/20 text-sm tracking-wider">Bir kanal seç veya özel mesaj gönder.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}