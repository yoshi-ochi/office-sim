// src/js/entities/Furniture.js
import { CONFIG } from '../config.js';

export class FurnitureFactory {
  static getDimensions(type, data) {
    if (type === 'desk_150_80' || type === 'desk') return { w: 1.5, d: 0.8 };
    if (type === 'desk_120_70') return { w: 1.2, d: 0.7 };
    if (type === 'desk_250_100') return { w: 2.5, d: 1.0 };
    if (type === 'chair') return { w: 0.5, d: 0.5 };
    if (type === 'partition') return { w: 1.2, d: 0.1 };
    if (type === 'locker_300_60' || type === 'locker') return { w: 3.0, d: 0.6 };
    if (type === 'custom_shelf') {
      return {
        w: parseFloat(data.shelfWidth) || 1.2,
        d: parseFloat(data.shelfDepth) || 0.45
      };
    }
    if (type === 'sofa_reception') return { w: 1.9, d: 0.8 };
    if (type === 'table_low_reception') return { w: 1.2, d: 0.6 };
    if (type === 'printer_floor' || type === 'printer') return { w: 0.9, d: 0.8 };
    if (type === 'elevator') return { w: 2.2, d: 1.6 };
    if (type.includes('stairs')) return { w: 1.6, d: 2.4 };
    return { w: 0.8, d: 0.8 };
  }

