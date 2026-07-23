// KADİM TABLET: Güneş'in Tropikal Zodyak Konumu
// Sapien takviminin klasik burç aralıklarına göre hesaplanır.

export interface ZodiacInfo {
  isim: string
  turkce: string
}

const ZODIAC_ARALIKLARI: { isim: string; turkce: string; sonAy: number; sonGun: number }[] = [
  { isim: 'Koc',     turkce: 'Koç',    sonAy: 4,  sonGun: 19 },
  { isim: 'Boga',    turkce: 'Boğa',   sonAy: 5,  sonGun: 20 },
  { isim: 'Ikizler', turkce: 'İkizler',sonAy: 6,  sonGun: 20 },
  { isim: 'Yengec',  turkce: 'Yengeç', sonAy: 7,  sonGun: 22 },
  { isim: 'Aslan',   turkce: 'Aslan',  sonAy: 8,  sonGun: 22 },
  { isim: 'Basak',   turkce: 'Başak',  sonAy: 9,  sonGun: 22 },
  { isim: 'Terazi',  turkce: 'Terazi', sonAy: 10, sonGun: 22 },
  { isim: 'Akrep',   turkce: 'Akrep',  sonAy: 11, sonGun: 21 },
  { isim: 'Yay',     turkce: 'Yay',    sonAy: 12, sonGun: 21 },
  { isim: 'Oglak',   turkce: 'Oğlak',  sonAy: 1,  sonGun: 19 },
  { isim: 'Kova',    turkce: 'Kova',   sonAy: 2,  sonGun: 18 },
  { isim: 'Balik',   turkce: 'Balık',  sonAy: 3,  sonGun: 20 },
]

/**
 * Verilen ay/gün için Güneş'in o an içinde bulunduğu burcu döndürür.
 * md karşılaştırması: ay*100 + gün formatı kullanılır (örn. 22 Temmuz -> 722)
 */
export function getSunZodiacSign(month: number, day: number): ZodiacInfo {
  const md = month * 100 + day

  if (md >= 321 && md <= 419) return { isim: 'Koc', turkce: 'Koç' }
  if (md >= 420 && md <= 520) return { isim: 'Boga', turkce: 'Boğa' }
  if (md >= 521 && md <= 620) return { isim: 'Ikizler', turkce: 'İkizler' }
  if (md >= 621 && md <= 722) return { isim: 'Yengec', turkce: 'Yengeç' }
  if (md >= 723 && md <= 822) return { isim: 'Aslan', turkce: 'Aslan' }
  if (md >= 823 && md <= 922) return { isim: 'Basak', turkce: 'Başak' }
  if (md >= 923 && md <= 1022) return { isim: 'Terazi', turkce: 'Terazi' }
  if (md >= 1023 && md <= 1121) return { isim: 'Akrep', turkce: 'Akrep' }
  if (md >= 1122 && md <= 1221) return { isim: 'Yay', turkce: 'Yay' }
  if (md >= 1222 || md <= 119) return { isim: 'Oglak', turkce: 'Oğlak' }
  if (md >= 120 && md <= 218) return { isim: 'Kova', turkce: 'Kova' }
  return { isim: 'Balik', turkce: 'Balık' } // 219 - 320
}