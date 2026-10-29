// src/js/main.js
import { CONFIG } from './config.js';
import { FurnitureFactory } from './entities/Furniture.js';
import { Player } from './entities/Player.js';
import { NPCManager } from './entities/NPC.js';
import { SheetService } from './services/SheetService.js';
import { Minimap } from './ui/Minimap.js';
import { ChatManager } from './ui/ChatManager.js';
import { FurnitureEditor } from './ui/FurnitureEditor.js';

class OfficeSimApp {
  constructor() {
    this.currentFloor = 6;
    this.mySeatFloor = 6;
    this.mySeatPos = { x: -4, z: -4 };

    this.floorObjects = [];
    this.npcObjects = [];
    this.floorPlane = null;
    this.floorMat = null;
    this.editGridGroup = null;
    this.isEditMode = false;
    this.selectedObject = null;
    this.isDragging = false;
    this.boxHelper = null;

    this.cameraAngle = Math.PI / 4;
    this.cameraPitch = 0.58;
    this.cameraDistance = 26.0;
    this.isRotatingCamera = false;
    this.pointerStartPos = { x: 0, y: 0 };
    this.hasMovedPointer = false;

    this.inputVector = { x: 0, y: 0 };
    this.keys = {};
    this.activeTargets = [];

    this.collidingObject = null;
    this.collisionTimer = 0;
    this.activeTriggerPadObj = null;
    this.triggerPadTimer = 0;
    this.isTriggerLocked = false; // ★ 階移動直後の再接触防止ロック
    this.isModalActive = false;
    this.isTransitioning = false;
    this.currentUser = null;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  showLoading() {
    const el = document.getElementById('global-loading-overlay');
    if (!el) return;
    el.style.display = 'flex';
    requestAnimationFrame(() => { el.style.opacity = '1'; });
  }

  hideLoading() {
    const el = document.getElementById('global-loading-overlay');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; }, 200);
  }

  createHoleFloor(stairsDownObjects = []) {
    if (this.floorPlane) {
      this.scene.remove(this.floorPlane);
      if (this.floorPlane.geometry) this.floorPlane.geometry.dispose();
    }

    const S = CONFIG.FIELD_SIZE / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-S, -S); shape.lineTo(S, -S); shape.lineTo(S, S); shape.lineTo(-S, S);
    shape.closePath();

    stairsDownObjects.forEach(obj => {
      const hw = 0.69, zMin = -0.93, zMax = 0.95;
      const localCorners = [
        new THREE.Vector3(-hw, 0, zMin), new THREE.Vector3(hw, 0, zMin),
        new THREE.Vector3(hw, 0, zMax), new THREE.Vector3(-hw, 0, zMax)
      ];
      obj.updateMatrixWorld(true);
      const worldCorners = localCorners.map(c => c.applyMatrix4(obj.matrixWorld));

      const hole = new THREE.Path();
      hole.moveTo(worldCorners[0].x, -worldCorners[0].z);
      hole.lineTo(worldCorners[1].x, -worldCorners[1].z);
      hole.lineTo(worldCorners[2].x, -worldCorners[2].z);
      hole.lineTo(worldCorners[3].x, -worldCorners[3].z);
      hole.closePath();
      shape.holes.push(hole);
    });

    const floorGeo = new THREE.ShapeGeometry(shape);
    const theme = CONFIG.FLOOR_THEME || { FLOOR_COLOR: 0x828890 };
    if (!this.floorMat) {
      this.floorMat = new THREE.MeshLambertMaterial({ color: theme.FLOOR_COLOR, side: THREE.DoubleSide });
    }
    this.floorPlane = new THREE.Mesh(floorGeo, this.floorMat);
    this.floorPlane.rotation.x = -Math.PI / 2;
    this.floorPlane.position.set(0, 0, 0);
    this.scene.add(this.floorPlane);
  }

  init() {
    const container = document.getElementById('canvas-container');
    const theme = CONFIG.FLOOR_THEME || { FLOOR_COLOR: 0x828890, SCENE_BG: 0xb0b7be };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(theme.SCENE_BG);

    const aspect = (window.innerWidth && window.innerHeight) ? (window.innerWidth / window.innerHeight) : 1;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.updateCamera(this.mySeatPos.x, this.mySeatPos.z);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(45, 60, 45);
    this.scene.add(dirLight);

    this.editGridGroup = new THREE.Group();
    const subGrid = new THREE.GridHelper(CONFIG.FIELD_SIZE, 160, 0x60a5fa, 0x93c5fd);
    subGrid.position.y = 0.005; subGrid.renderOrder = 50;
    this.editGridGroup.add(subGrid);

    const majorGrid = new THREE.GridHelper(CONFIG.FIELD_SIZE, 16, 0x1d4ed8, 0x1e3a8a);
    majorGrid.position.y = 0.007; majorGrid.renderOrder = 51;
    this.editGridGroup.add(majorGrid);

    this.editGridGroup.visible = false;
    this.scene.add(this.editGridGroup);

    this.player = new Player(this.scene);
    this.player.position.set(-4, 0, -1.0);

    this.sheetService = new SheetService(CONFIG.GAS_API_URL);
    this.minimap = new Minimap('minimap-canvas');
    this.chatManager = new ChatManager(this.sheetService, () => this.currentUser, () => this.currentFloor);
    this.editor = new FurnitureEditor(this);

    this.setupEvents();
    this.animate();
  }

  updateCamera(targetX, targetZ) {
    const validX = (typeof targetX === 'number' && !isNaN(targetX)) ? targetX : 0;
    const validZ = (typeof targetZ === 'number' && !isNaN(targetZ)) ? targetZ : 0;
    const distH = this.cameraDistance * Math.cos(this.cameraPitch);
    const heightY = Math.max(8.0, this.cameraDistance * Math.sin(this.cameraPitch));

    const cx = validX + distH * Math.sin(this.cameraAngle);
    const cy = heightY;
    const cz = validZ + distH * Math.cos(this.cameraAngle);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(validX, 0.8, validZ);
  }

  // ★ 物理壁の衝突判定（正面トリガーは壁ではないので通過可能）
  checkCollision(px, pz) {
    if (isNaN(px) || isNaN(pz)) return null;
    const pr = 0.22;

    for (const obj of this.floorObjects) {
      if (this.isEditMode && this.isDragging && this.selectedObject === obj) continue;
      const d = obj.userData;
      if (d.type === 'phone' || d.type === 'printer_desk') continue;

      const halfW = (d.boxW || 0.8) / 2;
      const halfD = (d.boxD || 0.8) / 2;

      const dx = px - obj.position.x;
      const dz = pz - obj.position.z;
      const rad = -(obj.rotation.y || 0);
      const localX = dx * Math.cos(rad) - dz * Math.sin(rad);
      const localZ = dx * Math.sin(rad) + dz * Math.cos(rad);

      // 階段の正面入口のみ踏み込みを許可（エレベーターは最前面の透明板で均一に止める）
      if (d.isStairsUp || d.isStairsDown) {
        if (localZ > 0.35 && Math.abs(localX) < halfW - 0.05) {
          continue;
        }
      }

      const closestX = Math.max(-halfW, Math.min(halfW, localX));
      const closestZ = Math.max(-halfD, Math.min(halfD, localZ));
      const distX = localX - closestX;
      const distZ = localZ - closestZ;
      if ((distX * distX + distZ * distZ) < (pr * pr)) {
        return obj;
      }
    }
    return null;
  }

  // ★ 正面トリガー板への接触判定（透明板を踏んだかを判定）
  checkTriggerPad() {
    if (this.isModalActive || this.isTransitioning || this.isEditMode) return null;
    const playerP = this.player.position;

    for (const obj of this.floorObjects) {
      const data = obj.userData;
      if (!data.isStairsUp && !data.isStairsDown && !data.isElevator) continue;
      if (!data.entryTrigger) continue;

      // トリガー板のワールド中心位置と回転からローカル接触を計算
      data.entryTrigger.updateMatrixWorld(true);
      const localP = data.entryTrigger.worldToLocal(playerP.clone());

      // triggerGeo は BoxGeometry(width, 0.6, 0.5) なので、半幅0.6m, 半奥行0.25m
      if (Math.abs(localP.x) <= 0.65 && Math.abs(localP.z) <= 0.35) {
        return obj; // 接触したオブジェクト自身を返す
      }
    }
    return null;
  }

  async loadFloor(floorId, silent = false) {
    if (!silent) this.showLoading();
    try {
      this.floorObjects.forEach(obj => this.scene.remove(obj));
      this.floorObjects = [];
      this.clearNPCs();

      if (this.boxHelper) {
        this.scene.remove(this.boxHelper);
        this.boxHelper = null;
      }
      this.editor.showActionBar(false);

      let layout = await this.sheetService.fetchFloorLayout(floorId);
      if (!layout || layout.length === 0) {
        layout = this.getDefaultLayoutForFloor(floorId);
      }

      layout.forEach(data => {
        const furniture = FurnitureFactory.create(data.type, data);
        this.scene.add(furniture);
        this.floorObjects.push(furniture);

        if (furniture.userData.isMySeat) {
          this.mySeatFloor = floorId;
          this.mySeatPos = { x: furniture.position.x, z: furniture.position.z };
        }
      });

      // 未配置の場合のデフォルト生成（特定設備への依存・優位性は排除）
      if (!this.floorObjects.some(o => o.userData.isElevator)) {
        const elv = FurnitureFactory.create('elevator', { x: -14, z: -16, rotation: 0, role: 'エレベーター' });
        this.scene.add(elv); this.floorObjects.push(elv);
      }
      if (!this.floorObjects.some(o => o.userData.isStairsUp)) {
        const up = FurnitureFactory.create('stairs_up', { x: 12, z: -16, rotation: 0, role: '上り階段' });
        this.scene.add(up); this.floorObjects.push(up);
      }
      if (!this.floorObjects.some(o => o.userData.isStairsDown)) {
        const dn = FurnitureFactory.create('stairs_down', { x: 16, z: -16, rotation: 0, role: '下り階段' });
        this.scene.add(dn); this.floorObjects.push(dn);
      }

      const downStairs = this.floorObjects.filter(o => o.userData.isStairsDown);
      this.createHoleFloor(downStairs);

      await this.checkBoardUnread();
      this.refreshNPCs();
    } finally {
      if (!silent) this.hideLoading();
    }
  }

  getDefaultLayoutForFloor(floorId) {
    if (floorId === 6) {
      return [
        { type: 'desk_150_80', x: -4, z: -4, rotation: 0, role: '自席', person: '自分', isMySeat: true, shiftWeekday: '09:00-18:00', extensionNumber: '6101' },
        { type: 'chair', x: -4, z: -4.8, rotation: 0 },
        { type: 'phone', x: -4.6, z: -4, rotation: 0, role: '内線電話', extensionNumber: '6101' },
        { type: 'printer_desk', x: -4, z: -4, rotation: 0, role: '自席プリンター', modelNumber: 'CANON LBP621C', tonerType: 'CRG-054H' },
        { type: 'board', x: -2.8, z: -4.6, rotation: 0, role: '業務連絡掲示板' },
        { type: 'desk_150_80', x: 2, z: -4, rotation: 0, role: 'ニュースセンター長', person: '佐藤 センター長', distNeeded: 'dist_01', shiftWeekday: '09:00-17:00', extensionNumber: '6102' },
        { type: 'chair', x: 2, z: -3.2, rotation: 0 },
        { type: 'desk_150_80', x: 6, z: -4, rotation: 0, role: '編制デスク', person: '鈴木 主任', distNeeded: 'dist_04', shiftWeekday: '15:00-24:00', extensionNumber: '6103' },
        { type: 'chair', x: 6, z: -3.2, rotation: 0 },
        { type: 'printer_floor', x: 12, z: 2, rotation: 0, role: '6Fフロア複合機', modelNumber: 'ApeosPort-VII C3373', tonerType: 'CT203138' },
        { type: 'sofa_reception', x: -8, z: 6, rotation: 0, role: '打合せソファ' },
        { type: 'table_low_reception', x: -8, z: 7.2, rotation: 0, role: '応接ローテーブル' },
        { type: 'locker_300_60', x: -14, z: -8, rotation: 0, role: '大型ロッカー' },
        { type: 'custom_shelf', x: 10, z: -8, rotation: 0, role: '資料棚', shelfWidth: 2.0, shelfDepth: 0.5, shelfHeight: 1.8 }
      ];
    }
    return [
      { type: 'desk_150_80', x: 0, z: -4, rotation: 0, role: '受付・デスク', person: '担当者', shiftWeekday: '09:00-17:00' },
      { type: 'chair', x: 0, z: -3.2, rotation: 0 },
      { type: 'printer_floor', x: 8, z: 0, rotation: 0, role: '共用複合機' }
    ];
  }

  returnToMySeat() {
    this.closeModal();
    if (this.currentFloor !== this.mySeatFloor) {
      this.currentFloor = this.mySeatFloor;
      const select = document.getElementById('floor-select');
      if (select) select.value = String(this.mySeatFloor);
      this.loadFloor(this.mySeatFloor);
    }
    this.player.position.set(-4, 0, -1.0);
    this.player.targetRotation = Math.PI;
    this.updateCamera(this.player.position.x, this.player.position.z);
  }

  async checkBoardUnread() {
    const posts = await this.sheetService.fetchBoardPosts();
    if (posts && posts.length > 0) {
      const lastPost = posts[posts.length - 1];
      const viewedKey = 'board_last_view_' + this.currentFloor;
      const lastViewed = localStorage.getItem(viewedKey);

      const hasUnread = !lastViewed || lastViewed !== lastPost.id;
      this.floorObjects.forEach(obj => {
        if (obj.userData.type === 'board' && obj.userData.unreadBoardDot) {
          obj.userData.unreadBoardDot.visible = hasUnread;
        }
      });
    }
  }

  clearNPCs() {
    this.npcObjects.forEach(npc => this.scene.remove(npc));
    this.npcObjects = [];
  }

  refreshNPCs() {
    this.clearNPCs();
    this.floorObjects.forEach(obj => {
      if (obj.userData.type.includes('desk') && !obj.userData.isMySeat && obj.userData.person !== '未設定') {
        if (NPCManager.isWorkingNow(obj.userData)) {
          const npc = NPCManager.createSittingNPC(obj.userData.person, obj.userData.role);
          npc.position.set(obj.position.x, 0, obj.position.z + 0.7);
          this.scene.add(npc);
          this.npcObjects.push(npc);
        }
      }
    });
  }

  spawnFurnitureInFrontOfPlayer(type, extraData = {}) {
    const fwd = this.player.getForwardVector();
    let snapX = Math.round((this.player.position.x + fwd.x * 1.5) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
    let snapZ = Math.round((this.player.position.z + fwd.z * 1.5) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
    let isUnderDesk = false;

    if (type === 'printer_desk') {
      const nearbyDesk = this.floorObjects.find(o => o.userData.type.includes('desk') && Math.hypot(o.position.x - snapX, o.position.z - snapZ) < 1.2);
      if (nearbyDesk) {
        snapX = nearbyDesk.position.x;
        snapZ = nearbyDesk.position.z;
        const existingPrinter = this.floorObjects.find(o => o.userData.type === 'printer_desk' && Math.hypot(o.position.x - snapX, o.position.z - snapZ) < 0.3);
        if (existingPrinter) isUnderDesk = true;
      }
    }

    const newObj = FurnitureFactory.create(type, { x: snapX, z: snapZ, rotation: 0, isUnderDesk, ...extraData });
    this.scene.add(newObj);
    this.floorObjects.push(newObj);
    this.selectFurniture(newObj);

    if (type === 'stairs_down') {
      const downStairs = this.floorObjects.filter(o => o.userData.isStairsDown);
      this.createHoleFloor(downStairs);
    }
  }

  rebuildFurnitureMesh(obj) {
    const d = obj.userData;
    const oldRot = obj.rotation.y;
    const oldPos = obj.position.clone();

    while (obj.children.length > 0) {
      const c = obj.children[0];
      obj.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material.dispose();
      }
    }

    const tempNew = FurnitureFactory.create(d.type, { x: oldPos.x, z: oldPos.z, rotation: oldRot, ...d });
    while (tempNew.children.length > 0) {
      obj.add(tempNew.children[0]);
    }
    obj.userData = tempNew.userData;
    if (this.boxHelper) this.boxHelper.update();

    if (d.type === 'stairs_down') {
      const downStairs = this.floorObjects.filter(o => o.userData.isStairsDown);
      this.createHoleFloor(downStairs);
    }
  }

  selectFurniture(obj) {
    this.selectedObject = obj;
    if (this.boxHelper) this.scene.remove(this.boxHelper);
    this.boxHelper = new THREE.BoxHelper(this.selectedObject, 0xffff00);
    this.scene.add(this.boxHelper);
    this.editor.showActionBar(true);
  }

  async syncCurrentLayoutToSheet() {
    this.showLoading();
    try {
      const items = this.floorObjects.map(obj => ({
        floor: this.currentFloor,
        type: obj.userData.type,
        x: obj.position.x,
        z: obj.position.z,
        rotation: obj.rotation.y,
        role: obj.userData.role,
        person: obj.userData.person,
        department: obj.userData.department || '',
        shiftWeekday: obj.userData.shiftWeekday || '',
        shiftSaturday: obj.userData.shiftSaturday || '',
        shiftHoliday: obj.userData.shiftHoliday || '',
        extensionNumber: obj.userData.extensionNumber || '',
        modelNumber: obj.userData.modelNumber || '',
        tonerType: obj.userData.tonerType || '',
        drumType: obj.userData.drumType || '',
        shelfWidth: obj.userData.shelfWidth || '',
        shelfDepth: obj.userData.shelfDepth || '',
        shelfHeight: obj.userData.shelfHeight || '',
        distNeeded: obj.userData.distNeeded || ''
      }));
      await this.sheetService.saveFloorLayout(this.currentFloor, items);
    } finally {
      this.hideLoading();
    }
  }

  // ★ 最も近いペアの設備オブジェクトを探す
  findNearestTarget(currentPos, candidateObjects) {
    if (!candidateObjects || candidateObjects.length === 0) return null;
    let nearest = candidateObjects[0];
    let minDist = Math.hypot(nearest.position.x - currentPos.x, nearest.position.z - currentPos.z);

    for (let i = 1; i < candidateObjects.length; i++) {
      const obj = candidateObjects[i];
      const d = Math.hypot(obj.position.x - currentPos.x, obj.position.z - currentPos.z);
      if (d < minDist) {
        minDist = d;
        nearest = obj;
      }
    }
    return nearest;
  }

  // ★ 階移動モーション（接触したそのオブジェクト自身で発火＋最寄り設備への接続）
  async triggerFloorTransition(targetFloor, arrivalType, interactObj) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.closeModal();

    const cvs = document.getElementById('transition-canvas');
    const ctx = cvs ? cvs.getContext('2d') : null;

    if (cvs && ctx) {
      cvs.width = window.innerWidth;
      cvs.height = window.innerHeight;
      cvs.style.display = 'block';
    }

    const drawCutoutHole = (cx, cy, r) => {
      if (!ctx || !cvs) return;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.fillStyle = '#0b0f19';
      ctx.beginPath();
      ctx.rect(0, 0, cvs.width, cvs.height);
      if (r > 0) ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
    };

    const interactRot = interactObj ? (interactObj.rotation.y || 0) : 0;
    const fwdX = -Math.sin(interactRot);
    const fwdZ = -Math.cos(interactRot);

    // 1. エレベーター演出（接触したそのエレベーター自身で実行）
    if (interactObj && interactObj.userData.isElevator) {
      const doorL = interactObj.userData.doorL;
      const doorR = interactObj.userData.doorR;
      const dw = interactObj.userData.doorWidth || 0.65;

      for (let t = 0; t <= 18; t++) {
        const o = (t / 18) * (dw - 0.05);
        if (doorL) doorL.position.x = -dw / 2 - o;
        if (doorR) doorR.position.x =  dw / 2 + o;
        await new Promise(r => setTimeout(r, 20));
      }

      const startPos = this.player.position.clone();
      const targetPos = new THREE.Vector3(interactObj.position.x, this.player.position.y, interactObj.position.z);

      for (let t = 0; t <= 22; t++) {
        const r = t / 22;
        this.player.position.x = startPos.x + (targetPos.x - startPos.x) * r;
        this.player.position.z = startPos.z + (targetPos.z - startPos.z) * r;
        this.updateCamera(this.player.position.x, this.player.position.z);
        await new Promise(r => setTimeout(r, 22));
      }

      if (cvs && ctx) {
        const maxRadius = Math.hypot(cvs.width, cvs.height);
        const p = this.player.position.clone(); p.y += 0.85; p.project(this.camera);
        const cx = (p.x * 0.5 + 0.5) * cvs.width;
        const cy = (-(p.y * 0.5) + 0.5) * cvs.height;
        const dur = 450, st = performance.now();
        await new Promise(resolve => {
          const a = now => {
            const pr = Math.min(1, (now - st) / dur);
            drawCutoutHole(cx, cy, maxRadius * (1 - pr));
            if (pr < 1) requestAnimationFrame(a); else resolve();
          };
          requestAnimationFrame(a);
        });
        drawCutoutHole(cx, cy, 0);
      }

    // 2. 階段演出（中央線へ収束しながら昇降）
    } else if (interactObj && (interactObj.userData.isStairsDown || interactObj.userData.isStairsUp)) {
      const isDown = interactObj.userData.isStairsDown;
      const startPos = this.player.position.clone();
      const targetPos = new THREE.Vector3(
        interactObj.position.x + fwdX * 0.85,
        this.player.position.y + (isDown ? -0.75 : 1.05),
        interactObj.position.z + fwdZ * 0.85
      );

      const totalSteps = 30;
      const maxRadius = cvs ? Math.hypot(cvs.width, cvs.height) : 1000;

      for (let t = 0; t <= totalSteps; t++) {
        const ratio = t / totalSteps;
        this.player.position.x = startPos.x + (targetPos.x - startPos.x) * ratio;
        this.player.position.z = startPos.z + (targetPos.z - startPos.z) * ratio;
        this.player.position.y += isDown ? -0.025 : 0.035;
        this.updateCamera(this.player.position.x, this.player.position.z);

        if (cvs && ctx) {
          const p = this.player.position.clone(); p.y += 0.85; p.project(this.camera);
          const cx = (p.x * 0.5 + 0.5) * cvs.width;
          const cy = (-(p.y * 0.5) + 0.5) * cvs.height;

          let currentR;
          if (ratio < 0.75) {
            const sub = ratio / 0.75;
            currentR = maxRadius - (maxRadius - 45) * (1 - Math.pow(1 - sub, 3));
          } else {
            const sub = (ratio - 0.75) / 0.25;
            currentR = 45 * (1 - sub);
          }
          drawCutoutHole(cx, cy, currentR);
        }
        await new Promise(r => setTimeout(r, 22));
      }
      if (cvs && ctx) drawCutoutHole(0, 0, 0);
    }

    const departurePos = interactObj ? interactObj.position.clone() : this.player.position.clone();
    this.currentFloor = targetFloor;
    const select = document.getElementById('floor-select');
    if (select) select.value = String(targetFloor);

    await this.loadFloor(targetFloor, true);

    // 4. 移動先フロアで最も近い接続先設備を自動検出
    let targetDestObj = null;
    if (arrivalType === 'stairs_down') {
      targetDestObj = this.findNearestTarget(departurePos, this.floorObjects.filter(o => o.userData.isStairsUp));
    } else if (arrivalType === 'stairs_up') {
      targetDestObj = this.findNearestTarget(departurePos, this.floorObjects.filter(o => o.userData.isStairsDown));
    } else if (arrivalType === 'elevator') {
      targetDestObj = this.findNearestTarget(departurePos, this.floorObjects.filter(o => o.userData.isElevator));
    }

    const destRot = targetDestObj ? (targetDestObj.rotation.y || 0) : 0;
    const destBackX = -Math.sin(destRot);
    const destBackZ = -Math.cos(destRot);

    if (arrivalType === 'stairs_down' && targetDestObj) {
      this.player.position.set(targetDestObj.position.x + destBackX * 0.75, 1.08, targetDestObj.position.z + destBackZ * 0.75);
    } else if (arrivalType === 'stairs_up' && targetDestObj) {
      this.player.position.set(targetDestObj.position.x + destBackX * 0.75, -1.08, targetDestObj.position.z + destBackZ * 0.75);
    } else if (arrivalType === 'elevator' && targetDestObj) {
      this.player.position.set(targetDestObj.position.x, 0, targetDestObj.position.z);
    } else {
      this.player.position.set(0, 0, 0);
    }
    this.updateCamera(this.player.position.x, this.player.position.z);

    const fadeDuration = 800;
    const startFade = performance.now();

    const arrivalMotionPromise = (async () => {
      if (arrivalType === 'stairs_down' && targetDestObj) {
        const startX = this.player.position.x, startZ = this.player.position.z, exitDist = 2.45;
        const forwardX = -destBackX, forwardZ = -destBackZ;
        for (let t = 0; t <= 30; t++) {
          const r = t / 30;
          this.player.position.x = startX + forwardX * exitDist * r;
          this.player.position.z = startZ + forwardZ * exitDist * r;
          this.player.position.y = Math.max(0, 1.08 * (1 - r));
          this.updateCamera(this.player.position.x, this.player.position.z);
          await new Promise(res => setTimeout(res, 24));
        }
      } else if (arrivalType === 'stairs_up' && targetDestObj) {
        const startX = this.player.position.x, startZ = this.player.position.z, exitDist = 2.45;
        const forwardX = -destBackX, forwardZ = -destBackZ;
        for (let t = 0; t <= 30; t++) {
          const r = t / 30;
          this.player.position.x = startX + forwardX * exitDist * r;
          this.player.position.z = startZ + forwardZ * exitDist * r;
          this.player.position.y = Math.min(0, -1.08 * (1 - r));
          this.updateCamera(this.player.position.x, this.player.position.z);
          await new Promise(res => setTimeout(res, 24));
        }
      } else if (arrivalType === 'elevator' && targetDestObj) {
        const elv = targetDestObj;
        const dw = elv.userData.doorWidth || 0.65;
        if (elv.userData.doorL && elv.userData.doorR) {
          for (let t = 0; t <= 15; t++) {
            const o = (t / 15) * (dw - 0.05);
            elv.userData.doorL.position.x = -dw / 2 - o;
            elv.userData.doorR.position.x =  dw / 2 + o;
            await new Promise(res => setTimeout(res, 18));
          }
        }
        const startX = this.player.position.x, startZ = this.player.position.z;
        const forwardX = Math.sin(destRot), forwardZ = Math.cos(destRot);
        for (let t = 0; t <= 22; t++) {
          const r = t / 22;
          this.player.position.x = startX + forwardX * 2.2 * r;
          this.player.position.z = startZ + forwardZ * 2.2 * r;
          this.updateCamera(this.player.position.x, this.player.position.z);
          await new Promise(res => setTimeout(res, 22));
        }
        if (elv.userData.doorL && elv.userData.doorR) {
          for (let t = 15; t >= 0; t--) {
            const o = (t / 15) * (dw - 0.05);
            elv.userData.doorL.position.x = -dw / 2 - o;
            elv.userData.doorR.position.x =  dw / 2 + o;
            await new Promise(res => setTimeout(res, 18));
          }
        }
      }
      this.player.position.y = 0;
    })();

    if (cvs && ctx) {
      await new Promise(resolve => {
        const animFade = now => {
          const pr = Math.min(1, (now - startFade) / fadeDuration);
          const alpha = Math.max(0, 1 - pr);
          ctx.clearRect(0, 0, cvs.width, cvs.height);
          ctx.fillStyle = 'rgba(11, 15, 25, ' + alpha.toFixed(3) + ')';
          ctx.fillRect(0, 0, cvs.width, cvs.height);
          if (pr < 1) requestAnimationFrame(animFade); else resolve();
        };
        requestAnimationFrame(animFade);
      });
      cvs.style.display = 'none';
      ctx.clearRect(0, 0, cvs.width, cvs.height);
    }

    await arrivalMotionPromise;
    this.isTransitioning = false;
    this.isTriggerLocked = true; // ★ 到着時はロック状態（一度離れるまで発火しない）
    this.triggerPadTimer = 0;
    this.activeTriggerPadObj = null;
  }

  setupEvents() {
    const btnLogin = document.getElementById('btn-login-unified');
    if (btnLogin) {
      btnLogin.addEventListener('click', async () => {
        const emailInput = document.getElementById('login-email');
        const passInput = document.getElementById('login-password');
        const email = emailInput ? emailInput.value.trim() : '';
        const pass = passInput ? passInput.value : '';

        if (!email || !pass) return alert('メールアドレスとパスワードを入力してください。');
        this.showLoading();
        try {
          const res = await this.sheetService.verifyPassword(email, pass);
          if (res && res.status === 'success') {
            this.currentUser = res.user;
            const badge = document.getElementById('user-badge');
            if (badge) badge.innerText = `👤 ${this.currentUser.name} (${this.currentUser.role})`;
            const overlay = document.getElementById('login-overlay');
            if (overlay) overlay.style.display = 'none';
            await this.loadFloor(this.currentFloor);
          } else {
            alert(res && res.message ? res.message : 'メールアドレスまたはパスワードが正しくありません。');
          }
        } catch (err) {
          alert('認証サーバーとの通信に失敗しました。');
        } finally {
          this.hideLoading();
        }
      });
    }

    document.getElementById('btn-account-manage')?.addEventListener('click', () => {
      if (!this.currentUser) return;
      this.showModal('👤 アカウント管理情報', `
        <div style="font-size: 13px; line-height: 1.6;">
          <strong>氏名:</strong> ${this.currentUser.name}<br>
          <strong>メール:</strong> ${this.currentUser.email}<br>
          <strong>所属部署:</strong> ${this.currentUser.department || '編集局'}<br>
          <strong>権限ロール:</strong> <span style="color: #2563eb; font-weight: bold;">${this.currentUser.role}</span>
        </div>
      `);
    });

    document.getElementById('btn-return-myseat')?.addEventListener('click', () => this.returnToMySeat());

    const editBtn = document.getElementById('btn-edit-mode');
    const carouselModal = document.getElementById('furniture-carousel-modal');
    const paletteFab = document.getElementById('btn-open-palette-fab');

    editBtn?.addEventListener('click', () => {
      this.isEditMode = !this.isEditMode;
      editBtn.classList.toggle('active', this.isEditMode);
      editBtn.innerText = this.isEditMode ? '保存して終了' : '🛠️ レイアウト';

      if (this.editGridGroup) this.editGridGroup.visible = this.isEditMode;

      if (carouselModal) {
        carouselModal.style.display = this.isEditMode ? 'flex' : 'none';
        carouselModal.classList.toggle('active', this.isEditMode);
        if (this.isEditMode) this.editor.updatePreviewModel();
      }

      if (!this.isEditMode) {
        if (paletteFab) paletteFab.style.display = 'none';
        this.syncCurrentLayoutToSheet();
        if (this.boxHelper) {
          this.scene.remove(this.boxHelper);
          this.boxHelper = null;
        }
        this.selectedObject = null;
        this.editor.showActionBar(false);
        this.editor.showSnapGuide(0, 0, false);
      }
    });

    document.getElementById('btn-carousel-close')?.addEventListener('click', () => {
      if (carouselModal) {
        carouselModal.style.display = 'none';
        carouselModal.classList.remove('active');
      }
      if (this.isEditMode && paletteFab) paletteFab.style.display = 'flex';
    });

    paletteFab?.addEventListener('click', () => {
      if (carouselModal) {
        carouselModal.style.display = 'flex';
        carouselModal.classList.add('active');
        this.editor.updatePreviewModel();
      }
      paletteFab.style.display = 'none';
    });

    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', e => {
      this.pointerStartPos = { x: e.clientX, y: e.clientY };
      this.hasMovedPointer = false;
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      if (this.isEditMode) {
        const hits = this.raycaster.intersectObjects(this.floorObjects, true);
        if (hits.length > 0) {
          let root = hits[0].object;
          while (root.parent && root.parent !== this.scene) root = root.parent;
          this.selectFurniture(root);
          this.isDragging = true;
        }
      } else {
        this.isRotatingCamera = true;
      }
    });

    window.addEventListener('pointermove', e => {
      if (Math.hypot(e.clientX - this.pointerStartPos.x, e.clientY - this.pointerStartPos.y) > 5) {
        this.hasMovedPointer = true;
      }

      if (this.isEditMode && this.isDragging && this.selectedObject) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        if (this.floorPlane) {
          const hits = this.raycaster.intersectObject(this.floorPlane);
          if (hits.length > 0) {
            const p = hits[0].point;
            const max = (CONFIG.FIELD_SIZE / 2) - 1.0;
            const snapStep = e.shiftKey ? 0.01 : (CONFIG.GRID_SIZE || 0.1);
            const snapX = Math.max(-max, Math.min(max, Math.round(p.x / snapStep) * snapStep));
            const snapZ = Math.max(-max, Math.min(max, Math.round(p.z / snapStep) * snapStep));
            this.selectedObject.position.x = snapX;
            this.selectedObject.position.z = snapZ;
            if (this.boxHelper) this.boxHelper.update();
            this.editor.showSnapGuide(snapX, snapZ, true);
          }
        }
        return;
      }

      if (this.isRotatingCamera) {
        this.cameraAngle -= (e.clientX - this.pointerStartPos.x) * 0.005;
        this.pointerStartPos = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('pointerup', () => {
      if (this.isEditMode && this.isDragging && this.selectedObject) {
        if (this.selectedObject.userData.isStairsDown) {
          this.createHoleFloor(this.floorObjects.filter(o => o.userData.isStairsDown));
        }
      }

      if (!this.hasMovedPointer && !this.isEditMode) {
        this.mouse.x = (this.pointerStartPos.x / window.innerWidth) * 2 - 1;
        this.mouse.y = -(this.pointerStartPos.y / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObjects(this.floorObjects, true);

        if (hits.length > 0) {
          let root = hits[0].object;
          while (root.parent && root.parent !== this.scene) root = root.parent;
          this.handleTriggerObject(root);
        }
      }

      this.isDragging = false;
      this.isRotatingCamera = false;
      this.editor.showSnapGuide(0, 0, false);
    });

    window.addEventListener('keydown', e => { if (e.key) this.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', e => { if (e.key) this.keys[e.key.toLowerCase()] = false; });

    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    let active = false, startX = 0, startY = 0;
    zone.addEventListener('pointerdown', e => {
      active = true;
      const rect = zone.getBoundingClientRect();
      startX = rect.left + rect.width / 2; startY = rect.top + rect.height / 2;
    });
    window.addEventListener('pointermove', e => {
      if (!active) return;
      let dx = e.clientX - startX, dy = e.clientY - startY, dist = Math.hypot(dx, dy);
      const maxR = 45;
      if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; dist = maxR; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      if (dist < 1.0) {
        this.inputVector = { x: 0, y: 0 };
      } else {
        const rad = Math.atan2(dy, dx) - Math.PI / 4;
        this.inputVector.x = Math.cos(rad) * (dist / maxR);
        this.inputVector.y = Math.sin(rad) * (dist / maxR);
      }
    });
    const endJoy = () => {
      active = false;
      knob.style.transform = 'translate(0px, 0px)';
      this.inputVector = { x: 0, y: 0 };
    };
    window.addEventListener('pointerup', endJoy);
    window.addEventListener('pointercancel', endJoy);

    window.addEventListener('wheel', e => {
      if (e.target.closest('#chat-drawer') || e.target.closest('#info-modal') || e.target.closest('#furniture-carousel-modal')) return;
      e.preventDefault();
      this.cameraDistance = Math.max(8.0, Math.min(65.0, this.cameraDistance + e.deltaY * 0.03));
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.getElementById('floor-select')?.addEventListener('change', e => {
      this.triggerFloorTransition(parseInt(e.target.value, 10), 'center', null);
    });

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
  }

  // ★ 接触したエレベーター自身（currentElevatorObj）を受け取る
  triggerElevator(currentElevatorObj = null) {
    const activeElv = currentElevatorObj || this.findNearestTarget(this.player.position, this.floorObjects.filter(o => o.userData.isElevator));

    let buttonsHtml = '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">';
    CONFIG.FLOORS.forEach(f => {
      const isCurrent = f.id === this.currentFloor;
      buttonsHtml += `
        <button class="btn-elv-floor" data-floor="${f.id}" style="padding: 12px; border-radius: 8px; border: 1.5px solid ${isCurrent ? '#00897b' : '#cfd8dc'}; background: ${isCurrent ? '#e0f2f1' : '#fff'};" ${isCurrent ? 'disabled' : ''}>
          🛗 ${f.id}F ${f.name}
        </button>`;
    });
    buttonsHtml += '</div>';
    this.showModal('🛗 エレベーター操作盤', buttonsHtml);

    document.querySelectorAll('.btn-elv-floor').forEach(btn => {
      btn.addEventListener('click', e => {
        const targetF = parseInt(e.currentTarget.getAttribute('data-floor'), 10);
        // ★ 目の前にある activeElv で確実に扉を開いて乗り込む！
        this.triggerFloorTransition(targetF, 'elevator', activeElv);
      });
    });
  }

  handleTriggerObject(obj) {
    if (this.isEditMode) {
      this.selectFurniture(obj);
      return;
    }
    const data = obj.userData;

    // 階段・エレベーターは正面透明板を踏んだ時のみ発火するため、クリックや壁接触では発火させない
    if (data.isStairsUp || data.isStairsDown || data.isElevator) {
      return;
    }

    if (data.type === 'board') { this.triggerBoard(obj); return; }
    if (data.isMySeat) { this.openMySeatPortal(); return; }

    if (data.type.includes('desk')) {
      const px = obj.position.x, pz = obj.position.z;
      const nearbyPhones = this.floorObjects.filter(o => o.userData.type === 'phone' && Math.hypot(o.position.x - px, o.position.z - pz) < 1.4);
      const extStr = nearbyPhones.map(p => p.userData.extensionNumber).filter(Boolean).join(', ') || data.extensionNumber || 'なし';

      this.showModal(`👤 ${data.role} のデスク詳細`, `
        <div style="font-size: 13px; line-height: 1.5;">
          <strong>担当者:</strong> ${data.person} (${data.department || '編集局'})<br>
          <strong>内線番号:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${extStr}</span><br>
          <strong>必要配布物:</strong> ${data.distNeeded ? '【要配布】' + data.distNeeded : '特になし'}
        </div>
      `);
      return;
    }

    if (data.type.includes('printer')) {
      this.showModal(`🖨️ ${data.role}`, `
        <div style="font-size: 13px; line-height: 1.6;">
          型番: <strong>${data.modelNumber || '未登録'}</strong><br>
          適合トナー: ${data.tonerType || '未登録'}<br>
          ドラム: ${data.drumType || '未登録'}
        </div>
      `);
      return;
    }

    this.showModal(`${data.role}`, '<strong>状況:</strong> 通常稼働中');
  }

  openMySeatPortal() {
    const html = `
      <div style="text-align: center; margin-bottom: 14px;">
        <p style="font-size: 12px; color: #64748b; margin: 0;">自席PC端末にログイン中。実行する業務機能を選択してください。</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <button id="portal-btn-wf" style="padding: 14px 10px; background: #e0f2fe; border: 1.5px solid #0284c7; border-radius: 10px; cursor: pointer; text-align: left;">
          <div style="font-size: 14px; font-weight: bold; color: #0369a1;">📋 業務フロー図</div>
          <div style="font-size: 11px; color: #0284c7; margin-top: 3px;">マニュアル閲覧・編集・保存</div>
        </button>

        <button id="portal-btn-dict" style="padding: 14px 10px; background: #faf5ff; border: 1.5px solid #a855f7; border-radius: 10px; cursor: pointer; text-align: left;">
          <div style="font-size: 14px; font-weight: bold; color: #7e22ce;">📖 社内用語辞書</div>
          <div style="font-size: 11px; color: #9333ea; margin-top: 3px;">用語検索・新規解説の追加</div>
        </button>

        <button id="portal-btn-equip" style="padding: 14px 10px; background: #f0fdf4; border: 1.5px solid #22c55e; border-radius: 10px; cursor: pointer; text-align: left;">
          <div style="font-size: 14px; font-weight: bold; color: #15803d;">📦 備品・消耗品管理</div>
          <div style="font-size: 11px; color: #16a34a; margin-top: 3px;">複合機トナー・用紙・ロッカー状況</div>
        </button>

        <button id="portal-btn-dist" style="padding: 14px 10px; background: #fef2f2; border: 1.5px solid #ef4444; border-radius: 10px; cursor: pointer; text-align: left;">
          <div style="font-size: 14px; font-weight: bold; color: #b91c1c;">🎯 資料配り先確認</div>
          <div style="font-size: 11px; color: #dc2626; margin-top: 3px;">朝刊・メモ等の配布トレーニング</div>
        </button>
      </div>

      <div style="margin-top: 12px; text-align: center;">
        <button id="portal-btn-hist" style="padding: 8px 16px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 20px; font-size: 12px; color: #475569; cursor: pointer;">
          📊 自身の受講・業務履歴ログを確認
        </button>
      </div>
    `;

    this.showModal('💻 自席 業務ポータルコンソール', html);

    document.getElementById('portal-btn-wf')?.addEventListener('click', () => this.openWorkflowsTableModal());
    document.getElementById('portal-btn-dict')?.addEventListener('click', () => this.openDictionaryModal());
    document.getElementById('portal-btn-equip')?.addEventListener('click', () => this.openEquipmentModal());
    document.getElementById('portal-btn-dist')?.addEventListener('click', () => this.openDistributionSelectModal());
    document.getElementById('portal-btn-hist')?.addEventListener('click', () => this.openHistoryModal());
  }

  openEquipmentModal() {
    const printers = this.floorObjects.filter(o => o.userData.type.includes('printer'));
    let html = '<div style="max-height: 280px; overflow-y: auto;">';
    html += '<strong style="color: #0f172a; font-size: 13px;">現フロアの登録機器・消耗品一覧:</strong>';
    printers.forEach(p => {
      const d = p.userData;
      html += `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; margin: 6px 0; font-size: 12px;">
          <strong style="color: #2563eb;">🖨️ ${d.role}</strong> (${d.type === 'printer_desk' ? '卓上型' : '床置複合機'})<br>
          型番: <strong>${d.modelNumber || '未登録'}</strong> | トナー: <strong>${d.tonerType || '未登録'}</strong> | ドラム: ${d.drumType || '未登録'}
        </div>
      `;
    });
    html += '</div>';
    this.showModal('📦 現フロア 備品・消耗品管理', html);
  }

  openDistributionSelectModal() {
    const tasks = [
      { id: 'dist_01', title: '📰 朝刊・夕刊メモ配り (5F・6F・7F)' },
      { id: 'dist_02', title: '📝 朝刊あつかい・論説秘書配り' },
      { id: 'dist_04', title: '✉️ 友好社・運動メモ配り' }
    ];
    let html = '<p style="font-size: 12px; color: #64748b;">開始する配布タスクを選択してください。対象座席に赤マーカーが点灯します。</p>';
    tasks.forEach(t => {
      html += `
        <button class="btn-start-dist" data-id="${t.id}" style="width: 100%; text-align: left; padding: 10px; margin: 6px 0; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; cursor: pointer;">
          <strong>▶ ${t.title}</strong>
        </button>
      `;
    });
    this.showModal('🎯 資料配り先確認・トレーニング起動', html);
    document.querySelectorAll('.btn-start-dist').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.getAttribute('data-id');
        this.closeModal();
        this.startDistributionTraining(id);
      });
    });
  }

  async openHistoryModal() {
    if (!this.currentUser) return;
    this.showLoading();
    try {
      const logs = await this.sheetService.fetchTrainingLogs();
      let html = '<div style="max-height: 280px; overflow-y: auto;">';
      if (logs.length === 0) {
        html += '<p style="color: #78909c; font-size: 13px;">まだ完了した受講・業務履歴はありません。</p>';
      } else {
        logs.slice().reverse().forEach(l => {
          html += `
            <div style="border-bottom: 1px solid #e2e8f0; padding: 6px 0; font-size: 12px;">
              <div style="font-weight: bold; color: #1e293b;">🎯 ${l.taskTitle}</div>
              <div style="color: #64748b; font-size: 11px;">スコア: ${l.score}点 (所要時間: ${l.clearTimeSec}秒) • ${l.timestamp}</div>
            </div>
          `;
        });
      }
      html += '</div>';
      this.showModal(`📊 ${this.currentUser.name} さんの受講・実績履歴`, html);
    } finally {
      this.hideLoading();
    }
  }

  startDistributionTraining(distId) {
    this.currentTrainingTaskId = distId;
    this.trainingStartTime = Date.now();
    this.activeTargets = [];

    this.floorObjects.forEach(obj => {
      const data = obj.userData;
      if (data.distNeeded === distId && data.redDot) {
        data.redDot.visible = true;
        this.activeTargets.push(obj);
      }
    });

    if (this.activeTargets.length === 0) {
      alert('現フロアに対象の配布先座席がありません。他フロアも確認してください。');
      return;
    }
    alert(`【配布トレーニング開始】\n赤ポチの座席（${this.activeTargets.length}箇所）に書類を届けてください。`);
  }

  async triggerBoard(boardObj) {
    this.showLoading();
    try {
      const posts = await this.sheetService.fetchBoardPosts();
      if (posts.length > 0) {
        localStorage.setItem(`board_last_view_${this.currentFloor}`, posts[posts.length - 1].id);
        if (boardObj.userData.unreadBoardDot) boardObj.userData.unreadBoardDot.visible = false;
      }

      let listHtml = '<div style="max-height: 180px; overflow-y: auto; margin-bottom: 12px; background: #fafafa; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">';
      posts.slice().reverse().forEach(p => {
        listHtml += `<div style="border-bottom: 1px solid #eee; padding: 6px 0; font-size: 12px;">
          <div style="color: #64748b; font-size: 11px;">[${p.category || '連絡'}] <strong>${p.author || '社員'}</strong> • ${p.date || ''}</div>
          <div style="color: #1e293b; margin-top: 2px;">${p.message}</div>
        </div>`;
      });
      listHtml += '</div>';

      const defaultAuthor = this.currentUser ? this.currentUser.name : '社員';
      const formHtml = `
        <div style="background: #f1f5f9; padding: 10px; border-radius: 8px;">
          <div style="font-weight: bold; font-size: 12px; margin-bottom: 6px; color: #334155;">📌 掲示板に新規投稿</div>
          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
            <input type="text" id="b-author" value="${defaultAuthor}" style="flex: 1; padding: 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px;">
            <select id="b-cat" style="padding: 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px;">
              <option value="連絡">連絡</option><option value="共有">共有</option><option value="至急">至急</option>
            </select>
          </div>
          <textarea id="b-msg" placeholder="投稿内容を入力..." rows="2" style="width: 100%; box-sizing: border-box; padding: 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; resize: none;"></textarea>
          <div style="text-align: right; margin-top: 6px;">
            <button id="btn-b-submit" class="btn-dialog btn-primary" style="padding: 5px 12px; font-size: 12px;">投稿する</button>
          </div>
        </div>
      `;

      this.showModal('📌 業務連絡掲示板', listHtml + formHtml);

      document.getElementById('btn-b-submit')?.addEventListener('click', async () => {
        const author = document.getElementById('b-author').value.trim() || defaultAuthor;
        const category = document.getElementById('b-cat').value;
        const msg = document.getElementById('b-msg').value.trim();
        if (!msg) return;

        this.showLoading();
        try {
          const now = new Date();
          const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          await this.sheetService.saveBoardPost({ id: `b_${Date.now()}`, date: dateStr, author: author, category: category, message: msg });
          alert('掲示板に投稿しました！');
          this.closeModal();
        } finally {
          this.hideLoading();
        }
      });
    } finally {
      this.hideLoading();
    }
  }

  async openDictionaryModal() {
    this.showLoading();
    try {
      const terms = await this.sheetService.fetchDictionary();
      let listHtml = '<div style="max-height: 220px; overflow-y: auto; margin-bottom: 12px;">';
      terms.forEach(t => {
        listHtml += `
          <div style="margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
            <div style="font-weight: bold; color: #7b1fa2; font-size: 13px;">[${t.category || '一般'}] ${t.term}</div>
            <div style="font-size: 12px; color: #475569; margin-top: 2px;">${t.content}</div>
          </div>
        `;
      });
      listHtml += '</div>';

      const addFormHtml = `
        <div style="background: #faf5ff; border: 1px solid #e9d5ff; padding: 10px; border-radius: 8px;">
          <div style="font-weight: bold; font-size: 12px; color: #6b21a8; margin-bottom: 6px;">➕ 用語・マニュアルの追加</div>
          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
            <input type="text" id="dict-term" placeholder="用語名" style="flex: 2; padding: 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px;">
            <input type="text" id="dict-cat" placeholder="分類" style="flex: 1; padding: 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px;">
          </div>
          <textarea id="dict-content" placeholder="説明を入力..." rows="2" style="width: 100%; box-sizing: border-box; padding: 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; resize: none;"></textarea>
          <div style="text-align: right; margin-top: 6px;">
            <button id="btn-dict-add" class="btn-dialog btn-primary" style="background: #7b1fa2; padding: 5px 12px; font-size: 12px;">追加保存</button>
          </div>
        </div>
      `;

      this.showModal('📖 社内辞書・マニュアル用語', listHtml + addFormHtml);

      document.getElementById('btn-dict-add')?.addEventListener('click', async () => {
        const term = document.getElementById('dict-term').value.trim();
        const cat = document.getElementById('dict-cat').value.trim() || '社内業務';
        const content = document.getElementById('dict-content').value.trim();
        if (!term || !content) return alert('用語名と説明を入力してください。');

        this.showLoading();
        try {
          await this.sheetService.saveDictionaryTerm({ term, category: cat, content });
          alert(`用語「${term}」を追加しました！`);
          this.closeModal();
        } finally {
          this.hideLoading();
        }
      });
    } finally {
      this.hideLoading();
    }
  }

  async openWorkflowsTableModal() {
    this.showLoading();
    try {
      let rows = await this.sheetService.fetchWorkflows();
      if (!rows || rows.length === 0) {
        rows = [
          { shift: '昼勤', timeGroup: '9:00~', time: '9:00', taskName: '朝刊取り', position: '早番', description: '新聞室から朝刊を回収し、連絡員席に並べる。共同・時事を29部コピー配布、メール送信。', briefexplanation: '新聞室から朝刊回収・配布', weekends: '' },
          { shift: '昼勤', timeGroup: '9:00~', time: '9:00', taskName: '朝刊配り', position: '早番/遅番', description: '早番:5・7F、遅番:6Fへ朝刊を配達。', briefexplanation: '各階朝刊配り', weekends: '' },
          { shift: '昼勤', timeGroup: '9:00~', time: '9:00', taskName: '朝刊あつかい配り', position: '早番', description: '論説委員会(+あつかい)・秘書室×2・経済部×3。18部コピー配布・メール送信。', briefexplanation: '論説・秘書室配り', weekends: '' },
          { shift: '昼勤', timeGroup: '10:00~', time: '10:00', taskName: '外回り', position: '早番', description: 'Bag便〆切10:00。電力ビル→県庁→県警→市役所。3Fサポセン備品補充、3F総務郵便出し・回収、2F販売部石巻かほく回収。', briefexplanation: '行政各庁・外回り便回収', weekends: '' },
          { shift: '昼勤', timeGroup: '13:00~', time: '13:00', taskName: '紙補充', position: '早番/遅番', description: '円卓の複合機2機のA3とA4を用紙補充する。', briefexplanation: '複合機コピー用紙補充', weekends: '' },
          { shift: '昼勤', timeGroup: '16:00~', time: '16:00', taskName: 'メモ配り', position: '遅番', description: '【自社メモ】(5F)防災教育室長・文化部長・写真映像部長・経済部×3 (6F)メディアセンター長。メール・FAX送信。', briefexplanation: '自社・運動・友好社メモ配り', weekends: '' }
        ];
      }

      let tableRowsHtml = '';
      rows.forEach((r, idx) => {
        tableRowsHtml += `
          <tr data-index="${idx}" style="border-bottom: 1px solid #cbd5e1;">
            <td style="padding: 6px; font-weight: bold; color: #0284c7;">${r.shift}</td>
            <td style="padding: 6px;">${r.time}</td>
            <td style="padding: 6px; font-weight: bold;">${r.taskName}</td>
            <td style="padding: 6px;"><span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${r.position}</span></td>
            <td style="padding: 6px; font-size: 11px; max-width: 260px; line-height: 1.3;">${r.description}</td>
            <td style="padding: 6px; text-align: center;">
              <button class="btn-wf-edit-row" data-index="${idx}" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 6px; font-size: 11px; cursor: pointer;">編集</button>
            </td>
          </tr>
        `;
      });

      const modalBodyHtml = `
        <div style="max-height: 340px; overflow-y: auto; margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
            <thead style="background: #f8fafc; position: sticky; top: 0; border-bottom: 2px solid #cbd5e1;">
              <tr>
                <th style="padding: 6px;">シフト</th>
                <th style="padding: 6px;">時間</th>
                <th style="padding: 6px;">業務名</th>
                <th style="padding: 6px;">担当</th>
                <th style="padding: 6px;">業務内容・配布先</th>
                <th style="padding: 6px;">操作</th>
              </tr>
            </thead>
            <tbody>${tableRowsHtml}</tbody>
          </table>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <button id="btn-wf-add-new" class="btn-dialog" style="background: #10b981; color: #fff; font-size: 12px; padding: 6px 12px;">+ 新規業務行の追加</button>
          <button id="btn-wf-save-all" class="btn-dialog btn-primary" style="font-size: 12px; padding: 6px 16px;">スプレッドシートに保存</button>
        </div>
      `;

      this.showModal('📋 業務情報一覧・簡易マニュアル（編集対応）', modalBodyHtml);

      document.querySelectorAll('.btn-wf-edit-row').forEach(btn => {
        btn.addEventListener('click', e => {
          const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
          const item = rows[idx];
          const editHtml = `
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
              <label><strong>時間:</strong> <input type="text" id="edit-wf-time" value="${item.time}" style="width: 100%; padding: 4px;"></label>
              <label><strong>業務名:</strong> <input type="text" id="edit-wf-name" value="${item.taskName}" style="width: 100%; padding: 4px;"></label>
              <label><strong>担当 (早番/遅番):</strong> <input type="text" id="edit-wf-pos" value="${item.position}" style="width: 100%; padding: 4px;"></label>
              <label><strong>詳細説明:</strong> <textarea id="edit-wf-desc" rows="4" style="width: 100%; padding: 4px;">${item.description}</textarea></label>
              <div style="text-align: right; margin-top: 6px;">
                <button id="btn-wf-update-commit" class="btn-dialog btn-primary">行を更新</button>
              </div>
            </div>
          `;
          this.showModal(`✏️ 業務行の編集: ${item.taskName}`, editHtml);
          document.getElementById('btn-wf-update-commit')?.addEventListener('click', () => {
            item.time = document.getElementById('edit-wf-time').value;
            item.taskName = document.getElementById('edit-wf-name').value;
            item.position = document.getElementById('edit-wf-pos').value;
            item.description = document.getElementById('edit-wf-desc').value;
            this.openWorkflowsTableModal();
          });
        });
      });

      document.getElementById('btn-wf-add-new')?.addEventListener('click', () => {
        rows.push({
          shift: '昼勤', timeGroup: '新規', time: '10:00', taskName: '新規タスク', position: '早番',
          description: '業務の詳細を入力してください。', briefexplanation: '概要', weekends: ''
        });
        this.openWorkflowsTableModal();
      });

      document.getElementById('btn-wf-save-all')?.addEventListener('click', async () => {
        this.showLoading();
        try {
          await this.sheetService.saveWorkflows(rows);
          alert('業務情報一覧をスプレッドシート（Workflows）に保存しました！');
          this.closeModal();
        } finally {
          this.hideLoading();
        }
      });
    } finally {
      this.hideLoading();
    }
  }

  closeModal() {
    document.getElementById('info-modal').classList.remove('active');
    this.isModalActive = false;
    this.collisionTimer = 0;
    this.collidingObject = null;
    this.triggerPadTimer = 0;
    this.activeTriggerPadObj = null;
  }

  showModal(title, body) {
    document.getElementById('modal-title').innerHTML = title;
    document.getElementById('modal-content').innerHTML = body;
    document.getElementById('info-modal').classList.add('active');
    this.isModalActive = true;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    let vx = Number(this.inputVector.x) || 0;
    let vy = Number(this.inputVector.y) || 0;

    if (this.keys['w'] || this.keys['arrowup'])    { vx -= 0.7071; vy -= 0.7071; }
    if (this.keys['s'] || this.keys['arrowdown'])  { vx += 0.7071; vy += 0.7071; }
    if (this.keys['a'] || this.keys['arrowleft'])  { vx += 0.7071; vy -= 0.7071; }
    if (this.keys['d'] || this.keys['arrowright']) { vx -= 0.7071; vy += 0.7071; }

    // プレイヤー移動と物理壁衝突
    const hitWall = this.player.update({ x: vx, y: vy }, delta, (nx, nz) => this.checkCollision(nx, nz));

    this.updateCamera(this.player.position.x, this.player.position.z);
    this.minimap.update(this.player.position, this.floorObjects);

    // ★ 物理板（正面透明トリガー）への接触判定（離脱ロック＋1.2秒継続判定）
    const triggerTarget = this.checkTriggerPad();

    if (triggerTarget) {
      // ロック中（階移動直後など）は、トリガー板を踏んでいても発火タイマーを進めない
      if (!this.isTriggerLocked && !this.isTransitioning && !this.isModalActive) {
        if (this.activeTriggerPadObj === triggerTarget) {
          this.triggerPadTimer += delta;
          if (this.triggerPadTimer >= 1.2) {
            this.triggerPadTimer = 0;
            const targetObj = this.activeTriggerPadObj;
            this.activeTriggerPadObj = null;
            this.isTriggerLocked = true; // 次の階移動まで即座にロック

            if (targetObj.userData.isStairsUp) {
              if (this.currentFloor < CONFIG.FLOORS.length) {
                this.triggerFloorTransition(this.currentFloor + 1, 'stairs_up', targetObj);
              } else {
                alert('最上階のためこれ以上上がれません。');
                this.isTriggerLocked = false;
              }
            } else if (targetObj.userData.isStairsDown) {
              if (this.currentFloor > 1) {
                this.triggerFloorTransition(this.currentFloor - 1, 'stairs_down', targetObj);
              } else {
                alert('1階のためこれ以上下りられません。');
                this.isTriggerLocked = false;
              }
            } else if (targetObj.userData.isElevator) {
              this.triggerElevator(targetObj);
            }
            return;
          }
        } else {
          this.activeTriggerPadObj = triggerTarget;
          this.triggerPadTimer = 0;
        }
      }
    } else {
      // ★ プレイヤーがトリガー板から完全に外へ離れたら、再接触ロックを解除
      this.isTriggerLocked = false;
      this.activeTriggerPadObj = null;
      this.triggerPadTimer = 0;
    }

    // 一般家具（デスク・プリンター・掲示板等）のみ壁接触でモーダル表示
    // ※ 階段・エレベーターは四方の壁にいくらぶつかってもイベント発火させない
    const isMovingInput = Math.hypot(vx, vy) > 0.05;
    const isSpecialTransit = hitWall && (hitWall.userData.isStairsUp || hitWall.userData.isStairsDown || hitWall.userData.isElevator);

    if (!this.isModalActive && !this.isTransitioning && hitWall && !isSpecialTransit && isMovingInput) {
      if (this.collidingObject === hitWall) {
        this.collisionTimer += delta;
        if (this.collisionTimer >= 0.4) {
          this.handleTriggerObject(hitWall);
          this.collisionTimer = 0;
          this.collidingObject = null;
        }
      } else {
        this.collidingObject = hitWall;
        this.collisionTimer = 0;
      }
    } else {
      this.collidingObject = null;
      this.collisionTimer = 0;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

function startOfficeSimApp() {
  const app = new OfficeSimApp();
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startOfficeSimApp);
} else {
  startOfficeSimApp();
}





