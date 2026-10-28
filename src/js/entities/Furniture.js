// src/js/entities/Furniture.js
import { CONFIG } from '../config.js';

export class FurnitureFactory {
  static create(type, data = {}) {
    const group = new THREE.Group();
    group.name = `furniture_${type}_${Date.now()}`;

    // 可変棚用サイズパラメータ
    const shelfWidth = parseFloat(data.shelfWidth) || 1.2;
    const shelfDepth = parseFloat(data.shelfDepth) || 0.45;
    const shelfHeight = parseFloat(data.shelfHeight) || 1.8;

    group.userData = {
      type: type,
      gridX: parseFloat(data.x) || 0,
      gridZ: parseFloat(data.z) || 0,
      role: data.role || this.getDefaultRole(type),
      person: data.person || '未設定',
      department: data.department || '編集局',
      shiftWeekday: data.shiftWeekday || data.shift || '09:00-17:00',
      shiftSaturday: data.shiftSaturday || '09:00-15:00',
      shiftHoliday: data.shiftHoliday || '休み',
      extensionNumber: data.extensionNumber || '',
      modelNumber: data.modelNumber || '',
      tonerType: data.tonerType || '',
      drumType: data.drumType || '',
      // 可変サイズ棚データ
      shelfWidth, shelfDepth, shelfHeight,
      isMySeat: !!data.isMySeat,
      isPrinter: type.includes('printer') || !!data.isPrinter,
      isElevator: type === 'elevator' || !!data.isElevator,
      isStairsUp: type === 'stairs_up',
      isStairsDown: type === 'stairs_down',
      collisionRadius: this.getCollisionRadius(type, shelfWidth, shelfDepth)
    };

    let mesh;
    switch (type) {
      // 机 3種
      case 'desk_150_80':
      case 'desk':
        mesh = this.buildDesk(1.5, 0.8, group.userData.isMySeat); break;
      case 'desk_120_70':
        mesh = this.buildDesk(1.2, 0.7, group.userData.isMySeat); break;
      case 'desk_250_100':
        mesh = this.buildDesk(2.5, 1.0, group.userData.isMySeat); break;

      case 'chair': mesh = this.buildChair(); break;
      case 'partition': mesh = this.buildPartition(); break;
      
      // ロッカー (300×60×130)
      case 'locker_300_60':
      case 'locker':
        mesh = this.buildLocker300(); break;

      // 自由サイズ棚
      case 'custom_shelf':
        mesh = this.buildCustomShelf(shelfWidth, shelfDepth, shelfHeight); break;

      // 応接セット (黒)
      case 'sofa_reception':
        mesh = this.buildReceptionSofa(); break;
      case 'table_low_reception':
        mesh = this.buildReceptionLowTable(); break;

      case 'printer_floor':
      case 'printer':
        mesh = this.buildFloorPrinter(group.userData); break;
      case 'printer_desk':
        mesh = this.buildDeskPrinter(group.userData, data.isUnderDesk); break;
      case 'phone': mesh = this.buildPhone(); break;
      case 'board': mesh = this.buildBoard(group); break;
      case 'elevator': mesh = this.buildElevator(); break;
      case 'stairs_up': mesh = this.buildStairsMesh(0x22c55e, 'UP'); break;
      case 'stairs_down': mesh = this.buildStairsMesh(0xf97316, 'DN'); break;
      default: mesh = this.buildBox(); break;
    }
    group.add(mesh);

    const redDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff1744 })
    );
    redDot.position.set(0, 1.8, 0);
    redDot.visible = false;
    group.add(redDot);
    group.userData.redDot = redDot;

    group.position.set(
      Math.round((parseFloat(data.x) || 0) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE,
      0,
      Math.round((parseFloat(data.z) || 0) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE
    );
    group.rotation.y = parseFloat(data.rotation) || 0;

    return group;
  }

  static getDefaultRole(type) {
    if (type.includes('desk')) return '社員デスク';
    if (type === 'sofa_reception') return '応接ソファ';
    if (type === 'table_low_reception') return '応接ローテーブル';
    if (type === 'custom_shelf') return '書類棚';
    if (type.includes('locker')) return 'ロッカー';
    return '共用設備';
  }

  static getCollisionRadius(type, sw, sd) {
    if (type === 'partition' || type === 'phone' || type === 'printer_desk') return 0.3;
    if (type.includes('stairs') || type === 'elevator') return 1.2;
    if (type === 'desk_250_100') return 1.3;
    if (type === 'locker_300_60' || type === 'locker') return 1.5;
    if (type === 'custom_shelf') return Math.max(sw, sd) / 2 + 0.2;
    if (type === 'sofa_reception') return 0.9;
    return 0.65;
  }

  // --- デスク汎用生成 (幅w, 奥行d) ---
  static buildDesk(w, d, isMySeat) {
    const group = new THREE.Group();
    const topGeo = new THREE.BoxGeometry(w, 0.05, d);
    const topMat = new THREE.MeshStandardMaterial({ color: isMySeat ? 0x64b5f6 : 0xd7ccc8, roughness: 0.4 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.72;
    top.castShadow = true;
    group.add(top);

    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x455a64 });
    const xOff = (w / 2) - 0.08;
    const zOff = (d / 2) - 0.08;
    [[-xOff, -zOff], [xOff, -zOff], [-xOff, zOff], [xOff, zOff]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.35, z);
      leg.castShadow = true;
      group.add(leg);
    });

    const mon = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.3, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x212121 })
    );
    mon.position.set(0, 0.95, -d / 4);
    mon.castShadow = true;
    group.add(mon);

    return group;
  }

  // --- ロッカー 300cm × 60cm × 130cm ---
  static buildLocker300() {
    const group = new THREE.Group();
    // 3.0m(幅) × 1.3m(高さ) × 0.6m(奥行)
    const bodyGeo = new THREE.BoxGeometry(3.0, 1.3, 0.6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.5, metalness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.65;
    body.castShadow = true;
    group.add(body);

    // 扉のスリットライン (5扉)
    for (let i = 1; i < 5; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 1.26, 0.02),
        new THREE.MeshBasicMaterial({ color: 0x37474f })
      );
      line.position.set(-1.5 + (i * 0.6), 0.65, 0.301);
      group.add(line);
    }
    return group;
  }

  // --- 自由可変サイズ棚 (custom_shelf) ---
  static buildCustomShelf(w, d, h) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.6 });

    // 側板 左右
    const sideGeo = new THREE.BoxGeometry(0.04, h, d);
    [-w / 2 + 0.02, w / 2 - 0.02].forEach(x => {
      const side = new THREE.Mesh(sideGeo, woodMat);
      side.position.set(x, h / 2, 0);
      side.castShadow = true;
      group.add(side);
    });

    // 天板・底板・中棚 (高さに応じて段数自動計算)
    const shelvesCount = Math.max(2, Math.floor(h / 0.4));
    const shelfGeo = new THREE.BoxGeometry(w - 0.08, 0.03, d);
    for (let i = 0; i <= shelvesCount; i++) {
      const y = (h / shelvesCount) * i;
      const sh = new THREE.Mesh(shelfGeo, woodMat);
      sh.position.set(0, Math.max(0.02, y), 0);
      sh.castShadow = true;
      group.add(sh);
    }

    // 背板
    const backGeo = new THREE.BoxGeometry(w, h, 0.02);
    const backMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.8 });
    const back = new THREE.Mesh(backGeo, backMat);
    back.position.set(0, h / 2, -d / 2 + 0.01);
    group.add(back);

    return group;
  }

  // --- 応接ソファ（黒レザー調・3人掛け） ---
  static buildReceptionSofa() {
    const group = new THREE.Group();
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3, metalness: 0.1 });

    // 座面 (幅1.8m, 奥行0.75m, 高0.42m)
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.75), leatherMat);
    seat.position.y = 0.32;
    seat.castShadow = true;
    group.add(seat);

    // 背もたれ
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.48, 0.2), leatherMat);
    back.position.set(0, 0.62, -0.28);
    back.castShadow = true;
    group.add(back);

    // 肘掛け (左右)
    const armGeo = new THREE.BoxGeometry(0.2, 0.32, 0.78);
    [-0.95, 0.95].forEach(x => {
      const arm = new THREE.Mesh(armGeo, leatherMat);
      arm.position.set(x, 0.44, 0);
      arm.castShadow = true;
      group.add(arm);
    });

    // 金属調脚 (4本)
    const legMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.2, metalness: 0.9 });
    const legGeo = new THREE.CylinderGeometry(0.025, 0.02, 0.2, 8);
    [[-0.85, -0.3], [0.85, -0.3], [-0.85, 0.3], [0.85, 0.3]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.1, z);
      group.add(leg);
    });

    return group;
  }

  // --- 応接ローテーブル（黒鏡面調） ---
  static buildReceptionLowTable() {
    const group = new THREE.Group();
    // 幅1.2m, 奥行0.6m, 高さ0.42m
    const topGeo = new THREE.BoxGeometry(1.2, 0.05, 0.6);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.4 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.4;
    top.castShadow = true;
    group.add(top);

    // テーブル脚 (スクエア金属ブラック)
    const legMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4 });
    const legGeo = new THREE.BoxGeometry(0.04, 0.38, 0.04);
    [[-0.54, -0.24], [0.54, -0.24], [-0.54, 0.24], [0.54, 0.24]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.19, z);
      leg.castShadow = true;
      group.add(leg);
    });

    return group;
  }

  // （既存の chair, partition, printer, phone, board, elevator, stairs はそのまま維持）
  static buildChair() {
    const group = new THREE.Group();
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x37474f });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.48), seatMat);
    seat.position.y = 0.45; seat.castShadow = true; group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.05), seatMat);
    back.position.set(0, 0.7, -0.22); back.castShadow = true; group.add(back);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), seatMat);
    pole.position.y = 0.21; group.add(pole);
    return group;
  }

  static buildPartition() {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.06), new THREE.MeshStandardMaterial({ color: 0x90a4ae }));
    mesh.position.y = 0.7; mesh.castShadow = true; return mesh;
  }

  static buildFloorPrinter(userData) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 0.8), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 }));
    body.position.y = 0.48; body.castShadow = true; group.add(body);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.25), new THREE.MeshStandardMaterial({ color: 0x1976d2 }));
    panel.position.set(0.15, 0.98, 0.2); group.add(panel);
    return group;
  }

  static buildDeskPrinter(userData, isUnderDesk = false) {
    const group = new THREE.Group();
    const h = isUnderDesk ? 0.15 : 0.75;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.24, 0.38), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
    body.position.y = h + 0.12; body.castShadow = true; group.add(body);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.12), new THREE.MeshStandardMaterial({ color: 0x334155 }));
    tray.position.set(0, h + 0.1, 0.22); group.add(tray);
    return group;
  }

  static buildPhone() {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.22), new THREE.MeshStandardMaterial({ color: 0x37474f }));
    mesh.position.y = 0.76; group.add(mesh);
    return group;
  }

  static buildBoard(parentGroup) {
    const group = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.06), new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 }));
    frame.position.y = 1.35; frame.castShadow = true; group.add(frame);
    const face = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.98, 0.07), new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.9 }));
    face.position.y = 1.35; group.add(face);
    const badge = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    badge.position.set(0.65, 1.8, 0.1); badge.visible = false; group.add(badge);
    parentGroup.userData.unreadBoardDot = badge;
    return group;
  }

  static buildElevator() {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 1.6), new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.4, metalness: 0.3 }));
    shaft.position.y = 1.6; shaft.castShadow = true; group.add(shaft);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.06), new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.2, metalness: 0.8 }));
    door.position.set(0, 1.2, 0.82); group.add(door);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.4, 0.08), new THREE.MeshBasicMaterial({ color: 0x263238 }));
    slit.position.set(0, 1.2, 0.83); group.add(slit);
    const ind = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.08), new THREE.MeshBasicMaterial({ color: 0xffb300 }));
    ind.position.set(0, 2.65, 0.83); group.add(ind);
    return group;
  }

  static buildStairsMesh(signColor, text) {
    const group = new THREE.Group();
    const steps = 5, stepDepth = 0.35, stepHeight = 0.24, width = 1.5;
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });

    for (let i = 0; i < steps; i++) {
      const h = (i + 1) * stepHeight;
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(width, h, stepDepth), stairMat);
      stepMesh.position.set(0, h / 2, -0.7 + (i * stepDepth));
      stepMesh.castShadow = true; group.add(stepMesh);
    }

    const railMat = new THREE.MeshStandardMaterial({ color: signColor, roughness: 0.3, metalness: 0.5 });
    [-0.75, 0.75].forEach(x => {
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4), railMat);
      p1.position.set(x, 1.2, 0.6); group.add(p1);
      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4), railMat);
      p2.position.set(x, 0.6, -0.6); group.add(p2);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.85), railMat);
      bar.rotation.x = Math.PI / 6.2;
      bar.position.set(x, 1.28, 0); group.add(bar);
    });

    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 0.08), new THREE.MeshBasicMaterial({ color: signColor }));
    sign.position.set(0, 2.2, 0); group.add(sign);

    return group;
  }

  static buildBox() {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xffb74d }));
    mesh.position.y = 0.4; return mesh;
  }
}