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
      role: data.role || (type === 'desk' ? '社員' : (type === 'elevator' ? 'エレベーター' : (type === 'stairs' ? '階段' : '共用備品'))),
      person: data.person || '未設定',
      task: data.task || 'なし',
      distNeeded: data.distNeeded || null,
      isMySeat: !!data.isMySeat,
      isPrinter: !!data.isPrinter || type === 'printer',
      isElevator: !!data.isElevator || type === 'elevator',
      isStairs: !!data.isStairs || type === 'stairs',
      collisionRadius: (type === 'partition' || type === 'phone') ? 0.35 : (type === 'elevator' || type === 'stairs' ? 1.1 : 0.65)
    };

    let mesh;
    switch (type) {
      case 'desk': mesh = this.buildDesk(group.userData.isMySeat); break;
      case 'chair': mesh = this.buildChair(); break;
      case 'partition': mesh = this.buildPartition(); break;
      case 'printer': mesh = this.buildPrinter(); break;
      case 'locker': mesh = this.buildLocker(); break;
      case 'phone': mesh = this.buildPhone(); break;
      case 'board': mesh = this.buildBoard(); break;
      case 'elevator': mesh = this.buildElevator(); break;
      case 'stairs': mesh = this.buildStairs(); break;
      default: mesh = this.buildBox(); break;
    }
    group.add(mesh);

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
    top.position.y = 0.72;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x455a64 });
    [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.35, z);
      leg.castShadow = true;
      group.add(leg);
    });

    const monGeo = new THREE.BoxGeometry(0.5, 0.3, 0.04);
    const monMat = new THREE.MeshStandardMaterial({ color: 0x212121 });
    const mon = new THREE.Mesh(monGeo, monMat);
    mon.position.set(0, 0.95, -0.2);
    mon.castShadow = true;
    group.add(mon);

    return group;
  }

  static buildChair() {
    const group = new THREE.Group();
    const seatGeo = new THREE.BoxGeometry(0.48, 0.06, 0.48);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x37474f });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);

    const backGeo = new THREE.BoxGeometry(0.48, 0.45, 0.05);
    const back = new THREE.Mesh(backGeo, seatMat);
    back.position.set(0, 0.7, -0.22);
    back.castShadow = true;
    group.add(back);

    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8);
    const pole = new THREE.Mesh(poleGeo, seatMat);
    pole.position.y = 0.21;
    group.add(pole);

    return group;
  }

  static buildPartition() {
    const geo = new THREE.BoxGeometry(1.2, 1.4, 0.06);
    const mat = new THREE.MeshStandardMaterial({ color: 0x90a4ae });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.7;
    mesh.castShadow = true;
    return mesh;
  }

  static buildPrinter() {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.9, 0.95, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.48;
    body.castShadow = true;
    group.add(body);

    const panelGeo = new THREE.BoxGeometry(0.4, 0.06, 0.25);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1976d2 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0.15, 0.98, 0.2);
    group.add(panel);

    return group;
  }

  static buildLocker() {
    const geo = new THREE.BoxGeometry(0.9, 1.8, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb0bec5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.9;
    mesh.castShadow = true;
    return mesh;
  }

  static buildPhone() {
    const geo = new THREE.BoxGeometry(0.25, 0.1, 0.25);
    const mat = new THREE.MeshStandardMaterial({ color: 0x455a64 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.75;
    return mesh;
  }

  static buildBoard() {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(1.6, 1.1, 0.06);
    const mat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });
    const frame = new THREE.Mesh(geo, mat);
    frame.position.y = 1.35;
    frame.castShadow = true;
    group.add(frame);

    const faceGeo = new THREE.BoxGeometry(1.48, 0.98, 0.07);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.9 });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.y = 1.35;
    group.add(face);

    return group;
  }

  static buildBox() {
    const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffb74d });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.4;
    return mesh;
  }

  // --- 新規追加: エレベーター ---
  static buildElevator() {
    const group = new THREE.Group();

    // シャフト枠
    const shaftGeo = new THREE.BoxGeometry(2.2, 3.2, 1.6);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.4, metalness: 0.3 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 1.6;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    group.add(shaft);

    // ドアパネル
    const doorGeo = new THREE.BoxGeometry(1.4, 2.4, 0.06);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.2, metalness: 0.8 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.2, 0.82);
    group.add(door);

    // 中央スリット線
    const slitGeo = new THREE.BoxGeometry(0.04, 2.4, 0.08);
    const slitMat = new THREE.MeshBasicMaterial({ color: 0x263238 });
    const slit = new THREE.Mesh(slitGeo, slitMat);
    slit.position.set(0, 1.2, 0.83);
    group.add(slit);

    // 上部フロア表示インジケーター
    const indGeo = new THREE.BoxGeometry(0.8, 0.25, 0.08);
    const indMat = new THREE.MeshBasicMaterial({ color: 0xffb300 });
    const ind = new THREE.Mesh(indGeo, indMat);
    ind.position.set(0, 2.65, 0.83);
    group.add(ind);

    return group;
  }

  // --- 新規追加: 階段 ---
  static buildStairs() {
    const group = new THREE.Group();
    const steps = 5;
    const stepDepth = 0.35;
    const stepHeight = 0.25;
    const width = 1.6;
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.7 });

    for (let i = 0; i < steps; i++) {
      const h = (i + 1) * stepHeight;
      const stepGeo = new THREE.BoxGeometry(width, h, stepDepth);
      const stepMesh = new THREE.Mesh(stepGeo, stairMat);
      stepMesh.position.set(0, h / 2, -0.7 + (i * stepDepth));
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      group.add(stepMesh);
    }

    // 手すり（左右）
    const railMat = new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.3, metalness: 0.5 });
    [-0.8, 0.8].forEach(x => {
      const poleGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.4);
      const pole1 = new THREE.Mesh(poleGeo, railMat);
      pole1.position.set(x, 1.2, 0.6);
      group.add(pole1);

      const pole2 = new THREE.Mesh(poleGeo, railMat);
      pole2.position.set(x, 0.6, -0.6);
      group.add(pole2);

      const barGeo = new THREE.BoxGeometry(0.04, 0.04, 1.85);
      const bar = new THREE.Mesh(barGeo, railMat);
      bar.rotation.x = Math.PI / 6.2;
      bar.position.set(x, 1.28, 0);
      group.add(bar);
    });

    return group;
  }
}