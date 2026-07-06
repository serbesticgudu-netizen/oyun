'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
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

type KanalBildirim = {
  [kanalId: string]: number
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
  const [kanalBildirim, setKanalBildirim] = useState<KanalBildirim>({})
  const [gonderiyor, setGonderiyor] = useState(false)
  const mesajSonuRef = useRef<HTMLDivElement>(null)
  const aktifKanalRef = useRef<Kanal | null>(null)
  const kullaniciRef = useRef<Kullanici | null>(null)
  const supabase = createClient()
  const [sidebarAcik, setSidebarAcik] = useState(true)

  // ref'leri güncel tut
  useEffect(() => { aktifKanalRef.current = aktifKanal }, [aktifKanal])
  useEffect(() => { kullaniciRef.current = kullanici }, [kullanici])

  useEffect(() => {
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/giris'; return }

      const { data: profil } = await supabase
        .from('profiles').select('rol, email').eq('id', user.id).single()
      const { data: karakter } = await supabase
        .from('karakterler').select('karakter_adi').eq('kullanici_id', user.id).single()

      const k: Kullanici = {
        id: user.id,
        email: profil?.email ?? user.email ?? '',
        rol: profil?.rol ?? 'ziyaretci',
        karakter_adi: karakter?.karakter_adi ?? undefined,
      }
      setKullanici(k)
      kullaniciRef.current = k

      const { data: kanallarData } = await supabase
        .from('chat_kanallari').select('*').eq('aktif', true).order('created_at')
      setKanallar(kanallarData ?? [])

      const { count } = await supabase
        .from('private_mesajlar')
        .select('*', { count: 'exact', head: true })
        .eq('alici_id', user.id)
        .eq('okundu', false)
      setOkunmamis(count ?? 0)

      const { data: profillerData } = await supabase
        .from('profiles').select('id, email, rol').neq('id', user.id)
      const { data: karakterlerData } = await supabase
        .from('karakterler').select('kullanici_id, karakter_adi')

      setKullanicilar(
        (profillerData ?? []).map(p => ({
          ...p,
          karakter_adi: karakterlerData?.find(c => c.kullanici_id === p.id)?.karakter_adi
        }))
      )
    }
    yukle()
  }, [])

  // Global realtime — tüm kanalları dinle, aktif olmayan kanallara bildirim ver
  useEffect(() => {
    if (!kullanici) return

    const globalKanal = supabase
      .channel('global_mesajlar')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_mesajlari',
      }, (payload) => {
        const yeni = payload.new as Mesaj
        // Kendi mesajımız değilse ve aktif kanalda değilsek bildirim ver
        if (
          yeni.kullanici_id !== kullaniciRef.current?.id &&
          yeni.kanal_id !== aktifKanalRef.current?.id
        ) {
          setKanalBildirim(prev => ({
            ...prev,
            [yeni.kanal_id]: (prev[yeni.kanal_id] ?? 0) + 1
          }))
        }
        // Aktif kanaldaysa mesajı doğrudan ekle
        if (yeni.kanal_id === aktifKanalRef.current?.id) {
          setMesajlar(prev => {
            // Duplicate önleme
            if (prev.find(m => m.id === yeni.id)) return prev
            return [...prev, yeni]
          })
        }
      })
      .subscribe()

    // Private mesaj bildirimi
    const privateKanal = supabase
      .channel(`private_bildirim_${kullanici.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'private_mesajlar',
        filter: `alici_id=eq.${kullanici.id}`,
      }, (payload) => {
        const yeni = payload.new as PrivateMesaj
        // Aktif private konuşmada değilsek bildirim ver
        if (yeni.gonderen_id !== aktifKanalRef.current?.id) {
          setOkunmamis(prev => prev + 1)
        }
        // Aktif konuşmadaysak mesajı ekle
        setPrivateMesajlar(prev => {
          if (!prev.length) return prev
          if (prev.find(m => m.id === yeni.id)) return prev
          return [...prev, yeni]
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(globalKanal)
      supabase.removeChannel(privateKanal)
    }
  }, [kullanici])

  // Kanal değiştiğinde mesajları çek
  useEffect(() => {
    if (!aktifKanal) return

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
  }, [aktifKanal])

  // Private hedef değiştiğinde mesajları çek
  useEffect(() => {
    if (!privateHedef || !kullanici) return

    const fetchPrivate = async () => {
      const { data } = await supabase
        .from('private_mesajlar')
        .select('*')
        .or(`and(gonderen_id.eq.${kullanici.id},alici_id.eq.${privateHedef.id}),and(gonderen_id.eq.${privateHedef.id},alici_id.eq.${kullanici.id})`)
        .order('created_at', { ascending: true })
        .limit(100)
      setPrivateMesajlar(data ?? [])

      await supabase
        .from('private_mesajlar')
        .update({ okundu: true })
        .eq('gonderen_id', privateHedef.id)
        .eq('alici_id', kullanici.id)
        .eq('okundu', false)

      setOkunmamis(prev => Math.max(0, prev - 1))
    }
    fetchPrivate()
  }, [privateHedef, kullanici])

  // Scroll to bottom
  useEffect(() => {
    mesajSonuRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mesajlar, privateMesajlar])

  async function mesajGonder() {
    if (!yeniMesaj.trim() || !aktifKanal || !kullanici || gonderiyor) return
    setGonderiyor(true)
    const icerik = yeniMesaj.trim()
    setYeniMesaj('') // Önce temizle, sonra gönder — anlık his için

    const { data, error } = await supabase.from('chat_mesajlari').insert({
      kanal_id: aktifKanal.id,
      kullanici_id: kullanici.id,
      kullanici_email: kullanici.email,
      kullanici_rol: kullanici.rol,
      karakter_adi: kullanici.karakter_adi ?? null,
      icerik,
    }).select().single()

    // Realtime bazen geç gelebilir, insert sonucu gelirse hemen ekle
    if (data && !mesajlar.find(m => m.id === data.id)) {
      setMesajlar(prev => [...prev, data as Mesaj])
    }
    if (error) setYeniMesaj(icerik) // Hata olursa geri koy
    setGonderiyor(false)
  }

  async function privateMesajGonder() {
    if (!ozelMesaj.trim() || !privateHedef || !kullanici || gonderiyor) return
    setGonderiyor(true)
    const icerik = ozelMesaj.trim()
    setOzelMesaj('')

    const { data, error } = await supabase.from('private_mesajlar').insert({
      gonderen_id: kullanici.id,
      alici_id: privateHedef.id,
      gonderen_email: kullanici.email,
      gonderen_karakter: kullanici.karakter_adi ?? null,
      icerik,
    }).select().single()

    if (data && !privateMesajlar.find(m => m.id === data.id)) {
      setPrivateMesajlar(prev => [...prev, data as PrivateMesaj])
    }
    if (error) setOzelMesaj(icerik)
    setGonderiyor(false)
  }

function kanalSec(kanal: Kanal) {
  setAktifKanal(kanal)
  setMod('kanal')
  setPrivateHedef(null)
  setKanalBildirim(prev => ({ ...prev, [kanal.id]: 0 }))
  setSidebarAcik(false) // Mobilde sidebar'ı kapat
}

function privateSec(k: Kullanici) {
  setPrivateHedef(k);
  setMod('private');
  setAktifKanal(null);
  setSidebarAcik(false); // Mobilde sidebar'ı kapatır
}

  function kanalErisimi(kanal: Kanal): boolean {
    if (!kullanici) return false
    const sira = ['ziyaretci', 'aday', 'oyun_arkadasi', 'kabileli']
    return sira.indexOf(kullanici.rol) >= sira.indexOf(kanal.min_rol)
  }

  function zaman(t: string) {
    return new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }

  function tarihStr(t: string) {
    return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
  }

  const aktifMesajlar = mod === 'kanal' ? mesajlar : privateMesajlar

return (
    <main className="h-screen bg-black flex flex-col overflow-hidden relative">
      {/* Arka plan katmanları */}
      <div className="fixed inset-0 opacity-10"
        style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover' }} />
      <div className="fixed inset-0 bg-black/88" />
      <div className="fixed top-0 left-0 right-0 h-px z-30"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent)' }} />

      <div className="relative z-10 flex h-full overflow-hidden">
        
        {/* MOBİL ARKA PLAN KARARTMA (Sidebar açıkken arkaya tıklanırsa kapatır) */}
        {sidebarAcik && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
            onClick={() => setSidebarAcik(false)} 
          />
        )}

        {/* SOL SIDEBAR - Mobilde kayarak açılır, masaüstünde sabittir */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-black border-r border-white/5 transition-transform duration-300 transform
          ${sidebarAcik ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex md:w-64 md:shrink-0 flex flex-col bg-black/40
        `}>
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <p className="text-fuchsia-400/40 text-xs tracking-[0.4em] uppercase mb-1">İletişim</p>
              <h1 className="text-white text-sm tracking-widest uppercase">Kabile Sesleri</h1>
            </div>
            {/* Mobilde sidebarı kapatma butonu */}
            <button onClick={() => setSidebarAcik(false)} className="md:hidden text-white/20 text-2xl">×</button>
          </div>

          {/* Kanallar Listesi */}
          <div className="flex flex-col gap-1 p-3 border-b border-white/5 overflow-y-auto">
            <p className="text-white/20 text-xs tracking-widest uppercase px-2 py-1">Kanallar</p>
            {kanallar.map(kanal => {
              const erisim = kanalErisimi(kanal)
              const bildirim = kanalBildirim[kanal.id] ?? 0
              return (
                <button
                  key={kanal.id}
                  onClick={() => erisim && kanalSec(kanal)}
                  className="flex items-center gap-3 px-3 py-2.5 text-left transition-all rounded"
                  style={{
                    background: aktifKanal?.id === kanal.id ? 'rgba(168,85,247,0.15)' : 'transparent',
                    borderLeft: aktifKanal?.id === kanal.id ? '2px solid rgba(168,85,247,0.6)' : '2px solid transparent',
                    opacity: erisim ? 1 : 0.3,
                  }}
                >
                  <span className="text-base">{kanal.simge}</span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-white/70 text-xs tracking-wider truncate">{kanal.isim}</span>
                    {bildirim > 0 && (
                      <span className="shrink-0 min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 text-black font-bold"
                        style={{ background: '#a855f7', fontSize: '9px', boxShadow: '0 0 6px rgba(168,85,247,0.8)' }}>
                        {bildirim > 9 ? '9+' : bildirim}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Özel Mesajlar Listesi */}
          <div className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-white/20 text-xs tracking-widest uppercase">Özel Mesajlar</p>
              {okunmamis > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                  style={{ background: '#e879f9', color: '#000', fontSize: '9px', boxShadow: '0 0 6px rgba(232,121,249,0.7)' }}>
                  {okunmamis}
                </span>
              )}
            </div>
            {kullanicilar.map(k => (
              <button
                key={k.id}
                onClick={() => { setPrivateHedef(k); setMod('private'); setAktifKanal(null); setSidebarAcik(false); }}
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
                  <span style={{ color: `${rolRenk[k.rol]}80`, fontSize: '10px' }} className="text-xs">
                    {rolEtiket[k.rol]}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-white/5">
            <Link href="/portal" className="text-white/15 text-xs tracking-widest uppercase hover:text-white/40 transition-all">
              ← Portal
            </Link>
          </div>
        </div>

        {/* SAĞ ALAN (SOHBET PENCERESİ) */}
        <div className="flex-1 flex flex-col overflow-hidden w-full bg-black/20">
          
          {/* SOHBET BAŞLIĞI */}
          <div className="px-4 md:px-6 py-4 border-b border-white/5 shrink-0 flex items-center gap-3 bg-black/40">
            {/* Mobilde sidebarı açan Hamburger Menü */}
            <button 
              onClick={() => setSidebarAcik(true)}
              className="md:hidden p-2 -ml-2 text-fuchsia-400/60 hover:text-fuchsia-400"
            >
              <span className="text-2xl">☰</span>
            </button>

            {(aktifKanal || privateHedef) ? (
              <>
                {aktifKanal ? (
                  <>
                    <span className="text-xl shrink-0">{aktifKanal.simge}</span>
                    <div className="min-w-0">
                      <h2 className="text-white text-sm tracking-widest uppercase truncate">{aktifKanal.isim}</h2>
                      <p className="text-white/20 text-[10px] md:text-xs truncate">{aktifKanal.aciklama}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                      style={{ background: `${rolRenk[privateHedef!.rol]}20`, border: `1px solid ${rolRenk[privateHedef!.rol]}40`, color: rolRenk[privateHedef!.rol] }}>
                      {(privateHedef!.karakter_adi ?? privateHedef!.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-white text-sm tracking-widest truncate">{privateHedef!.karakter_adi ?? privateHedef!.email}</h2>
                      <p className="text-[10px] md:text-xs truncate" style={{ color: `${rolRenk[privateHedef!.rol]}80` }}>{rolEtiket[privateHedef!.rol]}</p>
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-white/20 text-xs tracking-[0.2em] uppercase">Bir kanal seçin</p>
            )}
          </div>

          {/* MESAJLAR ALANI */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-2"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(168,85,247,0.4) transparent' }}>
            {(aktifKanal || privateHedef) ? (
              aktifMesajlar.map((m, i) => {
                const onceki = i > 0 ? aktifMesajlar[i - 1] : null
                const benimMi = mod === 'kanal'
                  ? (m as Mesaj).kullanici_id === kullanici?.id
                  : (m as PrivateMesaj).gonderen_id === kullanici?.id

                const gonderenAdi = mod === 'kanal'
                  ? ((m as Mesaj).karakter_adi || (m as Mesaj).kullanici_email)
                  : ((m as PrivateMesaj).gonderen_karakter || (m as PrivateMesaj).gonderen_email)

                const gonderenRol = mod === 'kanal' ? (m as Mesaj).kullanici_rol : 'oyun_arkadasi'
                const suankiGonderen = mod === 'kanal' ? (m as Mesaj).kullanici_id : (m as PrivateMesaj).gonderen_id
                const oncekiGonderen = onceki ? (mod === 'kanal' ? (onceki as Mesaj).kullanici_id : (onceki as PrivateMesaj).gonderen_id) : null
                const ayniGonderen = oncekiGonderen === suankiGonderen
                const buTarih = tarihStr(m.created_at)
                const oncekiTarih = onceki ? tarihStr(onceki.created_at) : null
                const yeniGun = oncekiTarih !== buTarih

                return (
                  <div key={m.id}>
                    {yeniGun && (
                      <div className="flex items-center gap-4 my-4">
                        <div className="flex-1 h-px bg-white/5" />
                        <span className="text-white/20 text-[10px] tracking-widest uppercase">{buTarih}</span>
                        <div className="flex-1 h-px bg-white/5" />
                      </div>
                    )}
                    <div className={`flex gap-2 md:gap-3 ${benimMi ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!ayniGonderen ? (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-1"
                          style={{ background: `${rolRenk[gonderenRol] ?? '#6b7280'}20`, border: `1px solid ${rolRenk[gonderenRol] ?? '#6b7280'}40`, color: rolRenk[gonderenRol] ?? '#6b7280' }}>
                          {gonderenAdi?.[0]?.toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-7 shrink-0" />
                      )}

                      <div className={`flex flex-col gap-0.5 max-w-[85%] md:max-w-md ${benimMi ? 'items-end' : 'items-start'}`}>
                        {!ayniGonderen && (
                          <div className={`flex items-baseline gap-2 mb-0.5 ${benimMi ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[10px] md:text-xs font-medium" style={{ color: rolRenk[gonderenRol] ?? '#6b7280' }}>
                              {gonderenAdi}
                            </span>
                            <span className="text-white/15 text-[9px]">{zaman(m.created_at)}</span>
                          </div>
                        )}
                        <div className="px-3 md:px-4 py-2 text-sm leading-relaxed break-words"
                          style={{
                            background: benimMi ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.05)',
                            border: benimMi ? '1px solid rgba(168,85,247,0.2)' : '1px solid rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.8)',
                            borderRadius: benimMi ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          }}>
                          {m.icerik}
                        </div>
                        {ayniGonderen && (
                          <span className="text-white/10 text-[9px] mt-0.5">{zaman(m.created_at)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex-1 flex items-center justify-center opacity-20">
                <div className="text-center">
                  <span className="text-4xl mb-4 block">◈</span>
                  <p className="text-xs tracking-widest uppercase">Bir bağlantı noktası seçin</p>
                </div>
              </div>
            )}
            <div ref={mesajSonuRef} />
          </div>

          {/* MESAJ YAZMA ALANI */}
          {(aktifKanal || privateHedef) && (
            <div className="px-4 md:px-6 py-4 border-t border-white/5 bg-black/60 shrink-0">
              <div className="flex items-end gap-2 md:gap-3 bg-white/[0.03] border border-white/10 rounded-lg p-2 md:p-3">
                <textarea
                  value={mod === 'kanal' ? yeniMesaj : ozelMesaj}
                  onChange={e => mod === 'kanal' ? setYeniMesaj(e.target.value) : setOzelMesaj(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      mod === 'kanal' ? mesajGonder() : privateMesajGonder()
                    }
                  }}
                  placeholder="Mesajınızı yazın..."
                  rows={1}
                  className="flex-1 bg-transparent text-white/80 text-sm placeholder-white/20 resize-none focus:outline-none py-1"
                  style={{ maxHeight: '120px' }}
                />
                <button
                  onClick={mod === 'kanal' ? mesajGonder : privateMesajGonder}
                  disabled={gonderiyor || !(mod === 'kanal' ? yeniMesaj.trim() : ozelMesaj.trim())}
                  className="shrink-0 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center transition-all disabled:opacity-20"
                  style={{ border: '1px solid rgba(168,85,247,0.4)', color: 'rgba(168,85,247,0.8)', background: 'rgba(168,85,247,0.1)' }}
                >
                  {gonderiyor ? '...' : '→'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}