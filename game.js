// 🚀 ULTIMATE SPACE SHOOTER PRO - The Most Addictive Bullet-Hell Roguelite Ever!

// GAME STATE & CONFIGURATION
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// UI ELEMENTS
const ui = {
    startScreen: document.getElementById('startScreen'),
    gameOver: document.getElementById('gameOver'),
    startBtn: document.getElementById('startBtn'),
    restartBtn: document.getElementById('restartBtn'),
    openSkillTreeBtn: document.getElementById('openSkillTreeBtn'),
    skillTreeModal: document.getElementById('skillTreeModal'),
    closeSkillTree: document.getElementById('closeSkillTree'),
    feverOverlay: document.getElementById('feverOverlay'),
    weaponHotbar: document.getElementById('weaponHotbar'),
    crosshair: document.getElementById('crosshair')
};

// GAME VARIABLES
let gameRunning = false;
let gameTime = 0;
let score = 0;
let wave = 1;
let health = 100;
let maxHealth = 100;
let kills = 0;
let level = 1;
let experience = 0;
let experienceToNext = 100;
let invincible = 0;
let shooting = false;
let keys = {};
let mouseX = 0;
let mouseY = 0;

// ENHANCED GAME MECHANICS
let combo = 0;
let comboTimer = 0;
let grazeBonus = 1.0;
let feverMode = false;
let feverTimer = 0;
let crystals = parseInt(localStorage.getItem('spaceshooter_crystals') || '0');
let crystalsEarned = 0;
let currentWeapon = 0;
let dashCooldown = 0;
let dashDistance = 150;
let timeWarpActive = false;
let timeWarpDuration = 0;

// WEAPON SYSTEM
const weapons = ['rapid', 'homing', 'laser'];
const weaponData = {
    rapid: { damage: 25, speed: 8, cooldown: 8, color: '#00ff88', size: 4 },
    homing: { damage: 40, speed: 6, cooldown: 20, color: '#ff8800', size: 6 },
    laser: { damage: 60, speed: 12, cooldown: 15, color: '#ff00ff', size: 8, pierce: 5 }
};

// SKILL TREE SYSTEM
let skillLevels = JSON.parse(localStorage.getItem('spaceshooter_skills') || '{}');
const skillData = {
    dashRange: { maxLevel: 5, effect: 0.25 },
    maxSpeed: { maxLevel: 3, effect: 0.15 },
    airDash: { maxLevel: 1, effect: 1 },
    critChance: { maxLevel: 6, effect: 0.05 },
    bulletPierce: { maxLevel: 3, effect: 1 },
    tripleShot: { maxLevel: 1, effect: 1 },
    shieldCapacity: { maxLevel: 4, effect: 25 },
    revive: { maxLevel: 3, effect: 1 },
    autoRepair: { maxLevel: 1, effect: 1 },
    magnetRange: { maxLevel: 5, effect: 50 },
    powerupMagnet: { maxLevel: 1, effect: 1 },
    timeWarp: { maxLevel: 3, effect: 1 }
};

// PLAYER OBJECT
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 20,
    hitboxSize: 5, // PRECISE HITBOX FOR SKILL-BASED DODGING
    color: '#00ff88',
    speed: 5,
    shootCooldown: 0,
    dashCooldown: 0
};

// OBJECT POOLS FOR PERFORMANCE
const bulletPool = [];
const particlePool = [];
const enemyPool = [];
let bullets = [];
let particles = [];
let enemies = [];
let lootItems = [];
let backgroundStars = [];

// ENHANCED ENEMY TYPES
const enemyTypes = {
    basic: { health: 50, speed: 2, size: 15, color: '#ff4444', shootPattern: 'single' },
    fast: { health: 30, speed: 4, size: 12, color: '#ffaa00', shootPattern: 'aimed' },
    heavy: { health: 120, speed: 1, size: 25, color: '#aa44ff', shootPattern: 'spiral' },
    elite: { health: 200, speed: 2.5, size: 20, color: '#ff00aa', shootPattern: 'burst' },
    boss: { health: 1000, speed: 1.5, size: 40, color: '#ff0066', shootPattern: 'chaos' }
};

// INITIALIZE OBJECT POOLS
function initPools() {
    for (let i = 0; i < 2000; i++) {
        bulletPool.push({
            x: 0, y: 0, vx: 0, vy: 0, size: 4, life: 0, damage: 25,
            color: '#00ff88', active: false, isEnemy: false, type: 'rapid', pierce: 0
        });
    }
    
    for (let i = 0; i < 500; i++) {
        particlePool.push({
            x: 0, y: 0, vx: 0, vy: 0, size: 2, life: 0,
            color: '#ffffff', active: false
        });
    }

    // Initialize background stars
    for (let i = 0; i < 200; i++) {
        backgroundStars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            brightness: Math.random() * 0.8 + 0.2,
            speed: Math.random() * 0.5 + 0.1
        });
    }
}

