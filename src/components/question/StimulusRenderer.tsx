import React, { useState } from 'react';
import { Stimulus } from '@/types';
import { resolvePath } from '@/lib/data/loader';

interface StimulusRendererProps {
  stimulus: Stimulus;
}

export const StimulusRenderer: React.FC<StimulusRendererProps> = ({ stimulus }) => {
  const [imgFailed, setImgFailed] = useState(false);

  // Graphical types render visual assets
  const graphicalTypes = ['figure', 'diagram', 'image'];
  const isGraphical = graphicalTypes.includes(stimulus.type);

  if (isGraphical) {
    // A graphical stimulus can have a top-level assets array or src/image_path fields.
    // In our banks, they are typically formatted as:
    // { id: '...', type: 'figure', assets: [ { src: '...', description: '...' } ] }
    const stimAny = stimulus as any;
    const firstAsset = Array.isArray(stimAny.assets) && stimAny.assets.length > 0
      ? stimAny.assets[0]
      : null;

    const src = firstAsset?.src || stimAny.src || stimAny.image_path || '';
    const description = firstAsset?.description || stimAny.description || 'Imagen de estímulo';

    if (!src && !description) {
      return (
        <div className="stimulus-card error">
          <p>Error: Estímulo gráfico sin recursos definidos.</p>
        </div>
      );
    }

    return (
      <div className="stimulus-card graphical">
        <h2 className="stimulus-title">{stimulus.title || 'Estímulo Visual'}</h2>
        {imgFailed || !src ? (
          <div className="asset-fallback-card" role="img" aria-label={description}>
            <div className="asset-fallback-icon">🎨</div>
            <div className="asset-fallback-title">Estímulo gráfico no disponible</div>
            <div className="asset-fallback-desc">{description}</div>
          </div>
        ) : (
          <div className="stimulus-image-wrapper">
            <img
              src={resolvePath(src)}
              alt={description}
              onError={() => setImgFailed(true)}
              className="stimulus-img"
            />
            <p className="stimulus-caption">{description}</p>
          </div>
        )}
      </div>
    );
  }

  // Textual types render text passages
  const isPassagePair = stimulus.type === 'passage_pair';

  if (isPassagePair) {
    // Clearly distinguish Text 1 and Text 2 by splitting on 'Texto 2:'
    const parts = stimulus.content.split(/Texto 2:/i);
    if (parts.length === 2) {
      const text1 = parts[0].replace(/Texto 1:/i, '').trim();
      const text2 = parts[1].trim();

      return (
        <div className="stimulus-card text-passage">
          <h2 className="stimulus-title">{stimulus.title || 'Lectura Doble'}</h2>
          <div className="passage-pair-layout">
            <div className="passage-column">
              <h3 className="column-header">Texto 1</h3>
              {text1.split('\n').map((p, i) => (
                <p key={i} className="passage-p">{p.trim()}</p>
              ))}
            </div>
            <div className="passage-column">
              <h3 className="column-header">Texto 2</h3>
              {text2.split('\n').map((p, i) => (
                <p key={i} className="passage-p">{p.trim()}</p>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }

  // Standard textual passage, draft, etc.
  const paragraphs = stimulus.content ? stimulus.content.split('\n') : [];

  return (
    <div className="stimulus-card text-passage">
      <h2 className="stimulus-title">{stimulus.title || 'Texto de Lectura'}</h2>
      <div className="passage-content">
        {paragraphs.map((p, i) => {
          const text = p.trim();
          if (!text) return null;
          return <p key={i} className="passage-p">{text}</p>;
        })}
      </div>
    </div>
  );
};
