// src/js/entities/Furniture.js
import { CONFIG } from '../config.js';

export class Furniture {
  static create(type, data = {}) {
    const group = new THREE.Group();
    group.name = `furniture_${type}_${Date.now()}`;
    group.userData = {
      type: type,
      gridX: data.x || 0,
      gridZ: data.z || 0,
      role: data.role || '未登録',
      person: data.person || '未設定',
      task: data.task || 'なし',
      distNeeded: data.distNeeded || null,
      isMySeat: !!data.isMySeat,
      isPrinter: !!data.isPrinter
    };

    let mesh;
    switch (type) {
      case 'desk':
        mesh = Furniture.buildDesk(group.userData.isMySeat);
        break;
      case 'chair':
        mesh = Furniture.buildChair();
        break;
      case 'partition':
        mesh = Furniture.buildPartition();
        break;
      case 'printer':
        mesh = Furniture.buildPrinter();
        break;
      case 'locker':
        mesh = Furniture.buildLocker();
        break;
      case 'phone':
        mesh = Furniture.buildPhone();
        break;
      case 'board':
        mesh = Furniture.buildBoard();
        break;
      default:
        mesh = Furniture.buildBox();
    }

    group.add(mesh);

    // 配布物トレーニング用の赤マーカー（赤ポチ）
    const redDotGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const redDotMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const redDot = new THREE.Mesh(redDotGeo, redDotMat);
    redDot.position.set(0, 1.8, 0);
    redDot.visible = false;
    redDot.name = "training_red_dot";
    group.add(redDot);
    group.userData.redDot = redDot;

    // 50cmグリッドへのスナップ配置
    group.position.set(
      Math.round(data.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE,
      0,
      Math.round(data.z / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE
    );
    group.rotation.y = data.rotation || 0;

    return group;
  }

  static buildDesk(isMySeat) {
    const group = new THREE.Group();
    // 天板: 1.4m x 0.8m x 0.05m
    const topGeo = new THREE.BoxGeometry(1.4, 0.05, 0.8);
    const topMat = new THREE.MeshStandardMaterial({
      color: isMySeat ? 0x64b5f6 : 0xd7ccc8,
      roughness: 0.4
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.72;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // 脚
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.5 });
    [ [-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32] ].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.35, z);
      leg.castShadow = true;
      group.add(leg);
    });

    // デスクトップPCモニタ
    const monGeo = new THREE.BoxGeometry(0.5, 0.3, 0.04);
    const monMat = new THREE.MeshStandardMaterial({ color: 0x212121 });
    const monitor = new THREE.Mesh(monGeo, monMat);
    monitor.position.set(0, 0.95, -0.2);
    monitor.castShadow = true;
    group.add(monitor);

    return group;
  }

  static buildChair() {
    const group = new THREE.Group();
    const seatGeo = new THREE.BoxGeometry(0.48, 0.06, 0.48);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.6 });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);

    // 背もたれ
    const backGeo = new THREE.BoxGeometry(0.48, 0.45, 0.05);
    const back = new THREE.Mesh(backGeo, seatMat);
    back.position.set(0, 0.7, -0.22);
    back.castShadow = true;
    group.add(back);

    // 支柱
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8);
    const pole = new THREE.Mesh(poleGeo, seatMat);
    pole.position.y = 0.21;
    group.add(pole);

    return group;
  }

  static buildPartition() {
    const geo = new THREE.BoxGeometry(1.2, 1.4, 0.06);
    const mat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.7 });
    const part = new THREE.Mesh(geo, mat);
    part.position.y = 0.7;
    part.castShadow = true;
    part.receiveShadow = true;
    return part;
  }

  static buildPrinter() {
    const group = new THREE.Group();
    // 複合機本体
    const bodyGeo = new THREE.BoxGeometry(0.9, 0.95, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.48;
    body.castShadow = true;
    group.add(body);

    // 操作パネル
    const panelGeo = new THREE.BoxGeometry(0.4, 0.06, 0.25);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1976d2 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0.15, 0.98, 0.2);
    group.add(panel);

    return group;
  }

  static buildLocker() {
    const geo = new THREE.BoxGeometry(0.9, 1.8, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.4 });
    const locker = new THREE.Mesh(geo, mat);
    locker.position.y = 0.9;
    locker.castShadow = true;
    return locker;
  }

  static buildPhone() {
    const geo = new THREE.BoxGeometry(0.25, 0.1, 0.25);
    const mat = new THREE.MeshStandardMaterial({ color: 0x455a64 });
    const phone = new THREE.Mesh(geo, mat);
    phone.position.y = 0.75;
    return phone;
  }

  static buildBoard() {
    const geo = new THREE.BoxGeometry(1.5, 1.0, 0.05);
    const mat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });
    const board = new THREE.Mesh(geo, mat);
    board.position.y = 1.3;
    board.castShadow = true;
    return board;
  }

  static buildBox() {
    const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffb74d });
    const box = new THREE.Mesh(geo, mat);
    box.position.y = 0.4;
    return box;
  }
}