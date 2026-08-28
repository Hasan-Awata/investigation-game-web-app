import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './ViewersContainer.css';

interface ViewersContainerProps {
  evidence: { id: string | number; [key: string]: any };
  children: React.ReactNode;
}

const ViewersContainer: React.FC<ViewersContainerProps> = ({ children }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
            </svg>
          )}
        </button>
      </div>

      <div className="viewers-content-area">
        {children}
      </div>
    </div>
  );

  if (isFullscreen) {
    return ReactDOM.createPortal(containerContent, document.body);
  }

  return containerContent;
};

export default ViewersContainer;