export type SceneType = "void" | "collision" | "drift" | "awakening" | "present";

export interface ColorTheme {
  primary: string;
  glow: string;
  accent: string;
}

export interface PanelStyle {
  caption: string;
  mood: "ink-wash" | "gothic-etch" | "cyber-glitch";
}

export interface TimelineEvent {
  id: string;
  era: string;
  yearsAgo: number;
  title: string;
  narrative: string;
  sceneType: SceneType;
  colorTheme: ColorTheme;
  panel?: PanelStyle;
  gorsel_url?: string; // İleride ekleyeceğin çizgi roman / ara sahne görsel linki
}

export const PRESENT_YEAR = 2026;

export const timelineEvents: TimelineEvent[] = [
  {
    id: "big-bang",
    era: "I. EVRE — Hiçlik ve Doğuş",
    yearsAgo: 13_800_000_000,
    title: "Büyük Patlama",
    narrative: "Mutlak karanlıktan büyük bir ışık patlaması. Gezegen ruhları ham enerji formunda kâinata yayılır. Theia ve Gaia, ikiz ruhlar olarak ayrışır.",
    sceneType: "void",
    colorTheme: { primary: "#0A0118", glow: "#6E00FF", accent: "#E8D5FF" },
    panel: { caption: "İki ruh, tek ışıktan doğar.", mood: "ink-wash" },
    gorsel_url: "/theia-bg.jpg" // Örnek olarak ana arka planı koydum, buraya çizgi roman görseli gelecek
  },
  {
    id: "collision",
    era: "II. EVRE — Şekillenme ve Kurban",
    yearsAgo: 4_533_000_000,
    title: "Theia–Gaia Çarpışması",
    narrative: "İki devasa kürenin kozmik dansı sona erer. Theia'nın maddesi Gaia ile birleşirken kopan parçalar Ay'ı oluşturur. Theia, madde formuna veda edip madde-ötesi forma geçer.",
    sceneType: "collision",
    colorTheme: { primary: "#1A0B2E", glow: "#FF2DAF", accent: "#B026FF" },
    panel: { caption: "Bir beden parçalanır, bir ruh özgürleşir.", mood: "gothic-etch" },
    gorsel_url: "" // Çarpışma anı çizgi roman karesi
  },
  {
    id: "cosmic-drift",
    era: "III. EVRE — Kâinat Yolculuğu",
    yearsAgo: 2_000_000_000,
    title: "Sessizlik ve Nakış",
    narrative: "Gaia ve Ay yörüngede dönerken, Theia mor/pembe bir enerji bulutu olarak galaksiler arasında süzülür; topladığı bilgiyi Kadim Tabletler'e nakşeder.",
    sceneType: "drift",
    colorTheme: { primary: "#120826", glow: "#B026FF", accent: "#6E00FF" },
    panel: { caption: "Bilgi, ışıktan daha yavaş yayılır.", mood: "ink-wash" },
  },
  {
    id: "gobeklitepe",
    era: "IV. EVRE — Kız Kardeşler Buluşmaları",
    yearsAgo: 9_000 + (PRESENT_YEAR - 1),
    title: "Göbeklitepe — İlk Uyanış",
    narrative: "Sapienslerin frekansı ilk kez algılaması. İlk Ruh Geçidi bilinçli olarak fark edilir.",
    sceneType: "awakening",
    colorTheme: { primary: "#1A0B2E", glow: "#B026FF", accent: "#FF2DAF" },
    panel: { caption: "Taş, ilk kez bir frekansı hatırlar.", mood: "gothic-etch" },
  },
  {
    id: "thera",
    era: "IV. EVRE — Kız Kardeşler Buluşmaları",
    yearsAgo: 1_600 + (PRESENT_YEAR - 1),
    title: "Thera Felaketi",
    narrative: "Dev bir yanardağ patlaması. Phicone (Kâtip), hafızasını yitirerek Gaia'nın yerçekimine hapsolur.",
    sceneType: "awakening",
    colorTheme: { primary: "#2A0A1A", glow: "#FF2DAF", accent: "#B026FF" },
    panel: { caption: "Kül altında bir hafıza gömülür.", mood: "cyber-glitch" },
  },
  {
    id: "ephesus",
    era: "IV. EVRE — Kız Kardeşler Buluşmaları",
    yearsAgo: 356 + (PRESENT_YEAR - 1),
    title: "Efes — Artemis Tapınağı",
    narrative: "Artemis Tapınağı'nın yanışı sırasında bir enerji geçidi açılır.",
    sceneType: "awakening",
    colorTheme: { primary: "#1A0B2E", glow: "#6E00FF", accent: "#E8D5FF" },
    panel: { caption: "Ateş, bir kapıyı hem yakar hem açar.", mood: "gothic-etch" },
  },
  {
    id: "present",
    era: "V. EVRE — Şimdiki Buluşma",
    yearsAgo: 0,
    title: "Temmuz 2026 — Tiyatro Theia",
    narrative: "Tiyatro Theia sahnelerini kurar. Geçitler uyanır. Zaman döngüsü tamamlandı.",
    sceneType: "present",
    colorTheme: { primary: "#0A0118", glow: "#FF2DAF", accent: "#B026FF" },
    panel: { caption: "Kapı, senin için açılıyor.", mood: "cyber-glitch" },
  },
];

const MAX_YEARS = timelineEvents[0].yearsAgo;
const EPSILON = 1;

// src/app/kozmogenez/timelineData.ts içindeki fonksiyonları güncelle:

export function yearsAgoToSliderT(yearsAgo: number): number {
  if (yearsAgo >= MAX_YEARS) return 0;
  if (yearsAgo <= 0) return 1;

  const logMax = Math.log10(MAX_YEARS + EPSILON);
  const logVal = Math.log10(yearsAgo + EPSILON);
  const rawT = 1 - logVal / logMax;

  // ZAMAN BÜKÜCÜ (Warping): Tarihi olayların olduğu son aşamalara (t > 0.8) 
  // daha fazla slider alanı ayırıyoruz ki o kısım daha yavaş ve hassas aksın.
  if (rawT > 0.6) {
    return 0.6 + Math.pow((rawT - 0.6) / 0.4, 1.8) * 0.4;
  }
  return rawT;
}

export function sliderTToYearsAgo(t: number): number {
  if (t <= 0) return MAX_YEARS;
  if (t >= 1) return 0;

  // Zaman bükücünün tersi (De-warping)
  let rawT = t;
  if (t > 0.6) {
    rawT = 0.6 + Math.pow((t - 0.6) / 0.4, 1 / 1.8) * 0.4;
  }

  const logMax = Math.log10(MAX_YEARS + EPSILON);
  const logVal = (1 - rawT) * logMax;
  return Math.pow(10, logVal) - EPSILON;
}

export function getActiveEvent(t: number): TimelineEvent {
  let activeEv = timelineEvents[0];
  for (const ev of timelineEvents) {
    const evT = yearsAgoToSliderT(ev.yearsAgo);
    if (t >= evT) {
      activeEv = ev;
    }
  }
  return activeEv;
}