// OBJECT POOL MANAGEMENT
function getBullet(x, y, vx, vy, size, life, color, damage, isEnemy = false, type = 'rapid', pierce = 0) {
    for (let bullet of bulletPool) {
        if (!bullet.active) {
            bullet.x = x;
            bullet.y = y;
            bullet.vx = vx;
            bullet.vy = vy;
            bullet.size = size;
            bullet.life = life;
            bullet.color = color;
            bullet.damage = damage;
            bullet.active = true;
            bullet.isEnemy = isEnemy;
            bullet.type = type;
            bullet.pierce = pierce;
            bullets.push(bullet);
            return bullet;
        }
    }
}

function returnBullet(bullet) {
    bullet.active = false;
    const index = bullets.indexOf(bullet);
    if (index > -1) bullets.splice(index, 1);
}

function spawnParticle(x, y, color, count = 1, size = 2, speed = 3) {
    for (let i = 0; i < count; i++) {
        for (let particle of particlePool) {
            if (!particle.active) {
                particle.x = x + (Math.random() - 0.5) * 20;
                particle.y = y + (Math.random() - 0.5) * 20;
                particle.vx = (Math.random() - 0.5) * speed;
                particle.vy = (Math.random() - 0.5) * speed;
                particle.size = size + Math.random() * 2;
                particle.life = 40 + Math.random() * 20;
                particle.color = color;
                particle.active = true;
                particles.push(particle);
                break;
            }
        }
    }
}

function returnParticle(particle) {
    particle.active = false;
    const index = particles.indexOf(particle);
    if (index > -1) particles.splice(index, 1);
}

// UTILITY FUNCTIONS
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// SCREEN SHAKE EFFECT
function screenShake(intensity = 10) {
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 100);
}

// ACHIEVEMENT SYSTEM
function showAchievement(text) {
    const popup = document.getElementById('achievementPopup');
    popup.textContent = text;
    popup.classList.remove('hidden');
    popup.classList.add('show');
    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => popup.classList.add('hidden'), 500);
    }, 3000);
}

// SKILL TREE FUNCTIONS
function getSkillLevel(skill) {
    return skillLevels[skill] || 0;
}

function canPurchaseSkill(skill, cost) {
    const currentLevel = getSkillLevel(skill);
    const maxLevel = skillData[skill].maxLevel;
    return crystals >= cost && currentLevel < maxLevel;
}

function purchaseSkill(skill, cost) {
    if (canPurchaseSkill(skill, cost)) {
        crystals -= cost;
        skillLevels[skill] = (skillLevels[skill] || 0) + 1;
        localStorage.setItem('spaceshooter_crystals', crystals.toString());
        localStorage.setItem('spaceshooter_skills', JSON.stringify(skillLevels));
        updateSkillTreeUI();
        updateUI();
        
        // Apply skill effects immediately
        applySkillEffects();
        
        showAchievement(`🎯 ${skill.toUpperCase()} UPGRADED!`);
        return true;
    }
    return false;
}

function applySkillEffects() {
    // Update player stats based on skills
    player.speed = 5 + (getSkillLevel('maxSpeed') * skillData.maxSpeed.effect);
    dashDistance = 150 + (getSkillLevel('dashRange') * skillData.dashRange.effect * 150);
    maxHealth = 100 + (getSkillLevel('shieldCapacity') * skillData.shieldCapacity.effect);
    
    if (health > maxHealth) health = maxHealth;
}

// WEAPON SYSTEM
function switchWeapon(weaponIndex) {
    if (weaponIndex >= 0 && weaponIndex < weapons.length) {
        currentWeapon = weaponIndex;
        updateWeaponUI();
    }
}

function updateWeaponUI() {
    document.querySelectorAll('.weapon-slot').forEach((slot, index) => {
        slot.classList.toggle('active', index === currentWeapon);
    });
}

