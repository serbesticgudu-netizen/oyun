'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Giris() {
  const [email, setEmail] = useState('')
  const [sifre, setSifre] = useState('')
  const [mod, setMod] = useState<'giris' | 'kayit'>('giris')
  const [mesaj, setMesaj] = useState('')
  const [yukleniyor, setYukleniyor] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('rol')
          .single()

        if (profile?.rol === 'aday') {
          router.push('/karakter')
        } else {
          router.push('/portal')
        }
      }
    }
    checkUser()
  }, [router])

  async function handleSubmit() {
    setYukleniyor(true)
    setMesaj('')
    const supabase = createClient()

    if (mod === 'kayit') {
      const { error } = await supabase.auth.signUp({ email, password: sifre })
      if (error) setMesaj(error.message)
else {
  setMesaj('Doğrulama e-postası gönderildi. Gelen kutunu kontrol et. Doğruladıktan sonra giriş yapabilirsin.')
}
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: sifre })
      if (error) setMesaj(error.message)
else {
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .single()
  
  if (profile?.rol === 'aday') router.push('/karakter')
  else router.push('/portal')
}
    }

    setYukleniyor(false)
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        backgroundImage: "url('/theia-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6 p-8 border border-white/10 bg-black/60">
        <h1 className="text-white text-2xl tracking-widest uppercase">
          {mod === 'giris' ? 'Geçide Giriş' : 'Kaydol'}
        </h1>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="w-full flex flex-col gap-6">
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-transparent border border-white/20 text-white px-4 py-3 text-sm tracking-wider placeholder-white/30 focus:outline-none focus:border-white/50"
          />
          <input
            type="password"
            placeholder="Şifre"
            value={sifre}
            onChange={e => setSifre(e.target.value)}
            className="w-full bg-transparent border border-white/20 text-white px-4 py-3 text-sm tracking-wider placeholder-white/30 focus:outline-none focus:border-white/50"
          />

          <button
            type="submit"
            disabled={yukleniyor}
            className="w-full border border-white/40 text-white py-3 text-sm tracking-widest uppercase hover:bg-white/10 transition-all disabled:opacity-40"
          >
            {yukleniyor ? '...' : mod === 'giris' ? 'Geçit Aç' : 'Kaydol'}
          </button>
        </form>

        {mesaj && (
          <p className="text-white/50 text-xs text-center tracking-wider">{mesaj}</p>
        )}

        <button
          onClick={() => setMod(mod === 'giris' ? 'kayit' : 'giris')}
          className="text-white/30 text-xs tracking-wider hover:text-white/60 transition-all"
        >
          {mod === 'giris' ? 'Henüz kaydolmadın mı?' : 'Zaten hesabın var mı?'}
        </button>
      </div>
    </main>
  )
}