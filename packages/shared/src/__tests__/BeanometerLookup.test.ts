import { describe, it, expect } from 'vitest';
import { calculateGoldEarned } from '../engine/BeanometerLookup.js';
import { BeanType } from '../types/beans.js';

describe('calculateGoldEarned', () => {
  describe('Stink Bean (3→1, 5→2, 7→3, 8→4)', () => {
    it('should return 0 for 1 card', () => {
      expect(calculateGoldEarned(BeanType.Stink, 1)).toBe(0);
    });
    it('should return 0 for 2 cards', () => {
      expect(calculateGoldEarned(BeanType.Stink, 2)).toBe(0);
    });
    it('should return 1 for 3 cards', () => {
      expect(calculateGoldEarned(BeanType.Stink, 3)).toBe(1);
    });
    it('should return 1 for 4 cards', () => {
      expect(calculateGoldEarned(BeanType.Stink, 4)).toBe(1);
    });
    it('should return 2 for 5 cards', () => {
      expect(calculateGoldEarned(BeanType.Stink, 5)).toBe(2);
    });
    it('should return 3 for 7 cards', () => {
      expect(calculateGoldEarned(BeanType.Stink, 7)).toBe(3);
    });
    it('should return 4 for 8 cards', () => {
      expect(calculateGoldEarned(BeanType.Stink, 8)).toBe(4);
    });
    it('should return 4 for 10+ cards', () => {
      expect(calculateGoldEarned(BeanType.Stink, 10)).toBe(4);
    });
  });

  describe('Garden Bean (2→2, 3→3, no 1-coin or 4-coin tier)', () => {
    it('should return 0 for 1 card', () => {
      expect(calculateGoldEarned(BeanType.Garden, 1)).toBe(0);
    });
    it('should return 2 for 2 cards', () => {
      expect(calculateGoldEarned(BeanType.Garden, 2)).toBe(2);
    });
    it('should return 3 for 3 cards', () => {
      expect(calculateGoldEarned(BeanType.Garden, 3)).toBe(3);
    });
    it('should return 3 for 6 cards', () => {
      expect(calculateGoldEarned(BeanType.Garden, 6)).toBe(3);
    });
  });

  describe('Red Bean (2→1, 3→2, 4→3, 5→4)', () => {
    it('should return 0 for 1 card', () => {
      expect(calculateGoldEarned(BeanType.Red, 1)).toBe(0);
    });
    it('should return 1 for 2 cards', () => {
      expect(calculateGoldEarned(BeanType.Red, 2)).toBe(1);
    });
    it('should return 2 for 3 cards', () => {
      expect(calculateGoldEarned(BeanType.Red, 3)).toBe(2);
    });
    it('should return 4 for 5 cards', () => {
      expect(calculateGoldEarned(BeanType.Red, 5)).toBe(4);
    });
  });

  describe('Blue Bean (4→1, 6→2, 8→3, 10→4)', () => {
    it('should return 0 for 3 cards', () => {
      expect(calculateGoldEarned(BeanType.Blue, 3)).toBe(0);
    });
    it('should return 1 for 4 cards', () => {
      expect(calculateGoldEarned(BeanType.Blue, 4)).toBe(1);
    });
    it('should return 2 for 6 cards', () => {
      expect(calculateGoldEarned(BeanType.Blue, 6)).toBe(2);
    });
    it('should return 4 for 10 cards', () => {
      expect(calculateGoldEarned(BeanType.Blue, 10)).toBe(4);
    });
  });

  describe('Chili Bean (3→1, 6→2, 8→3, 9→4)', () => {
    it('should return 1 for 3 cards', () => {
      expect(calculateGoldEarned(BeanType.Chili, 3)).toBe(1);
    });
    it('should return 4 for 9 cards', () => {
      expect(calculateGoldEarned(BeanType.Chili, 9)).toBe(4);
    });
  });

  describe('Soy Bean (2→1, 4→2, 6→3, 7→4)', () => {
    it('should return 1 for 2 cards', () => {
      expect(calculateGoldEarned(BeanType.Soy, 2)).toBe(1);
    });
    it('should return 4 for 7 cards', () => {
      expect(calculateGoldEarned(BeanType.Soy, 7)).toBe(4);
    });
  });

  describe('Black-eyed Bean (2→1, 4→2, 5→3, 6→4)', () => {
    it('should return 1 for 2 cards', () => {
      expect(calculateGoldEarned(BeanType.BlackEyed, 2)).toBe(1);
    });
    it('should return 4 for 6 cards', () => {
      expect(calculateGoldEarned(BeanType.BlackEyed, 6)).toBe(4);
    });
  });

  describe('Green Bean (3→1, 5→2, 6→3, 7→4)', () => {
    it('should return 0 for 2 cards', () => {
      expect(calculateGoldEarned(BeanType.Green, 2)).toBe(0);
    });
    it('should return 4 for 7 cards', () => {
      expect(calculateGoldEarned(BeanType.Green, 7)).toBe(4);
    });
  });

  it('should return 0 for 0 cards of any type', () => {
    for (const beanType of Object.values(BeanType)) {
      expect(calculateGoldEarned(beanType, 0)).toBe(0);
    }
  });
});
