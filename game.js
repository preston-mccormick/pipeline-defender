class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameState = 'playing'; // playing, paused, gameOver
        this.level = 1;
        this.timeLeft = 60;
        this.pipelineHealth = 100;
        this.score = 0;
        
        // Game objects
        this.technician = new Technician(this.width / 2, this.height - 80);
        this.pipeline = new Pipeline(this.width, this.height);
        this.projectiles = [];
        this.particles = [];
        
        // Game settings
        this.projectileSpawnRate = 0.02;
        this.projectileSpeed = 2;
        this.zapRange = 50;
        this.zapCooldown = 0;
        
        // Input handling
        this.keys = {};
        this.mouseX = this.width / 2;
        
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
            if (e.key.toLowerCase() === 'z' && this.gameState === 'playing') {
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
        this.sounds = {
            zap: this.createSound(800, 0.1, 'sine'),
            damage: this.createSound(200, 0.3, 'sawtooth'),
            levelUp: this.createSound(600, 0.5, 'sine'),
            explosion: this.createSound(150, 1.0, 'sawtooth')
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
        this.timeLeft = 60;
        this.pipelineHealth = 100;
        this.score = 0;
        this.projectiles = [];
        this.particles = [];
        this.technician.x = this.width / 2;
        this.projectileSpeed = 2;
        this.projectileSpawnRate = 0.02;
        
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
        
        // Check for nearby projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            const distance = Math.sqrt(
                Math.pow(projectile.x - this.technician.x, 2) + 
                Math.pow(projectile.y - this.technician.y, 2)
            );
            
            if (distance < this.zapRange) {
                // Create zap effect
                this.particles.push(new ZapEffect(projectile.x, projectile.y));
                this.projectiles.splice(i, 1);
                this.score += 10;
            }
        }
    }
    
    spawnProjectile() {
        if (Math.random() < this.projectileSpawnRate) {
            const types = ['rust', 'water'];
            const type = types[Math.floor(Math.random() * types.length)];
            const x = Math.random() * (this.width - 40) + 20;
            this.projectiles.push(new Projectile(x, -20, type, this.projectileSpeed));
        }
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Update technician
        this.technician.update(this.keys, this.mouseX, this.width);
        
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
        
        // Spawn new projectiles
        this.spawnProjectile();
        
        // Update cooldowns
        if (this.zapCooldown > 0) this.zapCooldown--;
        
        // Update timer
        if (this.timeLeft > 0) {
            this.timeLeft -= 1/60; // Assuming 60 FPS
            if (this.timeLeft <= 0) {
                this.nextLevel();
            }
        }
        
        this.updateUI();
    }
    
    nextLevel() {
        this.level++;
        this.timeLeft = 60;
        this.projectileSpeed += 0.5;
        this.projectileSpawnRate += 0.005;
        this.sounds.levelUp();
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.sounds.explosion();
        document.getElementById('gameOverScreen').style.display = 'block';
        document.getElementById('gameOverTitle').textContent = 'Pipeline Destroyed!';
        document.getElementById('gameOverMessage').textContent = `You reached level ${this.level} with a score of ${this.score}!`;
    }
    
    updateUI() {
        document.getElementById('level').textContent = this.level;
        document.getElementById('timer').textContent = Math.ceil(this.timeLeft);
        document.getElementById('health').textContent = Math.max(0, Math.ceil(this.pipelineHealth));
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = 'rgba(135, 206, 235, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Draw background elements
        this.drawBackground();
        
        // Draw pipeline
        this.pipeline.render(this.ctx);
        
        // Draw projectiles
        this.projectiles.forEach(projectile => projectile.render(this.ctx));
        
        // Draw technician
        this.technician.render(this.ctx);
        
        // Draw particles
        this.particles.forEach(particle => particle.render(this.ctx));
        
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
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 3;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00ffff';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.technician.x, this.technician.y);
        this.ctx.lineTo(this.technician.x + 20, this.technician.y - 20);
        this.ctx.lineTo(this.technician.x - 20, this.technician.y - 40);
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
    
    update(keys, mouseX, canvasWidth) {
        // Keyboard movement
        if (keys['arrowleft'] || keys['a']) {
            this.x -= this.speed;
        }
        if (keys['arrowright'] || keys['d']) {
            this.x += this.speed;
        }
        
        // Mouse movement
        if (mouseX > 0) {
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
        
        // Draw cane
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.x + 15, this.y - this.height + 20);
        ctx.lineTo(this.x + 25, this.y - this.height + 5);
        ctx.stroke();
        
        // Draw wire
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + 15, this.y - this.height + 20);
        ctx.lineTo(this.x + 25, this.y - this.height + 5);
        ctx.stroke();
    }
}

class Pipeline {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.pipelineY = height - 80;
        this.health = 100;
        this.cracks = [];
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        
        // Add crack
        this.cracks.push({
            x: Math.random() * this.width,
            width: Math.random() * 20 + 10,
            depth: Math.random() * 5 + 2
        });
    }
    
    render(ctx) {
        // Draw pipeline base
        const rustLevel = (100 - this.health) / 100;
        const baseColor = `rgb(${Math.floor(139 + rustLevel * 116)}, ${Math.floor(69 + rustLevel * 186)}, ${Math.floor(19 + rustLevel * 236)})`;
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, this.pipelineY, this.width, 60);
        
        // Draw rust spots
        if (rustLevel > 0) {
            ctx.fillStyle = `rgba(139, 69, 19, ${rustLevel})`;
            for (let i = 0; i < 20; i++) {
                const x = Math.random() * this.width;
                const y = this.pipelineY + Math.random() * 60;
                const size = Math.random() * 15 + 5;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw cracks
        ctx.strokeStyle = '#2F4F4F';
        ctx.lineWidth = 2;
        this.cracks.forEach(crack => {
            ctx.beginPath();
            ctx.moveTo(crack.x, this.pipelineY);
            ctx.lineTo(crack.x + crack.width, this.pipelineY + crack.depth);
            ctx.stroke();
        });
        
        // Draw pipeline top
        ctx.fillStyle = '#708090';
        ctx.fillRect(0, this.pipelineY, this.width, 10);
    }
}

class Projectile {
    constructor(x, y, type, speed) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.speed = speed;
        this.size = 20;
        this.damage = type === 'rust' ? 15 : 10;
        this.color = type === 'rust' ? '#8B4513' : '#87CEEB';
    }
    
    update() {
        this.y += this.speed;
    }
    
    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        
        if (this.type === 'rust') {
            // Draw rust monster
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw eyes
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(this.x - 5, this.y - 5, 3, 0, Math.PI * 2);
            ctx.arc(this.x + 5, this.y - 5, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Draw water droplet
            ctx.ellipse(this.x, this.y, this.size / 2, this.size, 0, 0, Math.PI * 2);
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
    }
    
    update() {
        this.life--;
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ffff';
        
        ctx.beginPath();
        ctx.moveTo(this.x - 10, this.y - 10);
        ctx.lineTo(this.x + 10, this.y + 10);
        ctx.moveTo(this.x + 10, this.y - 10);
        ctx.lineTo(this.x - 10, this.y + 10);
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

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});
