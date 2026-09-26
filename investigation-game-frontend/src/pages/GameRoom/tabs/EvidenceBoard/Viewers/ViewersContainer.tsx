import React, { useState, useRef, useLayoutEffect } from 'react';
import { useEvidenceContext } from '../EvidenceContext';
import './ViewersContainer.css';

interface ViewersContainerProps {
  children: React.ReactNode;
}

const ViewersContainer: React.FC<ViewersContainerProps> = ({ children }) => {
  // Grab the fullscreen state directly from the modal wrapper via Context
  const { isFullscreen } = useEvidenceContext(); 
  
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Reset zoom and pan when entering or exiting fullscreen
  useLayoutEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [isFullscreen]);

  useLayoutEffect(() => {
    if (!contentRef.current || !wrapperRef.current) return;
    const child = contentRef.current.firstElementChild as HTMLElement;
    if (!child) return;

    const calculateFit = () => {
      const childWidth = child.offsetWidth;
      const childHeight = child.offsetHeight;
      if (childWidth === 0 || childHeight === 0) return;

      // Calculate available space depending on the current mode
      const availableW = isFullscreen ? window.innerWidth - 80 : wrapperRef.current!.clientWidth - 40;
      const availableH = isFullscreen ? window.innerHeight - 80 : wrapperRef.current!.clientHeight - 40;

      const fitX = availableW / childWidth;
      const fitY = availableH / childHeight;

      setBaseScale(Math.min(fitX, fitY));
    };

    const observer = new ResizeObserver(calculateFit);
    observer.observe(child);
    observer.observe(wrapperRef.current);
    window.addEventListener('resize', calculateFit);
    
    calculateFit();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calculateFit);
    };
  }, [isFullscreen, children]);

  const clampPosition = (targetX: number, targetY: number, currentZoom: number) => {
    if (!contentRef.current) return { x: targetX, y: targetY };
    const child = contentRef.current.firstElementChild as HTMLElement;
    if (!child) return { x: targetX, y: targetY };

    const totalScale = baseScale * currentZoom;
    const visualWidth = child.offsetWidth * totalScale;
    const visualHeight = child.offsetHeight * totalScale;

    // Use window dimensions if fullscreen, otherwise use the wrapper's dimensions
    const boundW = isFullscreen ? window.innerWidth : wrapperRef.current!.clientWidth;
    const boundH = isFullscreen ? window.innerHeight : wrapperRef.current!.clientHeight;

    const maxX = Math.max(0, (visualWidth - boundW) / 2);
    const maxY = Math.max(0, (visualHeight - boundH) / 2);

    return {
      x: Math.min(Math.max(targetX, -maxX), maxX),
      y: Math.min(Math.max(targetY, -maxY), maxY)
    };
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isFullscreen) return;
    
    const zoomSensitivity = 0.005;
    const delta = e.deltaY * -zoomSensitivity;
    const newZoom = Math.min(Math.max(1, zoom + delta), 5);

    setZoom(newZoom);
    if (newZoom === 1) {
      setPosition({ x: 0, y: 0 });
    } else {
      setPosition(prev => clampPosition(prev.x, prev.y, newZoom));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isFullscreen) return;

    if (zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isFullscreen) return;

    if (isDragging && zoom > 1) {
      const deltaX = e.clientX - lastMouse.x;
      const deltaY = e.clientY - lastMouse.y;

      setPosition(prev => clampPosition(prev.x + deltaX, prev.y + deltaY, zoom));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (!isFullscreen) return;
    setIsDragging(false);
  };

  return (
    <div 
      ref={wrapperRef}
      className={`viewers-container-wrapper ${isFullscreen ? 'fullscreen-mode' : ''}`}
    >
      <div
        className={`viewers-zoom-overlay ${isFullscreen ? 'zoom-enabled' : 'native-scroll'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: !isFullscreen ? 'auto' : (isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'auto')) }}
      >
        <div
          ref={contentRef}
          className={`viewers-content-area ${isFullscreen ? 'fullscreen-scaled' : ''}`}
          style={isFullscreen ? {
            transform: `translate(${position.x}px, ${position.y}px) scale(${baseScale * zoom})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            transformOrigin: 'center center'
          } : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default ViewersContainer;