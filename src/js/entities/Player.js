// src/js/entities/Player.js
import { CONFIG } from '../config.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.mesh.position.set(0, 0, 0);
    this.targetRotation = 0;
    this.bounceTimer = 0;

    const headGeo = new THREE.SphereGeometry(0.35, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.2 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 1.35;
    this.head.castShadow = true;
    this.mesh.add(this.head);

    const coneGeo = new THREE.ConeGeometry(0.28, 0.9, 24);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xc62828 });
    this.body = new THREE.Mesh(coneGeo, coneMat);
    this.body.rotation.x = Math.PI;
    this.body.position.y = 0.7;
    this.body.castShadow = true;
    this.mesh.add(this.body);

    const shadowGeo = new THREE.RingGeometry(0.05, 0.35, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.mesh.add(shadow);

    this.scene.add(this.mesh);
  }

  get position() {
    return this.mesh.position;
  }

  getForwardVector() {
    return new THREE.Vector3(Math.sin(this.targetRotation), 0, Math.cos(this.targetRotation));
  }

  update(moveVec, delta, obstacleCheck) {
    if (isNaN(delta) || delta <= 0 || delta > 0.1) delta = 0.016;

    const mx = Number(moveVec.x) || 0;
    const my = Number(moveVec.y) || 0;
    const len = Math.hypot(mx, my);
    let collidedObject = null;

    const moveSpeed = CONFIG.MOVE_SPEED || 5.5;
    const rotSpeed = CONFIG.ROTATION_SPEED || 12.0;

    if (len > 0.05) {
      // アイソメトリック軸補正
      const normX = (mx - my) * 0.7071 / Math.max(1, len);
      const normZ = (mx + my) * 0.7071 / Math.max(1, len);
      const moveDist = moveSpeed * Math.min(len, 1.0) * delta;

      const half = (CONFIG.FIELD_SIZE / 2) - 1.0;

      // X軸単独の移動判定 (壁ずり)
      const nextX = this.mesh.position.x + normX * moveDist;
      const hitX = obstacleCheck ? obstacleCheck(nextX, this.mesh.position.z) : null;
      if (!hitX) {
        if (!isNaN(nextX)) this.mesh.position.x = Math.max(-half, Math.min(half, nextX));
      } else {
        collidedObject = hitX;
      }

      // Z軸単独の移動判定 (壁ずり)
      const nextZ = this.mesh.position.z + normZ * moveDist;
      const hitZ = obstacleCheck ? obstacleCheck(this.mesh.position.x, nextZ) : null;
      if (!hitZ) {
        if (!isNaN(nextZ)) this.mesh.position.z = Math.max(-half, Math.min(half, nextZ));
      } else {
        collidedObject = hitZ;
      }

      // 旋回補間
      this.targetRotation = Math.atan2(normX, normZ);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, this.targetRotation, rotSpeed * delta);

      // 歩行ホップアニメーション
      this.bounceTimer += delta * 15;
      this.head.position.y = 1.35 + Math.sin(this.bounceTimer) * 0.06;
      this.body.position.y = 0.7 + Math.sin(this.bounceTimer) * 0.03;
    } else {
      this.head.position.y = THREE.MathUtils.lerp(this.head.position.y, 1.35, delta * 10);
      this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, 0.7, delta * 10);
    }

    return len > 0.05 ? collidedObject : (obstacleCheck ? obstacleCheck(this.mesh.position.x, this.mesh.position.z) : null);
  }
}
