// src/js/entities/Player.js
import { CONFIG } from '../config.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.position = new THREE.Vector3(0, 0, 0);
    this.targetRotation = 0;
    this.speed = CONFIG.MOVE_SPEED;
    this.bounceTimer = 0;

    this.createModel();
  }

  createModel() {
    this.mesh = new THREE.Group();

    // 頭部（赤い球体）
    const headGeo = new THREE.SphereGeometry(0.35, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xe53935,
      roughness: 0.25,
      metalness: 0.1
    });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 1.35;
    this.head.castShadow = true;
    this.mesh.add(this.head);

    // 下部ピンボディ（逆円錐）
    const coneGeo = new THREE.ConeGeometry(0.28, 0.9, 24);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0xc62828,
      roughness: 0.3
    });
    this.body = new THREE.Mesh(coneGeo, coneMat);
    this.body.rotation.x = Math.PI;
    this.body.position.y = 0.7;
    this.body.castShadow = true;
    this.mesh.add(this.body);

    // 接地影用シャドウリング
    const shadowGeo = new THREE.RingGeometry(0.05, 0.35, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    this.mesh.add(shadowMesh);

    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  update(moveVec, delta) {
    const len = Math.hypot(moveVec.x, moveVec.y);

    if (len > 0.05) {
      const normX = moveVec.x / Math.max(1, len);
      const normZ = moveVec.y / Math.max(1, len);
      const moveDistance = this.speed * Math.min(len, 1.0) * delta;

      // 境界制限（50m四方 = -24m ～ 24m）
      const halfBound = (CONFIG.FIELD_SIZE / 2) - 1.0;
      this.mesh.position.x = Math.max(-halfBound, Math.min(halfBound, this.mesh.position.x + normX * moveDistance));
      this.mesh.position.z = Math.max(-halfBound, Math.min(halfBound, this.mesh.position.z + normZ * moveDistance));

      // 進行方向へのなめらかな旋回
      this.targetRotation = Math.atan2(normX, normZ);
      this.mesh.rotation.y = THREE.MathUtils.lerp(
        this.mesh.rotation.y,
        this.targetRotation,
        CONFIG.ROTATION_SPEED * delta
      );

      // 移動中の微小ホップアニメーション（どうぶつの森風）
      this.bounceTimer += delta * 15;
      this.head.position.y = 1.35 + Math.sin(this.bounceTimer) * 0.06;
      this.body.position.y = 0.7 + Math.sin(this.bounceTimer) * 0.03;
    } else {
      // 停止時は元の高さに戻す
      this.head.position.y = THREE.MathUtils.lerp(this.head.position.y, 1.35, delta * 10);
      this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, 0.7, delta * 10);
    }

    this.position.copy(this.mesh.position);
  }

  setPosition(x, z) {
    this.mesh.position.set(x, 0, z);
    this.position.copy(this.mesh.position);
  }
}