function shootWeapon() {
    const weapon = weaponData[weapons[currentWeapon]];
    if (player.shootCooldown <= 0) {
        const angleToMouse = angle(player.x, player.y, mouseX, mouseY);
        
        if (weapons[currentWeapon] === 'rapid') {
            // Rapid fire with potential triple shot
            const shots = getSkillLevel('tripleShot') > 0 ? 3 : 1;
            for (let i = 0; i < shots; i++) {
                const spreadAngle = shots > 1 ? (i - 1) * 0.3 : 0;
                const finalAngle = angleToMouse + spreadAngle;
                getBullet(
                    player.x, player.y,
                    Math.cos(finalAngle) * weapon.speed,
                    Math.sin(finalAngle) * weapon.speed,
                    weapon.size, 120, weapon.color, weapon.damage, false, 'rapid',
                    getSkillLevel('bulletPierce')
                );
            }
        } else if (weapons[currentWeapon] === 'homing') {
            // Homing missiles
            getBullet(
                player.x, player.y,
                Math.cos(angleToMouse) * weapon.speed,
                Math.sin(angleToMouse) * weapon.speed,
                weapon.size, 180, weapon.color, weapon.damage, false, 'homing'
            );
        } else if (weapons[currentWeapon] === 'laser') {
            // Piercing laser
            getBullet(
                player.x, player.y,
                Math.cos(angleToMouse) * weapon.speed,
                Math.sin(angleToMouse) * weapon.speed,
                weapon.size, 100, weapon.color, weapon.damage, false, 'laser',
                weapon.pierce + getSkillLevel('bulletPierce')
            );
        }
        
        player.shootCooldown = weapon.cooldown;
        spawnParticle(player.x, player.y, weapon.color, 3, 1, 2);
    }
}

// ENEMY SPAWNING
function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch (side) {
        case 0: x = Math.random() * canvas.width; y = -50; break;
        case 1: x = canvas.width + 50; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + 50; break;
        case 3: x = -50; y = Math.random() * canvas.height; break;
    }
    
    // Determine enemy type based on wave
    let type = 'basic';
    if (wave >= 20) type = Math.random() < 0.3 ? 'elite' : (Math.random() < 0.5 ? 'heavy' : 'fast');
    else if (wave >= 10) type = Math.random() < 0.4 ? 'heavy' : (Math.random() < 0.6 ? 'fast' : 'basic');
    else if (wave >= 5) type = Math.random() < 0.3 ? 'fast' : 'basic';
    
    const enemyData = enemyTypes[type];
    const enemy = {
        x, y,
        type,
        health: enemyData.health + (wave * 10),
        maxHealth: enemyData.health + (wave * 10),
        speed: enemyData.speed + (wave * 0.1),
        size: enemyData.size,
        color: enemyData.color,
        shootPattern: enemyData.shootPattern,
        shootCooldown: 0,
        angle: 0
    };
    
    enemies.push(enemy);
}

// LOOT SYSTEM
function spawnLoot(x, y, enemyType) {
    // Crystal drop chances
    let crystalChance = 0.01; // 1% base
    if (enemyType === 'elite') crystalChance = 0.15;
    if (enemyType === 'boss') crystalChance = 1.0;
    if (combo > 50) crystalChance += 0.01;
    
    if (Math.random() < crystalChance) {
        let crystalType = 'common';
        let crystalValue = 1;
        let crystalColor = '#4488ff';
        
        if (Math.random() < 0.1) { // 10% rare
            crystalType = 'rare';
            crystalValue = 3;
            crystalColor = '#aa44ff';
        }
        
        if (Math.random() < 0.01) { // 1% legendary
            crystalType = 'legendary';
            crystalValue = 10;
            crystalColor = '#ffd700';
        }
        
        lootItems.push({
            x, y,
            type: 'crystal',
            value: crystalValue,
            color: crystalColor,
            size: 8,
            life: 600,
            pulse: 0
        });
    }
    
    // Regular powerups
    if (Math.random() < 0.3) {
        const powerups = ['health', 'speed', 'damage', 'shield'];
        const powerup = powerups[Math.floor(Math.random() * powerups.length)];
        
        lootItems.push({
            x, y,
            type: powerup,
            color: powerup === 'health' ? '#ff4444' : powerup === 'speed' ? '#44ff44' : 
                   powerup === 'damage' ? '#ffaa00' : '#4444ff',
            size: 6,
            life: 300,
            pulse: 0
        });
    }
}

function applyLoot(loot) {
    if (loot.type === 'crystal') {
        crystals += loot.value;
        crystalsEarned += loot.value;
        localStorage.setItem('spaceshooter_crystals', crystals.toString());
        
        spawnParticle(loot.x, loot.y, loot.color, 15, 3, 5);
        screenShake(5);
        
        if (loot.value >= 10) {
            showAchievement('🔥 LEGENDARY CRYSTAL! +10💎');
        } else if (loot.value >= 3) {
            showAchievement('💎 RARE CRYSTAL! +3💎');
        }
    } else {
        // Apply powerup effects
        switch (loot.type) {
            case 'health':
                health = Math.min(maxHealth, health + 30);
                break;
            case 'speed':
                player.speed += 0.5;
                setTimeout(() => player.speed -= 0.5, 10000);
                break;
            case 'damage':
                // Temporary damage boost
                break;
            case 'shield':
                health = Math.min(maxHealth, health + 50);
                break;
        }
        spawnParticle(loot.x, loot.y, loot.color, 8, 2, 3);
    }
}

