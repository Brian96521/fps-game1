import * as THREE from 'https://cdn.skypack.dev/three@0.152.2';
import { PointerLockControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/PointerLockControls.js';

let scene, camera, renderer, controls;
let bullets = [];
let blueTeam = [], redTeam = [];
let blueScore = 0, redScore = 0;
const MAX_SCORE = 50;
let isGameOver = false;

function createBox(color) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color })
  );
  box.position.set(Math.random() * 30 - 15, 0.5, Math.random() * 30 - 15);
  box.userData.velocity = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5);
  return box;
}

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, document.body);
  camera.position.y = 1.6;

  const light = new THREE.HemisphereLight(0xffffff, 0x444444);
  light.position.set(0, 20, 0);
  scene.add(light);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // 加入一些牆壁當遮蔽物
  for (let i = 0; i < 10; i++) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    wall.position.set(Math.random() * 40 - 20, 1, Math.random() * 40 - 20);
    scene.add(wall);
  }

  // 加藍隊（你 + 2 隊友）
  const player = createBox(0x0000ff);
  player.isPlayer = true;
  scene.add(player);
  blueTeam.push(player);
  for (let i = 0; i < 2; i++) {
    const ally = createBox(0x0000ff);
    blueTeam.push(ally);
    scene.add(ally);
  }

  // 加紅隊敵人
  for (let i = 0; i < 3; i++) {
    const enemy = createBox(0xff0000);
    redTeam.push(enemy);
    scene.add(enemy);
  }

  document.addEventListener('click', () => {
    if (!isGameOver) {
      controls.lock();
      shoot();
    }
  });

  animate();
}

function shoot() {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.1),
    new THREE.MeshBasicMaterial({ color: 0xffff00 })
  );
  bullet.position.copy(camera.position);
  bullet.userData.velocity = new THREE.Vector3();
  camera.getWorldDirection(bullet.userData.velocity);
  bullet.userData.velocity.multiplyScalar(1);
  bullets.push(bullet);
  scene.add(bullet);
}

function respawn(team, color, index) {
  setTimeout(() => {
    const revived = createBox(color);
    team[index] = revived;
    scene.add(revived);
  }, 3000);
}

function checkVictory() {
  if (blueScore >= MAX_SCORE) {
    alert('🎉 藍隊勝利！');
    isGameOver = true;
  } else if (redScore >= MAX_SCORE) {
    alert('💀 紅隊獲勝...');
    isGameOver = true;
  }
}

function animate() {
  requestAnimationFrame(animate);

  bullets.forEach((b, i) => {
    b.position.add(b.userData.velocity);
    redTeam.forEach((enemy, ei) => {
      if (enemy && b.position.distanceTo(enemy.position) < 1) {
        scene.remove(enemy);
        redTeam[ei] = null;
        scene.remove(b);
        bullets[i] = null;
        blueScore++;
        checkVictory();
        respawn(redTeam, 0xff0000, ei);
      }
    });
  });
  bullets = bullets.filter(b => b);

  // AI 簡易追擊邏輯
  redTeam.forEach(enemy => {
    if (enemy) {
      const target = blueTeam.find(p => p);
      if (target) {
        const dir = target.position.clone().sub(enemy.position).normalize();
        enemy.position.add(dir.multiplyScalar(0.03));
      }
    }
  });

  blueTeam.forEach(ally => {
    if (ally && !ally.isPlayer) {
      const target = redTeam.find(e => e);
      if (target) {
        const dir = target.position.clone().sub(ally.position).normalize();
        ally.position.add(dir.multiplyScalar(0.03));
      }
    }
  });

  controls.update();
  renderer.render(scene, camera);
}

export default init;
