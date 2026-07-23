'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MarkdownComponents = {
  p: ({ ...props }) => <p className="mb-3 last:mb-0 leading-relaxed text-xs md:text-sm" {...props} />,
  strong: ({ ...props }) => <strong className="text-white font-bold tracking-wide" {...props} />,
  em: ({ ...props }) => <em className="italic text-white/90" {...props} />,
  ul: ({ ...props }) => <ul className="list-disc list-inside mb-3 space-y-1 ml-1 text-xs md:text-sm" {...props} />,
  li: ({ ...props }) => <li className="text-white/70" {...props} />,
  a: ({ ...props }) => (
    <a 
      className="text-fuchsia-400 hover:text-fuchsia-300 underline underline-offset-4 transition-colors" 
      target="_blank" 
      rel="noopener noreferrer" 
      {...props} 
    />
  ),
  h3: ({ ...props }) => <h3 className="text-sm md:text-base text-white mt-4 mb-1.5 tracking-widest uppercase" {...props} />,
}

const sorular = [
  {
    id: 1,
    soru: 'Theia seni çağırdığında ne hissediyorsun?',
    secenekler: ['Kaçınılmaz bir çekim — sanki her zaman biliyordum', 'Derin bir merak — ne olduğunu anlamak istiyorum', 'Tedirginlik — bilinmeyene adım atmak kolay değil', 'Coşku — yeni bir macera başlıyor'],
  },
  {
    id: 2,
    soru: 'Bir geçidin önünde duruyorsun. İçerisi karanlık. Ne yaparsın?',
    secenekler: ['Direkt geçerim — karanlık beni durduramaz', 'Önce gözlemlerim, sonra karar veririm', 'Yanımda biri varsa birlikte geçerim', 'Geçmeden önce ritüel yaparım'],
  },
  {
    id: 3,
    soru: 'Theia\'da seni en çok ne ilgilendirir?',
    secenekler: ['Kadim bilgiler ve tabletler', 'Diğer varlıklarla bağlantı kurmak', 'Kendi sınırlarımı test etmek', 'Bu alemin doğasını anlamak'],
  },
  {
    id: 4,
    soru: 'Gaia\'da seni en çok ne yorar?',
    secenekler: ['Maddenin ağırlığı ve sınırları', 'İnsanların birbirini anlamaması', 'Zamanın acımasız akışı', 'Gerçeğin görünmez olması'],
  },
  {
    id: 5,
    soru: 'En büyük gücün nedir?',
    secenekler: ['Sezgim — hissettiğim şeyleri bilirim', 'Sabrım — her şey zamanında gelir', 'Cesaretim — korku beni durdurmaz', 'Zekam — kalıpları görürüm'],
  },
  {
    id: 6,
    soru: 'Seni en derinden korkutan şey nedir?',
    secenekler: ['Yok olmak ve iz bırakmamak', 'Terk edilmek ve yalnız kalmak', 'Kontrolü kaybetmek', 'Yanılmak ve kandırılmak'],
  },
  {
    id: 7,
    soru: 'Bir Oyun içinde başka bir varlık sana ihanet etse ne yaparsın?',
    secenekler: ['Anında karşılık veririm', 'Sessizce ayrılır, yoluma devam ederim', 'Nedenini anlamaya çalışırım', 'Bunu bir test olarak kabul ederim'],
  },
  {
    id: 8,
    soru: 'Theia\'da bir şey yaratma gücün olsaydı ne yaratırdın?',
    secenekler: ['Geçmişe açılan bir pencere', 'Tüm varlıkların duyabileceği bir ses', 'Kaybolanların geri döneceği bir yer', 'Gerçeği gösteren bir ayna'],
  },
  {
    id: 9,
    soru: 'Kainat\'ta nereye aitsin?',
    secenekler: ['Gaia — madde benim evim', 'Theia — ruhum orada', 'İkisi arasında — sınırlarda yaşarım', 'Hiçbir yere — her yer benim evim'],
  },
  {
    id: 10,
    soru: 'Theia Kabilesi sana bir görev verse tepkin ne olur?',
    secenekler: ['Hemen kabul ederim', 'Önce detayları sorarım', 'Kendi koşullarımı öne sürerim', 'Reddetme hakkımı saklarım'],
  },
  {
    id: 11,
    soru: 'Bir Oyun\'un sonunda ne bırakmak istersin?',
    secenekler: ['Bir efsane — hatırlanmak istiyorum', 'Bir bağ — birini dönüştürmek istiyorum', 'Bir sır — keşfedilmeyi beklesin', 'Bir iz — Theia beni tanısın'],
  },
  {
    id: 12,
    soru: 'Bu çağrıya neden yanıt verdin?',
    secenekler: ['Çünkü seçildim ve bunu hissettim', 'Çünkü merak ettim ve durduramadım kendimi', 'Çünkü kaybedecek bir şeyim yok', 'Çünkü bu tam aradığım şeydi'],
  },
]