// GAME INITIALIZATION
function startGame() {
    gameRunning = true;
    gameTime = 0;
    score = 0;
    wave = 1;
    health = maxHealth;
    kills = 0;
    level = 1;
    experience = 0;
    combo = 0;
    comboTimer = 0;
    grazeBonus = 1.0;
    feverMode = false;
    feverTimer = 0;
    crystalsEarned = 0;
    invincible = 0;
    
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.shootCooldown = 0;
    
    bullets = [];
    particles = [];
    enemies = [];
    lootItems = [];
    
    // Apply skill effects
    applySkillEffects();
    
    ui.startScreen.classList.add('hidden');
    ui.gameOver.classList.add('hidden');
    ui.feverOverlay.classList.add('hidden');
    
    updateUI();
    updateWeaponUI();
    gameLoop();
}

function gameOver() {
    gameRunning = false;
    
    // Save high scores
    const highScore = parseInt(localStorage.getItem('spaceshooter_highscore') || '0');
    const highWave = parseInt(localStorage.getItem('spaceshooter_highwave') || '1');
    
    if (score > highScore) {
        localStorage.setItem('spaceshooter_highscore', score.toString());
        showAchievement('🏆 NEW HIGH SCORE!');
    }
    
    if (wave > highWave) {
        localStorage.setItem('spaceshooter_highwave', wave.toString());
        showAchievement('🌊 NEW WAVE RECORD!');
    }
    
    // Update UI
    document.getElementById('finalScore').textContent = score;
    document.getElementById('highestWave').textContent = wave;
    document.getElementById('totalKills').textContent = kills;
    document.getElementById('crystalsEarned').textContent = crystalsEarned;
    
    ui.gameOver.classList.remove('hidden');
    ui.feverOverlay.classList.add('hidden');
}

// UI UPDATE FUNCTIONS
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('wave').textContent = wave;
    document.getElementById('kills').textContent = kills;
    document.getElementById('level').textContent = level;
    document.getElementById('experience').textContent = experience;
    document.getElementById('crystalCount').textContent = crystals;
    document.getElementById('skillCrystals').textContent = crystals;
    
    // Health bar
    const healthPercent = (health / maxHealth) * 100;
    document.getElementById('healthFill').style.width = healthPercent + '%';
    
    // Combo tracker
    const comboTracker = document.getElementById('comboTracker');
    if (combo > 5) {
        comboTracker.style.display = 'block';
        document.getElementById('comboMultiplier').textContent = Math.floor(combo / 5) + 1;
    } else {
        comboTracker.style.display = 'none';
    }
    
    // Graze bonus
    document.getElementById('grazeMultiplier').textContent = grazeBonus.toFixed(1);
    
    // Fever mode
    if (feverMode && !ui.feverOverlay.classList.contains('show')) {
        ui.feverOverlay.classList.remove('hidden');
        ui.feverOverlay.classList.add('show');
    } else if (!feverMode && ui.feverOverlay.classList.contains('show')) {
        ui.feverOverlay.classList.remove('show');
        setTimeout(() => ui.feverOverlay.classList.add('hidden'), 500);
    }
}

function updateSkillTreeUI() {
    document.querySelectorAll('.skill').forEach(skillElement => {
        const skillName = skillElement.dataset.skill;
        const currentLevel = getSkillLevel(skillName);
        const maxLevel = skillData[skillName].maxLevel;
        const cost = parseInt(skillElement.dataset.cost);
        
        skillElement.querySelector('.skill-level span').textContent = currentLevel;
        
        if (currentLevel >= maxLevel) {
            skillElement.classList.add('max-level');
            skillElement.classList.remove('purchased');
        } else if (currentLevel > 0) {
            skillElement.classList.add('purchased');
            skillElement.classList.remove('max-level');
        } else {
            skillElement.classList.remove('purchased', 'max-level');
        }
        
        // Update cost for next level
        const nextLevelCost = cost + (currentLevel * Math.floor(cost * 0.5));
        skillElement.querySelector('.skill-cost').textContent = `Cost: ${nextLevelCost}💎`;
        skillElement.dataset.cost = nextLevelCost;
    });
}

