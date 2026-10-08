/**
 * Haptic Feedback Utility
 * Provides a centralized way to trigger haptic feedback patterns.
 */

export const HapticPatterns = {
    light: 10,       // Very precise click feel
    medium: 40,      // Navigation/Action confirmation
    heavy: 70,       // Delete/Destructive action
    selection: 15,   // Scrolling/Picker selection
    success: [50, 50, 50],
    error: [50, 100, 50, 100],
};

/**
 * Triggers haptic feedback if supported by the device.
 * @param {number|number[]} pattern - The vibration pattern to trigger.
 */
export const triggerHaptic = (pattern) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // Silently fail if vibration is blocked or unsupported
            console.debug('Haptic feedback failed:', e);
        }
    }
};
