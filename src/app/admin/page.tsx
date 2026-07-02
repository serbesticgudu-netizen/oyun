'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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

export default function Admin() {
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([])
  const [karakterler, setKarakterler] = useState<Karakter[]>([])
  const [aktifTab, setAktifTab] = useState<'kullanicilar' | 'karakterler'>('kullanicilar')
  const [seciliKarakter, setSeciliKarakter] = useState<Karakter | null>(null)
  const [editedGorselUrl, setEditedGorselUrl] = useState<string | null>('')
  const [isSavingGorsel, setIsSavingGorsel] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (seciliKarakter) {
      setEditedGorselUrl(seciliKarakter.gorsel_url)
    }
  }, [seciliKarakter])

  useEffect(() => {
    const supabase = createClient()

    async function yukle() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/giris'); return }

      const { data: profil } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profil?.is_admin) { router.push('/portal'); return }

      const { data: k } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      const { data: kar } = await supabase
        .from('karakterler')
        .select('*')
        .order('created_at', { ascending: false })

      setKullanicilar(k ?? [])
      setKarakterler(kar ?? [])
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
    const { data, error } = await supabase
      .from('karakterler')
      .update({ gorsel_url: editedGorselUrl })
      .eq('id', seciliKarakter.id)
      .select()
      .single()

    if (error) {
      alert('Hata: ' + error.message)
    } else if (data) {
      const guncelKarakter = data as Karakter
      setKarakterler(prev => prev.map(k => k.id === guncelKarakter.id ? guncelKarakter : k))
      setSeciliKarakter(guncelKarakter)
    }
    setIsSavingGorsel(false)
  }

  if (yukleniyor) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/20 text-xs tracking-widest uppercase">Yükleniyor...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-8 py-12 flex flex-col gap-8">

        {/* Başlık */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex flex-col gap-1">
            <p className="text-white/20 text-xs tracking-[0.4em] uppercase">Theia Kabilesi</p>
            <h1 className="text-white text-2xl tracking-widest uppercase">Yönetim Paneli</h1>
          </div>
          <div className="flex gap-4 text-xs tracking-widest uppercase">
            <span className="text-white/30">{kullanicilar.length} Varlık</span>
            <span className="text-white/30">{karakterler.length} Karakter</span>
          </div>
        </div>

        {/* Sekmeler */}
        <div className="flex gap-2">
          {(['kullanicilar', 'karakterler'] as const).map(tab => (
            <button key={tab} onClick={() => setAktifTab(tab)}
              className={`px-6 py-3 text-xs tracking-widest uppercase border transition-all ${aktifTab === tab ? 'border-white/40 text-white bg-white/10' : 'border-white/10 text-white/30 hover:border-white/20 hover:text-white/50'}`}>
              {tab === 'kullanicilar' ? 'Kullanıcılar' : 'Karakterler'}
            </button>
          ))}
        </div>

        {/* KULLANICILAR */}
        {aktifTab === 'kullanicilar' && (
          <div className="flex flex-col gap-2">
            {kullanicilar.map(k => {
              const karakter = karakterler.find(kar => kar.kullanici_id === k.id)
              return (
              <div key={k.id} className="border border-white/10 bg-white/5 px-6 py-4 flex items-center gap-4 md:gap-6">
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-white/70 text-sm">{k.email}</span>
                  {karakter?.karakter_adi && (
                    <span className="text-fuchsia-400/50 text-xs tracking-wider">{karakter.karakter_adi}</span>
                  )}
                  <span className="text-white/20 text-xs mt-1">
                    {new Date(k.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <span className={`text-xs tracking-widest uppercase px-3 py-1 border ${rolRenkleri[k.rol]}`}>
                  {k.rol}
                </span>
                <select
                  value={k.rol}
                  onChange={e => rolGuncelle(k.id, e.target.value)}
                  className="bg-black border border-white/20 text-white/60 text-xs tracking-wider px-3 py-2 focus:outline-none focus:border-white/40"
                >
                  <option value="ziyaretci">Ziyaretçi</option>
                  <option value="aday">Aday</option>
                  <option value="oyun_arkadasi">Oyun Arkadaşı</option>
                  <option value="kabileli">Kabileli</option>
                </select>
              </div>
              )
            })}
          </div>
        )}

        {/* KARAKTERLER */}
        {aktifTab === 'karakterler' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Liste */}
            <div className="flex flex-col gap-2">
              {karakterler.map(k => {
                const sahip = kullanicilar.find(u => u.id === k.kullanici_id)
                return (
                  <button key={k.id}
                    onClick={() => setSeciliKarakter(k)}
                    className={`border text-left px-6 py-4 flex items-center gap-4 transition-all ${seciliKarakter?.id === k.id ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <div className="flex-1 flex flex-col gap-1">
                      <span className="text-white/70 text-sm">
                        {k.karakter_adi || 'İsimsiz'} 
                        <span className="text-white/20 ml-2 text-xs">— {k.olusturma_yontemi === 'test' ? 'Test' : 'Form'}</span>
                      </span>
                      <span className="text-white/30 text-xs">{sahip?.email}</span>
                    </div>
                    <span className={`text-xs tracking-widest uppercase px-2 py-1 border ${durumRenkleri[k.durum]}`}>
                      {k.durum}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Detay */}
            {seciliKarakter && (
              <div className="border border-white/10 bg-white/5 p-6 flex flex-col gap-5 max-h-screen overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h2 className="text-white tracking-widest uppercase">
                    {seciliKarakter.karakter_adi || 'İsimsiz Varlık'}
                  </h2>
                  <select
                    value={seciliKarakter.durum}
                    onChange={e => durumGuncelle(seciliKarakter.id, e.target.value)}
                    className="bg-black border border-white/20 text-white/60 text-xs tracking-wider px-3 py-2 focus:outline-none focus:border-white/40"
                  >
                    <option value="beklemede">Beklemede</option>
                    <option value="hazirlaniyor">Hazırlanıyor</option>
                    <option value="tamamlandi">Tamamlandı</option>
                  </select>
                </div>

                {seciliKarakter.gorsel_url && (
                  <div className="relative w-full aspect-[4/5] bg-black/20 border border-white/10 rounded-md overflow-hidden">
                    <img src={seciliKarakter.gorsel_url} alt={seciliKarakter.karakter_adi} className="w-full h-full object-contain" />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-white/30 text-xs tracking-widest uppercase">Görsel URL</label>
                  <div className="flex gap-2">
                    <input
                      value={editedGorselUrl || ''}
                      onChange={e => setEditedGorselUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 bg-black/30 border border-white/20 p-2 text-white/60 text-xs"
                    />
                    <button
                      onClick={gorselUrlGuncelle}
                      disabled={isSavingGorsel || editedGorselUrl === seciliKarakter.gorsel_url}
                      className="border border-emerald-500/50 text-emerald-400/80 px-3 py-1 text-xs tracking-widest uppercase hover:bg-emerald-500/10 disabled:opacity-50 transition-all"
                    >{isSavingGorsel ? '...' : 'Kaydet'}</button>
                  </div>
                </div>

                <div className="w-full h-px bg-white/10" />

                {/* İletişim */}
                <div className="flex flex-col gap-1">
                  <span className="text-white/30 text-xs tracking-widest uppercase">İletişim</span>
                  <span className="text-white/60 text-sm">
                    {seciliKarakter.iletisim_tercihi === 'whatsapp'
                      ? `WhatsApp: ${seciliKarakter.telefon}`
                      : 'E-posta'}
                  </span>
                </div>

                {/* Form verisi */}
                {seciliKarakter.olusturma_yontemi === 'form' && (
                  <>
                    {[
                      ['Tür', seciliKarakter.tur],
                      ['Köken', seciliKarakter.koken],
                      ['Köken Hikayesi', seciliKarakter.koken_hikayesi],
                      ['Güçler', seciliKarakter.gucler],
                      ['Zayıflıklar', seciliKarakter.zayifliklar],
                      ['Motivasyon', seciliKarakter.motivasyon],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label as string} className="flex flex-col gap-1">
                        <span className="text-white/30 text-xs tracking-widest uppercase">{label}</span>
                        <p className="text-white/60 text-sm leading-relaxed">{value}</p>
                      </div>
                    ))}
                  </>
                )}

                {/* Test cevapları */}
                {seciliKarakter.olusturma_yontemi === 'test' && seciliKarakter.test_cevaplari && (
                  <div className="flex flex-col gap-3">
                    <span className="text-white/30 text-xs tracking-widest uppercase">Test Cevapları</span>
                    {Object.entries(seciliKarakter.test_cevaplari).map(([soru, cevap]) => (
                      <div key={soru} className="border-l border-white/10 pl-4 flex flex-col gap-1">
                        <span className="text-white/20 text-xs">Soru {soru}</span>
                        <span className="text-white/60 text-sm">{cevap}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}