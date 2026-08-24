import React, { useState } from 'react';
import { QuestionAsset } from '@/types';
import { resolvePath } from '@/lib/data/loader';

interface QuestionAssetRendererProps {
  assets?: QuestionAsset[];
}

export const QuestionAssetRenderer: React.FC<QuestionAssetRendererProps> = ({ assets }) => {
  const [failedAssets, setFailedAssets] = useState<Record<number, boolean>>({});

  if (!assets || assets.length === 0) {
    return null;
  }

  const handleImageError = (index: number) => {
    setFailedAssets(prev => ({
      ...prev,
      [index]: true
    }));
  };

  return (
    <div className="question-assets-container">
      {assets.map((asset, idx) => {
        const isFailed = failedAssets[idx];
        const srcUrl = resolvePath(asset.src);

        return (
          <div key={idx} className="question-asset-item">
            {isFailed ? (
              <div className="asset-fallback-card" role="img" aria-label={asset.description}>
                <div className="asset-fallback-icon">⚠️</div>
                <div className="asset-fallback-title">Recurso gráfico no disponible</div>
                <div className="asset-fallback-desc">{asset.description}</div>
              </div>
            ) : (
              <div className="asset-image-wrapper">
                <img
                  src={srcUrl}
                  alt={asset.description}
                  onError={() => handleImageError(idx)}
                  className="question-asset-img"
                />
                <p className="asset-caption">{asset.description}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
