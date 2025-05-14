// 检测子弹击中
function checkBulletHits() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    
    // 减少子弹生存时间
    bullet.ttl--;
    if (bullet.ttl <= 0) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      continue;
    }
    
    // 更新子弹位置
    bullet.position.add(bullet.velocity);
    
    // 检查子弹与障碍物碰// 游戏全局变量
let scene, camera, renderer, controls;
let bullets = [];
let blueTeam = []; // 玩家的队 (蓝队)
let redTeam = []; // 敌人队 (红队)
let obstacles = []; // 地图障碍物
let blueScore = 0;
let redScore = 0;
let isGameStarted = false;
let playerCharacter; // 存储玩家角色的引用
let maxScore = 50;
let gameInitialized = false;
let playerCollisionBox; // 玩家的碰撞盒
let playerIsDead = false;
let respawnTime = 3000; // 复活时间(毫秒)
let playerRespawnTimeout;
let playerHealth = 100;
let ammo = 30;
let maxAmmo = 90;

// DOM元素引用
let scoreDisplay, teamScoresDisplay, healthDisplay, ammoDisplay, respawnInfoDisplay;

// 键盘控制相关
const keyStates = {};
const moveSpeed = 0.15;

// 等待页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素引用
  scoreDisplay = document.getElementById('score-display');
  teamScoresDisplay = document.getElementById('team-scores');
  healthDisplay = document.getElementById('health-display');
  ammoDisplay = document.getElementById('ammo-display');
  respawnInfoDisplay = document.getElementById('respawn-info');

  // 添加开始按钮的事件监听器
  document.getElementById('start-button').addEventListener('click', function() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    startGame();
  });

  // 添加重新开始按钮的事件监听器
  document.getElementById('restart-button').addEventListener('click', function() {
    location.reload();
  });
});

// 开始游戏的函数
function startGame() {
  // 强制解锁控制（以防之前的游戏未正确结束）
  try {
    if (controls && controls.isLocked) {
      controls.unlock();
    }
  } catch (e) {}

  // 初始化游戏
  init();

  // 请求指针锁定
  renderer.domElement.addEventListener('click', function() {
    if (!isGameStarted && !playerIsDead) {
      controls.lock();
    }
  });
}

// 创建角色
function createCharacter(team, isPlayer = false) {
  // 创建角色身体
  const bodyGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: team === 'blue' ? 0x0000ff : 0xff0000
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.75;
  
  // 创建头部
  const headGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const headMaterial = new THREE.MeshStandardMaterial({ 
    color: team === 'blue' ? 0x6666ff : 0xff6666
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.8;
  
  // 创建眼睛
  const eyeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
  
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.15, 1.85, 0.31);
  
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.15, 1.85, 0.31);
  
  // 创建角色组
  const character = new THREE.Group();
  character.add(body);
  character.add(head);
  character.add(leftEye);
  character.add(rightEye);
  
  // 设置角色属性
  character.team = team;
  character.isPlayer = isPlayer;
  character.isDead = false;
  character.respawnTime = 0;
  character.health = 100;
  character.direction = new THREE.Vector3(0, 0, -1);
  character.state = 'patrol'; // patrol, chase, attack
  character.target = null;
  character.patrolPoint = null;
  character.patrolTimer = 0;
  
  // 创建碰撞盒
  const collisionGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
  const collisionMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xff0000, 
    transparent: true, 
    opacity: 0.0, 
    wireframe: true 
  });
  character.collisionBox = new THREE.Mesh(collisionGeometry, collisionMaterial);
  character.collisionBox.visible = false;
  character.add(character.collisionBox);
  
  // 将角色添加到场景
  scene.add(character);
  
  return character;
}

