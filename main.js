let scene, camera, renderer, controls;
let bullets = [];
let enemies = [];
let score = 0;
let isGameStarted = false;
const maxScore = 50;
let scoreElement;
let gameInitialized = false;

function init() {
  if (gameInitialized) return; // 防止重複初始化
  gameInitialized = true;
  
  // 創建得分顯示
  scoreElement = document.createElement('div');
  scoreElement.style.position = 'absolute';
  scoreElement.style.top = '20px';
  scoreElement.style.left = '20px';
  scoreElement.style.fontSize = '24px';
  scoreElement.style.color = 'white';
  scoreElement.textContent = `Score: ${score}`;
  document.body.appendChild(scoreElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.y = 1.6; // 設置相機高度模擬人的視角
  
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // 现在使用全局THREE对象里的PointerLockControls
  controls = new THREE.PointerLockControls(camera, document.body);

  // 添加環境光和平行光以提升視覺效果
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 10, 7.5);
  scene.add(light);

  const floorGeometry = new THREE.PlaneGeometry(100, 100);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // 創建十字準心
  createCrosshair();

  // 事件監聽器
  controls.addEventListener('lock', () => {
    isGameStarted = true;
  });

  controls.addEventListener('unlock', () => {
    if (score < maxScore) {
      isGameStarted = false;
    }
  });

  document.addEventListener('click', () => {
    if (!isGameStarted) {
      controls.lock();
    } else {
      shoot();
    }
  });

  // 適應窗口大小變化
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  spawnEnemies();
  animate();
}

function createCrosshair() {
  const crosshair = document.createElement('div');
  crosshair.style.position = 'absolute';
  crosshair.style.top = '50%';
  crosshair.style.left = '50%';
  crosshair.style.width = '20px';
  crosshair.style.height = '20px';
  crosshair.style.transform = 'translate(-50%, -50%)';
  crosshair.innerHTML = '+';
  crosshair.style.fontSize = '24px';
  crosshair.style.color = 'white';
  crosshair.style.userSelect = 'none';
  document.body.appendChild(crosshair);
}

function shoot() {
  const geometry = new THREE.SphereGeometry(0.1, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const bullet = new THREE.Mesh(geometry, material);
  
  // 設置子彈初始位置（從相機位置發射）
  bullet.position.copy(camera.position);
  
  // 計算子彈飛行方向（朝相機視線方向）
  bullet.velocity = new THREE.Vector3(0, 0, -1);
  bullet.velocity.applyQuaternion(camera.quaternion);
  bullet.velocity.normalize().multiplyScalar(1);
  
  bullets.push(bullet);
  scene.add(bullet);
}

function spawnEnemies() {
  for (let i = 0; i < 10; i++) {
    createEnemy();
  }
}

function createEnemy() {
  const enemy = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  
  // 確保敵人不會在玩家附近生成
  let x, z;
  do {
    x = Math.random() * 40 - 20;
    z = Math.random() * 40 - 20;
  } while (Math.abs(x) < 5 && Math.abs(z) < 5);
  
  enemy.position.set(x, 0.5, z);
  enemy.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.1);
  enemies.push(enemy);
  scene.add(enemy);
}

function updateScore() {
  scoreElement.textContent = `Score: ${score}`;
}

function gameOver() {
  const gameOverDiv = document.createElement('div');
  gameOverDiv.style.position = 'absolute';
  gameOverDiv.style.top = '50%';
  gameOverDiv.style.left = '50%';
  gameOverDiv.style.transform = 'translate(-50%, -50%)';
  gameOverDiv.style.fontSize = '48px';
  gameOverDiv.style.color = 'white';
  gameOverDiv.style.background = 'rgba(0, 0, 0, 0.7)';
  gameOverDiv.style.padding = '20px';
  gameOverDiv.style.borderRadius = '10px';
  gameOverDiv.textContent = 'You Win!';
  
  const restartButton = document.createElement('button');
  restartButton.textContent = 'Play Again';
  restartButton.style.display = 'block';
  restartButton.style.margin = '20px auto 0';
  restartButton.style.padding = '10px 20px';
  restartButton.addEventListener('click', () => {
    location.reload();
  });
  
  gameOverDiv.appendChild(restartButton);
  document.body.appendChild(gameOverDiv);
  
  controls.unlock();
}

function animate() {
  requestAnimationFrame(animate);

  // 更新子彈位置並檢測碰撞
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.position.add(bullet.velocity);
    
    // 移除超出範圍的子彈
    if (bullet.position.length() > 100) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      continue;
    }
    
    // 檢測子彈與敵人的碰撞
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (bullet.position.distanceTo(enemy.position) < 1) {
        scene.remove(enemy);
        scene.remove(bullet);
        enemies.splice(j, 1);
        bullets.splice(i, 1);
        score++;
        updateScore();
        
        // 生成新敵人
        if (score < maxScore) {
          createEnemy();
        } else {
          gameOver();
        }
        break;
      }
    }
  }

  // 更新敵人位置
  enemies.forEach(enemy => {
    enemy.position.add(enemy.velocity);
    
    // 敵人邊界反彈
    if (Math.abs(enemy.position.x) > 50) {
      enemy.velocity.x = -enemy.velocity.x;
    }
    if (Math.abs(enemy.position.z) > 50) {
      enemy.velocity.z = -enemy.velocity.z;
    }
  });

  renderer.render(scene, camera);
}

// 導出用於啟動遊戲的函數
export function startGame() {
  init();
}

// 不再使用 window.onload 自動啟動遊戲