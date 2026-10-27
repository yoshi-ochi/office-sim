// src/js/ui/Minimap.js
import { CONFIG } from '../config.js';

export class Minimap {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.size = this.canvas.width;
    this.fieldSize = CONFIG.FIELD_SIZE;
  }

  update(playerPos, floorObjects) {
    const ctx = this.ctx;
    const w = this.size;
    ctx.clearRect(0, 0, w, w);

    // フロア下地
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, w);

    const toMapX = x => ((x + this.fieldSize / 2) / this.fieldSize) * w;
    const toMapY = z => ((z + this.fieldSize / 2) / this.fieldSize) * w;

    // 家具・設備の描画
    floorObjects.forEach(obj => {
      const mx = toMapX(obj.position.x);
      const my = toMapY(obj.position.z);
      const t = obj.userData.type || '';

      if (t === 'elevator' || t === 'stairs_up' || t === 'stairs_down' || t === 'stairs') {
        ctx.fillStyle = t === 'stairs_up' ? '#22c55e' : (t === 'stairs_down' ? '#f97316' : '#f59e0b');
        ctx.fillRect(mx - 3, my - 3, 6, 6);
      } else if (t === 'desk') {
        ctx.fillStyle = obj.userData.isMySeat ? '#38bdf8' : '#94a3b8';
        ctx.fillRect(mx - 3, my - 2, 6, 4);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(mx - 2, my - 2, 4, 4);
      }

      // タスク対象 (赤丸)
      if (obj.userData.redDot && obj.userData.redDot.visible) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // プレイヤー自位置
    const px = toMapX(playerPos.x);
    const py = toMapY(playerPos.z);
    ctx.fillStyle = '#ef4444'; // 自アバターの色（赤）に合わせる
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}