type Mod = 'secim' | 'form' | 'test' | 'bitti'

export default function KarakterOlustur() {
  const [mod, setMod] = useState<Mod>('secim')
  const [adim, setAdim] = useState(0)
  const [iletisim, setIletisim] = useState<'email' | 'whatsapp'>('email')
  const [telefon, setTelefon] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    karakter_adi: '',
    tur: '',
    koken: 'Gaia' as 'Gaia' | 'Kainat',
    koken_hikayesi: '',
    gucler: '',
    zayifliklar: '',
    motivasyon: '',
  })

  const [testCevaplari, setTestCevaplari] = useState<Record<number, string>>({})

async function kaydet(yontem: 'form' | 'test') {
  setYukleniyor(true)
  const supabase = createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (!user) {
    console.error('Kullanıcı bulunamadı:', userError)
    alert('Oturum açık değil. Lütfen önce giriş yap.')
    setYukleniyor(false)
    return
  }

  const { error } = await supabase.from('karakterler').insert({
    kullanici_id: user.id,
    olusturma_yontemi: yontem,
    iletisim_tercihi: iletisim,
    telefon: iletisim === 'whatsapp' ? telefon : null,
    ...(yontem === 'form' ? {
      karakter_adi: form.karakter_adi,
      tur: form.tur,
      koken: form.koken,
      koken_hikayesi: form.koken_hikayesi,
      gucler: form.gucler,
      zayifliklar: form.zayifliklar,
      motivasyon: form.motivasyon,
    } : {
      test_cevaplari: testCevaplari,
    }),
  })

  if (error) {
    console.error('Kayıt hatası:', JSON.stringify(error))
    alert('Bir hata oluştu: ' + error.message)
    setYukleniyor(false)
    return
  }

  setYukleniyor(false)
  setMod('bitti')
}

  const inputClass = 'w-full bg-transparent border border-white/20 text-white px-4 py-3 text-sm tracking-wider placeholder-white/20 focus:outline-none focus:border-white/40 resize-none'
  const labelClass = 'text-white/40 text-xs tracking-widest uppercase'

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundImage: "url('/theia-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="fixed inset-0 bg-black/80" />
      <div className="relative z-10 w-full max-w-2xl mx-auto px-8 py-16 flex flex-col gap-10">

        {/* Başlık */}
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-white/30 text-xs tracking-[0.4em] uppercase">Theia Kabilesi</p>
          <h1 className="text-white text-3xl tracking-widest uppercase">Varlığını Tanımla</h1>
          <div className="w-24 h-px bg-white/20" />
        </div>

        {/* SEÇIM EKRANI */}
        {mod === 'secim' && (
          <div className="flex flex-col gap-6">
            <p className="text-white/40 text-sm tracking-wider text-center">
              Karakterini nasıl oluşturmak istiyorsun?
            </p>
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => setMod('form')}
                className="border border-white/20 bg-black/40 p-8 text-left hover:border-white/40 hover:bg-black/60 transition-all group"
              >
                <h2 className="text-white tracking-widest uppercase mb-2">Kendim Yazayım</h2>
                <p className="text-white/30 text-sm tracking-wider">Karakterinin origin bilgilerini sen belirle.</p>
              </button>
              <button
                onClick={() => setMod('test')}
                className="border border-white/20 bg-black/40 p-8 text-left hover:border-white/40 hover:bg-black/60 transition-all group"
              >
                <h2 className="text-white tracking-widest uppercase mb-2">Test ile Keşfedelim</h2>
                <p className="text-white/30 text-sm tracking-wider">12 soruyu yanıtla, Theia Kabilesi karakterini senin için oluştursun.</p>
              </button>
            </div>
          </div>
        )}

        {/* FORM */}
        {mod === 'form' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Karakter Adı</label>
              <input className={inputClass} placeholder="Varlığının adı..." value={form.karakter_adi} onChange={e => setForm({ ...form, karakter_adi: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Tür / Irk</label>
              <input className={inputClass} placeholder="İnsan, ruh, varlık, hibrit..." value={form.tur} onChange={e => setForm({ ...form, tur: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Köken</label>
              <div className="flex gap-4">
                {(['Gaia', 'Kainat'] as const).map(k => (
                  <button
                    key={k}
                    onClick={() => setForm({ ...form, koken: k })}
                    className={`flex-1 py-3 text-sm tracking-widest uppercase border transition-all ${form.koken === k ? 'border-white/60 text-white bg-white/10' : 'border-white/20 text-white/40 hover:border-white/40'}`}
                  >
                    {k === 'Gaia' ? 'Gaia\'lı' : 'Kainat\'tan'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Köken Hikayesi</label>
              <textarea rows={4} className={inputClass} placeholder="Nereden geliyorsun, nasıl bu noktaya ulaştın..." value={form.koken_hikayesi} onChange={e => setForm({ ...form, koken_hikayesi: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Güçler / Yetenekler</label>
              <textarea rows={3} className={inputClass} placeholder="Seni güçlü kılan ne..." value={form.gucler} onChange={e => setForm({ ...form, gucler: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Zayıflıklar / Korkular</label>
              <textarea rows={3} className={inputClass} placeholder="Seni durduran ne..." value={form.zayifliklar} onChange={e => setForm({ ...form, zayifliklar: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <label className={labelClass}>Motivasyon / Amaç</label>
              <textarea rows={3} className={inputClass} placeholder="Theia'ya neden geliyorsun..." value={form.motivasyon} onChange={e => setForm({ ...form, motivasyon: e.target.value })} />
            </div>

            {/* İletişim tercihi */}
            <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
              <p className={labelClass}>Karakterin hazırlandığında nasıl haber alalım?</p>
              <div className="flex gap-4">
                {(['email', 'whatsapp'] as const).map(t => (
                  <button key={t} onClick={() => setIletisim(t)}
                    className={`flex-1 py-3 text-sm tracking-widest uppercase border transition-all ${iletisim === t ? 'border-white/60 text-white bg-white/10' : 'border-white/20 text-white/40 hover:border-white/40'}`}>
                    {t === 'email' ? 'E-posta' : 'WhatsApp'}
                  </button>
                ))}
              </div>
              {iletisim === 'whatsapp' && (
                <input className={inputClass} placeholder="Telefon numarası (örn: +90 555 000 00 00)" value={telefon} onChange={e => setTelefon(e.target.value)} />
              )}
            </div>

            <button onClick={() => kaydet('form')} disabled={yukleniyor}
              className="w-full border border-white/40 text-white py-4 text-sm tracking-widest uppercase hover:bg-white/10 transition-all disabled:opacity-40">
              {yukleniyor ? '...' : 'Varlığımı Kaydet'}
            </button>
          </div>
        )}

        {/* TEST */}
        {mod === 'test' && adim < 12 && (
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-4">
              <span className="text-white/20 text-xs tracking-widest">{adim + 1} / 12</span>
              <div className="flex-1 h-px bg-white/10">
                <div className="h-full bg-white/30 transition-all" style={{ width: `${((adim + 1) / 12) * 100}%` }} />
              </div>
            </div>

            <p className="text-white text-lg tracking-wider">{sorular[adim].soru}</p>

            <div className="flex flex-col gap-3">
              {sorular[adim].secenekler.map((s, i) => (
                <button key={i}
                  onClick={() => {
                    setTestCevaplari({ ...testCevaplari, [sorular[adim].id]: s })
                    setAdim(adim + 1)
                  }}
                  className={`text-left border px-6 py-4 text-sm tracking-wider transition-all ${testCevaplari[sorular[adim].id] === s ? 'border-white/60 text-white bg-white/10' : 'border-white/20 text-white/40 hover:border-white/40 hover:text-white/70'}`}>
                  {s}
                </button>
              ))}
              <div className="flex flex-col gap-2 mt-2">
                <label className={labelClass}>Ya da kendi cevabını yaz</label>
                <input className={inputClass} placeholder="Kendi cevabın..."
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                      setTestCevaplari({ ...testCevaplari, [sorular[adim].id]: (e.target as HTMLInputElement).value.trim() })
                      setAdim(adim + 1)
                    }
                  }}
                />
              </div>
            </div>

            {adim > 0 && (
              <button onClick={() => setAdim(adim - 1)} className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all text-left">
                ← Önceki soru
              </button>
            )}
          </div>
        )}

        {/* TEST BİTTİ — İLETİŞİM */}
        {mod === 'test' && adim === 12 && (
          <div className="flex flex-col gap-6">
            <p className="text-white/60 text-sm tracking-wider text-center">
              Tüm soruları yanıtladın. Theia Kabilesi karakterini oluşturacak.
            </p>
            <div className="flex flex-col gap-4 border border-white/10 p-6">
              <p className={labelClass}>Karakterin hazırlandığında nasıl haber alalım?</p>
              <div className="flex gap-4">
                {(['email', 'whatsapp'] as const).map(t => (
                  <button key={t} onClick={() => setIletisim(t)}
                    className={`flex-1 py-3 text-sm tracking-widest uppercase border transition-all ${iletisim === t ? 'border-white/60 text-white bg-white/10' : 'border-white/20 text-white/40 hover:border-white/40'}`}>
                    {t === 'email' ? 'E-posta' : 'WhatsApp'}
                  </button>
                ))}
              </div>
              {iletisim === 'whatsapp' && (
                <input className={inputClass} placeholder="+90 555 000 00 00" value={telefon} onChange={e => setTelefon(e.target.value)} />
              )}
            </div>
            <button onClick={() => kaydet('test')} disabled={yukleniyor}
              className="w-full border border-white/40 text-white py-4 text-sm tracking-widest uppercase hover:bg-white/10 transition-all disabled:opacity-40">
              {yukleniyor ? '...' : 'Cevaplarımı Gönder'}
            </button>
          </div>
        )}

        {/* BİTTİ */}
        {mod === 'bitti' && (
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="w-16 h-16 border border-white/20 flex items-center justify-center text-3xl">
              ✦
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-white text-xl tracking-widest uppercase">Çağrın Alındı</h2>
              <p className="text-white/40 text-sm tracking-wider leading-relaxed">
                Theia Kabilesi varlığını inceliyor.<br />
                {iletisim === 'email'
                  ? 'Karakterin hazırlandığında e-posta adresine haber göndereceğiz.'
                  : 'Karakterin hazırlandığında WhatsApp\'tan seni bulacağız.'}
              </p>
            </div>
            <button onClick={() => router.push('/')}
              className="border border-white/20 text-white/40 px-8 py-3 text-xs tracking-widest uppercase hover:text-white/60 hover:border-white/40 transition-all">
              Ana Geçide Dön
            </button>
          </div>
        )}

      </div>
    </main>
  )
}