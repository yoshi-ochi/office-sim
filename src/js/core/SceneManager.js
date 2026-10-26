// src/js/core/SceneManager.js
import { CONFIG } from '../config.js';

export class SceneManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.floorPlane = null;
    this.gridHelper = null;

    this.init();
  }

  init() {
    // 1. シーン生成
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd7e0e5);

    // 2. 正射影カメラ (Orthographic / クォータービュー・アイソメトリック)
    const aspect = window.innerWidth / window.innerHeight;
    const d = CONFIG.CAMERA_VIEW_SIZE;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    this.updateCameraIsometric(0, 0);

    // 3. レンダラー
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. ライティング (どうぶつの森風の柔らかい光)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff6e5, 0.65);
    dirLight.position.set(30, 45, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    this.scene.add(dirLight);

    // 5. 床面 & 50cmグリッド
    this.createGround();

    // 6. リサイズ対応
    window.addEventListener('resize', () => this.onResize());
  }

  createGround() {
    // 50m四方の床
    const floorGeo = new THREE.PlaneGeometry(CONFIG.FIELD_SIZE, CONFIG.FIELD_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.85 });
    this.floorPlane = new THREE.Mesh(floorGeo, floorMat);
    this.floorPlane.rotation.x = -Math.PI / 2;
    this.floorPlane.receiveShadow = true;
    this.scene.add(this.floorPlane);

    // 50cmグリッド (100分割)
    this.gridHelper = new THREE.GridHelper(CONFIG.FIELD_SIZE, CONFIG.GRID_DIVISIONS, 0x81c784, 0xdcdcdc);
    this.gridHelper.position.y = 0.005;
    this.scene.add(this.gridHelper);
  }

  // ターゲット位置に追従する斜め45度カメラ
  updateCameraIsometric(targetX, targetZ) {
    const dist = CONFIG.CAMERA_DISTANCE;
    const elev = CONFIG.CAMERA_ELEVATION;
    this.camera.position.set(targetX + dist, elev, targetZ + dist);
    this.camera.lookAt(targetX, 0, targetZ);
  }

  setFloorColor(hexColor) {
    if (this.floorPlane) {
      this.floorPlane.material.color.setHex(hexColor);
    }
  }

  onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const d = CONFIG.CAMERA_VIEW_SIZE;
    this.camera.left = -d * aspect;
    this.camera.right = d * aspect;
    this.camera.top = d;
    this.camera.bottom = -d;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}