import ObjectPool from '../utils/objectPool.js';

const createParticle = () => ({
  x: 0,
  y: 0,
  color: null,
  baseColor: null,
  dead: false
});

const resetParticle = (p) => {
  p.x = 0;
  p.y = 0;
  p.color = null;
  p.baseColor = null;
  p.dead = false;
};

const createEffect = () => ({
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  size: 0,
  maxSize: 0,
  life: 0,
  type: '',
  color: null,
  gravity: 0,
  friction: 0
});

const resetEffect = (e) => {
  e.x = 0;
  e.y = 0;
  e.vx = 0;
  e.vy = 0;
  e.size = 0;
  e.maxSize = 0;
  e.life = 0;
  e.type = '';
  e.color = null;
  e.gravity = 0;
  e.friction = 0;
};

// Preload a modest amount to avoid first-frame allocations; tune as needed.
export const sandPool = new ObjectPool(createParticle, resetParticle, 5000);
export const effectPool = new ObjectPool(createEffect, resetEffect, 256);
