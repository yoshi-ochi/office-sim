// src/js/config.js
export const CONFIG = {
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbycEuOtzZi1dA_x8oFxlWP2njOUn6kplaa9b4iW-0d5ZAvl9s7qoiqyydEovgEyQp5-IA/exec",
  FIELD_SIZE: 50,
  GRID_SIZE: 0.5,
  GRID_DIVISIONS: 100,
  MOVE_SPEED: 7.5,
  ROTATION_SPEED: 14.0,
  CAMERA_VIEW_SIZE: 14,
  CAMERA_ELEVATION: 30,
  CAMERA_DISTANCE: 26,
  PLAYER_RADIUS: 0.35,

  // 衝突によるポップアップ発火の所要時間（秒）
  COLLISION_TRIGGER_TIME: 2.5,

  FLOORS: [
    { id: 1, name: "1F エントランス・受付", color: 0xe8eaf6 },
    { id: 2, name: "2F 総務・人事・経理部", color: 0xe0f2f1 },
    { id: 3, name: "3F 営業本部・企画推進部", color: 0xf5f5f0 },
    { id: 4, name: "4F DX開発部・システム課", color: 0xe3f2fd },
    { id: 5, name: "5F マーケティング・制作部", color: 0xfce4ec },
    { id: 6, name: "6F 会議室・セミナールーム", color: 0xfff3e0 },
    { id: 7, name: "7F 役員フロア・特別応接室", color: 0xefebe9 },
    { id: 8, name: "8F カフェ・リフレッシュラウンジ", color: 0xf1f8e9 }
  ],

  DISTRIBUTIONS: [
    { id: "dist_01", title: "週次営業進捗レポート", targetRoles: ["課長", "部長"] },
    { id: "dist_02", title: "社内セキュリティ監査通知", targetRoles: ["全員"] },
    { id: "dist_03", title: "健康診断案内票", targetRoles: ["全員"] },
    { id: "dist_04", title: "月次勤怠締め切り通知書", targetRoles: ["リーダー"] },
    { id: "dist_05", title: "新規プロジェクト要件概要", targetRoles: ["開発", "企画"] },
    { id: "dist_06", title: "備品発注承認依頼シート", targetRoles: ["課長"] },
    { id: "dist_07", title: "防災訓練手順チェック表", targetRoles: ["フロア責任者"] },
    { id: "dist_08", title: "郵便・宅配便受領サイン用紙", targetRoles: ["総務"] },
    { id: "dist_09", title: "新任研修アンケート", targetRoles: ["新入社員"] },
    { id: "dist_10", title: "役員会議事録", targetRoles: ["役員"] }
  ]
};