// 游戏全局变量
let scene, camera, renderer, controls;
let bullets = [];
let enemies = [];
let score = 0;
let isGameStarted = false;
const maxScore = 50;
let scoreElement;
let gameInitialized = false;

// 等待页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 添加开始按钮的事件监听器
  document.getElementById('start-button').addEventListener('click', function() {
    document.getElementById('start-screen').style.display = 'none';
    startGame();
  });
});

// 开始游戏的函数
function startGame() {
  init();
}

// 初始化游戏
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

  // 初始化场景
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.y = 1.6; // 設置相機高度模擬人的視角
  
  // 初始化渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // 初始化指针锁定控制器
  controls = new THREE.PointerLockControls(camera, document.body);

  // 添加灯光
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 10, 7.5);
  scene.add(light);

  // 创建地板
  const floorGeometry = new THREE.PlaneGeometry(100, 100);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // 创建十字准心
  createCrosshair();

  // 事件监听器
  controls.addEventListener('lock', function() {
    isGameStarted = true;
  });

  controls.addEventListener('unlock', function() {
    if (score < maxScore) {
      isGameStarted = false;
    }
  });

  document.addEventListener('click', function() {
    if (!isGameStarted) {
      controls.lock();
    } else {
      shoot();
    }
  });

  // 适应窗口大小变化
  window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 生成敌人并开始动画循环
  spawnEnemies();
  animate();
}

// 创建十字准心
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

// 发射子弹
function shoot() {
  const geometry = new THREE.SphereGeometry(0.1, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const bullet = new THREE.Mesh(geometry, material);
  
  // 设置子弹初始位置
  bullet.position.copy(camera.position);
  
  // 计算子弹飞行方向
  bullet.velocity = new THREE.Vector3(0, 0, -1);
  bullet.velocity.applyQuaternion(camera.quaternion);
  bullet.velocity.normalize().multiplyScalar(1);
  
  bullets.push(bullet);
  scene.add(bullet);
}

// 生成敌人
function spawnEnemies() {
  for (let i = 0; i < 10; i++) {
    createEnemy();
  }
}

// 创建敌人
function createEnemy() {
  const enemy = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  
  // 确保敌人不会在玩家附近生成
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

// 更新分数
function updateScore() {
  scoreElement.textContent = `Score: ${score}`;
}

// 游戏结束处理
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
  restartButton.addEventListener('click', function() {
    location.reload();
  });
  
  gameOverDiv.appendChild(restartButton);
  document.body.appendChild(gameOverDiv);
  
  controls.unlock();
}

// 动画循环
function animate() {
  requestAnimationFrame(animate);

  // 更新子弹位置并检测碰撞
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.position.add(bullet.velocity);
    
    // 移除超出范围的子弹
    if (bullet.position.length() > 100) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      continue;
    }
    
    // 检测子弹与敌人的碰撞
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (bullet.position.distanceTo(enemy.position) < 1) {
        scene.remove(enemy);
        scene.remove(bullet);
        enemies.splice(j, 1);
        bullets.splice(i, 1);
        score++;
        updateScore();
        
        // 生成新敌人或结束游戏
        if (score < maxScore) {
          createEnemy();
        } else {
          gameOver();
        }
        break;
      }
    }
  }

  // 更新敌人位置
  enemies.forEach(function(enemy) {
    enemy.position.add(enemy.velocity);
    
    // 敌人边界反弹
    if (Math.abs(enemy.position.x) > 50) {
      enemy.velocity.x = -enemy.velocity.x;
    }
    if (Math.abs(enemy.position.z) > 50) {
      enemy.velocity.z = -enemy.velocity.z;
    }
  });

  // 渲染场景
  renderer.render(scene, camera);
}