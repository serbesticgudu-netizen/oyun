import Link from 'next/link'

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        backgroundImage: "url('/theia-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="bg-black/50 w-full h-full absolute inset-0" />
      <div className="relative z-10 flex flex-col items-center gap-8">
        <h1 className="text-white text-6xl font-bold tracking-widest uppercase">
          Theia'nın Oyunu
        </h1>
        <p className="text-gray-400 text-sm tracking-widest uppercase">
          Kız Kardeşler Buluşması — MÖ 1628 · MS 2026
        </p>
        <Link
          href="/giris"
          className="border border-white/40 text-white px-10 py-3 text-sm tracking-widest uppercase hover:bg-white/10 transition-all"
        >
          Geçide Gir
        </Link>
        <Link
  href="/arsiv"
  className="text-white/30 text-xs tracking-widest uppercase hover:text-white/50 transition-all"
>
  Arşive Gir
</Link>
      </div>
    </main>
  )
}