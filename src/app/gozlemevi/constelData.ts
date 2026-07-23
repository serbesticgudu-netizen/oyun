export interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
}

export interface ConstellationLine {
  start: [number, number, number];
  end: [number, number, number];
}

// Gök kubbenin yarıçapı (Ay'ın arkasında durması için büyük olmalı)
const RADIUS = 300;

// Rastgele gökyüzü yıldızları üreteç fonksiyonu
export const generateBackgroundStars = (count = 300): Star[] => {
  return Array.from({ length: count }).map(() => {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    
    return {
      x: RADIUS * Math.sin(phi) * Math.cos(theta),
      y: RADIUS * Math.sin(phi) * Math.sin(theta),
      z: RADIUS * Math.cos(phi),
      size: Math.random() * 1.5 + 0.5,
      brightness: Math.random() * 0.5 + 0.5
    };
  });
};

// Santorini semalarında görünecek meşhur kadim takım yıldız hatları (3D koordinatları)
export const constellationLines: Record<string, ConstellationLine[]> = {
  orion: [
    { start: [100, 250, 100], end: [120, 220, 90] }, // Avcı kemeri
    { start: [120, 220, 90], end: [140, 190, 80] },
    { start: [100, 250, 100], end: [80, 280, 120] }, // Betelgeuse omuz
  ],
  ursaMajor: [
    { start: [-150, 200, -50], end: [-120, 210, -30] }, // Büyük ayı sapı
    { start: [-120, 210, -30], end: [-90, 220, -10] },
    { start: [-90, 220, -10], end: [-70, 180, 0] }, // Cezve gövdesi
    { start: [-70, 180, 0], end: [-100, 150, -20] },
  ]
};