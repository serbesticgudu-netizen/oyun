'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Kullanici = {
  id: string
  email: string
  rol: string
  created_at: string
}

type Karakter = {
  id: string
  kullanici_id: string
  karakter_adi: string
  tur: string
  koken: string
  koken_hikayesi: string
  gucler: string
  zayifliklar: string
  motivasyon: string
  olusturma_yontemi: string
  test_cevaplari: Record<number, string>
  durum: string
  iletisim_tercihi: string
  telefon: string
  created_at: string
  gorsel_url: string | null
}

type GorevKabulu = {
  kullanici_id: string
  gorev_id: string
  durum: string
}

type Gorev = {
  id: string
  isim: string
  tip: string
  durum: string
  mitolojik_gecmis: string
  fiziksel_gecmis: string
  simge: string
  koordinat_lat: number
  koordinat_lng: number
}

type Duyuru = {
  id: string
  baslik: string
  icerik: string
  tur: string
  gorsel_url: string | null
  yayin_tarihi: string
}

type MagazaUrunu = {
  id: string
  isim: string
  aciklama: string
  fiyat: number
  tip: string
  gorsel_url: string | null
  stok: number
  aktif: boolean
  sira: number
}

type Siparis = {
  id: string
  urun_isim: string
  fiyat: number
  miktar: number
  ad_soyad: string
  email: string
  telefon: string
  adres: string
  notlar: string
  durum: string
  created_at: string
}

const rolRenkleri: Record<string, string> = {
  ziyaretci: 'text-white/30 border-white/20',
  aday: 'text-amber-400 border-amber-400/30',
  oyun_arkadasi: 'text-cyan-400 border-cyan-400/30',
  kabileli: 'text-violet-400 border-violet-400/30',
}

const durumRenkleri: Record<string, string> = {
  beklemede: 'text-amber-400 border-amber-400/30',
  hazirlaniyor: 'text-cyan-400 border-cyan-400/30',
  tamamlandi: 'text-emerald-400 border-emerald-400/30',
}

type Tab = 'kullanicilar' | 'karakterler' | 'gorevler' | 'duyurular' | 'magaza' | 'siparisler'

const tablar: { key: Tab; label: string }[] = [
  { key: 'kullanicilar', label: 'Kullanıcılar' },
  { key: 'karakterler', label: 'Karakterler' },
  { key: 'gorevler', label: 'Görevler & Noktalar' },
  { key: 'duyurular', label: 'Duyurular' },
  { key: 'magaza', label: 'Mağaza' },
  { key: 'siparisler', label: 'Siparişler' },
]