// MAIN UPDATE FUNCTION
function update() {
    gameTime++;
    
    // Update background stars
    backgroundStars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = -10;
            star.x = Math.random() * canvas.width;
        }
    });
    
    // Player movement with enhanced controls
    let moveX = 0, moveY = 0;
    if (keys['a'] || keys['arrowleft']) moveX -= 1;
    if (keys['d'] || keys['arrowright']) moveX += 1;
    if (keys['w'] || keys['arrowup']) moveY -= 1;
    if (keys['s'] || keys['arrowdown']) moveY += 1;
    
    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
        moveX *= 0.707;
        moveY *= 0.707;
    }
    
    player.x = clamp(player.x + moveX * player.speed, player.size, canvas.width - player.size);
    player.y = clamp(player.y + moveY * player.speed, player.size, canvas.height - player.size);
    
    // Dash ability
    if (keys['q'] && dashCooldown <= 0) {
        const dashAngle = angle(player.x, player.y, mouseX, mouseY);
        player.x = clamp(player.x + Math.cos(dashAngle) * dashDistance, player.size, canvas.width - player.size);
        player.y = clamp(player.y + Math.sin(dashAngle) * dashDistance, player.size, canvas.height - player.size);
        dashCooldown = 120;
        spawnParticle(player.x, player.y, '#00ffff', 20, 3, 8);
        screenShake(3);
    }
    
    if (dashCooldown > 0) dashCooldown--;
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (invincible > 0) invincible--;
    
    // Shooting
    if (shooting || keys[' ']) {
        shootWeapon();
    }
    
    // Weapon switching
    if (keys['1']) switchWeapon(0);
    if (keys['2']) switchWeapon(1);
    if (keys['3']) switchWeapon(2);
    
    // Update crosshair position
    ui.crosshair.style.left = (mouseX - 20) + 'px';
    ui.crosshair.style.top = (mouseY - 20) + 'px';
    
    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (!bullet.active) continue;
        
        // Homing behavior
        if (bullet.type === 'homing' && !bullet.isEnemy) {
            let nearestEnemy = null;
            let nearestDist = Infinity;
            
            enemies.forEach(enemy => {
                const dist = distance(bullet.x, bullet.y, enemy.x, enemy.y);
                if (dist < nearestDist && dist < 200) {
                    nearestDist = dist;
                    nearestEnemy = enemy;
                }
            });
            
            if (nearestEnemy) {
                const targetAngle = angle(bullet.x, bullet.y, nearestEnemy.x, nearestEnemy.y);
                const currentAngle = Math.atan2(bullet.vy, bullet.vx);
                const angleDiff = targetAngle - currentAngle;
                const turnRate = 0.1;
                
                const newAngle = currentAngle + Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnRate);
                const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                bullet.vx = Math.cos(newAngle) * speed;
                bullet.vy = Math.sin(newAngle) * speed;
            }
        }
        
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        bullet.life--;
        
        // Remove bullets that are off-screen or expired
        if (bullet.life <= 0 || bullet.x < -50 || bullet.x > canvas.width + 50 || 
            bullet.y < -50 || bullet.y > canvas.height + 50) {
            returnBullet(bullet);
            continue;
        }
        
        // Player bullet vs enemy collision
        if (!bullet.isEnemy) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                if (distance(bullet.x, bullet.y, enemy.x, enemy.y) < bullet.size + enemy.size) {
                    // Critical hit chance
                    const critChance = getSkillLevel('critChance') * 0.05;
                    const isCrit = Math.random() < critChance;
                    const damage = isCrit ? bullet.damage * 2 : bullet.damage;
                    
                    enemy.health -= damage;
                    spawnParticle(bullet.x, bullet.y, isCrit ? '#ffff00' : enemy.color, isCrit ? 12 : 6, 2);
                    
                    if (isCrit) {
                        screenShake(5);
                    }
                    
                    // Pierce mechanic
                    if (bullet.pierce > 0) {
                        bullet.pierce--;
                    } else {
                        returnBullet(bullet);
                        break;
                    }
                    
                    if (enemy.health <= 0) {
                        // Enemy killed
                        combo++;
                        comboTimer = 120; // 2 seconds at 60fps
                        
                        let multiplier = Math.min(10, Math.floor(combo / 5) + 1);
                        let scoreGain = 15 * multiplier * grazeBonus;
                        
                        // Fever mode bonus
                        if (feverMode) scoreGain *= 2;
                        
                        score += Math.floor(scoreGain);
                        kills++;
                        experience += 10;
                        
                        spawnParticle(enemy.x, enemy.y, '#ffffff', 15, 4);
                        spawnLoot(enemy.x, enemy.y, enemy.type);
                        enemies.splice(j, 1);
                        
                        // Check for fever mode
                        if (combo >= 20 && !feverMode) {
                            feverMode = true;
                            feverTimer = 600; // 10 seconds
                            showAchievement('🔥 FEVER MODE ACTIVATED!');
                            screenShake(15);
                        }
                        
                        break;
                    }
                }
            }
        }
        
        // Enemy bullet vs player collision
        if (bullet.isEnemy && invincible <= 0) {
            if (distance(bullet.x, bullet.y, player.x, player.y) < bullet.size + player.hitboxSize) {
                health -= 20;
                invincible = 60;
                combo = 0; // COMBO BREAK!
                grazeBonus = 1.0;
                
                spawnParticle(player.x, player.y, '#ff4444', 10, 3);
                screenShake(10);
                returnBullet(bullet);
                
                if (health <= 0) {
                    // Check for revive skill
                    if (getSkillLevel('revive') > 0) {
                        health = maxHealth * 0.5;
                        skillLevels.revive--;
                        localStorage.setItem('spaceshooter_skills', JSON.stringify(skillLevels));
                        showAchievement('💀 REVIVED! Lives remaining: ' + getSkillLevel('revive'));
                        spawnParticle(player.x, player.y, '#00ff88', 30, 5);
                    } else {
                        gameOver();
                        return;
                    }
                }
                continue;
            }
        }
    }
    
    // Update combo timer
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer <= 0) {
            combo = 0;
        }
    }
    
    // Update fever mode
    if (feverMode) {
        feverTimer--;
        if (feverTimer <= 0) {
            feverMode = false;
        }
    }
    
    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Move towards player
        const angleToPlayer = angle(enemy.x, enemy.y, player.x, player.y);
        enemy.x += Math.cos(angleToPlayer) * enemy.speed;
        enemy.y += Math.sin(angleToPlayer) * enemy.speed;
        
        // Enemy shooting patterns
        if (enemy.shootCooldown <= 0) {
            switch (enemy.shootPattern) {
                case 'single':
                    getBullet(enemy.x, enemy.y, 
                        Math.cos(angleToPlayer) * 4, Math.sin(angleToPlayer) * 4,
                        4, 120, '#ff4444', 15, true);
                    enemy.shootCooldown = 60;
                    break;
                    
                case 'spiral':
                    for (let j = 0; j < 8; j++) {
                        const bulletAngle = (j / 8) * Math.PI * 2 + gameTime * 0.05;
                        getBullet(enemy.x, enemy.y, 
                            Math.cos(bulletAngle) * 4, Math.sin(bulletAngle) * 4,
                            5, 180, '#aa44ff', 20, true);
                    }
                    enemy.shootCooldown = 80;
                    break;
                    
                case 'aimed':
                    getBullet(enemy.x, enemy.y,
                        Math.cos(angleToPlayer) * 6, Math.sin(angleToPlayer) * 6,
                        4, 120, '#ffaa00', 18, true);
                    enemy.shootCooldown = 40;
                    break;
                    
                case 'burst':
                    for (let j = 0; j < 5; j++) {
                        const spreadAngle = angleToPlayer + (j - 2) * 0.3;
                        getBullet(enemy.x, enemy.y,
                            Math.cos(spreadAngle) * 5, Math.sin(spreadAngle) * 5,
                            4, 150, '#ff00aa', 22, true);
                    }
                    enemy.shootCooldown = 100;
                    break;
                    
                case 'chaos':
                    // Boss pattern - multiple types
                    for (let j = 0; j < 12; j++) {
                        const bulletAngle = (j / 12) * Math.PI * 2 + gameTime * 0.03;
                        getBullet(enemy.x, enemy.y,
                            Math.cos(bulletAngle) * 3, Math.sin(bulletAngle) * 3,
                            6, 200, '#ff0066', 25, true);
                    }
                    enemy.shootCooldown = 60;
                    break;
            }
        }
        
        if (enemy.shootCooldown > 0) enemy.shootCooldown--;
        
        // GRAZE DETECTION - bullets near player increase multiplier
        bullets.forEach(bullet => {
            if (bullet.isEnemy) {
                const dist = distance(bullet.x, bullet.y, player.x, player.y);
                if (dist < 25 && dist > player.hitboxSize) {
                    grazeBonus = Math.min(2.5, grazeBonus + 0.005);
                    spawnParticle(player.x, player.y, '#00ffff', 1, 1);
                }
            }
        });
        
        // Player collision with enemy
        if (distance(enemy.x, enemy.y, player.x, player.y) < enemy.size + player.hitboxSize) {
            if (invincible <= 0) {
                health -= 25;
                invincible = 60;
                combo = 0;
                grazeBonus = 1.0;
                
                spawnParticle(enemy.x, enemy.y, '#ff4444', 15, 3);
                screenShake(15);
                enemies.splice(i, 1);
                
                if (health <= 0) {
                    if (getSkillLevel('revive') > 0) {
                        health = maxHealth * 0.5;
                        skillLevels.revive--;
                        localStorage.setItem('spaceshooter_skills', JSON.stringify(skillLevels));
                        showAchievement('💀 REVIVED!');
                    } else {
                        gameOver();
                        return;
                    }
                }
            }
            continue;
        }
    }
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        if (!particle.active) continue;
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        particle.vx *= 0.95;
        particle.vy *= 0.95;
        
        if (particle.life <= 0) {
            returnParticle(particle);
        }
    }
    
    // Update loot items
    for (let i = lootItems.length - 1; i >= 0; i--) {
        const loot = lootItems[i];
        loot.life--;
        loot.pulse += 0.1;
        
        // Magnet effect
        const magnetRange = 50 + (getSkillLevel('magnetRange') * 50);
        const dist = distance(loot.x, loot.y, player.x, player.y);
        
        if (dist < magnetRange) {
            const pullAngle = angle(loot.x, loot.y, player.x, player.y);
            const pullStrength = (magnetRange - dist) / magnetRange * 3;
            loot.x += Math.cos(pullAngle) * pullStrength;
            loot.y += Math.sin(pullAngle) * pullStrength;
        }
        
        if (dist < loot.size + player.size) {
            applyLoot(loot);
            lootItems.splice(i, 1);
            continue;
        }
        
        if (loot.life <= 0) {
            lootItems.splice(i, 1);
        }
    }
    
    // Auto-repair skill
    if (getSkillLevel('autoRepair') > 0 && gameTime % 60 === 0) {
        health = Math.min(maxHealth, health + 1);
    }
    
    // Spawn enemies
    const spawnRate = Math.max(15, 60 - wave * 2);
    if (gameTime % spawnRate === 0) {
        spawnEnemy();
    }
    
    // Wave progression - ENDLESS MODE after wave 20
    if (gameTime % 1800 === 0) { // Every 30 seconds
        wave++;
        
        if (wave > 20) {
            // ABYSS MODE - chaos modifiers
            if (wave % 5 === 0) {
                const modifiers = ['bulletRain', 'speedBoost', 'ghostShips'];
                const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
                showAchievement(`🌀 CHAOS MODIFIER: ${modifier.toUpperCase()}`);
            }
        }
        
        // Spawn wave enemies
        const enemyCount = Math.min(wave + 2, 20);
        for (let i = 0; i < enemyCount; i++) {
            setTimeout(() => spawnEnemy(), i * 200);
        }
        
        showAchievement(`🌊 WAVE ${wave}!`);
    }
    
    // Level up system
    if (experience >= experienceToNext) {
        level++;
        experience -= experienceToNext;
        experienceToNext = Math.floor(experienceToNext * 1.2);
        showAchievement(`⭐ LEVEL UP! Level ${level}`);
        
        // Restore some health on level up
        health = Math.min(maxHealth, health + 20);
    }
    
    updateUI();
}

