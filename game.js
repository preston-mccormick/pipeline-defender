class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Game state
        this.gameState = 'playing'; // playing, paused, gameOver
        this.level = 1;
        this.timeLeft = 30;
        this.pipelineHealth = 100;
        this.score = 0;

        // Game objects
        this.technician = new Technician(this.width / 2, this.height - 80);
        this.pipeline = new Pipeline(this.width, this.height);
        this.projectiles = [];
        this.particles = [];
        this.batteries = [];
        this.bullhorns = [];
        this.surveyManagers = [];
        this.cartoPacs = [];
        this.aiBombs = [];

        // Game settings
        this.projectileSpawnRate = 0.020; // Increased from 0.015
        this.projectileSpeed = 1.2;
        this.zapRange = 50;
        this.baseZapRange = 50;
        this.zapCooldown = 0;
        this.batterySpawnTimer = 300; // 5 seconds delay
        this.rangeBoostTimer = 0;
        this.bullhornSpawnTimer = 600; // 10 seconds delay
        this.surveyManagerSpawnTimer = 900; // 15 seconds delay
        this.cartoPacSpawnTimer = 1200; // 20 seconds delay
        this.aiBombSpawnTimer = 1800; // 30 seconds delay
        this.duplicateTechnicianTimer = 0;
        this.aiBombSlowdownTimer = 0;
        this.gameSpeedMultiplier = 1.0;
        this.screenShake = 0;
        this.explosionFlash = 0;
        this.blastEffect = null;

        // Input handling
        this.keys = {};
        this.mouseX = this.width / 2;
        this.usingMouse = false;

        this.setupEventListeners();
        this.setupAudio();
        this.gameLoop();
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            if (e.key.toLowerCase() === 'p') {
                this.togglePause();
            }
            if ((e.key.toLowerCase() === 'z' || e.key === ' ') && this.gameState === 'playing') {
                this.zap();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Mouse controls
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.usingMouse = true;
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'playing') {
                this.zap();
            }
        });

        // Button controls
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        document.getElementById('quitBtn').addEventListener('click', () => this.quit());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.restart());
    }

    setupAudio() {
        // Create audio context for sound effects
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Load bull.wav file for bullhorn sound
        this.bullhornAudio = new Audio('bull.wav');
        this.bullhornAudio.preload = 'auto';

        this.sounds = {
            zap: this.createSound(800, 0.1, 'sine'),
            zapHit: this.createZapHitSound(),
            damage: this.createSound(200, 0.3, 'sawtooth'),
            levelUp: this.createSound(600, 0.5, 'sine'),
            explosion: this.createExplosionSound(),
            batteryCollect: this.createBatteryCollectSound(),
            bullhornBlast: () => this.playBullhornSound(),
            surveyManagerCollect: this.createSurveyManagerCollectSound(),
            cartoPacCollect: this.createCartoPacCollectSound(),
            aiBombCollect: this.createAiBombCollectSound()
        };
    }

    playBullhornSound() {
        // Play the bull.wav file
        this.bullhornAudio.currentTime = 0; // Reset to beginning
        this.bullhornAudio.play().catch(e => {
            console.log('Audio play failed:', e);
        });
    }

    createZapHitSound() {
        return () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Create a more complex zap hit sound
            oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.2);
            oscillator.type = 'sawtooth';

            gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        };
    }

    createExplosionSound() {
        return () => {
            // Create multiple oscillators for a more complex explosion sound
            const oscillators = [];
            const gainNodes = [];

            // Create more oscillators for a richer sound
            for (let i = 0; i < 6; i++) {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                // Different frequencies and types for each oscillator
                const baseFreq = 50 + i * 30;
                oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 0.05, this.audioContext.currentTime + 2.0);

                // Mix of wave types for more complex sound
                if (i < 2) oscillator.type = 'sawtooth';
                else if (i < 4) oscillator.type = 'square';
                else oscillator.type = 'triangle';

                // Varying gain and duration
                const gain = 0.4 - (i * 0.05);
                const duration = 1.5 + (i * 0.2);

                gainNode.gain.setValueAtTime(gain, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

                oscillator.start(this.audioContext.currentTime);
                oscillator.stop(this.audioContext.currentTime + duration);

                oscillators.push(oscillator);
                gainNodes.push(gainNode);
            }
        };
    }

    createBatteryCollectSound() {
        return () => {
            // Create a cool ascending power-up sound
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Ascending frequency sweep
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.3);
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }


    createSurveyManagerCollectSound() {
        return () => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            // Create a professional, clock-like sound
            oscillator1.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator1.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
            oscillator1.type = 'sine';

            oscillator2.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator2.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.2);
            oscillator2.type = 'triangle';

            gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator1.start();
            oscillator2.start();
            oscillator1.stop(audioContext.currentTime + 0.4);
            oscillator2.stop(audioContext.currentTime + 0.4);
        };
    }

    createCartoPacCollectSound() {
        return () => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            // Create a healing/repair sound with ascending tones
            oscillator1.frequency.setValueAtTime(300, audioContext.currentTime);
            oscillator1.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.3);
            oscillator1.type = 'sine';

            oscillator2.frequency.setValueAtTime(600, audioContext.currentTime);
            oscillator2.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.3);
            oscillator2.type = 'triangle';

            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator1.start();
            oscillator2.start();
            oscillator1.stop(audioContext.currentTime + 0.5);
            oscillator2.stop(audioContext.currentTime + 0.5);
        };
    }
    
    createAiBombCollectSound() {
        return () => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const oscillator3 = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // Create a dramatic, powerful sound with multiple frequencies
            oscillator1.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator1.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.8);
            oscillator1.type = 'sawtooth';
            
            oscillator2.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator2.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.8);
            oscillator2.type = 'square';
            
            oscillator3.frequency.setValueAtTime(100, audioContext.currentTime);
            oscillator3.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.8);
            oscillator3.type = 'triangle';
            
            gainNode.gain.setValueAtTime(0.8, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);
            
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            oscillator3.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator1.start();
            oscillator2.start();
            oscillator3.start();
            oscillator1.stop(audioContext.currentTime + 1.0);
            oscillator2.stop(audioContext.currentTime + 1.0);
            oscillator3.stop(audioContext.currentTime + 1.0);
        };
    }

    createSound(frequency, duration, type) {
        return () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type;

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pauseBtn').textContent = 'Resume';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pauseBtn').textContent = 'Pause';
        }
    }

    restart() {
        this.gameState = 'playing';
        this.level = 1;
        this.timeLeft = 30;
        this.pipelineHealth = 100;
        this.score = 0;
        this.projectiles = [];
        this.particles = [];
        this.batteries = [];
        this.bullhorns = [];
        this.surveyManagers = [];
        this.cartoPacs = [];
        this.aiBombs = [];
        this.technician.x = this.width / 2;
        this.projectileSpeed = 1.2;
        this.projectileSpawnRate = 0.015;
        this.zapRange = 50;
        this.baseZapRange = 50;
        this.batterySpawnTimer = 300; // 5 seconds delay
        this.rangeBoostTimer = 0;
        this.bullhornSpawnTimer = 600; // 10 seconds delay
        this.surveyManagerSpawnTimer = 900; // 15 seconds delay
        this.cartoPacSpawnTimer = 1200; // 20 seconds delay
        this.aiBombSpawnTimer = 1800; // 30 seconds delay
        this.duplicateTechnicianTimer = 0;
        this.aiBombSlowdownTimer = 0;
        this.gameSpeedMultiplier = 1.0;
        this.screenShake = 0;
        this.explosionFlash = 0;
        this.blastEffect = null;

        // Reset pipeline
        this.pipeline.health = 100;
        this.pipeline.cracks = [];
        this.pipeline.rustSplotches = [];
        this.pipeline.exploded = false;
        this.pipeline.explosionParticles = [];

        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('pauseBtn').textContent = 'Pause';
        this.updateUI();
    }

    quit() {
        if (confirm('Are you sure you want to quit?')) {
            window.close();
        }
    }

    zap() {
        if (this.zapCooldown > 0) return;

        this.zapCooldown = 10;
        this.sounds.zap();

        // Zap from original technician
        this.performZapFromPosition(this.technician.x + 10, this.technician.y - this.technician.height - 30);

        // If duplicate technician is active, also zap from duplicate position
        if (this.duplicateTechnicianTimer > 0) {
            // Position duplicate technician to the right of the original, but keep it on screen
            let duplicateX = this.technician.x + 100;
            if (duplicateX > this.width - 50) {
                duplicateX = this.technician.x - 100;
            }
            this.performZapFromPosition(duplicateX + 10, this.technician.y - this.technician.height - 30);
        }
    }

    performZapFromPosition(caneTipX, caneTipY) {
        // Check for projectiles in lightning bolt path (wider area above technician)
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];

            // Check if projectile is above technician and within zap range horizontally
            const horizontalDistance = Math.abs(projectile.x - caneTipX);
            const verticalDistance = caneTipY - projectile.y;

            if (horizontalDistance < this.zapRange && verticalDistance > 0 && verticalDistance < 150) {
                // Create zap effect
                this.particles.push(new ZapEffect(projectile.x, projectile.y));

                // Award points based on projectile type
                let pointsAwarded;
                if (projectile.type === 'rust') {
                    pointsAwarded = 100; // 100 points for rust monsters
                } else {
                    pointsAwarded = 50; // 50 points for water drops
                }
                this.score += pointsAwarded;

                // Create floating score effect
                this.particles.push(new FloatingScoreEffect(projectile.x, projectile.y, pointsAwarded));

                this.projectiles.splice(i, 1);

                // Play zap hit sound
                this.sounds.zapHit();
            }
        }

        // Check for batteries in lightning bolt path
        for (let i = this.batteries.length - 1; i >= 0; i--) {
            const battery = this.batteries[i];

            // Check if battery is above technician and within zap range horizontally
            const horizontalDistance = Math.abs(battery.x - caneTipX);
            const verticalDistance = caneTipY - battery.y;

            if (horizontalDistance < this.zapRange && verticalDistance > 0 && verticalDistance < 150) {
                // Collect battery and boost range
                this.collectBattery(battery);
                this.batteries.splice(i, 1);

                // Create collection effect
                this.particles.push(new BatteryCollectionEffect(battery.x, battery.y));
            }
        }

        // Check for Bullhorns in lightning bolt path
        for (let i = this.bullhorns.length - 1; i >= 0; i--) {
            const bullhorn = this.bullhorns[i];

            // Check if Bullhorn is above technician and within zap range horizontally
            const horizontalDistance = Math.abs(bullhorn.x - caneTipX);
            const verticalDistance = caneTipY - bullhorn.y;

            if (horizontalDistance < this.zapRange && verticalDistance > 0 && verticalDistance < 150) {
                // Collect Bullhorn and trigger blast
                this.collectBullhorn(bullhorn);
                this.bullhorns.splice(i, 1);

                // Create collection effect
                this.particles.push(new BullhornCollectionEffect(bullhorn.x, bullhorn.y));
            }
        }

        // Check for Survey Managers in lightning bolt path
        for (let i = this.surveyManagers.length - 1; i >= 0; i--) {
            const surveyManager = this.surveyManagers[i];

            // Check if Survey Manager is above technician and within zap range horizontally
            const horizontalDistance = Math.abs(surveyManager.x - caneTipX);
            const verticalDistance = caneTipY - surveyManager.y;

            if (horizontalDistance < this.zapRange && verticalDistance > 0 && verticalDistance < 150) {
                // Collect Survey Manager and duplicate technician
                this.collectSurveyManager(surveyManager);
                this.surveyManagers.splice(i, 1);

                // Create collection effect
                this.particles.push(new SurveyManagerCollectionEffect(surveyManager.x, surveyManager.y));
            }
        }

        // Check for CartoPacs in lightning bolt path
        for (let i = this.cartoPacs.length - 1; i >= 0; i--) {
            const cartoPac = this.cartoPacs[i];

            // Check if CartoPac is above technician and within zap range horizontally
            const horizontalDistance = Math.abs(cartoPac.x - caneTipX);
            const verticalDistance = caneTipY - cartoPac.y;

            if (horizontalDistance < this.zapRange && verticalDistance > 0 && verticalDistance < 150) {
                // Collect CartoPac and heal pipeline
                this.collectCartoPac(cartoPac);
                this.cartoPacs.splice(i, 1);

                // Create collection effect
                this.particles.push(new CartoPacCollectionEffect(cartoPac.x, cartoPac.y));
            }
        }
        
        // Check for AI Bombs in lightning bolt path
        for (let i = this.aiBombs.length - 1; i >= 0; i--) {
            const aiBomb = this.aiBombs[i];
            const horizontalDistance = Math.abs(aiBomb.x - caneTipX);
            const verticalDistance = caneTipY - aiBomb.y;
            
            if (horizontalDistance < this.zapRange && verticalDistance > 0 && verticalDistance < 150) {
                // Collect AI Bomb and trigger wave effect
                this.collectAiBomb(aiBomb);
                this.aiBombs.splice(i, 1);
                
                // Create collection effect
                this.particles.push(new AiBombCollectionEffect(aiBomb.x, aiBomb.y));
            }
        }
    }

    collectBattery(battery) {
        // Boost zapper range by 100%
        this.zapRange = Math.floor(this.baseZapRange * 2.0);
        this.rangeBoostTimer = 600; // 10 seconds at 60 FPS

        // Award points for collecting power-up
        this.score += 250;

        // Play cool collection sound
        this.sounds.batteryCollect();
    }

    collectBullhorn(bullhorn) {
        // Trigger large blast that clears projectiles
        this.triggerBlast(bullhorn.x, bullhorn.y);

        // Award points for collecting power-up
        this.score += 250;

        // Play blast sound
        this.sounds.bullhornBlast();
    }

    collectSurveyManager(surveyManager) {
        // Duplicate technician for 10 seconds
        this.duplicateTechnicianTimer = 600; // 10 seconds at 60 FPS

        // Award points for collecting power-up
        this.score += 250;

        // Play professional collection sound
        this.sounds.surveyManagerCollect();
    }

    collectCartoPac(cartoPac) {
        // Heal pipeline by 10%
        const healAmount = 10;
        this.pipelineHealth = Math.min(100, this.pipelineHealth + healAmount);
        this.pipeline.health = this.pipelineHealth;

        // Award points for collecting power-up
        this.score += 250;

        // Play healing collection sound
        this.sounds.cartoPacCollect();
    }
    
    collectAiBomb(aiBomb) {
        // Award points for collecting power-up
        this.score += 250;
        
        // Trigger AI Bomb wave effect
        this.triggerAiBombWave();
        
        // Play dramatic collection sound
        this.sounds.aiBombCollect();
    }
    
    triggerAiBombWave() {
        // Slow down the game instead of pausing
        this.aiBombSlowdownTimer = 300; // 5 seconds of slowdown
        this.gameSpeedMultiplier = 0.1; // Slow down to 10% speed
        
        // Clear all projectiles immediately
        this.projectiles = [];
        
        // Create dramatic screen flash
        this.explosionFlash = 60; // 1 second flash
        
        // Create wave effect
        this.particles.push(new AiBombWaveEffect());
        
        // Create sequential image popup effect
        this.particles.push(new AiBombSequenceEffect());
        
        // Create dramatic screen shake
        this.screenShake = 120; // 2 seconds of shake
    }

    triggerBlast(x, y) {
        // Create blast effect
        this.blastEffect = new BlastEffect(x, y);

        // Clear projectiles in large radius
        const blastRadius = 200;
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            const distance = Math.sqrt(
                Math.pow(projectile.x - x, 2) + Math.pow(projectile.y - y, 2)
            );

            if (distance < blastRadius) {
                // Create destruction effect
                this.particles.push(new ProjectileDestructionEffect(projectile.x, projectile.y));
                this.projectiles.splice(i, 1);
                this.score += 5; // Bonus points for clearing projectiles
            }
        }
    }

    spawnBattery() {
        if (this.batterySpawnTimer <= 0) {
            const x = Math.random() * (this.width - 40) + 20;
            this.batteries.push(new Battery(x, -20));
            // Random spawn between 19-26 seconds (1125-1575 frames) - 25% faster
            this.batterySpawnTimer = 1125 + Math.random() * 450;
        }
    }

    spawnBullhorn() {
        if (this.bullhornSpawnTimer <= 0) {
            const x = Math.random() * (this.width - 40) + 20;
            this.bullhorns.push(new Bullhorn(x, -20));
            // Much rarer spawn - 45-68 seconds (2700-4050 frames) - 25% faster
            this.bullhornSpawnTimer = 2700 + Math.random() * 1350;
        }
    }

    spawnSurveyManager() {
        if (this.surveyManagerSpawnTimer <= 0) {
            const x = Math.random() * (this.width - 40) + 20;
            this.surveyManagers.push(new SurveyManager(x, -20));
            // Spawn once per level - set timer to level duration (25% faster)
            this.surveyManagerSpawnTimer = 1350; // 22.5 seconds at 60 FPS
        }
    }

    spawnCartoPac() {
        if (this.cartoPacSpawnTimer <= 0) {
            const x = Math.random() * (this.width - 40) + 20;
            this.cartoPacs.push(new CartoPac(x, -20));
            // Spawn every 34-45 seconds (2025-2700 frames) - 25% faster
            this.cartoPacSpawnTimer = 2025 + Math.random() * 675;
        }
    }
    
    spawnAiBomb() {
        if (this.aiBombSpawnTimer <= 0) {
            const x = Math.random() * (this.width - 40) + 20;
            this.aiBombs.push(new AiBomb(x, -20));
            // Very rare spawn - 90-120 seconds (5400-7200 frames)
            this.aiBombSpawnTimer = 5400 + Math.random() * 1800;
        }
    }

    spawnProjectile() {
        if (Math.random() < this.projectileSpawnRate) {
            // Weighted random selection - water droplets are more common
            const rand = Math.random();
            let type;
            let speed;
            if (rand < 0.6) {
                type = 'water';
                speed = this.projectileSpeed; // Normal speed for water drops
            } else {
                type = 'rust';
                speed = this.projectileSpeed * 1.3; // 30% faster for rust monsters
            }

            const x = Math.random() * (this.width - 40) + 20;
            this.projectiles.push(new Projectile(x, -20, type, speed));
        }
    }

    update() {
        if (this.gameState !== 'playing') return;

        // Check if user switched to keyboard controls
        const isKeyboardMoving = this.keys['arrowleft'] || this.keys['arrowright'] || this.keys['a'] || this.keys['d'];
        if (isKeyboardMoving) {
            this.usingMouse = false;
        }

        // Apply speed multiplier for AI Bomb slowdown
        const speedMultiplier = this.gameSpeedMultiplier;

        // Update technician
        this.technician.update(this.keys, this.mouseX, this.width, this.usingMouse);

        // Update pipeline
        this.pipeline.update();

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update();

            // Check collision with pipeline
            if (projectile.y > this.height - 100) {
                this.pipeline.takeDamage(projectile.damage);
                this.pipelineHealth = this.pipeline.health;
                this.sounds.damage();

                // Create damage effect
                this.particles.push(new DamageEffect(projectile.x, this.height - 100));

                this.projectiles.splice(i, 1);

                if (this.pipelineHealth <= 0) {
                    this.pipeline.explode();
                    this.sounds.explosion();
                    this.gameOver();
                }
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update batteries
        for (let i = this.batteries.length - 1; i >= 0; i--) {
            this.batteries[i].update();
            if (this.batteries[i].y > this.height) {
                this.batteries.splice(i, 1);
            }
        }

        // Update Bullhorns
        for (let i = this.bullhorns.length - 1; i >= 0; i--) {
            this.bullhorns[i].update();
            if (this.bullhorns[i].y > this.height) {
                this.bullhorns.splice(i, 1);
            }
        }

        // Update blast effect
        if (this.blastEffect) {
            this.blastEffect.update();
            if (this.blastEffect.life <= 0) {
                this.blastEffect = null;
            }
        }

        // Update survey managers
        for (let i = this.surveyManagers.length - 1; i >= 0; i--) {
            this.surveyManagers[i].update();
            if (this.surveyManagers[i].y > this.height + 50) {
                this.surveyManagers.splice(i, 1);
            }
        }

        // Update carto pacs
        for (let i = this.cartoPacs.length - 1; i >= 0; i--) {
            this.cartoPacs[i].update();
            if (this.cartoPacs[i].y > this.height + 50) {
                this.cartoPacs.splice(i, 1);
            }
        }
        
        // Update AI Bombs
        for (let i = this.aiBombs.length - 1; i >= 0; i--) {
            this.aiBombs[i].update();
            if (this.aiBombs[i].y > this.height + 50) {
                this.aiBombs.splice(i, 1);
            }
        }

        // Spawn new projectiles, batteries, Bullhorns, Survey Managers, and CartoPacs
        // Only spawn projectiles if not in AI Bomb slowdown
        if (speedMultiplier >= 0.5) {
            this.spawnProjectile();
        }
        this.spawnBattery();
        this.spawnBullhorn();
        this.spawnSurveyManager();
        this.spawnCartoPac();
        this.spawnAiBomb();
        
        // Update cooldowns and timers
        if (this.zapCooldown > 0) this.zapCooldown--;
        if (this.batterySpawnTimer > 0) this.batterySpawnTimer--;
        if (this.bullhornSpawnTimer > 0) this.bullhornSpawnTimer--;
        if (this.surveyManagerSpawnTimer > 0) this.surveyManagerSpawnTimer--;
        if (this.cartoPacSpawnTimer > 0) this.cartoPacSpawnTimer--;
        if (this.aiBombSpawnTimer > 0) this.aiBombSpawnTimer--;
        if (this.duplicateTechnicianTimer > 0) this.duplicateTechnicianTimer--;
        if (this.aiBombSlowdownTimer > 0) {
            this.aiBombSlowdownTimer--;
            if (this.aiBombSlowdownTimer === 0) {
                this.gameSpeedMultiplier = 1.0; // Resume normal speed after AI Bomb sequence
            }
        }
        if (this.rangeBoostTimer > 0) {
            this.rangeBoostTimer--;
            if (this.rangeBoostTimer === 0) {
                this.zapRange = this.baseZapRange;
            }
        }

        // Update screen effects
        if (this.screenShake > 0) this.screenShake--;
        if (this.explosionFlash > 0) this.explosionFlash--;

        // Update timer
        if (this.timeLeft > 0) {
            this.timeLeft -= (1 / 60) * speedMultiplier; // Apply speed multiplier to timer
            if (this.timeLeft <= 0) {
                this.nextLevel();
            }
        }

        this.updateUI();
    }

    nextLevel() {
        this.level++;
        this.timeLeft = 30;

        // Clear visual damage but keep current health
        this.pipeline.cracks = [];
        this.pipeline.rustSplotches = [];
        this.pipeline.exploded = false;
        this.pipeline.explosionParticles = [];

        // Increase difficulty more gradually
        this.projectileSpeed += 0.3;
        this.projectileSpawnRate += 0.004; // Increased from 0.003

        // Reset survey manager spawn timer for new level
        this.surveyManagerSpawnTimer = 0;
        this.cartoPacSpawnTimer = 0;

        // Create level up effect
        this.particles.push(new LevelUpEffect(this.width / 2, this.height / 2));

        this.sounds.levelUp();
        this.updateUI();
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.sounds.explosion();

        // Trigger screen shake and explosion flash
        this.screenShake = 60; // 1 second of shake
        this.explosionFlash = 30; // 0.5 seconds of flash

        document.getElementById('gameOverScreen').style.display = 'block';
        document.getElementById('gameOverTitle').textContent = 'Pipeline Destroyed!';
        document.getElementById('gameOverMessage').textContent = `You reached level ${this.level} with a score of ${this.score}!`;
    }

    updateUI() {
        document.getElementById('level').textContent = this.level;
        document.getElementById('timer').textContent = Math.ceil(this.timeLeft);
        document.getElementById('score').textContent = this.score;

        // Update title bar health display
        const healthPercent = Math.max(0, Math.ceil(this.pipelineHealth));
        document.getElementById('titleHealthText').textContent = healthPercent + '%';
        document.getElementById('titleHealthFill').style.width = healthPercent + '%';
    }

    render() {
        // Apply screen shake
        if (this.screenShake > 0) {
            const shakeIntensity = this.screenShake / 60;
            const shakeX = (Math.random() - 0.5) * 10 * shakeIntensity;
            const shakeY = (Math.random() - 0.5) * 10 * shakeIntensity;
            this.ctx.save();
            this.ctx.translate(shakeX, shakeY);
        }

        // Clear canvas
        this.ctx.fillStyle = 'rgba(135, 206, 235, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw background elements
        this.drawBackground();

        // Draw pipeline
        this.pipeline.render(this.ctx);

        // Draw projectiles
        this.projectiles.forEach(projectile => projectile.render(this.ctx));

        // Draw batteries
        this.batteries.forEach(battery => battery.render(this.ctx));

        // Draw Bullhorns
        this.bullhorns.forEach(bullhorn => bullhorn.render(this.ctx));

        // Draw Survey Managers
        this.surveyManagers.forEach(surveyManager => surveyManager.render(this.ctx));

        // Draw CartoPacs
        this.cartoPacs.forEach(cartoPac => cartoPac.render(this.ctx));
        
        // Draw AI Bombs
        this.aiBombs.forEach(aiBomb => aiBomb.render(this.ctx));
        
        // Draw technician with glow effect if range is boosted
        this.technician.renderWithGlow(this.ctx, this.rangeBoostTimer > 0);

        // Draw duplicate technician if active
        if (this.duplicateTechnicianTimer > 0) {
            // Position duplicate technician to the right of the original, but keep it on screen
            let duplicateX = this.technician.x + 100; // 100 pixels to the right
            if (duplicateX > this.width - 50) {
                // If too far right, position to the left instead
                duplicateX = this.technician.x - 100;
            }

            // Save context to draw duplicate technician
            this.ctx.save();
            this.ctx.translate(duplicateX - this.technician.x, 0);
            this.technician.renderWithGlow(this.ctx, true);
            this.ctx.restore();
        }

        // Draw particles
        this.particles.forEach(particle => particle.render(this.ctx));

        // Draw blast effect
        if (this.blastEffect) {
            this.blastEffect.render(this.ctx);
        }

        // Draw zap effect
        if (this.zapCooldown > 0) {
            this.drawZapEffect();
        }

        // Draw pause overlay
        if (this.gameState === 'paused') {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.width / 2, this.height / 2);
        }

        // Draw explosion flash
        if (this.explosionFlash > 0) {
            const flashIntensity = this.explosionFlash / 30;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity * 0.8})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        // Restore canvas context if screen shake was applied
        if (this.screenShake > 0) {
            this.ctx.restore();
        }
    }

    drawBackground() {
        // Draw clouds
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 5; i++) {
            const x = (i * 200 + Date.now() * 0.01) % (this.width + 100);
            const y = 50 + Math.sin(i) * 20;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 30, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawZapEffect() {
        // Draw lightning from original technician
        this.drawLightningFromPosition(this.technician.x + 10, this.technician.y - this.technician.height - 30);

        // If duplicate technician is active, also draw lightning from duplicate position
        if (this.duplicateTechnicianTimer > 0) {
            let duplicateX = this.technician.x + 100;
            if (duplicateX > this.width - 50) {
                duplicateX = this.technician.x - 100;
            }
            this.drawLightningFromPosition(duplicateX + 10, this.technician.y - this.technician.height - 30);
        }
    }

    drawLightningFromPosition(caneTipX, caneTipY) {
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 4;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00ffff';

        // Draw lightning bolt from cane tip upward
        this.ctx.beginPath();
        this.ctx.moveTo(caneTipX, caneTipY);

        // Create jagged lightning bolt pattern using current zap range
        let currentX = caneTipX;
        let currentY = caneTipY;
        const segments = 8;
        const maxHeight = this.zapRange * 2; // Scale height based on current range

        for (let i = 0; i < segments; i++) {
            const progress = i / segments;
            const nextY = caneTipY - (maxHeight * progress);
            const nextX = currentX + (Math.random() - 0.5) * (this.zapRange * 0.4); // Scale width based on range

            this.ctx.lineTo(nextX, nextY);
            currentX = nextX;
            currentY = nextY;
        }

        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

class Technician {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 60;
        this.speed = 5;
    }

    update(keys, mouseX, canvasWidth, usingMouse) {
        // Check if any movement keys are currently pressed
        const isKeyboardMoving = keys['arrowleft'] || keys['arrowright'] || keys['a'] || keys['d'];

        // Keyboard movement
        if (keys['arrowleft'] || keys['a']) {
            this.x -= this.speed;
        }
        if (keys['arrowright'] || keys['d']) {
            this.x += this.speed;
        }

        // Mouse movement (only if using mouse and no keyboard input)
        if (usingMouse && !isKeyboardMoving) {
            this.x = mouseX;
        }

        // Keep within bounds
        this.x = Math.max(this.width / 2, Math.min(canvasWidth - this.width / 2, this.x));
    }

    render(ctx) {
        // Draw technician body
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);

        // Draw head
        ctx.fillStyle = '#FDBCB4';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height - 15, 15, 0, Math.PI * 2);
        ctx.fill();

        // Draw backpack
        ctx.fillStyle = '#2F4F4F';
        ctx.fillRect(this.x - 10, this.y - this.height + 10, 20, 25);

        // Draw cane held above head
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y - this.height + 20);
        ctx.lineTo(this.x + 10, this.y - this.height - 30);
        ctx.stroke();

        // Draw cane tip
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x + 10, this.y - this.height - 30, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw wire from backpack to cane
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y - this.height + 20);
        ctx.lineTo(this.x + 10, this.y - this.height - 30);
        ctx.stroke();
    }

    renderWithGlow(ctx, isGlowing) {
        // Draw technician body
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);

        // Draw head
        ctx.fillStyle = '#FDBCB4';
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.height - 15, 15, 0, Math.PI * 2);
        ctx.fill();

        // Draw backpack
        ctx.fillStyle = '#2F4F4F';
        ctx.fillRect(this.x - 10, this.y - this.height + 10, 20, 25);

        // Draw cane held above head
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y - this.height + 20);
        ctx.lineTo(this.x + 10, this.y - this.height - 30);
        ctx.stroke();

        // Draw cane tip with glow effect if range is boosted
        if (isGlowing) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#FFD700';
        }
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x + 10, this.y - this.height - 30, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw wire from backpack to cane
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y - this.height + 20);
        ctx.lineTo(this.x + 10, this.y - this.height - 30);
        ctx.stroke();

        // Reset shadow
        if (isGlowing) {
            ctx.shadowBlur = 0;
        }
    }
}

