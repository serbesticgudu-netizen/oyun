export type AyFazi = {
  faz: number
  isim: string
  sembol: string
  dolunayMi: boolean
  yeniAyMi: boolean
  aciklama: string
}

export function ayFaziniHesapla(tarih: Date = new Date()): AyFazi {
  // Bilinen dolunay: 29 Temmuz 2026 saat 10:36 UTC
  const referans = new Date('2026-07-29T10:36:00Z')
  const ayDongusu = 29.53058867

  const farkMs = tarih.getTime() - referans.getTime()
  const farkGun = farkMs / (1000 * 60 * 60 * 24)

  // Faz: 0 = dolunay, 0.5 = yeni ay
  const fazHam = ((farkGun % ayDongusu) + ayDongusu) % ayDongusu
  const faz = fazHam / ayDongusu

  let isim: string
  let sembol: string
  let aciklama: string

  if (faz < 0.04 || faz > 0.96) {
    isim = 'Dolunay'; sembol = '🌕'
    aciklama = 'THEIA TAM UYANIK. Ruh Geçitleri en güçlü halinde.'
  } else if (faz < 0.25) {
    isim = 'Azalan Ay'; sembol = '🌖'
    aciklama = 'Geçitler kapanmaya başlıyor. Zaman kıymetli.'
  } else if (faz < 0.29) {
    isim = 'Son Dördün'; sembol = '🌗'
    aciklama = 'Denge noktası. Theia içe dönüyor.'
  } else if (faz < 0.46) {
    isim = 'Eski Ay'; sembol = '🌘'
    aciklama = 'Dinlenme devri. Kadim Tabletler okunur.'
  } else if (faz < 0.54) {
    isim = 'Yeni Ay'; sembol = '🌑'
    aciklama = 'Karanlık en derin noktasında. Geçitler uykuda.'
  } else if (faz < 0.71) {
    isim = 'Hilal'; sembol = '🌒'
    aciklama = 'Theia uyanıyor. Hazırlık vakti.'
  } else if (faz < 0.75) {
    isim = 'İlk Dördün'; sembol = '🌓'
    aciklama = 'Denge noktası. İki dünya eşit ağırlıkta.'
  } else {
    isim = 'Şişen Ay'; sembol = '🌔'
    aciklama = 'Enerji yükseliyor. Geçitler sizi hissediyor.'
  }

  return {
    faz,
    dolunayMi: faz < 0.04 || faz > 0.96,
    yeniAyMi: faz >= 0.46 && faz < 0.54,
    isim,
    sembol,
    aciklama,
  }
}