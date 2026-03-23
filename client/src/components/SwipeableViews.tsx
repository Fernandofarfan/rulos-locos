import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SwipeableViewsProps {
    views: { id: string; label: string }[];
    activeView: string;
    onViewChange: (view: string) => void;
    children: React.ReactNode;
}

/**
 * SwipeableViews — Adds touch swipe gestures on mobile to switch between views.
 * Also adds pull-to-refresh indicator.
 */
export const SwipeableViews: React.FC<SwipeableViewsProps> = ({
    views,
    activeView,
    onViewChange,
    children,
}) => {
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [swiping, setIsSwiping] = useState(false);


    const minSwipeDistance = 80;

    const currentIdx = views.findIndex(v => v.id === activeView);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
        setIsSwiping(true);
    }, []);

    const onTouchEnd = useCallback(() => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeft = distance > minSwipeDistance;
        const isRight = distance < -minSwipeDistance;

        if (isLeft && currentIdx < views.length - 1) {
            onViewChange(views[currentIdx + 1].id);
        } else if (isRight && currentIdx > 0) {
            onViewChange(views[currentIdx - 1].id);
        }
        setIsSwiping(false);
    }, [touchStart, touchEnd, currentIdx, views, onViewChange]);

    return (
        <div
            className="md:hidden relative"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* View indicator dots */}
            <div className="flex items-center justify-center gap-1.5 py-2">
                {views.map((v, i) => (
                    <button
                        key={v.id}
                        onClick={() => onViewChange(v.id)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                            i === currentIdx ? 'bg-blue-400 w-4' : 'bg-slate-700'
                        }`}
                        title={v.label}
                    />
                ))}
            </div>

            {/* Swipe hint */}
            {swiping && (
                <div className="absolute top-1/2 left-0 right-0 flex justify-between px-2 pointer-events-none z-10">
                    {currentIdx > 0 && <ChevronLeft size={24} className="text-white/20" />}
                    {currentIdx < views.length - 1 && <ChevronRight size={24} className="text-white/20 ml-auto" />}
                </div>
            )}

            {children}
        </div>
    );
};

/**
 * PullToRefresh — Shows a visual indicator when pulling down on mobile.
 */
export const PullToRefresh: React.FC<{ onRefresh: () => void; children: React.ReactNode }> = ({
    onRefresh,
    children,
}) => {
    const [pulling, setPulling] = useState(false);
    const [startY, setStartY] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.scrollY === 0) {
            setStartY(e.touches[0].clientY);
            setPulling(true);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!pulling) return;
        const dist = Math.max(0, e.touches[0].clientY - startY);
        setPullDistance(Math.min(dist, 100));
    };

    const handleTouchEnd = () => {
        if (pullDistance > 60) onRefresh();
        setPulling(false);
        setPullDistance(0);
    };

    return (
        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            {pullDistance > 10 && (
                <div className="flex justify-center py-2" style={{ transform: `translateY(${pullDistance * 0.3}px)` }}>
                    <div className={`w-5 h-5 border-2 rounded-full ${
                        pullDistance > 60 ? 'border-blue-400 animate-spin' : 'border-slate-600'
                    } border-t-transparent`} />
                </div>
            )}
            {children}
        </div>
    );
};
