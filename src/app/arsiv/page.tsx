import Link from 'next/link'

const bolumler = [
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
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        backgroundImage: "url('/theia-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/75" />
      <div className="relative z-10 w-full max-w-3xl px-8 flex flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-3">
          <p className="text-white/30 text-xs tracking-[0.4em] uppercase">Theia Kabilesi Arşivi</p>
          <h1 className="text-white text-4xl tracking-widest uppercase">Kadim Kayıtlar</h1>
          <div className="w-24 h-px bg-white/20 mt-2" />
        </div>

        <div className="grid grid-cols-1 gap-6 w-full">
          {bolumler.map((b) => (
            <Link
              key={b.href}
              href={b.href}
              className="group border border-white/10 bg-black/40 p-8 flex items-center gap-8 hover:border-white/30 hover:bg-black/60 transition-all"
            >
              <span className="text-5xl text-white/20 group-hover:text-white/40 transition-all">
                {b.sembol}
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="text-white text-lg tracking-widest uppercase">{b.baslik}</h2>
                <p className="text-white/40 text-sm tracking-wider">{b.aciklama}</p>
              </div>
              <span className="ml-auto text-white/20 group-hover:text-white/50 transition-all text-2xl">→</span>
            </Link>
          ))}
        </div>

        <Link
          href="/"
          className="text-white/20 text-xs tracking-widest uppercase hover:text-white/50 transition-all"
        >
          ← Ana Geçide Dön
        </Link>
      </div>
    </main>
  )
}