// ENHANCED DRAW FUNCTION
function draw() {
    // Clear with dynamic background
    ctx.fillStyle = feverMode ? 'rgba(50, 0, 100, 0.3)' : 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Background stars
    backgroundStars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    if (!gameRunning) return;
    
    // Particles
    particles.forEach(particle => {
        if (!particle.active) return;
        const alpha = particle.life / 40;
        ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Enhanced bullet rendering
    bullets.forEach(bullet => {
        if (!bullet.active) return;
        
        // Glow effect
        const glowSize = bullet.size * (bullet.type === 'laser' ? 3 : 2);
        const gradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, glowSize);
        gradient.addColorStop(0, bullet.color + 'ff');
        gradient.addColorStop(1, bullet.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Core bullet
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Special effects for different bullet types
        if (bullet.type === 'homing' && !bullet.isEnemy) {
            ctx.strokeStyle = bullet.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
    });
    
    // Loot items with enhanced effects
    lootItems.forEach(loot => {
        const pulseSize = Math.sin(loot.pulse) * 3 + loot.size;
        
        if (loot.type === 'crystal') {
            // Crystal sparkle effect
            const sparkleGradient = ctx.createRadialGradient(loot.x, loot.y, 0, loot.x, loot.y, pulseSize * 3);
            sparkleGradient.addColorStop(0, loot.color + 'ff');
            sparkleGradient.addColorStop(0.5, loot.color + '80');
            sparkleGradient.addColorStop(1, loot.color + '00');
            ctx.fillStyle = sparkleGradient;
            ctx.beginPath();
            ctx.arc(loot.x, loot.y, pulseSize * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.fillStyle = loot.color;
        ctx.beginPath();
        ctx.arc(loot.x, loot.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Enhanced enemy rendering
    enemies.forEach(enemy => {
        // Enemy glow
        const gradient = ctx.createRadialGradient(enemy.x, enemy.y, 0, enemy.x, enemy.y, enemy.size * 2.5);
        gradient.addColorStop(0, enemy.color + '80');
        gradient.addColorStop(1, enemy.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Enemy body
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Health bar for stronger enemies
        if (enemy.health < enemy.maxHealth && enemy.maxHealth > 100) {
            const barWidth = enemy.size * 2;
            const barHeight = 4;
            const healthPercent = enemy.health / enemy.maxHealth;
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(enemy.x - barWidth/2, enemy.y - enemy.size - 10, barWidth, barHeight);
            
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.fillRect(enemy.x - barWidth/2, enemy.y - enemy.size - 10, barWidth * healthPercent, barHeight);
        }
    });
    
    // Enhanced player rendering
    const playerGlow = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, player.size * 3);
    playerGlow.addColorStop(0, player.color + 'ff');
    playerGlow.addColorStop(0.7, player.color + '40');
    playerGlow.addColorStop(1, player.color + '00');
    ctx.fillStyle = playerGlow;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size * 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Player body
    ctx.fillStyle = invincible > 0 ? '#ffffff' : player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Show precise hitbox in fever mode or when invincible
    if (feverMode || invincible > 0) {
        ctx.strokeStyle = feverMode ? '#ff00ff' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.hitboxSize, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Dash cooldown indicator
    if (dashCooldown > 0) {
        const dashPercent = 1 - (dashCooldown / 120);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size + 5, 0, Math.PI * 2 * dashPercent);
        ctx.stroke();
    }
}

// GAME LOOP
function gameLoop() {
    update();
    draw();
    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// EVENT LISTENERS
ui.startBtn.addEventListener('click', startGame);
ui.restartBtn.addEventListener('click', startGame);
ui.openSkillTreeBtn.addEventListener('click', () => {
    ui.skillTreeModal.classList.remove('hidden');
    updateSkillTreeUI();
});

ui.closeSkillTree.addEventListener('click', () => {
    ui.skillTreeModal.classList.add('hidden');
});

// Skill tree interactions
document.addEventListener('click', (e) => {
    if (e.target.closest('.skill')) {
        const skillElement = e.target.closest('.skill');
        const skillName = skillElement.dataset.skill;
        const cost = parseInt(skillElement.dataset.cost);
        
        if (purchaseSkill(skillName, cost)) {
            // Skill purchased successfully
        }
    }
});

// Weapon hotbar clicks
ui.weaponHotbar.addEventListener('click', (e) => {
    const slot = e.target.closest('.weapon-slot');
    if (slot) {
        const weaponIndex = parseInt(slot.dataset.weapon);
        switchWeapon(weaponIndex);
    }
});

// Keyboard controls
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    // Prevent default for game keys
    if (['w', 'a', 's', 'd', ' ', 'q', '1', '2', '3', 'escape'].includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
    
    // Skill tree toggle
    if (e.key.toLowerCase() === 'escape') {
        if (ui.skillTreeModal.classList.contains('hidden')) {
            ui.skillTreeModal.classList.remove('hidden');
            updateSkillTreeUI();
        } else {
            ui.skillTreeModal.classList.add('hidden');
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mouse controls
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', (e) => {
    shooting = true;
    if (!gameRunning && !ui.startScreen.classList.contains('hidden')) {
        startGame();
    }
});

canvas.addEventListener('mouseup', () => {
    shooting = false;
});

// Mobile controls
document.getElementById('dashBtn')?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    keys['q'] = true;
});

document.getElementById('dashBtn')?.addEventListener('touchend', (e) => {
    e.preventDefault();
    keys['q'] = false;
});

document.getElementById('weaponSwapBtn')?.addEventListener('click', () => {
    switchWeapon((currentWeapon + 1) % weapons.length);
});

document.getElementById('skillTreeBtn')?.addEventListener('click', () => {
    ui.skillTreeModal.classList.toggle('hidden');
    if (!ui.skillTreeModal.classList.contains('hidden')) {
        updateSkillTreeUI();
    }
});

document.getElementById('autoFireToggle')?.addEventListener('click', (e) => {
    const btn = e.target;
    btn.classList.toggle('active');
    // Auto-fire logic would go here
});

// Touch controls for joystick
let joystickActive = false;
const joystick = document.getElementById('joystick');
const joystickHandle = document.getElementById('joystickHandle');

joystick?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    joystickActive = true;
});

document.addEventListener('touchmove', (e) => {
    if (joystickActive && e.touches.length > 0) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = rect.width / 2 - 25;
        
        if (distance <= maxDistance) {
            joystickHandle.style.left = (50 + (deltaX / maxDistance) * 35) + '%';
            joystickHandle.style.top = (50 + (deltaY / maxDistance) * 35) + '%';
            
            // Convert to movement
            keys['a'] = deltaX < -10;
            keys['d'] = deltaX > 10;
            keys['w'] = deltaY < -10;
            keys['s'] = deltaY > 10;
        }
    }
});

document.addEventListener('touchend', () => {
    if (joystickActive) {
        joystickActive = false;
        joystickHandle.style.left = '50%';
        joystickHandle.style.top = '50%';
        keys['a'] = keys['d'] = keys['w'] = keys['s'] = false;
    }
});

// Resize handler
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Initialize game
initPools();
applySkillEffects();
updateUI();
updateSkillTreeUI();
updateWeaponUI();
draw();