export default function Admin() {
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([])
  const [karakterler, setKarakterler] = useState<Karakter[]>([])
  const [gorevKabulleri, setGorevKabulleri] = useState<GorevKabulu[]>([])
  const [gorevler, setGorevler] = useState<Gorev[]>([])
  const [duyurular, setDuyurular] = useState<Duyuru[]>([])
  const [magaza, setMagaza] = useState<MagazaUrunu[]>([])
  const [siparisler, setSiparisler] = useState<Siparis[]>([])
  const [aktifTab, setAktifTab] = useState<Tab>('kullanicilar')
  const [seciliKarakter, setSeciliKarakter] = useState<Karakter | null>(null)
  const [editedGorselUrl, setEditedGorselUrl] = useState<string | null>('')
  const [isSavingGorsel, setIsSavingGorsel] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [editNokta, setEditNokta] = useState<Partial<Gorev> | null>(null)
  const [editDuyuru, setEditDuyuru] = useState<Partial<Duyuru> | null>(null)
  const [editUrun, setEditUrun] = useState<Partial<MagazaUrunu> | null>(null)
  const [kayıtYapılıyor, setKayıtYapılıyor] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (seciliKarakter) setEditedGorselUrl(seciliKarakter.gorsel_url)
  }, [seciliKarakter])

  useEffect(() => {
    const supabase = createClient()
    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/giris'); return }
      const { data: profil } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profil?.is_admin) { router.push('/portal'); return }

      const [k, kar, gor, gk, duy, mag, sip] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('karakterler').select('*').order('created_at', { ascending: false }),
        supabase.from('gecit_noktalari').select('*').order('created_at', { ascending: false }),
        supabase.from('gorev_kabulleri').select('*'),
        supabase.from('duyurular').select('*').order('yayin_tarihi', { ascending: false }),
        supabase.from('magaza_urunleri').select('*').order('sira'),
        supabase.from('siparisler').select('*').order('created_at', { ascending: false }),
      ])

      setKullanicilar(k.data ?? [])
      setKarakterler(kar.data ?? [])
      setGorevler(gor.data ?? [])
      setGorevKabulleri(gk.data ?? [])
      setDuyurular(duy.data ?? [])
      setMagaza(mag.data ?? [])
      setSiparisler(sip.data ?? [])
      setYukleniyor(false)
    }
    yukle()
  }, [router])

  async function rolGuncelle(id: string, yeniRol: string) {
    const supabase = createClient()
    await supabase.from('profiles').update({ rol: yeniRol }).eq('id', id)
    setKullanicilar(prev => prev.map(k => k.id === id ? { ...k, rol: yeniRol } : k))
  }

  async function durumGuncelle(id: string, yeniDurum: string) {
    const supabase = createClient()
    await supabase.from('karakterler').update({ durum: yeniDurum }).eq('id', id)
    setKarakterler(prev => prev.map(k => k.id === id ? { ...k, durum: yeniDurum } : k))
    if (seciliKarakter?.id === id) setSeciliKarakter(prev => prev ? { ...prev, durum: yeniDurum } : null)
  }

  async function gorselUrlGuncelle() {
    if (!seciliKarakter) return
    setIsSavingGorsel(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('karakterler').update({ gorsel_url: editedGorselUrl }).eq('id', seciliKarakter.id).select().single()
    if (error) alert('Hata: ' + error.message)
    else if (data) {
      setKarakterler(prev => prev.map(k => k.id === data.id ? data as Karakter : k))
      setSeciliKarakter(data as Karakter)
    }
    setIsSavingGorsel(false)
  }

  async function gorevDurumGuncelle(kullanici_id: string, gorev_id: string, yeniDurum: string) {
    const supabase = createClient()
    const { data, error } = await supabase.from('gorev_kabulleri').update({ durum: yeniDurum }).match({ kullanici_id, gorev_id }).select().single()
    if (error) alert('Hata: ' + error.message)
    else if (data) setGorevKabulleri(prev => prev.map(k => (k.kullanici_id === kullanici_id && k.gorev_id === gorev_id) ? data as GorevKabulu : k))
  }

  async function noktaKaydet() {
    if (!editNokta) return
    setKayıtYapılıyor(true)
    const supabase = createClient()
    const { data, error } = editNokta.id
      ? await supabase.from('gecit_noktalari').update(editNokta).eq('id', editNokta.id).select().single()
      : await supabase.from('gecit_noktalari').insert(editNokta).select().single()
    if (error) alert('Hata: ' + error.message)
    else if (data) {
      setGorevler(prev => editNokta.id ? prev.map(g => g.id === data.id ? data as Gorev : g) : [...prev, data as Gorev])
      setEditNokta(null)
    }
    setKayıtYapılıyor(false)
  }

  async function noktaSil(id: string) {
    if (!confirm('Silinsin mi?')) return
    const supabase = createClient()
    await supabase.from('gecit_noktalari').delete().eq('id', id)
    setGorevler(prev => prev.filter(g => g.id !== id))
  }

  async function duyuruKaydet() {
    if (!editDuyuru) return
    setKayıtYapılıyor(true)
    const supabase = createClient()
    const { data, error } = editDuyuru.id
      ? await supabase.from('duyurular').update(editDuyuru).eq('id', editDuyuru.id).select().single()
      : await supabase.from('duyurular').insert(editDuyuru).select().single()
    if (error) alert('Hata: ' + error.message)
    else if (data) {
      setDuyurular(prev => editDuyuru.id ? prev.map(d => d.id === data.id ? data as Duyuru : d) : [data as Duyuru, ...prev])
      setEditDuyuru(null)
    }
    setKayıtYapılıyor(false)
  }

  async function duyuruSil(id: string) {
    if (!confirm('Silinsin mi?')) return
    const supabase = createClient()
    await supabase.from('duyurular').delete().eq('id', id)
    setDuyurular(prev => prev.filter(d => d.id !== id))
  }

  async function urunKaydet() {
    if (!editUrun) return
    setKayıtYapılıyor(true)
    const supabase = createClient()
    const { data, error } = editUrun.id
      ? await supabase.from('magaza_urunleri').update(editUrun).eq('id', editUrun.id).select().single()
      : await supabase.from('magaza_urunleri').insert(editUrun).select().single()
    if (error) alert('Hata: ' + error.message)
    else if (data) {
      setMagaza(prev => editUrun.id ? prev.map(u => u.id === data.id ? data as MagazaUrunu : u) : [...prev, data as MagazaUrunu])
      setEditUrun(null)
    }
    setKayıtYapılıyor(false)
  }

  async function urunSil(id: string) {
    if (!confirm('Silinsin mi?')) return
    const supabase = createClient()
    await supabase.from('magaza_urunleri').delete().eq('id', id)
    setMagaza(prev => prev.filter(u => u.id !== id))
  }

  async function siparisDurumGuncelle(id: string, yeniDurum: string) {
    const supabase = createClient()
    await supabase.from('siparisler').update({ durum: yeniDurum }).eq('id', id)
    setSiparisler(prev => prev.map(s => s.id === id ? { ...s, durum: yeniDurum } : s))
  }

  const inputClass = 'bg-black/30 border border-white/20 p-2 text-white/80 text-xs w-full focus:outline-none focus:border-white/40'
  const labelClass = 'text-white/30 text-xs tracking-widest uppercase'

  if (yukleniyor) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/20 text-xs tracking-widest uppercase">Yükleniyor...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col gap-6 md:gap-8">

        {/* Başlık */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex flex-col gap-1">
            <p className="text-white/20 text-xs tracking-[0.4em] uppercase">Theia Kabilesi</p>
            <h1 className="text-white text-xl md:text-2xl tracking-widest uppercase">Yönetim Paneli</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/20 text-xs hidden md:block">{kullanicilar.length} kullanıcı · {karakterler.length} karakter</span>
            <Link href="/portal" className="border border-white/10 text-white/30 px-4 py-2 text-xs tracking-widest uppercase hover:border-white/30 hover:text-white/60 transition-all">
              ← Portal
            </Link>
          </div>
        </div>

        {/* Sekmeler — yatay scroll mobilde */}
        <div className="flex gap-1 md:gap-2 overflow-x-auto pb-1">
          {tablar.map(tab => (
            <button key={tab.key} onClick={() => setAktifTab(tab.key)}
              className={`px-3 md:px-6 py-2 md:py-3 text-xs tracking-widest uppercase border transition-all whitespace-nowrap shrink-0 ${aktifTab === tab.key ? 'border-white/40 text-white bg-white/10' : 'border-white/10 text-white/30 hover:border-white/20'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* KULLANICILAR */}
        {aktifTab === 'kullanicilar' && (
          <div className="flex flex-col gap-2">
            {kullanicilar.map(k => (
              <div key={k.id} className="border border-white/10 bg-white/5 px-4 md:px-6 py-4 flex flex-wrap items-center gap-3 md:gap-6">
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-white/70 text-sm truncate">{k.email}</span>
                  <span className="text-white/20 text-xs">{new Date(k.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
                <select
                  value={k.rol}
                  onChange={e => rolGuncelle(k.id, e.target.value)}
                  className="bg-black border border-white/20 text-white/60 text-xs px-3 py-2 focus:outline-none shrink-0"
                >
                  <option value="ziyaretci">Ziyaretçi</option>
                  <option value="aday">Aday</option>
                  <option value="oyun_arkadasi">Oyun Arkadaşı</option>
                  <option value="kabileli">Kabileli</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {/* KARAKTERLER */}
        {aktifTab === 'karakterler' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              {karakterler.map(k => {
                const sahip = kullanicilar.find(u => u.id === k.kullanici_id)
                return (
                  <button key={k.id} onClick={() => setSeciliKarakter(k)}
                    className={`border text-left px-4 md:px-6 py-4 flex items-center gap-4 transition-all ${seciliKarakter?.id === k.id ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <span className="text-white/70 text-sm truncate">{k.karakter_adi || 'İsimsiz'} <span className="text-white/20 text-xs">— {k.olusturma_yontemi === 'test' ? 'Test' : 'Form'}</span></span>
                      <span className="text-white/30 text-xs truncate">{sahip?.email}</span>
                    </div>
                    <span className={`text-xs tracking-widest uppercase px-2 py-1 border shrink-0 ${durumRenkleri[k.durum]}`}>{k.durum}</span>
                  </button>
                )
              })}
            </div>

            {seciliKarakter && (() => {
              const kullaniciGorevleri = gorevKabulleri.filter(k => k.kullanici_id === seciliKarakter.kullanici_id)
              return (
                <div className="border border-white/10 bg-white/5 p-6 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-white tracking-widest uppercase truncate">{seciliKarakter.karakter_adi || 'İsimsiz'}</h2>
                    <select value={seciliKarakter.durum} onChange={e => durumGuncelle(seciliKarakter.id, e.target.value)}
                      className="bg-black border border-white/20 text-white/60 text-xs px-3 py-2 focus:outline-none shrink-0">
                      <option value="beklemede">Beklemede</option>
                      <option value="hazirlaniyor">Hazırlanıyor</option>
                      <option value="tamamlandi">Tamamlandı</option>
                    </select>
                  </div>

                  {seciliKarakter.gorsel_url && (
                    <img src={seciliKarakter.gorsel_url} alt={seciliKarakter.karakter_adi} className="w-full max-h-60 object-contain border border-white/10" />
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>Görsel URL</label>
                    <div className="flex gap-2">
                      <input value={editedGorselUrl || ''} onChange={e => setEditedGorselUrl(e.target.value)} placeholder="https://..." className={`${inputClass} flex-1`} />
                      <button onClick={gorselUrlGuncelle} disabled={isSavingGorsel || editedGorselUrl === seciliKarakter.gorsel_url}
                        className="border border-emerald-500/50 text-emerald-400/80 px-3 py-1 text-xs uppercase hover:bg-emerald-500/10 disabled:opacity-50 shrink-0">
                        {isSavingGorsel ? '...' : 'Kaydet'}
                      </button>
                    </div>
                  </div>

                  <div className="w-full h-px bg-white/10" />

                  {kullaniciGorevleri.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className={labelClass}>Görevler</span>
                      {kullaniciGorevleri.map(kabul => {
                        const gorev = gorevler.find(g => g.id === kabul.gorev_id)
                        if (!gorev) return null
                        return (
                          <div key={kabul.gorev_id} className="flex items-center justify-between gap-2">
                            <span className="text-white/60 text-xs truncate">{gorev.isim}</span>
                            <select value={kabul.durum} onChange={e => gorevDurumGuncelle(seciliKarakter.kullanici_id, kabul.gorev_id, e.target.value)}
                              className="bg-black border border-white/20 text-white/60 text-xs px-2 py-1 focus:outline-none shrink-0">
                              <option value="aktif">Aktif</option>
                              <option value="tamamlandi">Tamamlandı</option>
                            </select>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {seciliKarakter.olusturma_yontemi === 'form' && (
                    <div className="flex flex-col gap-3">
                      {[['Tür', seciliKarakter.tur], ['Köken', seciliKarakter.koken], ['Köken Hikayesi', seciliKarakter.koken_hikayesi], ['Güçler', seciliKarakter.gucler], ['Zayıflıklar', seciliKarakter.zayifliklar], ['Motivasyon', seciliKarakter.motivasyon]].filter(([, v]) => v).map(([label, value]) => (
                        <div key={label as string} className="flex flex-col gap-1">
                          <span className={labelClass}>{label}</span>
                          <p className="text-white/60 text-xs leading-relaxed">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {seciliKarakter.olusturma_yontemi === 'test' && seciliKarakter.test_cevaplari && (
                    <div className="flex flex-col gap-2">
                      <span className={labelClass}>Test Cevapları</span>
                      {Object.entries(seciliKarakter.test_cevaplari).map(([soru, cevap]) => (
                        <div key={soru} className="border-l border-white/10 pl-3">
                          <span className="text-white/20 text-xs block">Soru {soru}</span>
                          <span className="text-white/60 text-xs">{cevap}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* GÖREVLER & NOKTALAR */}
        {aktifTab === 'gorevler' && (
          <div className="flex flex-col gap-4">
            <button onClick={() => setEditNokta({ tip: 'kesfet', durum: 'uyku', simge: '✦', koordinat_lat: 38.2, koordinat_lng: 27.2 })}
              className="border border-emerald-500/30 text-emerald-400/70 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10 transition-all self-start">
              + Yeni Nokta
            </button>

            <div className="flex flex-col gap-2">
              {gorevler.map(g => (
                <div key={g.id} className="border border-white/10 bg-white/5 px-4 py-3 flex flex-wrap items-center gap-3">
                  <span className="text-lg shrink-0">{g.simge}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-white/70 text-sm truncate block">{g.isim}</span>
                    <span className="text-white/30 text-xs">{g.tip} · {g.durum}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditNokta(g)} className="text-cyan-400/60 hover:text-cyan-400 text-xs uppercase tracking-widest">Düzenle</button>
                    <button onClick={() => noktaSil(g.id)} className="text-rose-400/60 hover:text-rose-400 text-xs uppercase tracking-widest">Sil</button>
                  </div>
                </div>
              ))}
            </div>

            {editNokta && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setEditNokta(null)}>
                <div className="w-full max-w-lg bg-black border border-white/20 p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <h3 className="text-white tracking-widest uppercase">{editNokta.id ? 'Noktayı Düzenle' : 'Yeni Nokta'}</h3>
                  <input value={editNokta.isim || ''} onChange={e => setEditNokta({ ...editNokta, isim: e.target.value })} placeholder="İsim" className={inputClass} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" step="any" value={editNokta.koordinat_lat || ''} onChange={e => setEditNokta({ ...editNokta, koordinat_lat: parseFloat(e.target.value) })} placeholder="Enlem" className={inputClass} />
                    <input type="number" step="any" value={editNokta.koordinat_lng || ''} onChange={e => setEditNokta({ ...editNokta, koordinat_lng: parseFloat(e.target.value) })} placeholder="Boylam" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <select value={editNokta.tip || 'kesfet'} onChange={e => setEditNokta({ ...editNokta, tip: e.target.value })} className={inputClass}>
                      {['gecit', 'gorev', 'etkinlik', 'tehlike', 'kesfet'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={editNokta.durum || 'uyku'} onChange={e => setEditNokta({ ...editNokta, durum: e.target.value })} className={inputClass}>
                      {['aktif', 'uyku', 'kapali'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input value={editNokta.simge || ''} onChange={e => setEditNokta({ ...editNokta, simge: e.target.value })} placeholder="Simge" className={inputClass} />
                  </div>
                  <textarea value={editNokta.mitolojik_gecmis || ''} onChange={e => setEditNokta({ ...editNokta, mitolojik_gecmis: e.target.value })} placeholder="Mitolojik geçmiş" rows={4} className={inputClass} />
                  <textarea value={editNokta.fiziksel_gecmis || ''} onChange={e => setEditNokta({ ...editNokta, fiziksel_gecmis: e.target.value })} placeholder="Fiziksel geçmiş" rows={3} className={inputClass} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditNokta(null)} className="border border-white/20 text-white/50 px-4 py-2 text-xs uppercase hover:bg-white/10">İptal</button>
                    <button onClick={noktaKaydet} disabled={kayıtYapılıyor} className="border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs uppercase hover:bg-emerald-500/10 disabled:opacity-50">
                      {kayıtYapılıyor ? '...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DUYURULAR */}
        {aktifTab === 'duyurular' && (
          <div className="flex flex-col gap-4">
            <button onClick={() => setEditDuyuru({ tur: 'duyuru', yayin_tarihi: new Date().toISOString() })}
              className="border border-emerald-500/30 text-emerald-400/70 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10 transition-all self-start">
              + Yeni Duyuru
            </button>

            <div className="flex flex-col gap-2">
              {duyurular.map(d => (
                <div key={d.id} className="border border-white/10 bg-white/5 px-4 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-white/70 text-sm truncate block">{d.baslik}</span>
                    <span className="text-white/30 text-xs">{d.tur} · {new Date(d.yayin_tarihi).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditDuyuru(d)} className="text-cyan-400/60 hover:text-cyan-400 text-xs uppercase tracking-widest">Düzenle</button>
                    <button onClick={() => duyuruSil(d.id)} className="text-rose-400/60 hover:text-rose-400 text-xs uppercase tracking-widest">Sil</button>
                  </div>
                </div>
              ))}
            </div>

            {editDuyuru && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setEditDuyuru(null)}>
                <div className="w-full max-w-lg bg-black border border-white/20 p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <h3 className="text-white tracking-widest uppercase">{editDuyuru.id ? 'Duyuruyu Düzenle' : 'Yeni Duyuru'}</h3>
                  <input value={editDuyuru.baslik || ''} onChange={e => setEditDuyuru({ ...editDuyuru, baslik: e.target.value })} placeholder="Başlık" className={inputClass} />
                  <select value={editDuyuru.tur || 'duyuru'} onChange={e => setEditDuyuru({ ...editDuyuru, tur: e.target.value })} className={inputClass}>
                    {['duyuru', 'etkinlik', 'hikaye', 'gorsel'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input value={editDuyuru.gorsel_url || ''} onChange={e => setEditDuyuru({ ...editDuyuru, gorsel_url: e.target.value })} placeholder="Görsel URL" className={inputClass} />
                  <textarea value={editDuyuru.icerik || ''} onChange={e => setEditDuyuru({ ...editDuyuru, icerik: e.target.value })} placeholder="İçerik" rows={6} className={inputClass} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditDuyuru(null)} className="border border-white/20 text-white/50 px-4 py-2 text-xs uppercase hover:bg-white/10">İptal</button>
                    <button onClick={duyuruKaydet} disabled={kayıtYapılıyor} className="border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs uppercase hover:bg-emerald-500/10 disabled:opacity-50">
                      {kayıtYapılıyor ? '...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MAĞAZA */}
        {aktifTab === 'magaza' && (
          <div className="flex flex-col gap-4">
            <button onClick={() => setEditUrun({ tip: 'fiziksel', aktif: true, stok: -1, sira: magaza.length + 1 })}
              className="border border-emerald-500/30 text-emerald-400/70 px-4 py-2 text-xs tracking-widest uppercase hover:bg-emerald-500/10 transition-all self-start">
              + Yeni Ürün
            </button>

            <div className="flex flex-col gap-2">
              {magaza.map(u => (
                <div key={u.id} className="border border-white/10 bg-white/5 px-4 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-white/70 text-sm truncate block">{u.isim}</span>
                    <span className="text-white/30 text-xs">{u.tip} · {u.fiyat} ₺ · {u.aktif ? 'Aktif' : 'Pasif'}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditUrun(u)} className="text-cyan-400/60 hover:text-cyan-400 text-xs uppercase tracking-widest">Düzenle</button>
                    <button onClick={() => urunSil(u.id)} className="text-rose-400/60 hover:text-rose-400 text-xs uppercase tracking-widest">Sil</button>
                  </div>
                </div>
              ))}
            </div>

            {editUrun && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setEditUrun(null)}>
                <div className="w-full max-w-lg bg-black border border-white/20 p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <h3 className="text-white tracking-widest uppercase">{editUrun.id ? 'Ürünü Düzenle' : 'Yeni Ürün'}</h3>
                  <input value={editUrun.isim || ''} onChange={e => setEditUrun({ ...editUrun, isim: e.target.value })} placeholder="İsim" className={inputClass} />
                  <textarea value={editUrun.aciklama || ''} onChange={e => setEditUrun({ ...editUrun, aciklama: e.target.value })} placeholder="Açıklama" rows={3} className={inputClass} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" value={editUrun.fiyat || ''} onChange={e => setEditUrun({ ...editUrun, fiyat: parseFloat(e.target.value) })} placeholder="Fiyat (₺)" className={inputClass} />
                    <input type="number" value={editUrun.sira || ''} onChange={e => setEditUrun({ ...editUrun, sira: parseInt(e.target.value) })} placeholder="Sıra" className={inputClass} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={editUrun.tip || 'fiziksel'} onChange={e => setEditUrun({ ...editUrun, tip: e.target.value })} className={inputClass}>
                      <option value="fiziksel">Fiziksel</option>
                      <option value="dijital">Dijital</option>
                    </select>
                    <select value={editUrun.aktif ? 'true' : 'false'} onChange={e => setEditUrun({ ...editUrun, aktif: e.target.value === 'true' })} className={inputClass}>
                      <option value="true">Aktif</option>
                      <option value="false">Pasif</option>
                    </select>
                  </div>
                  <input value={editUrun.gorsel_url || ''} onChange={e => setEditUrun({ ...editUrun, gorsel_url: e.target.value })} placeholder="Görsel URL" className={inputClass} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditUrun(null)} className="border border-white/20 text-white/50 px-4 py-2 text-xs uppercase hover:bg-white/10">İptal</button>
                    <button onClick={urunKaydet} disabled={kayıtYapılıyor} className="border border-emerald-500/50 text-emerald-400/80 px-4 py-2 text-xs uppercase hover:bg-emerald-500/10 disabled:opacity-50">
                      {kayıtYapılıyor ? '...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SİPARİŞLER */}
        {aktifTab === 'siparisler' && (
          <div className="flex flex-col gap-2">
            {siparisler.length === 0 && <p className="text-white/20 text-xs tracking-wider">Henüz sipariş yok.</p>}
            {siparisler.map(s => (
              <div key={s.id} className="border border-white/10 bg-white/5 px-4 py-4 flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-white/70 text-sm">{s.urun_isim} × {s.miktar}</span>
                  <span className="text-white/40 text-xs">{s.ad_soyad} · {s.email}</span>
                  {s.telefon && <span className="text-white/30 text-xs">{s.telefon}</span>}
                  {s.adres && <span className="text-white/30 text-xs">{s.adres}</span>}
                  {s.notlar && <span className="text-fuchsia-400/40 text-xs italic">{s.notlar}</span>}
                  <span className="text-white/20 text-xs">{new Date(s.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-white/50 text-sm">{(s.fiyat * s.miktar).toLocaleString('tr-TR')} ₺</span>
                  <select value={s.durum} onChange={e => siparisDurumGuncelle(s.id, e.target.value)}
                    className="bg-black border border-white/20 text-white/60 text-xs px-2 py-1 focus:outline-none">
                    <option value="beklemede">Beklemede</option>
                    <option value="onaylandi">Onaylandı</option>
                    <option value="kargoda">Kargoda</option>
                    <option value="teslim">Teslim</option>
                    <option value="iptal">İptal</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}