  static create(type, data = {}) {
    const group = new THREE.Group();
    group.name = `furniture_${type}_${Date.now()}`;

    const shelfWidth = parseFloat(data.shelfWidth) || 1.2;
    const shelfDepth = parseFloat(data.shelfDepth) || 0.45;
    const shelfHeight = parseFloat(data.shelfHeight) || 1.8;
    const dims = this.getDimensions(type, data);

    group.userData = {
      type: type,
      boxW: dims.w,
      boxD: dims.d,
      gridX: parseFloat(data.x) || 0,
      gridZ: parseFloat(data.z) || 0,
      role: data.role || (type.includes('desk') ? '社員デスク' : (type === 'stairs_up' ? '上り階段' : (type === 'stairs_down' ? '下り階段' : '共用設備'))),
      person: data.person || '未設定',
      department: data.department || '編集局',
      shiftWeekday: data.shiftWeekday || data.shift || '09:00-17:00',
      shiftSaturday: data.shiftSaturday || '09:00-15:00',
      shiftHoliday: data.shiftHoliday || '休み',
      extensionNumber: data.extensionNumber || '',
      modelNumber: data.modelNumber || '',
      tonerType: data.tonerType || '',
      drumType: data.drumType || '',
      shelfWidth, shelfDepth, shelfHeight,
      isMySeat: !!data.isMySeat,
      isPrinter: type.includes('printer') || !!data.isPrinter,
      isElevator: type === 'elevator' || !!data.isElevator,
      isStairsUp: type === 'stairs_up',
      isStairsDown: type === 'stairs_down'
    };

    let mesh;
    switch (type) {
      case 'desk_150_80':
      case 'desk':
        mesh = this.buildDesk(1.5, 0.8, group.userData.isMySeat); break;
      case 'desk_120_70':
        mesh = this.buildDesk(1.2, 0.7, group.userData.isMySeat); break;
      case 'desk_250_100':
        mesh = this.buildDesk(2.5, 1.0, group.userData.isMySeat); break;
      case 'chair': mesh = this.buildChair(); break;
      case 'partition': mesh = this.buildPartition(); break;
      case 'locker_300_60':
      case 'locker':
        mesh = this.buildLocker300(); break;
      case 'custom_shelf':
        mesh = this.buildCustomShelf(shelfWidth, shelfDepth, shelfHeight); break;
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
      case 'elevator': mesh = this.buildElevator(group); break;
      case 'stairs_up': mesh = this.buildStairsUp(); break;
      case 'stairs_down': mesh = this.buildStairsDown(); break;
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

  static buildDesk(w, d, isMySeat) {
    const group = new THREE.Group();
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.05, d),
      new THREE.MeshStandardMaterial({ color: isMySeat ? 0x64b5f6 : 0xd7ccc8, roughness: 0.4 })
    );
    top.position.y = 0.72;
    group.add(top);

    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x455a64 });
    const xOff = (w / 2) - 0.08;
    const zOff = (d / 2) - 0.08;
    [[-xOff, -zOff], [xOff, -zOff], [-xOff, zOff], [xOff, zOff]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.35, z);
      group.add(leg);
    });

    const mon = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.3, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x212121 })
    );
    mon.position.set(0, 0.95, -d / 4);
    group.add(mon);
    return group;
  }

  static buildLocker300() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 1.3, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.5, metalness: 0.2 })
    );
    body.position.y = 0.65;
    group.add(body);

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

  static buildCustomShelf(w, d, h) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.6 });

    [-w / 2 + 0.02, w / 2 - 0.02].forEach(x => {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, d), woodMat);
      side.position.set(x, h / 2, 0);
      group.add(side);
    });

    const shelvesCount = Math.max(2, Math.floor(h / 0.4));
    for (let i = 0; i <= shelvesCount; i++) {
      const y = (h / shelvesCount) * i;
      const sh = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.03, d), woodMat);
      sh.position.set(0, Math.max(0.02, y), 0);
      group.add(sh);
    }

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.8 })
    );
    back.position.set(0, h / 2, -d / 2 + 0.01);
    group.add(back);
    return group;
  }

  static buildReceptionSofa() {
    const group = new THREE.Group();
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3, metalness: 0.1 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.8), leatherMat);
    seat.position.y = 0.32;
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.48, 0.2), leatherMat);
    back.position.set(0, 0.62, -0.3);
    group.add(back);

    [-0.95, 0.95].forEach(x => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 0.8), leatherMat);
      arm.position.set(x, 0.44, 0);
      group.add(arm);
    });

    const legMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.2, metalness: 0.9 });
    const legGeo = new THREE.CylinderGeometry(0.025, 0.02, 0.2, 8);
    [[-0.85, -0.3], [0.85, -0.3], [-0.85, 0.3], [0.85, 0.3]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.1, z);
      group.add(leg);
    });
    return group;
  }

  static buildReceptionLowTable() {
    const group = new THREE.Group();
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.05, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.1, metalness: 0.4 })
    );
    top.position.y = 0.4;
    group.add(top);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4 });
    const legGeo = new THREE.BoxGeometry(0.04, 0.38, 0.04);
    [[-0.54, -0.24], [0.54, -0.24], [-0.54, 0.24], [0.54, 0.24]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.19, z);
      group.add(leg);
    });
    return group;
  }

  static buildChair() {
    const group = new THREE.Group();
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x37474f });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.48), seatMat);
    seat.position.y = 0.45; group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.05), seatMat);
    back.position.set(0, 0.7, -0.22); group.add(back);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), seatMat);
    pole.position.y = 0.21; group.add(pole);
    return group;
  }

  static buildPartition() {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.06), new THREE.MeshStandardMaterial({ color: 0x90a4ae }));
    mesh.position.y = 0.7; return mesh;
  }

  static buildFloorPrinter(userData) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 0.8), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 }));
    body.position.y = 0.48; group.add(body);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.25), new THREE.MeshStandardMaterial({ color: 0x1976d2 }));
    panel.position.set(0.15, 0.98, 0.2); group.add(panel);
    return group;
  }

  static buildDeskPrinter(userData, isUnderDesk = false) {
    const group = new THREE.Group();
    const h = isUnderDesk ? 0.15 : 0.75;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.24, 0.38), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
    body.position.y = h + 0.12; group.add(body);
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
    frame.position.y = 1.35; group.add(frame);
    const face = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.98, 0.07), new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.9 }));
    face.position.y = 1.35; group.add(face);
    const badge = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    badge.position.set(0.65, 1.8, 0.1); badge.visible = false; group.add(badge);
    parentGroup.userData.unreadBoardDot = badge;
    return group;
  }

  static buildElevator(parentGroup) {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 1.6), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.3 }));
    shaft.position.y = 1.6; group.add(shaft);

    const interior = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 1.3), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
    interior.position.set(0, 1.2, 0.1); group.add(interior);

    const doorMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.2, metalness: 0.8 });
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.38, 0.05), doorMat);
    doorL.position.set(-0.35, 1.2, 0.8); group.add(doorL);

    const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.38, 0.05), doorMat);
    doorR.position.set(0.35, 1.2, 0.8); group.add(doorR);

    parentGroup.userData.doorL = doorL;
    parentGroup.userData.doorR = doorR;

    const ind = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.08), new THREE.MeshBasicMaterial({ color: 0xffb300 }));
    ind.position.set(0, 2.65, 0.83); group.add(ind);
    return group;
  }

  // ★ 上り階段: 手前が低い1段目、奥へ登っていく
  static buildStairsUp() {
    const group = new THREE.Group();
    const steps = 6, stepDepth = 0.30, stepHeight = 0.18, width = 1.4;
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x828b96, roughness: 0.6 });

    for (let i = 0; i < steps; i++) {
      const h = (i + 1) * stepHeight;
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(width, h, stepDepth), stairMat);
      stepMesh.position.set(0, h / 2, 0.75 - (i * stepDepth));
      group.add(stepMesh);
    }

    const railMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.6 });
    [-0.72, 0.72].forEach(x => {
      const pFront = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7), railMat);
      pFront.position.set(x, 0.55, 0.75); group.add(pFront);

      const pBack = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7), railMat);
      pBack.position.set(x, 1.25, -0.75); group.add(pBack);

      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 1.85), railMat);
      bar.rotation.x = -Math.PI / 5.8;
      bar.position.set(x, 1.25, 0); group.add(bar);
    });

    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.04), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    sign.position.set(0, 1.9, -0.75); group.add(sign);

    return group;
  }

  // ★ 下り階段: フタを全廃し、地下へ下りる段差を完全可視化（奥へ暗くフェード）
  static buildStairsDown() {
    const group = new THREE.Group();
    const steps = 6, stepDepth = 0.30, stepHeight = 0.18, width = 1.35;

    // 1. 地下の立体ピット壁（奥壁・両側壁・底面）
    const pitMat = new THREE.MeshStandardMaterial({ color: 0x111622, roughness: 0.9 });
    
    // 奥の壁
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 1.6, 0.04), pitMat);
    wallBack.position.set(0, -0.8, -1.0); group.add(wallBack);

    // 左右の壁（地下部分）
    [-0.70, 0.70].forEach(x => {
      const wallSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 2.0), pitMat);
      wallSide.position.set(x, -0.8, 0); group.add(wallSide);
    });

    // 坑道底面
    const pitFloor = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.04, 2.0), pitMat);
    pitFloor.position.set(0, -1.6, 0); group.add(pitFloor);

    // 2. 下っていく階段ステップ（手前は明るく見え、奥に向かって暗くフェードする立体）
    // 手前 (i=0) は床面の高さ直下からスタートし、奥に向かって一段ずつ深くなる
    const stepColors = [0x9ba4af, 0x828b96, 0x69727d, 0x515a65, 0x3a424d, 0x252c36];

    for (let i = 0; i < steps; i++) {
      const stepY = -((i + 1) * stepHeight);
      const stepZ = 0.75 - (i * stepDepth);

      const mat = new THREE.MeshStandardMaterial({
        color: stepColors[i],
        roughness: 0.45,
        metalness: 0.1
      });

      // 踏板メッシュ
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, stepDepth), mat);
      stepMesh.position.set(0, stepY + 0.09, stepZ);
      group.add(stepMesh);

      // 各段差の視認エッジライン（白色ハイライト）
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.02, 0.025),
        new THREE.MeshBasicMaterial({ color: 0xdbe2ea })
      );
      edge.position.set(0, stepY + 0.18, stepZ + (stepDepth / 2));
      group.add(edge);
    }

    // 3. 地上の低背ガードフェンス（高さ 0.38m）
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.6 });
    [-0.70, 0.70].forEach(x => {
      const sideFence = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.38, 2.0), fenceMat);
      sideFence.position.set(x, 0.19, 0); group.add(sideFence);
    });
    const backFence = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.38, 0.03), fenceMat);
    backFence.position.set(0, 0.19, -1.0); group.add(backFence);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.18, 0.04), new THREE.MeshBasicMaterial({ color: 0x475569 }));
    sign.position.set(0, 0.48, -1.0); group.add(sign);

    return group;
  }

  static buildBox() {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xffb74d }));
    mesh.position.y = 0.4; return mesh;
  }
}
