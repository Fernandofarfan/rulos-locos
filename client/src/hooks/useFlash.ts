import { useState, useEffect, useRef } from 'react';

/**
 * Returns a flash class name when the value changes.
 * @param value The value to monitor for changes
 * @param positiveClass Class to apply when value increases (default: text-green-500)
 * @param negativeClass Class to apply when value decreases (default: text-red-500)
 * @param duration Duration of the flash in ms
 */
export const useFlash = (value: number | string, positiveClass = 'text-green-500 font-bold transition-all duration-300', negativeClass = 'text-red-500 font-bold transition-all duration-300', duration = 1000) => {
    const [flashClass, setFlashClass] = useState('');
    const prevValueRef = useRef(value);

    useEffect(() => {
        if (value !== prevValueRef.current) {
            const isPositive = Number(value) > Number(prevValueRef.current);
            setFlashClass(isPositive ? positiveClass : negativeClass);
            prevValueRef.current = value;

            const timer = setTimeout(() => {
                setFlashClass('');
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [value, positiveClass, negativeClass, duration]);

    return flashClass;
};
