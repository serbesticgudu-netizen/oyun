import Link from 'next/link'

const bolumler = [
  {
    href: '/kozmogenez',
    baslik: 'Sıfırıncı Kayıt: Kozmogenez',
    aciklama: 'Büyük Patlama\'dan günümüze kâinatın hafızası. Zamanın ve mekânın ötesine yolculuk.',
    sembol: '𐃏', // Kozmik döngüyü temsil eden kadim sembol
  },
  {
    href: '/arsiv/tabletler',
    baslik: 'Kadim Tabletler',
    aciklama: 'Evrenin yasaları. Theia ve Gaia\'nın tarihi. Geçitlerin sırları.',
    sembol: '𐀏',
  },
  {
    href: '/arsiv/rehber',
    baslik: 'Theia\'nın Oyunu Rehberi',
    aciklama: 'Oyunun kuralları, ritüeller ve Gaia Halkı\'na kılavuz.',
    sembol: '𐂃',
  },
  {
    href: '/arsiv/duyurular',
    baslik: 'Tiyatro Theia',
    aciklama: 'Kabilenin sesleri. Duyurular, etkinlikler ve hikayeler.',
    sembol: '𐄂',
  },
  {
    href: '/harita',
    baslik: 'Geçit Enerji Haritası',
    aciklama: 'Ruh Geçitleri\'nin Gaia üzerindeki koordinatları. Her nokta bir kapı.',
    sembol: '⊕',
  },
]

export default function Arsiv() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center py-12"
      style={{
        backgroundImage: "url('/theia-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="fixed inset-0 bg-black/75" />
      
      <div className="relative z-10 w-full max-w-3xl px-8 flex flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/30 text-xs tracking-[0.4em] uppercase">Theia Kabilesi Arşivi</p>
          <h1 className="text-white text-4xl tracking-widest uppercase text-center">Kadim Kayıtlar</h1>
          <div className="w-24 h-px bg-white/20 mt-2" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6 w-full">
          {bolumler.map((b) => (
            <Link
              key={b.href}
              href={b.href}
              className={`group border p-6 md:p-8 flex flex-col md:flex-row items-center text-center md:text-left gap-4 md:gap-8 transition-all ${
                b.href === '/kozmogenez' 
                ? 'border-fuchsia-500/30 bg-fuchsia-500/5 shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:border-fuchsia-500/60 hover:bg-fuchsia-500/10' 
                : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-black/60'
              }`}
            >
              <span className={`text-4xl md:text-5xl transition-all ${
                b.href === '/kozmogenez' ? 'text-fuchsia-400/40 group-hover:text-fuchsia-400' : 'text-white/20 group-hover:text-white/40'
              }`}>
                {b.sembol}
              </span>
              <div className="flex flex-col gap-2">
                <h2 className={`text-lg tracking-widest uppercase ${
                  b.href === '/kozmogenez' ? 'text-fuchsia-300' : 'text-white'
                }`}>{b.baslik}</h2>
                <p className="text-white/40 text-sm tracking-wider">{b.aciklama}</p>
              </div>
              <span className={`hidden md:block ml-auto text-2xl transition-all ${
                b.href === '/kozmogenez' ? 'text-fuchsia-400/20 group-hover:text-fuchsia-400' : 'text-white/20 group-hover:text-white/50'
              }`}>→</span>
            </Link>
          ))}
        </div>

        <Link
          href="/portal"
          className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all mt-4"
        >
          ← Portal'a Dön
        </Link>
      </div>
    </main>
  )
}