class Pipeline {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.pipelineY = height - 80;
        this.health = 100;
        this.cracks = [];
        this.rustSplotches = [];
        this.exploded = false;
        this.explosionParticles = [];
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;

        // Add crack based on damage amount
        const crackCount = Math.ceil(amount / 5);
        for (let i = 0; i < crackCount; i++) {
            this.cracks.push({
                x: Math.random() * this.width,
                width: Math.random() * 20 + 10,
                depth: Math.random() * 5 + 2,
                age: 0
            });
        }

        // Add rust splotches based on damage
        const rustCount = Math.ceil(amount / 10);
        for (let i = 0; i < rustCount; i++) {
            this.rustSplotches.push({
                x: Math.random() * this.width,
                y: this.pipelineY + Math.random() * 60,
                size: Math.random() * 15 + 8,
                age: 0,
                maxAge: 100
            });
        }
    }

    update() {
        // Age cracks for gradual corrosion effect
        this.cracks.forEach(crack => {
            crack.age += 0.1;
        });

        // Age rust splotches
        this.rustSplotches.forEach(splotch => {
            splotch.age += 0.5;
        });

        // Update explosion particles
        if (this.exploded) {
            this.explosionParticles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.3; // gravity
                particle.life--;
                particle.size *= 0.98; // shrink over time
                particle.rotation += particle.rotationSpeed || 0;
            });

            // Remove dead particles
            this.explosionParticles = this.explosionParticles.filter(p => p.life > 0);
        }
    }

    explode() {
        this.exploded = true;
        this.health = 0;

        // Create massive explosion particles
        for (let i = 0; i < 150; i++) {
            this.explosionParticles.push({
                x: this.width / 2 + (Math.random() - 0.5) * 200,
                y: this.pipelineY + 30,
                vx: (Math.random() - 0.5) * 25,
                vy: -Math.random() * 30 - 10,
                life: 80 + Math.random() * 60,
                size: 3 + Math.random() * 15,
                color: this.getRandomExplosionColor(),
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3
            });
        }

        // Create secondary explosion wave
        setTimeout(() => {
            for (let i = 0; i < 75; i++) {
                this.explosionParticles.push({
                    x: this.width / 2 + (Math.random() - 0.5) * 150,
                    y: this.pipelineY + 30,
                    vx: (Math.random() - 0.5) * 20,
                    vy: -Math.random() * 25 - 5,
                    life: 60 + Math.random() * 40,
                    size: 2 + Math.random() * 8,
                    color: this.getRandomExplosionColor(),
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.2
                });
            }
        }, 200);
    }

    getRandomExplosionColor() {
        const colors = ['#FF4500', '#FFD700', '#FF0000', '#FF8C00', '#FF6347', '#FFA500', '#FFFF00', '#FF1493'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    render(ctx) {
        if (this.exploded) {
            // Draw explosion particles with rotation and glow
            this.explosionParticles.forEach(particle => {
                const alpha = particle.life / 140; // Adjusted for longer life
                const size = particle.size * (0.5 + alpha * 0.5);

                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.rotation);

                // Add glow effect
                ctx.shadowBlur = size * 2;
                ctx.shadowColor = particle.color;

                // Draw particle with gradient
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
                gradient.addColorStop(0, particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
                gradient.addColorStop(1, particle.color + '00');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            });

            // Draw some remaining pipeline debris with more dramatic effect
            ctx.fillStyle = 'rgba(128, 128, 128, 0.2)';
            ctx.fillRect(0, this.pipelineY, this.width, 60);

            // Add some debris chunks
            for (let i = 0; i < 10; i++) {
                const x = (i * this.width / 10) + Math.sin(Date.now() * 0.01 + i) * 20;
                const y = this.pipelineY + Math.sin(Date.now() * 0.02 + i) * 10;
                ctx.fillStyle = `rgba(100, 100, 100, ${0.3 + Math.sin(Date.now() * 0.01 + i) * 0.2})`;
                ctx.fillRect(x, y, 20 + Math.sin(Date.now() * 0.03 + i) * 10, 15);
            }
            return;
        }

        // NEW: Draw thick green SNES-style pipe
        const y = this.pipelineY;
        const totalHeight = 60;         // overall visual thickness (keeps game collision intact)
        const rimHeight = 24;           // top "lip" height
        const bodyY = y + rimHeight;
        const bodyHeight = totalHeight - rimHeight;

        // Body gradient (darker toward bottom)
        const bodyGrad = ctx.createLinearGradient(0, bodyY, 0, bodyY + bodyHeight);
        bodyGrad.addColorStop(0, '#4BB34B'); // lighter green
        bodyGrad.addColorStop(0.5, '#2E8B57'); // medium green
        bodyGrad.addColorStop(1, '#1F5E1F'); // dark green
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(0, bodyY, this.width, bodyHeight);

        // Shadow under body for depth
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, bodyY + bodyHeight, this.width, 8);

        // Top rim (flat rectangle across with a glossy oval highlight)
        const capGrad = ctx.createLinearGradient(0, y, 0, bodyY);
        capGrad.addColorStop(0, '#5CCC66'); // top rim lighter
        capGrad.addColorStop(1, '#2E8B57'); // blend into pipe
        ctx.fillStyle = capGrad;
        ctx.fillRect(0, y, this.width, rimHeight);

        // Inner lip (darker inset to simulate the pipe mouth)
        ctx.fillStyle = '#1E6A1E';
        ctx.fillRect(6, y + 6, Math.max(0, this.width - 12), rimHeight - 12);

        // Glossy oval highlight across the top (gives the SNES polished look)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const ovalGrad = ctx.createRadialGradient(this.width / 2, y + rimHeight * 0.4, 10, this.width / 2, y + rimHeight * 0.4, this.width / 1.5);
        ovalGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
        ovalGrad.addColorStop(0.5, 'rgba(255,255,255,0.07)');
        ovalGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = ovalGrad;
        ctx.beginPath();
        ctx.ellipse(this.width / 2, y + rimHeight * 0.4, Math.max(30, this.width / 2 - 20), rimHeight * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Vertical seams / segments and small rivets to mimic tile repeats from SNES sprites
        ctx.strokeStyle = 'rgba(0,0,0,0.14)';
        ctx.lineWidth = 2;
        for (let sx = 40; sx < this.width; sx += 40) {
            ctx.beginPath();
            ctx.moveTo(sx, y + 4);
            ctx.lineTo(sx, bodyY + bodyHeight - 4);
            ctx.stroke();

            // small rivet on the rim
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.arc(sx, y + rimHeight / 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Slight top edge highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(6, y + 3);
        ctx.lineTo(this.width - 6, y + 3);
        ctx.stroke();

        // Draw rust splotches on the green pipe using previous logic (keeps gameplay feedback)
        this.rustSplotches.forEach(splotch => {
            const alpha = Math.min(splotch.age / 20, 1);
            const size = splotch.size * (0.5 + alpha * 0.5);

            // Rust color with varying shades
            const rustColors = ['#8B4513', '#A0522D', '#CD853F', '#D2691E'];
            const colorIndex = Math.floor(splotch.age / 10) % rustColors.length;

            // Blend rust onto green (with alpha)
            ctx.fillStyle = rustColors[colorIndex] + Math.floor(alpha * 200).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(splotch.x, splotch.y, size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw cracks (subtle, darker lines on top of the lip and body)
        this.cracks.forEach(crack => {
            const age = Math.min(crack.age, 10);
            const alpha = Math.min(age / 5, 1) * 0.85;
            const width = crack.width * (1 + age * 0.1);
            const depth = crack.depth * (1 + age * 0.2);

            ctx.strokeStyle = `rgba(20, 40, 20, ${alpha})`;
            ctx.lineWidth = 1 + age * 0.4;
            ctx.beginPath();
            ctx.moveTo(crack.x, this.pipelineY + 6);
            ctx.lineTo(crack.x + width, this.pipelineY + 6 + depth);
            ctx.stroke();
        });

        // Top thin rim detail (darker inner stroke to simulate the pipe opening edge)
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 2;
        ctx.strokeRect(6, y + 6, Math.max(0, this.width - 12), rimHeight - 12);
    }
}

class Projectile {
    constructor(x, y, type, speed) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.speed = speed;
        this.size = type === 'rust' ? 15 : 20; // Rust monsters are smaller
        this.damage = type === 'rust' ? 15 : 10;
        this.color = type === 'rust' ? '#8B4513' : '#1E90FF';
        this.wiggleOffset = 0;
        this.wiggleSpeed = 0.1;
        this.originalX = x;
    }

    update() {
        this.y += this.speed;

        // Make rust monsters wiggle
        if (this.type === 'rust') {
            this.wiggleOffset += this.wiggleSpeed;
            this.x = this.originalX + Math.sin(this.wiggleOffset) * 8;
        }
    }

    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();

        if (this.type === 'rust') {
            // Draw rust monster with wiggle
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            // Draw eyes
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(this.x - 5, this.y - 5, 3, 0, Math.PI * 2);
            ctx.arc(this.x + 5, this.y - 5, 3, 0, Math.PI * 2);
            ctx.fill();

            // Draw angry eyebrows
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x - 8, this.y - 8);
            ctx.lineTo(this.x - 3, this.y - 6);
            ctx.moveTo(this.x + 3, this.y - 6);
            ctx.lineTo(this.x + 8, this.y - 8);
            ctx.stroke();
        } else if (this.type === 'water') {
            // Draw water droplet
            ctx.ellipse(this.x, this.y, this.size / 2, this.size, 0, 0, Math.PI * 2);
            ctx.fill();

            // Add water shine effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.ellipse(this.x - 3, this.y - 5, this.size / 4, this.size / 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class ZapEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 20;
        this.maxLife = 20;
        this.lightningSegments = [];
        this.generateLightning();
    }

    generateLightning() {
        // Generate jagged lightning bolt pattern
        const segments = 6;
        this.lightningSegments = [{ x: this.x, y: this.y }];

        for (let i = 1; i < segments; i++) {
            const prev = this.lightningSegments[i - 1];
            const angle = (Math.random() - 0.5) * Math.PI / 3; // Random angle within 60 degrees
            const length = 15 + Math.random() * 10;

            this.lightningSegments.push({
                x: prev.x + Math.cos(angle) * length,
                y: prev.y + Math.sin(angle) * length
            });
        }
    }

    update() {
        this.life--;
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff';

        ctx.beginPath();
        ctx.moveTo(this.lightningSegments[0].x, this.lightningSegments[0].y);

        for (let i = 1; i < this.lightningSegments.length; i++) {
            ctx.lineTo(this.lightningSegments[i].x, this.lightningSegments[i].y);
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

class DamageEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 30;
        this.maxLife = 30;
        this.particles = [];

        // Create explosion particles
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30
            });
        }
    }

    update() {
        this.life--;
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.5; // gravity
            particle.life--;
        });
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;

        this.particles.forEach(particle => {
            if (particle.life > 0) {
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
}

class LevelUpEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 60;
        this.maxLife = 60;
        this.scale = 0.5;
    }

    update() {
        this.life--;
        this.scale = 0.5 + (1 - this.life / this.maxLife) * 1.5;
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;
        const size = 40 * this.scale;

        // Draw "LEVEL UP!" text with glow effect
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // Glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ff00';
        ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL UP!', 0, 0);

        // Health restored message
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ffff';
        ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Pipeline Health Restored!', 0, 30);

        ctx.restore();
    }
}

class Battery {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 18;
        this.speed = 1.8;
        this.rotation = 0;
        this.pulseScale = 1;
        this.pulseDirection = 1;
    }

    update() {
        this.y += this.speed;
        this.rotation += 0.08;

        // Pulsing effect
        this.pulseScale += this.pulseDirection * 0.03;
        if (this.pulseScale >= 1.3) {
            this.pulseDirection = -1;
        } else if (this.pulseScale <= 0.7) {
            this.pulseDirection = 1;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.pulseScale, this.pulseScale);

        // Draw battery pack body
        ctx.fillStyle = '#2E8B57';
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 1.8);

        // Draw battery pack top
        ctx.fillStyle = '#228B22';
        ctx.fillRect(-this.size / 3, -this.size / 2 - 4, this.size * 2 / 3, 8);

        // Draw positive terminal
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-3, -this.size / 2 - 7, 6, 4);

        // Draw negative terminal
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-3, this.size / 2 + 3, 6, 4);

        // Draw battery symbol
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚡', 0, 3);

        // Draw glow effect
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00FF00';
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size * 1.8);

        ctx.restore();
    }
}

