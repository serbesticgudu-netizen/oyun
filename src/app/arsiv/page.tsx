import Link from 'next/link'

const bolumler = [
  {
    href: '/kozmogenez',
    baslik: 'Sıfırıncı Kayıt: Kozmogenez',
    aciklama: 'Büyük Patlama\'dan günümüze kâinatın hafızası. Zamanın ötesine yolculuk.',
    sembol: '𐃏',
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
      className="h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden relative"
      style={{
        backgroundImage: "url('/theia-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="fixed inset-0 bg-black/80" />
      
      {/* SAĞ ÜST KÖŞEDEKİ PORTAL LİNKİ */}
      <Link
        href="/portal"
        className="absolute top-4 right-4 md:top-8 md:right-8 z-20 border border-white/10 text-white/30 hover:border-white/30 hover:text-white/60 px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs tracking-widest uppercase transition-all bg-black/40"
      >
        ← Portal
      </Link>

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center gap-6 md:gap-8">
        
        {/* Başlık Alanı - Daha Kompakt */}
        <div className="flex flex-col items-center gap-1 md:gap-2 text-center">
          <p className="text-white/30 text-[9px] md:text-xs tracking-[0.4em] uppercase">Theia Kabilesi Arşivi</p>
          <h1 className="text-white text-2xl md:text-4xl tracking-widest uppercase font-thin">Kadim Kayıtlar</h1>
          <div className="w-16 h-px bg-white/20 mt-1" />
        </div>

        {/* 2 Sütunlu Dengeli Grid - Mobilde ve Masaüstünde Sığan Düzen */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 w-full">
          {bolumler.map((b) => {
            const isKozmo = b.href === '/kozmogenez';
            return (
              <Link
                key={b.href}
                href={b.href}
                className={`group border p-3 md:p-5 flex flex-col justify-center items-center text-center gap-1.5 md:gap-2 rounded-md transition-all relative overflow-hidden ${
                  isKozmo 
                  ? 'col-span-2 border-fuchsia-500/30 bg-fuchsia-500/5 shadow-[0_0_15px_rgba(168,85,247,0.08)] hover:border-fuchsia-500/60 hover:bg-fuchsia-500/10' 
                  : 'border-white/5 bg-black/50 hover:border-white/20 hover:bg-black/70'
                }`}
              >
                {/* Sembol */}
                <span className={`text-2xl md:text-4xl transition-all duration-300 group-hover:scale-110 ${
                  isKozmo ? 'text-fuchsia-400/50 group-hover:text-fuchsia-400' : 'text-white/20 group-hover:text-white/40'
                }`}>
                  {b.sembol}
                </span>

                {/* Metin Alanı */}
                <div className="flex flex-col gap-0.5 md:gap-1">
                  <h2 className={`text-xs md:text-sm tracking-widest uppercase font-medium ${
                    isKozmo ? 'text-fuchsia-300' : 'text-white/80'
                  }`}>
                    {b.baslik}
                  </h2>
                  <p className="text-white/30 text-[9px] md:text-xs tracking-wide max-w-md line-clamp-2 leading-relaxed">
                    {b.aciklama}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

      </div>
    </main>
  )
}