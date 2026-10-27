// src/js/entities/Player.js
import { CONFIG } from '../config.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3(0, 0, 0);
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

  getForwardVector() {
    return new THREE.Vector3(Math.sin(this.targetRotation), 0, Math.cos(this.targetRotation));
  }

  update(moveVec, delta, obstacleCheck) {
    const len = Math.hypot(moveVec.x, moveVec.y);
    let collidedObject = null;

    if (len > 0.05) {
      const normX = moveVec.x / Math.max(1, len);
      const normZ = moveVec.y / Math.max(1, len);
      const moveDist = CONFIG.MOVE_SPEED * Math.min(len, 1.0) * delta;

      const nextX = this.mesh.position.x + normX * moveDist;
      const hitX = obstacleCheck(nextX, this.mesh.position.z);
      if (!hitX) {
        const half = (CONFIG.FIELD_SIZE / 2) - 1.0;
        this.mesh.position.x = Math.max(-half, Math.min(half, nextX));
      } else {
        collidedObject = hitX;
      }

      const nextZ = this.mesh.position.z + normZ * moveDist;
      const hitZ = obstacleCheck(this.mesh.position.x, nextZ);
      if (!hitZ) {
        const half = (CONFIG.FIELD_SIZE / 2) - 1.0;
        this.mesh.position.z = Math.max(-half, Math.min(half, nextZ));
      } else {
        collidedObject = hitZ;
      }

      this.targetRotation = Math.atan2(normX, normZ);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, this.targetRotation, CONFIG.ROTATION_SPEED * delta);

      this.bounceTimer += delta * 15;
      this.head.position.y = 1.35 + Math.sin(this.bounceTimer) * 0.06;
      this.body.position.y = 0.7 + Math.sin(this.bounceTimer) * 0.03;
    } else {
      this.head.position.y = THREE.MathUtils.lerp(this.head.position.y, 1.35, delta * 10);
      this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, 0.7, delta * 10);
    }
    this.position.copy(this.mesh.position);

    return len > 0.05 ? collidedObject : null;
  }
}