// 初始化游戏
function init() {
  if (gameInitialized) return; // 防止重複初始化
  gameInitialized = true;
  
  // 更新HUD显示
  updateHUD();

  // 初始化场景
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // 天空蓝背景色
  
  // 创建相机
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.y = 1.7; // 設置相機高度模擬人的視角
  
  // 初始化渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // 初始化指针锁定控制器
  controls = new THREE.PointerLockControls(camera, document.body);

  // 添加灯光
  const ambientLight = new THREE.AmbientLight(0x606060);
  scene.add(ambientLight);
  
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(50, 100, 50);
  light.castShadow = true;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 500;
  light.shadow.camera.left = -100;
  light.shadow.camera.right = 100;
  light.shadow.camera.top = 100;
  light.shadow.camera.bottom = -100;
  scene.add(light);

  // 创建地板
  const floorGeometry = new THREE.PlaneGeometry(100, 100);
  const floorTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/hardwood2_diffuse.jpg');
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(10, 10);
  const floorMaterial = new THREE.MeshStandardMaterial({ 
    map: floorTexture, 
    roughness: 0.8,
    color: 0xaaaaaa
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // 创建环境(军事基地)
  createMilitaryBase();

  // 创建玩家角色
  playerCharacter = createCharacter('blue', true);
  playerCharacter.position.set(0, 0, 5);
  blueTeam.push(playerCharacter);
  
  // 创建玩家碰撞盒
  playerCollisionBox = new THREE.Box3().setFromObject(playerCharacter.collisionBox);
  
  // 创建队友 (蓝队)
  for (let i = 0; i < 2; i++) {
    const teammate = createCharacter('blue');
    teammate.position.set(-5 + i * 10, 0, 5);
    blueTeam.push(teammate);
  }
  
  // 创建敌人 (红队)
  for (let i = 0; i < 3; i++) {
    const enemy = createCharacter('red');
    enemy.position.set(-5 + i * 5, 0, -15);
    redTeam.push(enemy);
  }

  // 创建十字准心
  createCrosshair();

  // 射击和指针锁定事件
  controls.addEventListener('lock', function() {
    isGameStarted = true;
    document.getElementById('crosshair').style.display = 'block';
  });

  controls.addEventListener('unlock', function() {
    isGameStarted = false;
    if (blueScore < maxScore && redScore < maxScore) {
      document.getElementById('crosshair').style.display = 'none';
    }
  });

  document.addEventListener('click', function() {
    if (isGameStarted && !playerIsDead && ammo > 0) {
      shoot(playerCharacter);
      ammo--;
      updateHUD();
      
      // 如果弹药用完，3秒后自动补充
      if (ammo === 0 && maxAmmo > 0) {
        setTimeout(() => {
          const reloadAmount = Math.min(30, maxAmmo);
          ammo = reloadAmount;
          maxAmmo -= reloadAmount;
          updateHUD();
        }, 3000);
      }
    }
  });

  // 键盘事件监听
  document.addEventListener('keydown', function(event) {
    keyStates[event.code] = true;
    
    // ESC键暂停游戏
    if (event.code === 'Escape' && isGameStarted) {
      controls.unlock();
    }
    
    // R键换弹
    if (event.code === 'KeyR' && ammo < 30 && maxAmmo > 0) {
      const reloadAmount = Math.min(30 - ammo, maxAmmo);
      ammo += reloadAmount;
      maxAmmo -= reloadAmount;
      updateHUD();
    }
  });
  
  document.addEventListener('keyup', function(event) {
    keyStates[event.code] = false;
  });

  // 适应窗口大小变化
  window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 启动动画循环
  animate();
}

// 创建军事基地环境
function createMilitaryBase() {
  // 外墙
  createWall(-50, 0, 0, 100, 4, 2, 0x888888);
  createWall(50, 0, 0, 100, 4, 2, 0x888888);
  createWall(0, 0, -50, 2, 4, 100, 0x888888);
  createWall(0, 0, 50, 2, 4, 100, 0x888888);
  
  // 内部建筑和障碍物
  // 中央大楼
  createBuilding(0, 0, 0, 12, 6, 12, 0x777777);
  
  // 集装箱和障碍物
  const boxColors = [0x8B4513, 0x556B2F, 0x708090, 0x5F9EA0];
  
  // 左侧区域
  for (let i = 0; i < 5; i++) {
    const color = boxColors[Math.floor(Math.random() * boxColors.length)];
    createCrate(-20 + Math.random() * 10, 0, -20 + Math.random() * 40, 2, 2, 4, color);
  }
  
  // 右侧区域
  for (let i = 0; i < 5; i++) {
    const color = boxColors[Math.floor(Math.random() * boxColors.length)];
    createCrate(20 + Math.random() * 10, 0, -20 + Math.random() * 40, 2, 2, 4, color);
  }
  
  // 低矮墙
  createWall(-25, 0, -10, 20, 1.5, 2, 0x888888);
  createWall(25, 0, 10, 20, 1.5, 2, 0x888888);
  createWall(-10, 0, 25, 2, 1.5, 20, 0x888888);
  createWall(10, 0, -25, 2, 1.5, 20, 0x888888);
  
  // 掩体
  createCover(-15, 0, 0, 3, 1, 6, 0x8B4513);
  createCover(15, 0, 0, 3, 1, 6, 0x8B4513);
  createCover(0, 0, 15, 6, 1, 3, 0x8B4513);
  createCover(0, 0, -15, 6, 1, 3, 0x8B4513);
}

// 创建墙
function createWall(x, y, z, width, height, depth, color) {
  const wallGeometry = new THREE.BoxGeometry(width, height, depth);
  const wallMaterial = new THREE.MeshStandardMaterial({ color: color });
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  wall.position.set(x, y + height / 2, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
  
  // 添加碰撞检测
  const boundingBox = new THREE.Box3().setFromObject(wall);
  obstacles.push({ mesh: wall, boundingBox: boundingBox });
}

// 创建建筑
function createBuilding(x, y, z, width, height, depth, color) {
  const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
  const buildingMaterial = new THREE.MeshStandardMaterial({ color: color });
  const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
  building.position.set(x, y + height / 2, z);
  building.castShadow = true;
  building.receiveShadow = true;
  scene.add(building);
  
  // 添加碰撞检测
  const boundingBox = new THREE.Box3().setFromObject(building);
  obstacles.push({ mesh: building, boundingBox: boundingBox });
}

// 创建箱子
function createCrate(x, y, z, width, height, depth, color) {
  const crateGeometry = new THREE.BoxGeometry(width, height, depth);
  const crateMaterial = new THREE.MeshStandardMaterial({ color: color });
  const crate = new THREE.Mesh(crateGeometry, crateMaterial);
  crate.position.set(x, y + height / 2, z);
  crate.castShadow = true;
  crate.receiveShadow = true;
  scene.add(crate);
  
  // 添加碰撞检测
  const boundingBox = new THREE.Box3().setFromObject(crate);
  obstacles.push({ mesh: crate, boundingBox: boundingBox });
}

// 创建掩体
function createCover(x, y, z, width, height, depth, color) {
  const coverGeometry = new THREE.BoxGeometry(width, height, depth);
  const coverMaterial = new THREE.MeshStandardMaterial({ color: color });
  const cover = new THREE.Mesh(coverGeometry, coverMaterial);
  cover.position.set(x, y + height / 2, z);
  cover.castShadow = true;
  cover.receiveShadow = true;
  scene.add(cover);
  
  // 添加碰撞检测
  const boundingBox = new THREE.Box3().setFromObject(cover);
  obstacles.push({ mesh: cover, boundingBox: boundingBox });
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

// 处理WASD键盘移动
function handleKeyboardMovement() {
  if (playerIsDead) return;
  
  const frontVector = new THREE.Vector3(0, 0, 0);
  const sideVector = new THREE.Vector3(0, 0, 0);
  
  if (keyStates['KeyW']) {
    frontVector.z = -1;
  }
  if (keyStates['KeyS']) {
    frontVector.z = 1;
  }
  if (keyStates['KeyA']) {
    sideVector.x = -1;
  }
  if (keyStates['KeyD']) {
    sideVector.x = 1;
  }
  
  // 标准化向量
  if (frontVector.length() > 0) frontVector.normalize();
  if (sideVector.length() > 0) sideVector.normalize();
  
  // 应用摄像机方向
  frontVector.applyQuaternion(camera.quaternion);
  sideVector.applyQuaternion(camera.quaternion);
  
  // 忽略Y轴变化
  frontVector.y = 0;
  sideVector.y = 0;
  
  if (frontVector.length() > 0) frontVector.normalize();
  if (sideVector.length() > 0) sideVector.normalize();
  
  // 计算最终移动向量
  const moveVector = new THREE.Vector3();
  moveVector.addVectors(frontVector.multiplyScalar(moveSpeed), sideVector.multiplyScalar(moveSpeed));
  
  // 存储当前位置
  const oldPosition = playerCharacter.position.clone();
  
  // 应用移动
  playerCharacter.position.add(moveVector);
  
  // 更新玩家碰撞盒
  playerCollisionBox.setFromObject(playerCharacter.collisionBox);
  
  // 检查碰撞
  if (checkCollisions(playerCollisionBox)) {
    // 如果发生碰撞，恢复原来的位置
    playerCharacter.position.copy(oldPosition);
    playerCollisionBox.setFromObject(playerCharacter.collisionBox);
  }
  
  // 更新相机位置
  camera.position.x = playerCharacter.position.x;
  camera.position.z = playerCharacter.position.z;
  camera.position.y = playerCharacter.position.y + 1.7;
}

// 检查碰撞
function checkCollisions(box) {
  for (let obstacle of obstacles) {
    if (box.intersectsBox(obstacle.boundingBox)) {
      return true;
    }
  }
  return false;
}

// 射击函数
function shoot(character) {
  const geometry = new THREE.SphereGeometry(0.1, 8, 8);
  const material = new THREE.MeshBasicMaterial({ color: character.team === 'blue' ? 0x00ffff : 0xff8080 });
  const bullet = new THREE.Mesh(geometry, material);
  
  // 设置子弹初始位置
  bullet.position.set(
    character.position.x,
    character.position.y + 1.5, // 从角色头部射出
    character.position.z
  );
  
  // 计算子弹飞行方向
  if (character.isPlayer) {
    // 玩家子弹 - 从相机方向射出
    bullet.velocity = new THREE.Vector3(0, 0, -1);
    bullet.velocity.applyQuaternion(camera.quaternion);
  } else {
    // AI子弹 - 朝向目标射出
    if (character.target) {
      bullet.velocity = new THREE.Vector3();
      bullet.velocity.subVectors(character.target.position, bullet.position);
    } else {
      bullet.velocity = character.direction.clone();
    }
  }
  
  bullet.velocity.normalize().multiplyScalar(0.8);
  bullet.team = character.team;
  bullet.ttl = 100; // 子弹生存时间
  
  bullets.push(bullet);
  scene.add(bullet);
  
  // 播放射击音效
  // playSound('shoot');
}

// 更新分数
function updateScore() {
  blueScore = Math.max(0, blueScore);
  redScore = Math.max(0, redScore);
  updateHUD();
  
  // 检查是否达到胜利条件
  if (blueScore >= maxScore) {
    gameOver('blue');
  } else if (redScore >= maxScore) {
    gameOver('red');
  }
}

// 响应角色死亡
function characterDeath(character) {
  character.isDead = true;
  character.visible = false;
  
  if (character.isPlayer) {
    playerIsDead = true;
    playerHealth = 0;
    updateHUD();
    
    // 显示死亡信息
    respawnInfoDisplay.textContent = '你已阵亡! 复活中...';
    respawnInfoDisplay.style.display = 'block';
    
    // 设置玩家复活计时器
    playerRespawnTimeout = setTimeout(() => {
      respawnCharacter(character);
      playerIsDead = false;
      playerHealth = 100;
      updateHUD();
      respawnInfoDisplay.style.display = 'none';
    }, respawnTime);
  } else {
    // 设置AI角色复活计时器
    setTimeout(() => {
      respawnCharacter(character);
    }, respawnTime);
  }
}

// 角色复活
function respawnCharacter(character) {
  // 根据队伍选择复活位置
  let x, z;
  if (character.team === 'blue') {
    x = -15 + Math.random() * 30;
    z = 40 + Math.random() * 5;
  } else {
    x = -15 + Math.random() * 30;
    z = -40 - Math.random() * 5;
  }
  
  // 设置新位置
  character.position.set(x, 0, z);
  
  // 恢复角色属性
  character.isDead = false;
  character.visible = true;
  character.health = 100;
  
  // 如果是玩家，更新相机位置
  if (character.isPlayer) {
    camera.position.set(x, 1.7, z);
  }
}

// 游戏结束处理
function gameOver(winningTeam) {
  // 解锁指针
  if (controls && controls.isLocked) {
    controls.unlock();
  }
  
  // 更新游戏结束画面
  const resultText = document.getElementById('result-text');
  const finalScore = document.getElementById('final-score');
  
  if (winningTeam === 'blue') {
    resultText.textContent = '胜利!';
    resultText.style.color = '#4da6ff';
  } else {
    resultText.textContent = '失败!';
    resultText.style.color = '#ff4d4d';
  }
  
  finalScore.textContent = `蓝队: ${blueScore} | 红队: ${redScore}`;
  
  // 显示游戏结束界面
  document.getElementById('game-over').style.display = 'block';
  document.getElementById('crosshair').style.display = 'none';
}

// 更新AI角色
function updateAI() {
  const allCharacters = [...blueTeam, ...redTeam];
  
  // 更新所有非玩家角色的AI行为
  for (let character of allCharacters) {
    if (character.isPlayer || character.isDead) continue;
    
    // 更新巡逻点
    if (!character.patrolPoint || character.patrolTimer <= 0) {
      // 设置新的巡逻点
      character.patrolPoint = new THREE.Vector3(
        Math.random() * 80 - 40,
        0,
        Math.random() * 80 - 40
      );
      character.patrolTimer = 200 + Math.random() * 200;
    } else {
      character.patrolTimer--;
    }
    
    // 寻找最近的敌人
    let nearestEnemy = null;
    let minDistance = Infinity;
    
    for (let otherCharacter of allCharacters) {
      if (otherCharacter.team !== character.team && !otherCharacter.isDead) {
        const distance = character.position.distanceTo(otherCharacter.position);
        if (distance < minDistance) {
          minDistance = distance;
          nearestEnemy = otherCharacter;
        }
      }
    }
    
    // 状态机逻辑
    if (nearestEnemy && minDistance < 20) {
      character.target = nearestEnemy;
      
      if (minDistance < 15) {
        character.state = 'attack';
      } else {
        character.state = 'chase';
      }
    } else {
      character.state = 'patrol';
      character.target = null;
    }
    
    // 根据状态执行行为
    switch (character.state) {
      case 'patrol':
        if (character.patrolPoint) {
          moveCharacter(character, character.patrolPoint);
        }
        break;
        
      case 'chase':
        if (character.target) {
          moveCharacter(character, character.target.position);
        }
        break;
        
      case 'attack':
        if (character.target) {
          // 面向目标
          const direction = new THREE.Vector3();
          direction.subVectors(character.target.position, character.position);
          direction.y = 0;
          direction.normalize();
          character.direction = direction;
          
          // 随机射击
          if (Math.random() < 0.02) {
            shoot(character);
          }
        }
        break;
    }
  }
}

// 移动AI角色
function moveCharacter(character, targetPosition) {
  const direction = new THREE.Vector3();
  direction.subVectors(targetPosition, character.position);
  direction.y = 0;
  direction.normalize();
  character.direction = direction.clone();
  
  // 存储当前位置
  const oldPosition = character.position.clone();
  
  // 应用移动
  character.position.add(direction.multiplyScalar(moveSpeed * 0.5));
  
  // 更新角色碰撞盒
  const characterBox = new THREE.Box3().setFromObject(character.collisionBox);
  
  // 检查碰撞
  if (checkCollisions(characterBox)) {
    // 如果发生碰撞，恢复原来的位置
    character.position.copy(oldPosition);
  }
}

// 检测子弹击中
function checkBulletHits() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    
    // 减少子弹生存时间
    bullet.ttl--;
    if (bullet.ttl <= 0) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      continue;
    }
    
    // 更新子弹位置
    bullet.position.add(bullet.velocity);
    
    // 检查子弹与障碍物碰撞
    const bulletBox = new THREE.Box3().setFromObject(bullet);
    let hitObstacle = false;
    
    for (let obstacle of obstacles) {
      if (bulletBox.intersectsBox(obstacle.boundingBox)) {
        scene.remove(bullet);
        bullets.splice(i, 1);
        hitObstacle = true;
        break;
      }
    }
    
    if (hitObstacle) continue;
    
    // 检查子弹与角色碰撞
    const allCharacters = [...blueTeam, ...redTeam];
    for (let character of allCharacters) {
      if (character.isDead || character.team === bullet.team) continue;
      
      const characterBox = new THREE.Box3().setFromObject(character.collisionBox);
      if (bulletBox.intersectsBox(characterBox)) {
        // 击中角色
        scene.remove(bullet);
        bullets.splice(i, 1);
        
        // 处理击中逻辑
        character.health -= 25;
        
        if (character.health <= 0) {
          // 角色死亡
          characterDeath(character);
          
          // 更新分数
          if (character.team === 'blue') {
            redScore++;
          } else {
            blueScore++;
          }
          updateScore();
          
          // 检查是否达到胜利条件
          if (blueScore >= maxScore) {
            gameOver('blue');
          } else if (redScore >= maxScore) {
            gameOver('red');
          }
        }
        
        break;