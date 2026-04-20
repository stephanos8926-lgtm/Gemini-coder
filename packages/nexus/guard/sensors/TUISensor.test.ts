import { describe, it, expect, beforeEach } from 'vitest';
import { TUISensor } from './TUISensor';

describe('TUISensor', () => {
    let sensor: TUISensor;

    beforeEach(() => {
        sensor = new TUISensor();
    });

    it('should have correct capabilities and name', () => {
        expect(sensor.name).toBe('TUISensor');
        expect(sensor.capabilities).toContain('terminal-output');
    });

    it('should handle basic data', async () => {
        const result = await sensor.handle({ type: 'test', data: 'hello' });
        expect(result).toBe(true);
    });
});
