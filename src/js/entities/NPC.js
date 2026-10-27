// src/js/entities/NPC.js

export class NPCManager {
  /**
   * シフト文字列（"09:00-17:00", "15:00-24:00" など）から現在勤務中か判定
   */
  static isWorkingNow(shiftStr) {
    if (!shiftStr || shiftStr === '常駐' || shiftStr === '24時間') return true;
    const parts = shiftStr.split('-');
    if (parts.length !== 2) return true;

    const parseMinutes = str => {
      const [h, m] = str.trim().split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const start = parseMinutes(parts[0]);
    const end = parseMinutes(parts[1]);
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();

    if (start <= end) {
      return current >= start && current < end;
    } else {
      // 日跨ぎシフト (例: 15:00-24:00, 22:00-06:00)
      return current >= start || current < end;
    }
  }

  /**
   * 勤務中NPCアバターの生成
   */
  static createSittingNPC(name, role) {
    const group = new THREE.Group();
    group.name = `npc_${name}`;

    // 頭部
    const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.15;
    head.castShadow = true;
    group.add(head);

    // 胴体 (スーツ)
    const bodyGeo = new THREE.BoxGeometry(0.36, 0.45, 0.22);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    group.add(body);

    // ネームバッジ (頭上に浮遊)
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.roundRect(0, 0, 128, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name || '社員', 64, 16);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.y = 1.5;
    sprite.scale.set(0.8, 0.2, 1);
    group.add(sprite);

    group.userData = { isNPC: true, name, role };
    return group;
  }
}