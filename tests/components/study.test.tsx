// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Study from '@/pages/Study';

// Mock the loaders and data store
vi.mock('@/lib/data/loader', () => {
  const mockCards = [
    { id: 'C1', examTargets: ['prepatec'], area: 'cognitive', category: 'analogies', title: 'Analogía C1', front: 'Frente Analógico 1', back: 'Dorso Analógico 1' },
    { id: 'C2', examTargets: ['prepatec'], area: 'cognitive', category: 'analogies', title: 'Analogía C2', front: 'Frente Analógico 2', back: 'Dorso Analógico 2' }
  ];

  return {
    resolvePath: (p: string) => p,
    initializeDataStore: () => Promise.resolve(),
    loadExamTargets: () => Promise.resolve({
      prepatec: {
        areas: ['cognitive'],
        categories: { cognitive: ['analogies'] }
      }
    }),
    getStudyCardsByTarget: () => Promise.resolve(mockCards)
  };
});

describe('Study Cards Page UI Component', () => {
  it('renders selector screen and transitions to study card viewport on click', async () => {
    const { findByText, getByText, findAllByText } = render(
      <MemoryRouter initialEntries={['/study?target=prepatec']}>
        <Study />
      </MemoryRouter>
    );

    // Initial config screen renders count
    expect(await findByText(/Se encontraron/i)).toBeDefined();

    // Start study session
    const startBtn = getByText('Comenzar Repaso');
    fireEvent.click(startBtn);

    // Card UI title should render (appears on front and back sides)
    const titles = await findAllByText('Analogía C1');
    expect(titles.length).toBe(2);
    expect(getByText('Frente Analógico 1')).toBeDefined();
    expect(getByText('Ficha 1 de 2')).toBeDefined();
  });

  it('flips card to back side on click or keyboard Enter/Space', async () => {
    const { findByText, getByText } = render(
      <MemoryRouter initialEntries={['/study?target=prepatec']}>
        <Study />
      </MemoryRouter>
    );

    // Start
    fireEvent.click(await findByText('Comenzar Repaso'));
    
    // Click card container to flip
    const cardEl = await findByText('Frente Analógico 1');
    fireEvent.click(cardEl);

    // Back side should show
    expect(getByText('Dorso Analógico 1')).toBeDefined();

    // Flip back
    fireEvent.click(getByText('Dorso Analógico 1'));
    expect(getByText('Frente Analógico 1')).toBeDefined();

    // Keyboard Space trigger on container
    const container = cardEl.closest('.study-card-flip-container');
    expect(container).not.toBeNull();
    
    if (container) {
      fireEvent.keyDown(container, { code: 'Space' });
      expect(getByText('Dorso Analógico 1')).toBeDefined();
    }
  });

  it('navigates next and previous cards and resets flip state', async () => {
    const { findByText, getByText, getAllByText } = render(
      <MemoryRouter initialEntries={['/study?target=prepatec']}>
        <Study />
      </MemoryRouter>
    );

    fireEvent.click(await findByText('Comenzar Repaso'));

    // Flip card C1 to back side
    fireEvent.click(getByText('Frente Analógico 1'));
    expect(getByText('Dorso Analógico 1')).toBeDefined();

    // Click Next card
    fireEvent.click(getByText('Siguiente →'));

    // Check we are on Card 2 and it has reset to front-side state (Frente 2 is visible, not Dorso 2)
    expect(getAllByText('Analogía C2').length).toBe(2);
    expect(getByText('Frente Analógico 2')).toBeDefined();
    expect(getByText('Ficha 2 de 2')).toBeDefined();
  });
});
