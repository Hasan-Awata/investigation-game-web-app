import React, { useState, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import './ViewersContainer.css';

interface ViewersContainerProps {
  evidence: { id: string | number; [key: string]: any };
  children: React.ReactNode;
}

const ViewersContainer: React.FC<ViewersContainerProps> = ({ children }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // --- SEPARATE SCALES ---
  // baseScale forces the document to fit the screen perfectly on load.
  // zoom handles the user's 1x to 5x wheel scrolling.
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const contentRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      // Reset interaction states when closing
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  // 1. Calculate Base Fit Scale (Perfect Screen Fit without Scrollbars)
  useLayoutEffect(() => {
    if (!isFullscreen || !contentRef.current) return;
    
    const child = contentRef.current.firstElementChild as HTMLElement;
    if (!child) return;

    const calculateFit = () => {
      const childWidth = child.offsetWidth;
      const childHeight = child.offsetHeight;
      
      if (childWidth === 0 || childHeight === 0) return;

      // Calculate maximum allowed size with padding buffers
      const availableW = window.innerWidth - 80;
      const availableH = window.innerHeight - 80;

      const fitX = availableW / childWidth;
      const fitY = availableH / childHeight;

      // Automatically shrink the document to fit, but never scale it up past 1x
      setBaseScale(Math.min(fitX, fitY, 1));
    };

    // ResizeObserver catches delayed image loads automatically
    const observer = new ResizeObserver(calculateFit);
    observer.observe(child);
    window.addEventListener('resize', calculateFit);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calculateFit);
    };
  }, [isFullscreen, children]);

  // 2. Safe Bounds Clamping (Prevents moving off-screen)
  const clampPosition = (targetX: number, targetY: number, currentZoom: number) => {
    if (!contentRef.current) return { x: targetX, y: targetY };
    const child = contentRef.current.firstElementChild as HTMLElement;
    if (!child) return { x: targetX, y: targetY };

    // The true visual size rendered on the screen
    const totalScale = baseScale * currentZoom;
    const visualWidth = child.offsetWidth * totalScale;
    const visualHeight = child.offsetHeight * totalScale;

    // Boundary constraints based on center origin
    const maxX = Math.max(0, (visualWidth - window.innerWidth) / 2);
    const maxY = Math.max(0, (visualHeight - window.innerHeight) / 2);

    return {
      x: Math.min(Math.max(targetX, -maxX), maxX),
      y: Math.min(Math.max(targetY, -maxY), maxY)
    };
  };

  // 3. Zoom & Pan Handlers
  const handleWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.005;
    const delta = e.deltaY * -zoomSensitivity;
    const newZoom = Math.min(Math.max(1, zoom + delta), 5); // Clamped 1x to 5x
    
    setZoom(newZoom);
    if (newZoom === 1) {
      setPosition({ x: 0, y: 0 }); // Auto-center when fully zoomed out
    } else {
      setPosition(prev => clampPosition(prev.x, prev.y, newZoom));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      const deltaX = e.clientX - lastMouse.x;
      const deltaY = e.clientY - lastMouse.y;
      
      setPosition(prev => clampPosition(prev.x + deltaX, prev.y + deltaY, zoom));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const containerContent = (
    <div className={`viewers-container-wrapper ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      <div className="viewers-floating-toolbar">
        <button 
          type="button" 
          className="btn-icon-fullscreen" 
          onClick={toggleFullscreen}
          title={isFullscreen ? "Close" : "Fullscreen"}
        >
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
          )}
        </button>
      </div>

      {isFullscreen ? (
        <div 
          className="viewers-zoom-overlay"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'auto') }}
        >
          <div 
            ref={contentRef}
            className="viewers-content-area fullscreen-scaled"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${baseScale * zoom})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            {children}
          </div>
        </div>
      ) : (
        <div className="viewers-content-area">
          {children}
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return ReactDOM.createPortal(containerContent, document.body);
  }

  return containerContent;
};

export default ViewersContainer;