import React from 'react';
import styles from './CoordinatePicker.module.css';

export interface CoordinateMarker {
  id: string | number;
  x: string | number;
  y: string | number;
  label?: string;
  isTargeting?: boolean;
}

interface CoordinatePickerProps {
  imageUrl: string;
  isTargeting: boolean;
  targetingBannerText: string;
  cancelTargetBtnText: string;
  onCancelTargeting: () => void;
  onCoordinateSelect: (x: string, y: string) => void;
  markers: CoordinateMarker[];
}

export const CoordinatePicker = ({
  imageUrl, isTargeting, targetingBannerText, cancelTargetBtnText,
  onCancelTargeting, onCoordinateSelect, markers
}: CoordinatePickerProps) => {

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isTargeting) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const yPercent = (((e.clientY - rect.top) / rect.height) * 100).toFixed(1);
    onCoordinateSelect(xPercent, yPercent);
  };

  return (
    <div className={styles.container}>
      {isTargeting && (
        <div className={styles.banner}>
          <span>{targetingBannerText}</span>
          <button type="button" className={styles.cancelBtn} onClick={onCancelTargeting}>
            {cancelTargetBtnText}
          </button>
        </div>
      )}

      <div className={`${styles.imageWrapper} ${isTargeting ? styles.mappingActive : ''}`} onClick={handleImageClick}>
        <img src={imageUrl} alt="Map Preview" />

        {markers.map((marker) => (
          <div
            key={marker.id}
            className={`${styles.hoverZone} ${marker.isTargeting ? styles.selected : styles.investigated}`}
            style={{ top: `${marker.y}%`, left: `${marker.x}%` }}
          >
            <div className={styles.crosshair}></div>
            {marker.label && (
              <div className={styles.tooltip}>{marker.label}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
