// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { OptionComponent } from '@/components/question/OptionComponent';
import { StimulusRenderer } from '@/components/question/StimulusRenderer';
import { QuestionAssetRenderer } from '@/components/question/QuestionAssetRenderer';
import { QuestionNavigator } from '@/components/question/QuestionNavigator';
import { ExamSession, QuestionOption, Stimulus } from '@/types';

// Mock resolving base url resolution
vi.mock('@/lib/data/loader', () => {
  return {
    resolvePath: (p: string) => p,
    initializeDataStore: () => Promise.resolve(),
    getQuestionWithStimulus: () => null
  };
});

describe('OptionComponent Renderer Tests', () => {
  const mockOption: QuestionOption = {
    id: 'A',
    text: 'Opción de prueba'
  };

  it('renders options correctly with accessibility radio role', () => {
    const onClick = vi.fn();
    const { getByRole, getByText } = render(
      <OptionComponent
        option={mockOption}
        isSelected={false}
        onClick={onClick}
        index={0}
      />
    );

    const row = getByRole('radio');
    expect(row).toBeDefined();
    expect(row.getAttribute('aria-checked')).toBe('false');
    expect(getByText('A')).toBeDefined();
    expect(getByText('Opción de prueba')).toBeDefined();

    // Select triggers callback
    fireEvent.click(row);
    expect(onClick).toHaveBeenCalled();
  });

  it('handles keyboard space/enter accessibility', () => {
    const onClick = vi.fn();
    const { getByRole } = render(
      <OptionComponent
        option={mockOption}
        isSelected={true}
        onClick={onClick}
        index={0}
      />
    );

    const row = getByRole('radio');
    expect(row.getAttribute('aria-checked')).toBe('true');

    // Trigger Enter key
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onClick).toHaveBeenCalled();
  });
});

describe('StimulusRenderer Layouts', () => {
  it('renders standard textual paragraphs', () => {
    const stim: Stimulus = {
      id: 'S1',
      type: 'passage',
      title: 'El Sol',
      content: 'El Sol es una estrella.\nGira en el sistema solar.'
    };

    const { getByText } = render(<StimulusRenderer stimulus={stim} />);
    expect(getByText('El Sol')).toBeDefined();
    expect(getByText('El Sol es una estrella.')).toBeDefined();
    expect(getByText('Gira en el sistema solar.')).toBeDefined();
  });

  it('splits double reading passages correctly', () => {
    const stim: Stimulus = {
      id: 'S2',
      type: 'passage_pair',
      title: 'Lectura Cruzada',
      content: 'Texto 1: A es rojo. Texto 2: B es azul.'
    };

    const { getByText } = render(<StimulusRenderer stimulus={stim} />);
    expect(getByText('Lectura Cruzada')).toBeDefined();
    expect(getByText('Texto 1')).toBeDefined();
    expect(getByText('Texto 2')).toBeDefined();
  });
});

describe('QuestionAssetRenderer error safety', () => {
  it('displays graceful fallback when asset image fails to load', () => {
    const assets = [
      {
        src: '/non-existent-img.png',
        description: 'Venn diagram showing circles'
      }
    ];

    const { getByRole, getByText } = render(
      <QuestionAssetRenderer assets={assets} />
    );

    const img = getByRole('img');
    expect(img).toBeDefined();
    
    // Simulate image loading failure trigger
    fireEvent.error(img);

    expect(getByText('Recurso gráfico no disponible')).toBeDefined();
    expect(getByText('Venn diagram showing circles')).toBeDefined();
  });
});

describe('QuestionNavigator rendering states', () => {
  it('highlights current, answered, and flagged items in navigation grid', () => {
    const session: ExamSession = {
      id: 's-1',
      mode: 'practice',
      examTarget: 'prepatec',
      questionIds: ['Q1', 'Q2', 'Q3'],
      currentQuestionIndex: 1, // Current is index 1
      selectedAnswers: { Q1: 'A' }, // Answered
      flaggedQuestionIds: ['Q3'], // Flagged
      startTime: Date.now(),
      status: 'active',
      config: { mode: 'practice', examTarget: 'prepatec', questionCount: 3 }
    };

    const onJump = vi.fn();
    const { container } = render(
      <QuestionNavigator session={session} onJumpToQuestion={onJump} />
    );

    const btn1 = container.querySelector('button[aria-label*="pregunta 1"]') as HTMLButtonElement;
    const btn2 = container.querySelector('button[aria-label*="pregunta 2"]') as HTMLButtonElement;
    const btn3 = container.querySelector('button[aria-label*="pregunta 3"]') as HTMLButtonElement;

    expect(btn1).toBeTruthy();
    expect(btn2).toBeTruthy();
    expect(btn3).toBeTruthy();

    expect(btn1.className).toContain('answered');
    expect(btn2.className).toContain('current');
    expect(btn3.className).toContain('flagged');

    fireEvent.click(btn3);
    expect(onJump).toHaveBeenCalledWith(2);
  });
});
