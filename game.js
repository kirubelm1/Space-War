 const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const ui = {
            score: document.getElementById('score'),
            healthFill: document.getElementById('healthFill'),
            wave: document.getElementById('wave'),
            powerLevel: document.getElementById('powerLevel'),
            kills: document.getElementById('kills'),
            startScreen: document.getElementById('startScreen'),
            gameOver: document.getElementById('gameOver'),
            finalScore: document.getElementById('finalScore'),
            highestWave: document.getElementById('highestWave'),
            totalKills: document.getElementById('totalKills'),
            startBtn: document.getElementById('startBtn'),
            restartBtn: document.getElementById('restartBtn'),
            bossHealth: document.getElementById('bossHealth'),
            bossHealthFill: document.getElementById('bossHealthFill'),
            // New UI elements
            comboTracker: document.getElementById('comboTracker'),
            comboMultiplier: document.getElementById('comboMultiplier'),
            abilityCooldownFill: document.getElementById('abilityCooldownFill'),
            damageIndicatorsContainer: document.getElementById('damageIndicatorsContainer'),
            autoAimToggle: document.getElementById('autoAimToggle'),
            level: document.getElementById('level'),
            experience: document.getElementById('experience'),
            dashCooldown: document.getElementById('dashCooldown'),
            dashTimer: document.getElementById('dashTimer')
        };

        // Game variables
        let gameRunning = false;
        let score = 0;
        let health = 100;
        let maxHealth = 100;
        let wave = 1;
        let kills = 0;
        let powerLevel = 1;
        let enemySpawnTimer = 0;
        let waveTimer = 0;
        let bossActive = false;
        let specialCooldown = 0;
        let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        // New Game Variables
        let combo = 0;
        let comboTimer = 0;
        let screenShake = 0;
        let invincible = 0;
        let slowEnemies = 0;
        let autoAim = isMobile; // Auto-aim is default for mobile
        let dash = { active: false, cooldown: 0, distance: 150, duration: 10 };
        let timeWarp = { active: false, duration: 0 };
        let magnetField = { active: false, duration: 0 };
        let criticalHit = { chance: 0.1, multiplier: 2 };
        let experience = 0;
        let playerLevel = 1;
        let skillPoints = 0;
        let achievements = [];
        let gameTime = 0;
        let doubleJump = { available: false, used: false };
        let shield = { active: false, health: 0, maxHealth: 50 };
        
        // Object Pooling variables (Performance Improvement)
        const BULLET_POOL_SIZE = 500;
        let bulletPool = [];
        const PARTICLE_POOL_SIZE = 1000;
        let particlePool = [];
        
        // Game objects
        let player = {};
        let bullets = [];
        let enemies = [];
        let particles = [];
        let powerups = [];
        let effects = [];
        let boss = null;
        let backgroundStars = [];
        
        // New Game Object Arrays
        let backgroundAsteroids = [];
        let damageIndicators = [];


        // Input
        let keys = {};
        let mouseX = 0;
        let mouseY = 0;
        let shooting = false;
        let specialActive = false;
        let joystickActive = false;
        let joystickX = 0;
        let joystickY = 0;

        // Resize canvas
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initBackgroundStars();
            initBackgroundAsteroids(); // Initialize Asteroids on resize
        }
        
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Initialize background stars (UPDATED for parallax)
        function initBackgroundStars() {
            backgroundStars = [];
            // Layer 1: Slow, small, many (Original stars)
            for (let i = 0; i < 200; i++) {
                backgroundStars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 1.5 + 0.5, // Smaller
                    speed: Math.random() * 0.3 + 0.1, // Slower
                    brightness: Math.random() * 0.4 + 0.1
                });
            }
            // Layer 2: Faster, larger, fewer (Parallax effect)
            for (let i = 0; i < 50; i++) {
                backgroundStars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2.5 + 1, // Larger
                    speed: Math.random() * 1.0 + 0.5, // Faster
                    brightness: Math.random() * 0.8 + 0.5
                });
            }
        }
        
        // Initialize background asteroids (NEW)
        function initBackgroundAsteroids() {
            backgroundAsteroids = [];
            for (let i = 0; i < 10; i++) {
                backgroundAsteroids.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: random(20, 50),
                    speed: random(0.5, 1.5),
                    rotation: random(0, Math.PI * 2),
                    rotationSpeed: random(-0.01, 0.01)
                });
            }
        }

        // Utility functions
        function random(min, max) {
            return Math.random() * (max - min) + min;
        }

        function distance(x1, y1, x2, y2) {
            return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        }

        function angle(x1, y1, x2, y2) {
            return Math.atan2(y2 - y1, x2 - x1);
        }

        // Create notification
        function createNotification(text, color = '#00ff88') {
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = text;
            notification.style.color = color;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 2000);
        }

        // Create on-screen damage indicator (NEW UI Element)
        function createDamageIndicator(x, y, amount, color = '#ff4444') {
            const indicator = document.createElement('div');
            indicator.className = 'damage-indicator';
            indicator.textContent = amount;
            indicator.style.color = color;
            indicator.style.left = x + 'px';
            indicator.style.top = y + 'px';
            ui.damageIndicatorsContainer.appendChild(indicator);
            
            // Remove the DOM element after the animation finishes
            setTimeout(() => {
                indicator.remove();
            }, 1000); // Animation duration is 1s
        }

        // --- Object Pooling Functions (Performance Improvement) ---

        function initPools() {
            // Bullet Pool
            bulletPool.length = 0; // Clear pool
            for (let i = 0; i < BULLET_POOL_SIZE; i++) {
                bulletPool.push({ active: false, trail: [] });
            }
            // Particle Pool
            particlePool.length = 0; // Clear pool
            for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
                particlePool.push({ active: false });
            }
        }

        function getBullet(x, y, vx, vy, size, life, color, damage, isEnemy = false, type = 'normal', homingTarget = null) {
            for (let i = 0; i < bulletPool.length; i++) {
                const bullet = bulletPool[i];
                if (!bullet.active) {
                    Object.assign(bullet, {
                        active: true, x, y, vx, vy, size, life, color, damage, isEnemy, type, homingTarget
                    });
                    bullet.trail.length = 0;
                    bullets.push(bullet);
                    return bullet;
                }
            }
            return null; // Pool exhausted
        }

        function returnBullet(bullet) {
            bullet.active = false;
            bullet.trail.length = 0;
            // Remove from the active bullets array
            const index = bullets.indexOf(bullet);
            if (index > -1) {
                bullets.splice(index, 1);
            }
        }
        
        function getParticle(x, y, vx, vy, life, color, size) {
            for (let i = 0; i < particlePool.length; i++) {
                const particle = particlePool[i];
                if (!particle.active) {
                    Object.assign(particle, {
                        active: true, x, y, vx, vy, life, color, size
                    });
                    particles.push(particle);
                    return particle;
                }
            }
            return null; // Pool exhausted
        }

        function returnParticle(particle) {
            particle.active = false;
            // Remove from the active particles array
            const index = particles.indexOf(particle);
            if (index > -1) {
                particles.splice(index, 1);
            }
        }

        // Spawn particle (UPDATED to use pooling)
        function spawnParticle(x, y, color, count = 8, size = 3) {
            for(let i = 0; i < count; i++) {
                getParticle(
                    x, y, 
                    random(-8, 8), random(-8, 8), // vx, vy
                    40, color, 
                    random(size * 0.5, size * 1.5) // size
                );
            }
        }
        
        // Initialize game (UPDATED)
        function initGame() {
            score = 0;
            health = maxHealth;
            wave = 1;
            kills = 0;
            powerLevel = 1;
            enemySpawnTimer = 0;
            waveTimer = 0;
            bossActive = false;
            
            // New Variable Resets
            combo = 0;
            comboTimer = 0;
            screenShake = 0;
            invincible = 0;
            slowEnemies = 0;
            
            // Clear all object arrays and re-initialize pools
            bullets.length = 0;
            enemies.length = 0;
            particles.length = 0;
            powerups.length = 0;
            effects.length = 0;
            damageIndicators.length = 0;
            boss = null;
            
            initPools(); // Initialize/Reset Pools (Performance Improvement)
            initBackgroundAsteroids(); // Initialize Asteroids (Visual Upgrade)
            
            player = {
                x: canvas.width / 2,
                y: canvas.height / 2,
                size: 20,
                speed: 6,
                shootCooldown: 0,
                color: '#00ff88',
                trail: [],
                weaponType: 'normal' // New property (Gameplay Feature: New Weapons)
            };
            
            ui.bossHealth.style.display = 'none';
            updateUI();
        }

        // Start game
        function startGame() {
            gameRunning = true;
            ui.startScreen.classList.add('hidden');
            ui.gameOver.classList.add('hidden');
            initGame();
            createNotification('WAVE ' + wave, '#00ff88');
            gameLoop();
        }

        // Game over
        function gameOver() {
            gameRunning = false;
            ui.finalScore.textContent = score;
            ui.highestWave.textContent = wave;
            ui.totalKills.textContent = kills;
            ui.gameOver.classList.remove('hidden');
        }

        // Update UI (UPDATED)
        function updateUI() {
            ui.score.textContent = score;
            ui.healthFill.style.width = (health / maxHealth * 100) + '%';
            ui.wave.textContent = wave;
            ui.powerLevel.textContent = powerLevel;
            ui.kills.textContent = kills;
            ui.level.textContent = playerLevel;
            ui.experience.textContent = experience;
            
            // Combo/Multiplier UI (UI Element)
            if (combo > 0) {
                ui.comboTracker.style.display = 'block';
                ui.comboMultiplier.textContent = Math.min(5, Math.floor(combo / 5) + 1);
            } else {
                ui.comboTracker.style.display = 'none';
            }
        }

        // Spawn enemy (UPDATED with new types and better scaling)
        function spawnEnemy() {
            const side = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(side) {
                case 0: x = random(-50, canvas.width); y = -50; break;
                case 1: x = canvas.width + 50; y = random(-50, canvas.height); break;
                case 2: x = random(-50, canvas.width); y = canvas.height + 50; break;
                case 3: x = -50; y = random(-50, canvas.height); break;
            }
            
            // Dynamic enemy selection based on wave (Better wave progression logic)
            const enemyPool = ['normal', 'normal', 'fast'];
            if (wave >= 3) enemyPool.push('tank');
            if (wave >= 5) enemyPool.push('shooter');
            if (wave >= 8) enemyPool.push('homing'); // New Homing Enemy
            if (wave >= 10) enemyPool.push('mine'); // New Mine Enemy

            const type = enemyPool[Math.floor(Math.random() * enemyPool.length)];
            
            let speed = 0, size = 0, health = 0, color = '';
            let healthScale = Math.floor(wave / 5) * 0.5 + 1; // Scale health every 5 waves
            
            switch(type) {
                case 'normal': speed = 2 + wave * 0.1; size = 15; health = 1 * healthScale; color = '#ff4444'; break;
                case 'fast': speed = 4 + wave * 0.1; size = 10; health = 1 * healthScale; color = '#ffaa00'; break;
                case 'tank': speed = 1 + wave * 0.05; size = 25; health = 3 * healthScale; color = '#aa44ff'; break;
                case 'shooter': speed = 1.5 + wave * 0.08; size = 18; health = 2 * healthScale; color = '#00aaff'; break;
                case 'homing': speed = 2.5 + wave * 0.1; size = 16; health = 1.5 * healthScale; color = '#ff00ff'; break; // New
                case 'mine': speed = 0.5; size = 30; health = 4 * healthScale; color = '#555555'; break; // New
            }
            
            enemies.push({
                x: x,
                y: y,
                size: size,
                speed: speed,
                health: health,
                maxHealth: health,
                color: color,
                type: type,
                shootCooldown: type === 'shooter' ? 60 : 0,
                mineTimer: type === 'mine' ? 180 : 0, // 3 seconds till detonation (New Mine Enemy)
                trail: []
            });
        }

        // Spawn boss (UPDATED with new properties for patterns)
        function spawnBoss() {
            bossActive = true;
            ui.bossHealth.style.display = 'block';
            
            boss = {
                x: canvas.width / 2,
                y: -100,
                size: 80,
                speed: 1,
                health: 100 + wave * 30, // Increased boss health scaling
                maxHealth: 100 + wave * 30,
                color: '#ff0066',
                phase: 1, // New phase tracking (New Boss Patterns)
                shootCooldown: 0,
                patternCooldown: 0,
                laserActive: false, // New laser tracking
                laserTimer: 0,
                trail: []
            };
            
            createNotification('BOSS INCOMING: WAVE ' + wave, '#ff0066');
        }

        // Spawn powerup (UPDATED with new types)
        function spawnPowerup(x, y) {
            const types = ['health', 'power', 'shield', 'speed', 'multishot', 'invincibility', 'freeze', 'laser', 'homing_missile', 'magnet', 'double_damage'];
            const type = types[Math.floor(Math.random() * types.length)];
            
            let color;
            switch(type) {
                case 'health': color = '#ff4444'; break;
                case 'power': color = '#00ff88'; break;
                case 'shield': color = '#0088ff'; break;
                case 'speed': color = '#ffaa00'; break;
                case 'multishot': color = '#aa00ff'; break;
                case 'invincibility': color = '#ffcc00'; break;
                case 'freeze': color = '#00ccff'; break;
                case 'laser': color = '#ff00ff'; break;
                case 'homing_missile': color = '#ffaa00'; break;
                case 'magnet': color = '#ff8800'; break;
                case 'double_damage': color = '#ff0088'; break;
            }
            
            powerups.push({
                x: x,
                y: y,
                size: 15,
                type: type,
                color: color,
                life: 600
            });
        }

        // Create effect
        function createEffect(x, y, type, duration = 30) {
            effects.push({
                x: x,
                y: y,
                type: type,
                life: duration,
                size: 20
            });
        }

        // Update game (UPDATED with all logic)
        function update() {
            if (!gameRunning) return;

            // --- Screen Shake (Visual Upgrade) ---
            if (screenShake > 0) {
                canvas.classList.add('shake');
                screenShake--;
            } else {
                canvas.classList.remove('shake');
            }

            // --- Update Status Timers (Gameplay/Power-ups) ---
            if (invincible > 0) {
                invincible--;
                player.color = invincible % 10 < 5 ? '#ffcc00' : '#00ff88'; // Flashing effect
            } else {
                player.color = '#00ff88';
            }
            if (slowEnemies > 0) slowEnemies--;
            
            // Dash ability update
            if (dash.cooldown > 0) {
                dash.cooldown--;
                ui.dashTimer.textContent = Math.ceil(dash.cooldown / 60) + 's';
            } else {
                ui.dashTimer.textContent = 'Ready';
                if (powerLevel >= 2) ui.dashCooldown.style.display = 'block';
            }
            
            // Time warp ability update
            if (timeWarp.duration > 0) {
                timeWarp.duration--;
                timeWarp.active = true;
            } else {
                timeWarp.active = false;
            }
            
            // Magnet field update
            if (magnetField.duration > 0) {
                magnetField.duration--;
                magnetField.active = true;
                // Pull powerups towards player
                powerups.forEach(powerup => {
                    const dx = player.x - powerup.x;
                    const dy = player.y - powerup.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 200) {
                        powerup.x += (dx / dist) * 3;
                        powerup.y += (dy / dist) * 3;
                    }
                });
            } else {
                magnetField.active = false;
            }
            
            // Combo / Multiplier Tracker (UI Element)
            if (comboTimer > 0) comboTimer--; else combo = 0;
            
            // Experience and leveling system
            gameTime++;
            const xpNeeded = playerLevel * 100;
            if (experience >= xpNeeded) {
                experience -= xpNeeded;
                playerLevel++;
                maxHealth += 10;
                health = maxHealth;
                criticalHit.chance = Math.min(0.3, 0.1 + playerLevel * 0.02);
                createNotification('LEVEL UP! +10 MAX HEALTH', '#ffff00');
            }

            // --- Update Background (Visual Upgrade: Parallax & Asteroids) ---
            backgroundStars.forEach(star => {
                star.y += star.speed;
                if (star.y > canvas.height) {
                    star.y = 0;
                    star.x = Math.random() * canvas.width;
                }
            });
            
            backgroundAsteroids.forEach(asteroid => {
                asteroid.x += (slowEnemies > 0 ? asteroid.speed * 0.2 : asteroid.speed);
                asteroid.y += (slowEnemies > 0 ? asteroid.speed * 0.2 : asteroid.speed) * 0.5;
                asteroid.rotation += asteroid.rotationSpeed * (slowEnemies > 0 ? 0.2 : 1);
                
                if (asteroid.x > canvas.width + asteroid.size || asteroid.y > canvas.height + asteroid.size) {
                    // Reset asteroid off-screen
                    asteroid.x = -asteroid.size;
                    asteroid.y = Math.random() * canvas.height;
                }
            });


            // Update player trail
            player.trail.unshift({x: player.x, y: player.y});
            if (player.trail.length > 10) player.trail.pop();

            // Player movement
            let moveX = 0, moveY = 0;
            
            if (joystickActive && isMobile) {
                moveX = joystickX * player.speed;
                moveY = joystickY * player.speed;
            } else {
                if (keys['w'] || keys['ArrowUp']) moveY -= 1;
                if (keys['s'] || keys['ArrowDown']) moveY += 1;
                if (keys['a'] || keys['ArrowLeft']) moveX -= 1;
                if (keys['d'] || keys['ArrowRight']) moveX += 1;
            }
            
            // Normalize diagonal movement
            if (moveX !== 0 && moveY !== 0) {
                moveX *= 0.7071;
                moveY *= 0.7071;
            }
            
            // Dash ability
            let speedMultiplier = 1;
            if (dash.active && dash.duration > 0) {
                speedMultiplier = 3;
                dash.duration--;
                spawnParticle(player.x, player.y, '#00ffff', 3, 2);
            } else {
                dash.active = false;
                dash.duration = 10;
            }
            
            player.x += moveX * player.speed * speedMultiplier;
            player.y += moveY * player.speed * speedMultiplier;

            // Keep player in bounds
            player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
            player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));

            // --- Shooting Logic (Gameplay Feature: New Weapons & Pooling) ---
            if (player.shootCooldown > 0) player.shootCooldown--;
            
            let currentTarget = null;
            if (enemies.length > 0 && (autoAim || player.weaponType === 'homing_missile')) {
                 // Find the closest enemy for auto-aim/homing-missile
                let closestDist = Infinity;
                enemies.forEach(enemy => {
                    const dist = distance(player.x, player.y, enemy.x, enemy.y);
                    if (dist < closestDist) {
                        closestDist = dist;
                        currentTarget = enemy;
                    }
                });
            }
            
            let aimX = currentTarget ? currentTarget.x : mouseX;
            let aimY = currentTarget ? currentTarget.y : mouseY;
            
            if ((shooting || keys[' '] || specialActive) && player.shootCooldown <= 0) {
                const bulletAngle = angle(player.x, player.y, aimX, aimY);
                let fireRate = 8;
                let weaponDamage = 1;
                let bulletSize = 6;
                let bulletSpeed = 12;
                let bulletColor = '#00ff88';
                let bulletType = 'normal';
                
                switch(player.weaponType) {
                    case 'normal':
                        // Base power levels: 1 bullet, multishot at power 3
                        let bulletCount = powerLevel >= 3 ? 3 : 1;
                        if (powerLevel >= 5) fireRate = 5; // Faster fire rate at max power
                        weaponDamage = powerLevel >= 4 ? 2 : 1;
                        bulletColor = powerLevel >= 2 ? '#00ffff' : '#00ff88';

                        for (let i = 0; i < bulletCount; i++) {
                            const spread = bulletCount > 1 ? (i - 1) * 0.2 : 0;
                            getBullet(
                                player.x, player.y, 
                                Math.cos(bulletAngle + spread) * bulletSpeed, 
                                Math.sin(bulletAngle + spread) * bulletSpeed, 
                                bulletSize, 90, bulletColor, weaponDamage
                            );
                        }
                        break;
                    case 'laser': // New Weapon Type (Gameplay Feature)
                        fireRate = 40; // Slow fire rate
                        weaponDamage = 5; // High damage
                        bulletSize = 10;
                        bulletColor = '#ff00ff';
                        bulletType = 'laser';
                        // Laser bullet (treated as a long, high-damage projectile)
                        getBullet(
                            player.x, player.y, 
                            Math.cos(bulletAngle) * 20, 
                            Math.sin(bulletAngle) * 20, 
                            bulletSize, 30, bulletColor, weaponDamage, false, bulletType
                        );
                        break;
                    case 'homing_missile': // New Weapon Type (Gameplay Feature)
                        fireRate = 30;
                        weaponDamage = 2;
                        bulletSize = 8;
                        bulletColor = '#ffaa00';
                        bulletType = 'homing';
                        
                        // Homing missile targets the closest enemy
                        getBullet(
                            player.x, player.y, 
                            Math.cos(bulletAngle) * 5, 
                            Math.sin(bulletAngle) * 5, 
                            bulletSize, 180, bulletColor, weaponDamage, false, bulletType, currentTarget
                        );
                        break;
                }
                
                player.shootCooldown = fireRate;
                
                // Screen shake for powerful shots (Visual Upgrade)
                if (weaponDamage >= 5 || player.weaponType === 'laser') {
                    screenShake = 5;
                }
            }

            // --- Special ability ---
            if (specialCooldown > 0) specialCooldown--;
            
            if ((keys['e'] || keys['Shift'] || specialActive) && specialCooldown <= 0 && powerLevel >= 2) {
                createEffect(player.x, player.y, 'nova');
                screenShake = 10;
                
                // Damage all nearby enemies
                enemies.forEach(enemy => {
                    const dmg = 5;
                    if (distance(player.x, player.y, enemy.x, enemy.y) < 200) {
                        enemy.health -= dmg;
                        createDamageIndicator(enemy.x, enemy.y, dmg, '#ffff00');
                        spawnParticle(enemy.x, enemy.y, '#ffff00', 5);
                    }
                });
                
                specialCooldown = 180; // 3 seconds at 60fps
            }
            // Animated ability cooldown UI element (UI Element)
            ui.abilityCooldownFill.style.width = (1 - (specialCooldown / 180)) * 100 + '%';


            // --- Update bullets (Pooling) ---
            for (let i = bullets.length - 1; i >= 0; i--) {
                const bullet = bullets[i];
                
                if (bullet.type === 'homing' && bullet.homingTarget && bullet.homingTarget.health > 0) {
                    // Update velocity to home towards target
                    const angleToTarget = angle(bullet.x, bullet.y, bullet.homingTarget.x, bullet.homingTarget.y);
                    const homingSpeed = 0.05;
                    bullet.vx = bullet.vx * (1 - homingSpeed) + Math.cos(angleToTarget) * 12 * homingSpeed;
                    bullet.vy = bullet.vy * (1 - homingSpeed) + Math.sin(angleToTarget) * 12 * homingSpeed;
                }
                
                // Time warp affects bullet speed
                let timeMultiplier = timeWarp.active ? 0.3 : 1;
                if (bullet.isEnemy && timeWarp.active) timeMultiplier = 0.1; // Slow enemy bullets more
                
                bullet.x += bullet.vx * (slowEnemies > 0 && bullet.isEnemy ? 0.2 : timeMultiplier);
                bullet.y += bullet.vy * (slowEnemies > 0 && bullet.isEnemy ? 0.2 : timeMultiplier);
                bullet.life--;
                
                // Update bullet trail
                bullet.trail.unshift({x: bullet.x, y: bullet.y});
                if (bullet.trail.length > 5) bullet.trail.pop();

                if (bullet.life <= 0 || bullet.x < -50 || bullet.x > canvas.width + 50 || 
                    bullet.y < -50 || bullet.y > canvas.height + 50) {
                    returnBullet(bullet); // Use pooling return
                }
            }

            // --- Update enemies (Collision, New Types, Combo Logic) ---
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                const enemyMoveSpeed = enemy.speed * (slowEnemies > 0 ? 0.2 : 1); // Freeze Power-up
                
                // Update enemy trail
                enemy.trail.unshift({x: enemy.x, y: enemy.y});
                if (enemy.trail.length > 8) enemy.trail.pop();
                
                // Move towards player
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    if (enemy.type !== 'mine') { // Mines do not move (New Enemy Type)
                        enemy.x += (dx / dist) * enemyMoveSpeed;
                        enemy.y += (dy / dist) * enemyMoveSpeed;
                    } else if (enemy.type === 'mine' && enemy.mineTimer > 0) {
                         // Mine Detonation Countdown
                         enemy.mineTimer--;
                         if (enemy.mineTimer <= 0) {
                             // Mine Detonation
                             if (distance(enemy.x, enemy.y, player.x, player.y) < 100 && invincible <= 0) {
                                 health -= 20;
                                 createDamageIndicator(player.x, player.y, 20, '#ff0000');
                             }
                             screenShake = 15;
                             spawnParticle(enemy.x, enemy.y, '#ff0000', 30, 8);
                             enemies.splice(i, 1);
                             continue;
                         }
                    }
                }

                // Enemy shooting (for shooter & homing types)
                if ((enemy.type === 'shooter' || enemy.type === 'homing') && enemy.shootCooldown <= 0 && dist < 400) {
                    const angleToPlayer = angle(enemy.x, enemy.y, player.x, player.y);
                    const isHoming = enemy.type === 'homing';
                    
                    getBullet(
                        enemy.x, enemy.y,
                        Math.cos(angleToPlayer) * (isHoming ? 4 : 7),
                        Math.sin(angleToPlayer) * (isHoming ? 4 : 7),
                        isHoming ? 6 : 5, 
                        120, '#ff4444', 1, true, isHoming ? 'homing_enemy' : 'normal'
                    );
                    enemy.shootCooldown = isHoming ? 120 : 90;
                }
                if (enemy.shootCooldown > 0) enemy.shootCooldown--;

                // Check collision with player
                if (distance(enemy.x, enemy.y, player.x, player.y) < enemy.size + player.size) {
                    spawnParticle(enemy.x, enemy.y, '#ff4444', 12, 4);
                    
                    if (invincible <= 0) { // Invincibility Power-up check
                        health -= 10;
                        createDamageIndicator(player.x, player.y, 10, '#ff0000');
                        screenShake = 10;
                    }
                    
                    if (health <= 0) {
                        gameOver();
                        return;
                    }
                    
                    createNotification('-10 Health' + (invincible > 0 ? ' (Invincible Blocked)' : ''), '#ff4444');
                    enemy.health = 0; // Destroy enemy on collision
                }

                // Check collision with bullets (More efficient: use pooling index)
                for (let j = bullets.length - 1; j >= 0; j--) {
                    const bullet = bullets[j];
                    if (bullet.isEnemy || !bullet.active) continue;
                    
                    if (distance(bullet.x, bullet.y, enemy.x, enemy.y) < bullet.size + enemy.size) {
                        
                        // Collision detected
                        let damageDealt = bullet.damage;
                        if (bullet.type === 'laser') damageDealt *= 2; // Extra damage for laser
                        
                        // Critical hit system
                        let isCritical = Math.random() < criticalHit.chance;
                        if (isCritical) {
                            damageDealt *= criticalHit.multiplier;
                            createDamageIndicator(enemy.x, enemy.y, damageDealt, '#ffff00');
                            createNotification('CRITICAL!', '#ffff00');
                            screenShake = 8;
                        } else {
                            createDamageIndicator(enemy.x, enemy.y, damageDealt);
                        }
                        
                        spawnParticle(bullet.x, bullet.y, enemy.color, 8, 3);
                        enemy.health -= damageDealt;
                        
                        returnBullet(bullet); // Use pooling return for bullet

                        if (enemy.health <= 0) {
                            spawnParticle(enemy.x, enemy.y, '#ffffff', 15, 4);
                            
                            // Combo/Multiplier Logic (UI Element)
                            combo++;
                            comboTimer = 120; // 2 seconds to keep combo going
                            let multiplier = Math.min(5, Math.floor(combo / 5) + 1);
                            
                            let baseScore = enemy.type === 'tank' ? 30 : enemy.type === 'shooter' ? 25 : 15;
                            let earnedScore = baseScore * multiplier;
                            if (isCritical) earnedScore *= 2;
                            
                            score += earnedScore;
                            experience += Math.floor(earnedScore / 10);
                            kills++;
                            
                            // Chance to spawn powerup
                            if (Math.random() < 0.2) {
                                spawnPowerup(enemy.x, enemy.y);
                            }
                            
                            // Remove enemy
                            enemies.splice(i, 1);
                            
                            // Screen shake for kill
                            screenShake = 2;
                            
                            break;
                        }
                    }
                }
            }

            // --- Update Boss (Gameplay Feature: New Patterns) ---
            if (boss) {
                // Phase Check (New Boss Patterns)
                let phase1Health = boss.maxHealth * 0.5;
                if (boss.health < phase1Health && boss.phase < 2) {
                    boss.phase = 2;
                    createNotification('BOSS: PHASE 2 ACTIVATED!', '#ff8800');
                    boss.patternCooldown = 1; // Immediately start new pattern
                }
                
                // Update boss trail
                boss.trail.unshift({x: boss.x, y: boss.y});
                if (boss.trail.length > 15) boss.trail.pop();
                
                // Boss movement
                boss.y += boss.speed;
                if (boss.y > 100) boss.y = 100;
                
                // Boss shooting patterns
                boss.patternCooldown--;
                boss.laserTimer--;
                
                if (boss.patternCooldown <= 0) {
                    const pattern = Math.floor(Math.random() * (boss.phase === 2 ? 3 : 2)); // 3 patterns in phase 2
                    
                    switch(pattern) {
                        case 0: // Spiral pattern (Existing + scaled)
                            for (let i = 0; i < 8 + boss.phase * 2; i++) {
                                const bulletAngle = (i / (8 + boss.phase * 2)) * Math.PI * 2 + boss.phase;
                                getBullet(boss.x, boss.y, Math.cos(bulletAngle) * 4, Math.sin(bulletAngle) * 4, 8, 180, '#ff0066', 2, true);
                            }
                            boss.phase += 0.2;
                            boss.patternCooldown = 60;
                            break;
                        case 1: // Homing Missile Barrage (New Boss Pattern)
                            for(let i = 0; i < 3; i++) {
                                const bulletAngle = angle(boss.x, boss.y, player.x, player.y) + random(-0.3, 0.3);
                                setTimeout(() => {
                                    getBullet(boss.x, boss.y, Math.cos(bulletAngle) * 5, Math.sin(bulletAngle) * 5, 8, 240, '#ffaa00', 2, true, 'homing_enemy');
                                }, i * 20);
                            }
                            boss.patternCooldown = 120;
                            break;
                        case 2: // Laser Beam (New Boss Pattern - Phase 2 only)
                            boss.laserActive = true;
                            boss.laserTimer = 90; // Beam duration + warning
                            boss.patternCooldown = 240; // Long cooldown
                            screenShake = 20;
                            break;
                    }
                }
                
                // Laser Beam Active Check
                if (boss.laserActive && boss.laserTimer > 60) {
                    // Warning phase (drawing in draw() function)
                } else if (boss.laserActive && boss.laserTimer > 0) {
                    // Firing phase (damage logic)
                    if (Math.abs(player.y - boss.y) < player.size + 10) { // Check if player is on the horizontal line
                        if (invincible <= 0) {
                             health -= 1; // Continuous damage
                             createDamageIndicator(player.x, player.y, 1, '#ff0000');
                        }
                    }
                } else if (boss.laserActive && boss.laserTimer <= 0) {
                    boss.laserActive = false;
                }
                
                // Update boss health bar
                ui.bossHealthFill.style.width = (boss.health / boss.maxHealth * 100) + '%';
                
                // Check collision with bullets
                for (let j = bullets.length - 1; j >= 0; j--) {
                    const bullet = bullets[j];
                    if (bullet.isEnemy || !bullet.active) continue;
                    
                    if (distance(bullet.x, bullet.y, boss.x, boss.y) < bullet.size + boss.size) {
                        spawnParticle(bullet.x, bullet.y, '#ff0066', 5, 2);
                        
                        let damageDealt = bullet.damage;
                        createDamageIndicator(boss.x, boss.y, damageDealt, '#00ff88');
                        
                        boss.health -= damageDealt;
                        returnBullet(bullet); // Use pooling return for bullet
                        
                        screenShake = 3;

                        if (boss.health <= 0) {
                            spawnParticle(boss.x, boss.y, '#ffffff', 50, 6);
                            createNotification('BOSS DEFEATED!', '#00ff88');
                            
                            // Chance for a special weapon powerup after boss fight
                            if (Math.random() < 0.5) spawnPowerup(boss.x, boss.y);

                            score += 500;
                            kills += 10;
                            boss = null;
                            bossActive = false;
                            ui.bossHealth.style.display = 'none';
                            break;
                        }
                    }
                }
            }

            // --- Update particles (Pooling) ---
            for (let i = particles.length - 1; i >= 0; i--) {
                const particle = particles[i];
                if (!particle.active) continue;

                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life--;
                particle.vx *= 0.95;
                particle.vy *= 0.95;

                if (particle.life <= 0) {
                    returnParticle(particle); // Use pooling return
                }
            }

            // Update powerups
            for (let i = powerups.length - 1; i >= 0; i--) {
                const powerup = powerups[i];
                powerup.life--;
                
                if (powerup.life <= 0) {
                    powerups.splice(i, 1);
                    continue;
                }
                
                // Check collision with player
                if (distance(powerup.x, powerup.y, player.x, player.y) < powerup.size + player.size) {
                    applyPowerup(powerup.type);
                    createNotification(powerup.type.toUpperCase(), powerup.color);
                    powerups.splice(i, 1);
                }
            }

            // Update effects
            for (let i = effects.length - 1; i >= 0; i--) {
                const effect = effects[i];
                effect.life--;
                effect.size += 2;
                
                if (effect.life <= 0) {
                    effects.splice(i, 1);
                }
            }

            // --- Spawn enemies (Better Wave Progression) ---
            enemySpawnTimer++;
            const baseSpawnRate = 100;
            const spawnRateFactor = Math.max(1, wave / 5); // Enemies spawn faster as waves increase
            const spawnRate = Math.max(20, baseSpawnRate / spawnRateFactor);
            
            if (enemySpawnTimer >= spawnRate && !bossActive) {
                spawnEnemy();
                enemySpawnTimer = 0;
            }

            // --- Wave progression (Better Wave Progression) ---
            waveTimer++;
            // New wave after 30 seconds (1800 frames) or if enemies are cleared early.
            const waveDuration = 1800;
            if ((waveTimer >= waveDuration || enemies.length === 0) && !bossActive && waveTimer > 60) { // Min 1 second gap (60 frames)
                wave++;
                waveTimer = 0;
                
                // Every 3 waves, spawn a boss
                if (wave % 3 === 0) {
                    setTimeout(() => spawnBoss(), 1000);
                } else {
                    createNotification('WAVE ' + wave, '#00ff88');
                    // Spawn multiple enemies for new wave
                    const enemyCount = Math.min(5 + wave * 3, 30); // More aggressive enemy spawning
                    for (let i = 0; i < enemyCount; i++) {
                        setTimeout(() => spawnEnemy(), i * 200);
                    }
                }
            }

            updateUI();
        }

        // Apply powerup (UPDATED with new power-ups and weapons)
        function applyPowerup(type) {
            switch(type) {
                case 'health':
                    health = Math.min(maxHealth, health + 30);
                    break;
                case 'power':
                    powerLevel = Math.min(5, powerLevel + 1);
                    break;
                case 'shield':
                    createEffect(player.x, player.y, 'shield', 120);
                    invincible = Math.max(invincible, 120); // 2 seconds of invincibility
                    break;
                case 'speed':
                    player.speed += 2;
                    setTimeout(() => player.speed -= 2, 10000);
                    break;
                case 'multishot':
                    player.weaponType = 'normal'; // Reset weapon type if not normal
                    powerLevel = Math.max(powerLevel, 3);
                    break;
                case 'invincibility': // New Powerup
                    invincible = Math.max(invincible, 300); // 5 seconds of invincibility
                    player.weaponType = 'normal';
                    break;
                case 'freeze': // New Powerup
                    slowEnemies = 180; // 3 seconds of slow motion
                    createEffect(canvas.width/2, canvas.height/2, 'freeze', 180);
                    break;
                case 'laser': // New Weapon Powerup
                    player.weaponType = 'laser';
                    setTimeout(() => player.weaponType = 'normal', 10000); // 10 seconds of laser
                    break;
                case 'homing_missile': // New Weapon Powerup
                    player.weaponType = 'homing_missile';
                    setTimeout(() => player.weaponType = 'normal', 10000);
                    break;
                case 'magnet': // New Powerup
                    magnetField.active = true;
                    magnetField.duration = 300; // 5 seconds
                    createEffect(player.x, player.y, 'magnet', 300);
                    break;
                case 'double_damage': // New Powerup
                    criticalHit.chance = Math.min(1.0, criticalHit.chance + 0.2);
                    setTimeout(() => criticalHit.chance = Math.max(0.1, criticalHit.chance - 0.2), 15000);
                    break;
            }
        }

        // Draw game (UPDATED with all visuals)
        function draw() {
            // Apply screen shake offset (Visual Upgrade)
            let shakeX = 0, shakeY = 0;
            if (screenShake > 0) {
                shakeX = random(-5, 5);
                shakeY = random(-5, 5);
            }
            ctx.save();
            ctx.translate(shakeX, shakeY);
            
            // Clear canvas
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw background stars (Parallax)
            backgroundStars.forEach(star => {
                ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();
            });
            
            // Draw background asteroids (Visual Upgrade)
            backgroundAsteroids.forEach(asteroid => {
                ctx.save();
                ctx.translate(asteroid.x, asteroid.y);
                ctx.rotate(asteroid.rotation);
                
                // Draw a simple jagged shape for asteroid
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -asteroid.size);
                ctx.lineTo(asteroid.size * 0.7, asteroid.size * 0.5);
                ctx.lineTo(-asteroid.size * 0.5, asteroid.size * 0.3);
                ctx.lineTo(-asteroid.size * 0.8, -asteroid.size * 0.2);
                ctx.closePath();
                ctx.stroke();
                
                ctx.restore();
            });


            if (!gameRunning) {
                ctx.restore(); // Restore context if game not running
                return;
            }

            // Draw effects
            effects.forEach(effect => {
                if (effect.type === 'nova') {
                    const gradient = ctx.createRadialGradient(
                        effect.x, effect.y, 0,
                        effect.x, effect.y, effect.size
                    );
                    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.8)');
                    gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                    ctx.fill();
                } else if (effect.type === 'shield') {
                    // Draw player shield
                    const alpha = effect.life / 30;
                    ctx.strokeStyle = `rgba(0, 136, 255, ${alpha})`;
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.arc(player.x, player.y, player.size + 10, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (effect.type === 'freeze') {
                    // Draw slow motion overlay
                    const alpha = effect.life / 180 * 0.5;
                    ctx.fillStyle = `rgba(0, 204, 255, ${alpha})`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else if (effect.type === 'magnet') {
                    // Draw magnet field
                    const alpha = effect.life / 300;
                    ctx.strokeStyle = `rgba(255, 136, 0, ${alpha})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(player.x, player.y, 200, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });

            // Draw particle trails (using pooling active flag)
            particles.forEach(particle => {
                if (!particle.active) return;
                const alpha = particle.life / 40;
                ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw bullet trails and bullets (using pooling active flag)
            bullets.forEach(bullet => {
                if (!bullet.active) return;
                
                // Draw trail
                bullet.trail.forEach((point, index) => {
                    const alpha = index / bullet.trail.length * 0.5;
                    ctx.strokeStyle = bullet.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                    ctx.lineWidth = bullet.size * 0.5;
                    ctx.beginPath();
                    if (index > 0) {
                        ctx.moveTo(bullet.trail[index-1].x, bullet.trail[index-1].y);
                        ctx.lineTo(point.x, point.y);
                    }
                    ctx.stroke();
                });
                
                // Draw bullet body
                ctx.fillStyle = bullet.color;
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Neon Glow Effect (Visual Upgrade)
                const glowSize = bullet.type === 'laser' ? bullet.size * 4 : bullet.size * 2;
                const gradient = ctx.createRadialGradient(
                    bullet.x, bullet.y, 0,
                    bullet.x, bullet.y, glowSize
                );
                gradient.addColorStop(0, bullet.color + '80');
                gradient.addColorStop(1, bullet.color + '00');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, glowSize, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw enemy trails
            enemies.forEach(enemy => {
                enemy.trail.forEach((point, index) => {
                    const alpha = index / enemy.trail.length * 0.3;
                    ctx.fillStyle = enemy.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, enemy.size * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                });
            });

            // Draw enemies
            enemies.forEach(enemy => {
                // Draw Mine Timer Warning (New Enemy Type)
                if (enemy.type === 'mine' && enemy.mineTimer > 0) {
                    const warningRadius = 100 * (enemy.mineTimer / 180);
                    ctx.strokeStyle = enemy.mineTimer % 10 < 5 ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 255, 0, 0.4)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, 100, 0, Math.PI * 2); // Blast radius
                    ctx.stroke();
                    
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, warningRadius, 0, Math.PI * 2); // Countdown fill
                    ctx.fill();
                }

                // Glow effect
                const gradient = ctx.createRadialGradient(
                    enemy.x, enemy.y, 0,
                    enemy.x, enemy.y, enemy.size * 2
                );
                gradient.addColorStop(0, enemy.color + '80');
                gradient.addColorStop(1, enemy.color + '00');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.size * 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Enemy body
                ctx.fillStyle = enemy.color;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Health bar
                if (enemy.health < enemy.maxHealth) {
                    const healthWidth = 30;
                    const healthHeight = 4;
                    const healthX = enemy.x - healthWidth / 2;
                    const healthY = enemy.y - enemy.size - 10;
                    
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(healthX, healthY, healthWidth, healthHeight);
                    
                    ctx.fillStyle = '#00ff00';
                    ctx.fillRect(healthX, healthY, healthWidth * (enemy.health / enemy.maxHealth), healthHeight);
                }
            });

            // Draw boss
            if (boss) {
                // Boss Laser Beam Warning/Active (Boss Pattern)
                if (boss.laserActive) {
                    const laserColor = boss.laserTimer > 60 ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 0, 0, 0.8)';
                    const lineWidth = boss.laserTimer > 60 ? 10 : 30; // Thin warning, thick fire
                    
                    ctx.strokeStyle = laserColor;
                    ctx.lineWidth = lineWidth;
                    ctx.beginPath();
                    ctx.moveTo(0, boss.y);
                    ctx.lineTo(canvas.width, boss.y);
                    ctx.stroke();
                    
                    // Firing effect
                    if (boss.laserTimer <= 60) {
                         ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                         ctx.fillRect(0, boss.y - 15, canvas.width, 30);
                    }
                }

                // Boss trail
                boss.trail.forEach((point, index) => {
                    const alpha = index / boss.trail.length * 0.2;
                    ctx.fillStyle = boss.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, boss.size * 0.8, 0, Math.PI * 2);
                    ctx.fill();
                });
                
                // Boss glow
                const pulse = Math.sin(Date.now() * 0.01) * 10;
                const gradient = ctx.createRadialGradient(
                    boss.x, boss.y, 0,
                    boss.x, boss.y, boss.size * 2 + pulse
                );
                gradient.addColorStop(0, boss.color + 'c0');
                gradient.addColorStop(0.5, boss.color + '60');
                gradient.addColorStop(1, boss.color + '00');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(boss.x, boss.y, boss.size * 2 + pulse, 0, Math.PI * 2);
                ctx.fill();
                
                // Boss body
                ctx.fillStyle = boss.color;
                ctx.beginPath();
                ctx.arc(boss.x, boss.y, boss.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Boss details
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(boss.x, boss.y, boss.size * 0.7, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw powerups
            powerups.forEach(powerup => {
                const pulse = Math.sin(Date.now() * 0.01) * 3;
                
                // Glow
                const gradient = ctx.createRadialGradient(
                    powerup.x, powerup.y, 0,
                    powerup.x, powerup.y, powerup.size * 3
                );
                gradient.addColorStop(0, powerup.color + 'a0');
                gradient.addColorStop(1, powerup.color + '00');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(powerup.x, powerup.y, powerup.size * 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Powerup body
                ctx.fillStyle = powerup.color;
                ctx.beginPath();
                ctx.arc(powerup.x, powerup.y, powerup.size + pulse, 0, Math.PI * 2);
                ctx.fill();
                
                // Icon
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                let icon = '?';
                switch(powerup.type) {
                    case 'health': icon = '❤️'; break;
                    case 'power': icon = '⚡'; break;
                    case 'shield': icon = '🛡️'; break;
                    case 'speed': icon = '🚀'; break;
                    case 'multishot': icon = '🎯'; break;
                    case 'invincibility': icon = '🌟'; break; // New Icon
                    case 'freeze': icon = '❄️'; break;
                    case 'laser': icon = '🔥'; break;
                    case 'homing_missile': icon = '🔭'; break;
                    case 'magnet': icon = '🧲'; break;
                    case 'double_damage': icon = '💥'; break;
                }
                ctx.fillText(icon, powerup.x, powerup.y);
            });

            // Draw player trail
            player.trail.forEach((point, index) => {
                const alpha = index / player.trail.length * 0.4;
                ctx.fillStyle = player.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                ctx.beginPath();
                ctx.arc(point.x, point.y, player.size * 0.8, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw player
            const playerGlow = ctx.createRadialGradient(
                player.x, player.y, 0,
                player.x, player.y, player.size * 3
            );
            playerGlow.addColorStop(0, player.color + 'c0');
            playerGlow.addColorStop(1, player.color + '00');
            ctx.fillStyle = playerGlow;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.size * 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Player body
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Player details
            const playerAngle = angle(player.x, player.y, mouseX, mouseY);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(player.x, player.y, player.size - 3, 0, Math.PI * 2);
            ctx.stroke();
            
            // Direction indicator
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(
                player.x + Math.cos(playerAngle) * (player.size + 15),
                player.y + Math.sin(playerAngle) * (player.size + 15)
            );
            ctx.stroke();
            
            // Special ability indicator
            if (specialCooldown > 0) {
                const cooldownPercent = 1 - (specialCooldown / 180);
                ctx.beginPath();
                ctx.arc(player.x, player.y, player.size + 5, -Math.PI/2, -Math.PI/2 + cooldownPercent * Math.PI * 2);
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            
            ctx.restore(); // Restore context after applying screen shake offset
        }

        // Game loop
        function gameLoop() {
            update();
            draw();
            if (gameRunning) {
                requestAnimationFrame(gameLoop);
            }
        }

        // Event listeners
        ui.startBtn.addEventListener('click', startGame);
        ui.restartBtn.addEventListener('click', startGame);

        // Keyboard events
        window.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;
            if (e.key === ' ') e.preventDefault();
            
            // Dash ability (Q key)
            if (e.key.toLowerCase() === 'q' && dash.cooldown <= 0 && gameRunning) {
                dash.active = true;
                dash.cooldown = 120; // 2 seconds
                invincible = Math.max(invincible, 15); // Brief invincibility during dash
                screenShake = 5;
                ui.dashCooldown.style.display = 'block';
            }
            
            // Time warp ability (T key)
            if (e.key.toLowerCase() === 't' && timeWarp.duration <= 0 && powerLevel >= 3) {
                timeWarp.active = true;
                timeWarp.duration = 180; // 3 seconds
                createNotification('TIME WARP!', '#00ffff');
            }
        });

        window.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });

        // Mouse events
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

        // Touch events for mobile (UPDATED)
        const joystick = document.getElementById('joystick');
        const joystickHandle = document.getElementById('joystickHandle');
        const shootBtn = document.getElementById('shootBtn');
        const specialBtn = document.getElementById('specialBtn');
        const autoAimToggle = document.getElementById('autoAimToggle'); // NEW

        if (isMobile) {
            document.getElementById('mobileControls').style.display = 'flex';
            joystick.style.display = 'flex';
            
            // Auto-Aim Toggle (Mobile Enhancement)
            autoAimToggle.addEventListener('click', () => {
                autoAim = !autoAim;
                autoAimToggle.style.backgroundColor = autoAim ? 'rgba(0, 255, 136, 0.6)' : 'rgba(0, 0, 0, 0.3)';
            });
            // Initial color set
            autoAimToggle.style.backgroundColor = autoAim ? 'rgba(0, 255, 136, 0.6)' : 'rgba(0, 0, 0, 0.3)';
            
            // Joystick
            joystick.addEventListener('touchstart', handleJoystickStart);
            joystick.addEventListener('touchmove', handleJoystickMove);
            joystick.addEventListener('touchend', handleJoystickEnd);
            
            // Shoot and Special Buttons
            shootBtn.addEventListener('touchstart', (e) => { e.preventDefault(); shooting = true; });
            shootBtn.addEventListener('touchend', (e) => { e.preventDefault(); shooting = false; });
            
            specialBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (specialCooldown <= 0 && powerLevel >= 2) {
                    specialActive = true;
                    setTimeout(() => specialActive = false, 100);
                }
            });
        }
        
        function handleJoystickStart(e) {
            e.preventDefault();
            joystickActive = true;
            handleJoystickMove(e);
        }
        
        function handleJoystickMove(e) {
            if (!joystickActive) return;
            e.preventDefault();
            
            const rect = joystick.getBoundingClientRect();
            const touch = e.touches[0];
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const touchX = touch.clientX;
            const touchY = touch.clientY;
            
            const dx = touchX - centerX;
            const dy = touchY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = rect.width / 2 - 25;
            
            if (distance < maxDistance) {
                joystickX = dx / maxDistance;
                joystickY = dy / maxDistance;
                joystickHandle.style.left = (dx + rect.width / 2 - 25) + 'px';
                joystickHandle.style.top = (dy + rect.height / 2 - 25) + 'px';
                joystickHandle.style.transform = ''; // Remove transform for precise movement
            } else {
                const angle = Math.atan2(dy, dx);
                joystickX = Math.cos(angle);
                joystickY = Math.sin(angle);
                joystickHandle.style.left = (Math.cos(angle) * maxDistance + rect.width / 2 - 25) + 'px';
                joystickHandle.style.top = (Math.sin(angle) * maxDistance + rect.height / 2 - 25) + 'px';
                joystickHandle.style.transform = ''; // Remove transform for precise movement
            }
            
            // Update mouse position for aiming (Mobile Enhancement)
            // If auto-aim is off, use the joystick direction for aiming
            if (!autoAim) {
                mouseX = player.x + joystickX * 100;
                mouseY = player.y + joystickY * 100;
            } else {
                 // Aim slightly below if not explicitly aiming
                 mouseX = player.x;
                 mouseY = player.y + 100;
            }
        }
        
        function handleJoystickEnd(e) {
            e.preventDefault();
            joystickActive = false;
            joystickX = 0;
            joystickY = 0;
            // Better joystick responsiveness: Snap handle back with transform
            joystickHandle.style.left = '50%';
            joystickHandle.style.top = '50%';
            joystickHandle.style.transform = 'translate(-50%, -50%)';
        }

        canvas.addEventListener('touchstart', (e) => {
            // Prevent scrolling on canvas touch
            e.preventDefault(); 
            
            if (isMobile && e.target === canvas) {
                const touch = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                mouseX = touch.clientX - rect.left;
                mouseY = touch.clientY - rect.top;
                
                // If auto-aim is off, tapping the screen aims and shoots
                if (!autoAim) {
                    shooting = true;
                }
                
                if (!gameRunning && !ui.startScreen.classList.contains('hidden')) {
                    startGame();
                }
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (isMobile && !joystickActive) {
                e.preventDefault();
                const touch = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                mouseX = touch.clientX - rect.left;
                mouseY = touch.clientY - rect.top;
            }
        });

        canvas.addEventListener('touchend', (e) => {
            if (isMobile && e.target === canvas) {
                e.preventDefault();
                // Only stop shooting if a non-joystick/button touch ended
                if (!autoAim) {
                    shooting = false;
                }
            }
        });

        // Start drawing
        draw();