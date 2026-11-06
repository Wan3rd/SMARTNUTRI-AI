import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import MealDetailModal from './MealDetailModal';

/**
 * Owns the "which meal log is open" state so that opening/closing the
 * MealDetailModal does NOT re-render the (large) parent page.
 *
 * Usage:
 *   const mealModalRef = useRef(null);
 *   onClick={() => mealModalRef.current?.open(log)}
 *   <MealDetailModalHost ref={mealModalRef} rules={rules} allergies={...} onDelete={...} />
 */
const MealDetailModalHost = forwardRef(function MealDetailModalHost({ onDelete, ...modalProps }, ref) {
    const [selectedLog, setSelectedLog] = useState(null);

    useImperativeHandle(ref, () => ({
        open: (log) => setSelectedLog(log),
        close: () => setSelectedLog(null),
    }), []);

    const handleClose = useCallback(() => setSelectedLog(null), []);

    const handleDelete = useCallback((deletedId) => {
        setSelectedLog(null);
        onDelete?.(deletedId);
    }, [onDelete]);

    if (!selectedLog) return null;

    return (
        <MealDetailModal
            {...modalProps}
            log={selectedLog}
            onClose={handleClose}
            onDelete={handleDelete}
        />
    );
});

export default MealDetailModalHost;

