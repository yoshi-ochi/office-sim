// src/js/entities/Furniture.js
import { CONFIG } from '../config.js';

export class FurnitureFactory {
  static create(type, data = {}) {
    const group = new THREE.Group();
    group.name = `furniture_${type}_${Date.now()}`;
    group.userData = {
      type: type,
      gridX: parseFloat(data.x) || 0,
      gridZ: parseFloat(data.z) || 0,
      role: data.role || (type === 'desk' ? '社員' : (type === 'stairs_up' ? '上り階段' : (type === 'stairs_down' ? '下り階段' : '共用設備'))),
      person: data.person || '未設定',
      department: data.department || '編集局',
      shift: data.shift || '09:00-17:00',
      isMySeat: !!data.isMySeat,
      isPrinter: !!data.isPrinter || type === 'printer',
      isElevator: !!data.isElevator || type === 'elevator',
      isStairsUp: type === 'stairs_up',
      isStairsDown: type === 'stairs_down',
      collisionRadius: (type === 'partition' || type === 'phone') ? 0.35 : (type.includes('stairs') || type === 'elevator' ? 1.2 : 0.65)
    };

    let mesh;
    switch (type) {
      case 'desk': mesh = this.buildDesk(group.userData.isMySeat); break;
      case 'chair': mesh = this.buildChair(); break;
      case 'partition': mesh = this.buildPartition(); break;
      case 'printer': mesh = this.buildPrinter(); break;
      case 'locker': mesh = this.buildLocker(); break;
      case 'phone': mesh = this.buildPhone(); break;
      case 'board': mesh = this.buildBoard(group); break;
      case 'elevator': mesh = this.buildElevator(); break;
      case 'stairs_up': mesh = this.buildStairsMesh(0x22c55e, 'UP'); break; // 緑（上り）
      case 'stairs_down': mesh = this.buildStairsMesh(0xf97316, 'DN'); break; // オレンジ（下り）
      default: mesh = this.buildBox(); break;
    }
    group.add(mesh);

    // 配布タスク用赤球マーカー
    const redDotGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const redDotMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const redDot = new THREE.Mesh(redDotGeo, redDotMat);
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

  static buildDesk(isMySeat) {
    const group = new THREE.Group();
    const topGeo = new THREE.BoxGeometry(1.4, 0.05, 0.8);
    const topMat = new THREE.MeshStandardMaterial({ color: isMySeat ? 0x64b5f6 : 0xd7ccc8, roughness: 0.4 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.72; top.castShadow = true;
    group.add(top);

    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x455a64 });
    [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.35, z); leg.castShadow = true;
      group.add(leg);
    });

    const monGeo = new THREE.BoxGeometry(0.5, 0.3, 0.04);
    const monMat = new THREE.MeshStandardMaterial({ color: 0x212121 });
    const mon = new THREE.Mesh(monGeo, monMat);
    mon.position.set(0, 0.95, -0.2); mon.castShadow = true;
    group.add(mon);
    return group;
  }

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

  static buildPrinter() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 0.8), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
    body.position.y = 0.48; body.castShadow = true; group.add(body);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.25), new THREE.MeshStandardMaterial({ color: 0x1976d2 }));
    panel.position.set(0.15, 0.98, 0.2); group.add(panel);
    return group;
  }

  static buildLocker() {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.5), new THREE.MeshStandardMaterial({ color: 0xb0bec5 }));
    mesh.position.y = 0.9; mesh.castShadow = true; return mesh;
  }

  static buildPhone() {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.1, 0.25), new THREE.MeshStandardMaterial({ color: 0x455a64 }));
    mesh.position.y = 0.75; return mesh;
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
    const ind = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.08), new THREE.MeshBasicMaterial({ color: 0xffb300 }));
    ind.position.set(0, 2.65, 0.83); group.add(ind);
    return group;
  }

  // 上り階段・下り階段の共通ステップモデル
  static buildStairsMesh(signColor, text) {
    const group = new THREE.Group();
    const steps = 5, stepDepth = 0.35, stepHeight = 0.24, width = 1.6;
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });

    for (let i = 0; i < steps; i++) {
      const h = (i + 1) * stepHeight;
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(width, h, stepDepth), stairMat);
      stepMesh.position.set(0, h / 2, -0.7 + (i * stepDepth));
      stepMesh.castShadow = true; group.add(stepMesh);
    }

    // 手すり
    const railMat = new THREE.MeshStandardMaterial({ color: signColor, roughness: 0.3, metalness: 0.5 });
    [-0.8, 0.8].forEach(x => {
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4), railMat);
      p1.position.set(x, 1.2, 0.6); group.add(p1);
      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4), railMat);
      p2.position.set(x, 0.6, -0.6); group.add(p2);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.85), railMat);
      bar.rotation.x = Math.PI / 6.2;
      bar.position.set(x, 1.28, 0); group.add(bar);
    });

    // 階段頭上の案内サイン（▲UP / ▼DOWN）
    const signGeo = new THREE.BoxGeometry(1.0, 0.35, 0.08);
    const signMat = new THREE.MeshBasicMaterial({ color: signColor });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 2.2, 0);
    group.add(sign);

    return group;
  }

  static buildBox() {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xffb74d }));
    mesh.position.y = 0.4; return mesh;
  }
}