class SurveyManager {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.speed = 1.5;
        this.rotation = 0;
        this.pulseScale = 1;
        this.pulseDirection = 1;
        this.glowIntensity = 0;
    }

    update() {
        this.y += this.speed;
        this.rotation += 0.05;
        this.glowIntensity += 0.1;

        // Pulsing effect
        this.pulseScale += this.pulseDirection * 0.02;
        if (this.pulseScale >= 1.2) {
            this.pulseDirection = -1;
        } else if (this.pulseScale <= 0.8) {
            this.pulseDirection = 1;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.pulseScale, this.pulseScale);

        // Draw the clock/timer icon based on the provided image
        // Outer circle
        ctx.strokeStyle = '#4169E1'; // Royal blue
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.stroke();

        // Central hub (larger circle in center)
        ctx.fillStyle = '#4169E1';
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 6, 0, Math.PI * 2);
        ctx.fill();

        // Clock hand pointing to 2 o'clock position
        ctx.strokeStyle = '#4169E1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        // Calculate 2 o'clock position (60 degrees from top)
        const handLength = this.size / 3;
        const handX = Math.sin(Math.PI / 3) * handLength;
        const handY = -Math.cos(Math.PI / 3) * handLength;
        ctx.lineTo(handX, handY);
        ctx.stroke();

        // Hand tip (small circle at end)
        ctx.fillStyle = '#4169E1';
        ctx.beginPath();
        ctx.arc(handX, handY, this.size / 12, 0, Math.PI * 2);
        ctx.fill();

        // Clock dots at 12, 4, 6, 8, and 10 o'clock positions
        const dotPositions = [
            { angle: 0, x: 0, y: -this.size / 2 },           // 12 o'clock
            { angle: Math.PI / 3, x: Math.sin(Math.PI / 3) * this.size / 2.5, y: -Math.cos(Math.PI / 3) * this.size / 2.5 }, // 2 o'clock (4 o'clock)
            { angle: Math.PI / 2, x: this.size / 2.5, y: 0 },     // 3 o'clock (6 o'clock)
            { angle: 2 * Math.PI / 3, x: Math.sin(2 * Math.PI / 3) * this.size / 2.5, y: Math.cos(2 * Math.PI / 3) * this.size / 2.5 }, // 4 o'clock (8 o'clock)
            { angle: 5 * Math.PI / 6, x: Math.sin(5 * Math.PI / 6) * this.size / 2.5, y: -Math.cos(5 * Math.PI / 6) * this.size / 2.5 }  // 5 o'clock (10 o'clock)
        ];

        ctx.fillStyle = '#4169E1';
        dotPositions.forEach(pos => {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.size / 15, 0, Math.PI * 2);
            ctx.fill();
        });

        // Glow effect
        const glowAlpha = (Math.sin(this.glowIntensity) + 1) / 2;
        ctx.shadowBlur = 8 + glowAlpha * 5;
        ctx.shadowColor = '#4169E1';
        ctx.strokeStyle = `rgba(65, 105, 225, ${0.3 + glowAlpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }
}

class SurveyManagerCollectionEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 60;
        this.maxLife = 60;
        this.scale = 0.5;
    }

    update() {
        this.life--;
        this.scale = 0.5 + (1 - this.life / this.maxLife) * 1.5;
    }

    render(ctx) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // Draw "SURVEY MANAGER!" text with glow
        ctx.fillStyle = '#4169E1';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#4169E1';
        ctx.fillText('SURVEY MANAGER!', 0, -10);

        // Draw "TECHNICIAN DUPLICATED!" text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('TECHNICIAN DUPLICATED!', 0, 10);

        // Draw "+250" points text
        ctx.fillStyle = '#FF69B4';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('+250', 0, 25);

        ctx.restore();
    }
}

class CartoPac {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 22;
        this.speed = 1.3;
        this.rotation = 0;
        this.pulseScale = 1;
        this.pulseDirection = 1;
        this.glowIntensity = 0;
    }

    update() {
        this.y += this.speed;
        this.rotation += 0.04;
        this.glowIntensity += 0.08;

        // Pulsing effect
        this.pulseScale += this.pulseDirection * 0.015;
        if (this.pulseScale >= 1.15) {
            this.pulseDirection = -1;
        } else if (this.pulseScale <= 0.85) {
            this.pulseDirection = 1;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.pulseScale, this.pulseScale);

        // Draw CartoPac based on the image description - blue circle with white 'i'
        // Outer circle (blue)
        ctx.fillStyle = '#4169E1'; // Royal blue
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Inner circle (white)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw the 'i' letter
        ctx.fillStyle = '#4169E1'; // Blue 'i' on white background
        ctx.font = `bold ${this.size / 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('i', 0, 0);

        // Glow effect
        const glowAlpha = (Math.sin(this.glowIntensity) + 1) / 2;
        ctx.shadowBlur = 8 + glowAlpha * 5;
        ctx.shadowColor = '#4169E1';
        ctx.strokeStyle = `rgba(65, 105, 225, ${0.3 + glowAlpha * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }
}

class CartoPacCollectionEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 60;
        this.maxLife = 60;
        this.scale = 0.5;
    }

    update() {
        this.life--;
        this.scale = 0.5 + (1 - this.life / this.maxLife) * 1.5;
    }

    render(ctx) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // Draw "CARTOPAC!" text with glow
        ctx.fillStyle = '#4169E1';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#4169E1';
        ctx.fillText('CARTOPAC!', 0, -10);

        // Draw "PIPELINE HEALED!" text
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('PIPELINE HEALED!', 0, 10);

        // Draw "+250" points text
        ctx.fillStyle = '#FF69B4';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('+250', 0, 25);

        ctx.restore();
    }
}

class BatteryCollectionEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 50;
        this.maxLife = 50;
        this.scale = 0.5;
    }

    update() {
        this.life--;
        this.scale = 0.5 + (1 - this.life / this.maxLife) * 1.5;
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;

        // Draw "RANGE BOOST!" text with glow effect
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // Glow effect
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#FFD700';
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('RANGE BOOST!', 0, 0);

        // Duration message
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00FF00';
        ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
        ctx.font = 'bold 14px Arial';
        ctx.fillText('10 seconds', 0, 25);

        // Points message
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FF69B4';
        ctx.fillStyle = `rgba(255, 105, 180, ${alpha})`;
        ctx.font = 'bold 12px Arial';
        ctx.fillText('+250', 0, 45);

        ctx.restore();
    }
}

class Bullhorn {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
        this.speed = 1.5;
        this.rotation = 0;
        this.pulseScale = 1;
        this.pulseDirection = 1;
        this.glowIntensity = 0;
    }

    update() {
        this.y += this.speed;
        this.rotation += 0.05;

        // Pulsing effect
        this.pulseScale += this.pulseDirection * 0.02;
        if (this.pulseScale >= 1.4) {
            this.pulseDirection = -1;
        } else if (this.pulseScale <= 0.6) {
            this.pulseDirection = 1;
        }

        // Glow intensity pulsing
        this.glowIntensity += 0.1;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.pulseScale, this.pulseScale);

        // Draw megaphone body (blue like the image)
        ctx.fillStyle = '#4169E1'; // Royal blue
        ctx.beginPath();
        // Main megaphone body - cone shape
        ctx.moveTo(-this.size / 3, -this.size / 2);
        ctx.lineTo(this.size / 2, -this.size / 4);
        ctx.lineTo(this.size / 2, this.size / 4);
        ctx.lineTo(-this.size / 3, this.size / 2);
        ctx.closePath();
        ctx.fill();

        // Draw megaphone handle
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(-this.size / 2, -this.size / 6, this.size / 4, this.size / 3);

        // Draw sound waves emanating from the megaphone
        const glowAlpha = (Math.sin(this.glowIntensity) + 1) / 2;
        ctx.strokeStyle = `rgba(65, 105, 225, ${0.3 + glowAlpha * 0.4})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8 + glowAlpha * 5;
        ctx.shadowColor = '#4169E1';

        // Draw curved sound wave lines
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const waveRadius = (this.size / 2 + 5) + (i * 8);
            const startAngle = -Math.PI / 4 + (i * 0.1);
            const endAngle = Math.PI / 4 - (i * 0.1);
            ctx.arc(this.size / 2, 0, waveRadius, startAngle, endAngle);
            ctx.stroke();
        }

        // Draw megaphone opening highlight
        ctx.fillStyle = '#87CEEB'; // Light blue highlight
        ctx.beginPath();
        ctx.arc(this.size / 2, 0, this.size / 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw glow effect around the entire megaphone
        ctx.shadowBlur = 12 + glowAlpha * 8;
        ctx.shadowColor = '#4169E1';
        ctx.strokeStyle = '#4169E1';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }
}

class BlastEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 40;
        this.maxLife = 40;
        this.radius = 0;
        this.maxRadius = 200;
    }

    update() {
        this.life--;
        this.radius = this.maxRadius * (1 - this.life / this.maxLife);
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;

        // Draw expanding blast ring
        ctx.save();
        ctx.translate(this.x, this.y);

        // Outer ring
        ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
        ctx.lineWidth = 8;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FF4500';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring
        ctx.strokeStyle = `rgba(255, 255, 0, ${alpha * 0.8})`;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FFFF00';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        // Center flash
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class BullhornCollectionEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 60;
        this.maxLife = 60;
        this.scale = 0.5;
    }

    update() {
        this.life--;
        this.scale = 0.5 + (1 - this.life / this.maxLife) * 1.5;
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;

        // Draw "BULLHORN!" text with glow effect
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // Glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#4169E1';
        ctx.fillStyle = `rgba(65, 105, 225, ${alpha})`;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BULLHORN!', 0, 0);

        // Subtitle
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#87CEEB';
        ctx.fillStyle = `rgba(135, 206, 235, ${alpha})`;
        ctx.font = 'bold 16px Arial';
        ctx.fillText('Sound Blast!', 0, 30);

        // Points message
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FF69B4';
        ctx.fillStyle = `rgba(255, 105, 180, ${alpha})`;
        ctx.font = 'bold 12px Arial';
        ctx.fillText('+250', 0, 50);

        ctx.restore();
    }
}

class ProjectileDestructionEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 20;
        this.maxLife = 20;
        this.particles = [];

        // Create small explosion particles
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 20,
                color: Math.random() < 0.5 ? '#FF4500' : '#FFD700'
            });
        }
    }

    update() {
        this.life--;
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.3; // gravity
            particle.life--;
        });
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;

        this.particles.forEach(particle => {
            if (particle.life > 0) {
                ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
}

class FloatingScoreEffect {
    constructor(x, y, score) {
        this.x = x;
        this.y = y;
        this.score = score;
        this.life = 60; // 1 second at 60 FPS
        this.maxLife = 60;
        this.velocityY = -2; // Float upward
        this.scale = 1;
    }

    update() {
        this.life--;
        this.y += this.velocityY;
        this.velocityY *= 0.98; // Slow down over time
        this.scale = 0.5 + (1 - this.life / this.maxLife) * 1.5; // Scale up then down
    }

    render(ctx) {
        if (this.life <= 0) return;

        const alpha = this.life / this.maxLife;
        const text = `+${this.score}`;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);

        // Draw text with glow effect
        ctx.fillStyle = this.score >= 100 ? '#FFD700' : '#00FF00'; // Gold for rust monsters, green for water
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.score >= 100 ? '#FFD700' : '#00FF00';
        ctx.globalAlpha = alpha;
        ctx.fillText(text, 0, 0);

        ctx.restore();
    }
}

class AiBomb {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 2;
        this.rotation = 0;
        this.pulseScale = 1;
        this.pulseDirection = 1;
        this.flashTimer = 0;
    }
    
    update() {
        this.y += this.speed;
        this.rotation += 0.1;
        
        // Pulsing effect
        this.pulseScale += this.pulseDirection * 0.02;
        if (this.pulseScale >= 1.2) {
            this.pulseScale = 1.2;
            this.pulseDirection = -1;
        } else if (this.pulseScale <= 0.8) {
            this.pulseScale = 0.8;
            this.pulseDirection = 1;
        }
        
        // Flashing effect
        this.flashTimer++;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.pulseScale, this.pulseScale);
        
        // Flash effect
        if (Math.floor(this.flashTimer / 10) % 2 === 0) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff6b6b';
        }
        
        // Draw AI Bomb (simplified AI logo based on AI.jpg)
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(-15, -15, 30, 30);
        
        // Draw white circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw 'i' letter
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(-2, -8, 4, 4);
        ctx.fillRect(-2, 2, 4, 8);
        
        ctx.restore();
    }
}

class AiBombCollectionEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 60;
        this.maxLife = 60;
        this.scale = 0.5;
    }
    
    update() {
        this.life--;
        this.scale = 0.5 + (1 - this.life / this.maxLife) * 1.5;
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        // Glow effect
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#ff6b6b';
        
        // Text
        ctx.fillStyle = `rgba(255, 107, 107, ${alpha})`;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('AI BOMB!', 0, -20);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = 'bold 16px Arial';
        ctx.fillText('WAVE CLEAR!', 0, 10);
        
        // Points
        ctx.fillStyle = `rgba(255, 192, 203, ${alpha})`;
        ctx.font = 'bold 20px Arial';
        ctx.fillText('+250', 0, 35);
        
        ctx.restore();
    }
}

class AiBombWaveEffect {
    constructor() {
        this.life = 120; // 2 seconds
        this.maxLife = 120;
        this.waveProgress = 0;
        this.particles = [];
        this.createWaveParticles();
    }
    
    createWaveParticles() {
        // Create particles that follow the wave
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * 800,
                y: Math.random() * 600,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 60 + Math.random() * 60,
                maxLife: 60 + Math.random() * 60,
                size: 2 + Math.random() * 4
            });
        }
    }
    
    update() {
        this.life--;
        this.waveProgress = 1 - (this.life / this.maxLife);
        
        // Update particles
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
        });
        
        // Remove dead particles
        this.particles = this.particles.filter(p => p.life > 0);
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        const waveX = this.waveProgress * ctx.canvas.width;
        
        ctx.save();
        
        // Draw dramatic wave effect with gradient
        const gradient = ctx.createLinearGradient(0, 0, waveX, 0);
        gradient.addColorStop(0, `rgba(74, 144, 226, ${alpha * 0.4})`);
        gradient.addColorStop(0.5, `rgba(255, 107, 107, ${alpha * 0.3})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.2})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, waveX, ctx.canvas.height);
        
        // Draw multiple wave lines for dramatic effect
        for (let i = 0; i < 3; i++) {
            const lineAlpha = alpha * (1 - i * 0.3);
            const lineWidth = 8 - i * 2;
            const lineX = waveX - (i * 10);
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
            ctx.lineWidth = lineWidth;
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(lineX, 0);
            ctx.lineTo(lineX, ctx.canvas.height);
            ctx.stroke();
        }
        
        // Draw wave particles
        this.particles.forEach(particle => {
            const particleAlpha = particle.life / particle.maxLife;
            ctx.fillStyle = `rgba(255, 255, 255, ${particleAlpha * alpha})`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffffff';
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }
}

class AiBombSequenceEffect {
    constructor() {
        this.life = 300; // 5 seconds total
        this.maxLife = 300;
        this.currentImage = 0;
        this.imageDuration = 60; // 1 second per image
        this.images = ['PCS.jpg', 'SurveryManager.jpg', 'FDC.jpg', 'Bullhorn.png', 'CartoPac2.jpg'];
        this.loadedImages = [];
        this.pulseScale = 1;
        this.pulseDirection = 1;
        this.loadImages();
    }
    
    loadImages() {
        this.images.forEach((imageName, index) => {
            const img = new Image();
            img.onload = () => {
                this.loadedImages[index] = img;
            };
            img.onerror = () => {
                console.log(`Failed to load image: ${imageName}`);
                // Create a placeholder if image fails to load
                this.loadedImages[index] = null;
            };
            img.src = imageName;
        });
    }
    
    update() {
        this.life--;
        this.currentImage = Math.floor((this.maxLife - this.life) / this.imageDuration);
        if (this.currentImage >= this.images.length) {
            this.currentImage = this.images.length - 1;
        }
        
        // Pulsing effect
        this.pulseScale += this.pulseDirection * 0.05;
        if (this.pulseScale >= 1.3) {
            this.pulseScale = 1.3;
            this.pulseDirection = -1;
        } else if (this.pulseScale <= 0.7) {
            this.pulseScale = 0.7;
            this.pulseDirection = 1;
        }
    }
    
    render(ctx) {
        if (this.currentImage < this.images.length) {
            const alpha = Math.min(1, (this.imageDuration - ((this.maxLife - this.life) % this.imageDuration)) / 10);
            const scale = (0.5 + alpha * 0.5) * this.pulseScale;
            
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
            ctx.scale(scale, scale);
            
            // Add dramatic glow effect
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ff6b6b';
            
            // Draw the actual image if loaded, otherwise show placeholder
            const img = this.loadedImages[this.currentImage];
            if (img && img.complete) {
                // Draw the loaded image with dramatic effects
                const imgWidth = 250;
                const imgHeight = 125;
                
                // Draw background glow
                ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
                ctx.fillRect(-imgWidth/2 - 20, -imgHeight/2 - 20, imgWidth + 40, imgHeight + 40);
                
                // Draw the image
                ctx.drawImage(img, -imgWidth/2, -imgHeight/2, imgWidth, imgHeight);
                
                // Draw border
                ctx.strokeStyle = '#ff6b6b';
                ctx.lineWidth = 4;
                ctx.strokeRect(-imgWidth/2, -imgHeight/2, imgWidth, imgHeight);
            } else {
                // Draw placeholder if image not loaded yet
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-125, -62, 250, 125);
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.images[this.currentImage], 0, 0);
            }
            
            ctx.restore();
        }
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});