'use client';
/**
 * Shared Framer Motion animation primitives for FloodGuard dashboards.
 * Import from here to keep animation values consistent platform-wide.
 */

import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';

// ── Variant presets ────────────────────────────────────────────────────────────

export const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

export const scaleIn = {
    hidden: { opacity: 0, scale: 0.93 },
    visible: { opacity: 1, scale: 1 },
};

export const slideRight = {
    hidden: { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0 },
};

export const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const staggerFast = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
};

// ── Reusable wrapper components ────────────────────────────────────────────────

/** Page-level entrance — wraps the full page section */
export function PageMotion({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/** A single staggered child item */
export function FadeUp({
    children,
    delay = 0,
    className,
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            variants={fadeUp}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94], delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/** Scale-in card — great for metric cards */
export function ScaleCard({
    children,
    delay = 0,
    className,
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            variants={scaleIn}
            transition={{ duration: 0.3, ease: 'easeOut', delay }}
            whileHover={{ scale: 1.015, transition: { duration: 0.15 } }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/** Animated number counter */
export function AnimatedNumber({
    value,
    className,
}: {
    value: number;
    className?: string;
}) {
    return (
        <motion.span
            key={value}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 300 }}
            className={className}
        >
            {value.toLocaleString()}
        </motion.span>
    );
}

/** Fade+slide list item — used in tables, cards, etc. */
export function ListItem({ children, index = 0, className }: { children: ReactNode; index?: number; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.04, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/** Header row that fades in from top */
export function HeaderMotion({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/** Pulse badge — used for live indicators */
export function LiveBadge({ label = 'Live', className }: { label?: string; className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 400 }}
            className={`flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full ${className || ''}`}
        >
            <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"
            />
            <span className="text-xs text-green-400 font-medium whitespace-nowrap">{label}</span>
        </motion.div>
    );
}
