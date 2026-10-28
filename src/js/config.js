// src/js/config.js
export const CONFIG = {
  FIELD_SIZE: 80,
  GRID_SIZE: 0.1,
  DISPLAY_GRID_SIZE: 0.5,
  GRID_DIVISIONS: 160,
  MAJOR_GRID_DIVISIONS: 16,
  PLAYER_RADIUS: 0.35,
  MOVE_SPEED: 5.5,
  ROTATION_SPEED: 12.0,
  COLLISION_TRIGGER_TIME: 1.2,
  CAMERA_DISTANCE: 22,
  CAMERA_ELEVATION: 26,
  CAMERA_VIEW_SIZE: 15,
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbzjOakTpi9SBII8IYt-G-uoBOhHzN8YfrPx3Yt861SVu_h3tgIvHahyKyIr2QcsCLgDRg/exec",

  FLOORS: [
    { id: 1, name: "1F エントランス・受付・新聞室", color: 0xc8cbcf },
    { id: 2, name: "2F 販売部・総務・経理", color: 0xc9ccd0 },
    { id: 3, name: "3F 編集局・連絡員席", color: 0xcfd2d6 },
    { id: 4, name: "4F DX推進・システム", color: 0xc8cbcf },
    { id: 5, name: "5F 制作・文化部・写真映像部", color: 0xcbd0d4 },
    { id: 6, name: "6F ニュースセンター・編制", color: 0xcfd2d6 }, // 白い机がくっきり映える落ち着いた暗めグレー
    { id: 7, name: "7F 論説委員会・役員室", color: 0xcad0d5 },
    { id: 8, name: "8F カフェ・ラウンジ", color: 0xcfd2d6 }
  ]
};