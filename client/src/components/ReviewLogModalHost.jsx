import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import ReviewLogModal from './ReviewLogModal';

/**
 * Owns the open/selectedLog state for ReviewLogModal so that opening or closing
 * the nutritionist meal review modal does NOT re-render huge parent pages
 * (such as the 6,400+ line ClientDetails page or NutritionistDashboard).
 *
 * Usage:
 *   const reviewModalRef = useRef(null);
 *   onClick={() => reviewModalRef.current?.open(log)}
 *   <ReviewLogModalHost ref={reviewModalRef} onReviewComplete={...} />
 */
const ReviewLogModalHost = forwardRef(function ReviewLogModalHost({ onReviewComplete, ...modalProps }, ref) {
    const [selectedLog, setSelectedLog] = useState(null);

    useImperativeHandle(ref, () => ({
        open: (log) => setSelectedLog(log),
        close: () => setSelectedLog(null),
    }), []);

    const handleClose = useCallback(() => setSelectedLog(null), []);

    if (!selectedLog) return null;

    return (
        <ReviewLogModal
            {...modalProps}
            isOpen={true}
            log={selectedLog}
            onClose={handleClose}
            onReviewComplete={onReviewComplete}
        />
    );
});

export default ReviewLogModalHost;
