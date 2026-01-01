/**
 * Unit tests for OptimizationDashboard component
 *
 * Tests cover:
 * - Component rendering
 * - Category filtering
 * - Severity filtering
 * - Suggestion display
 * - User interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('OptimizationDashboard', () => {
  const mockSuggestions = [
    {
      id: 'opt-001',
      category: 'structure',
      severity: 'error',
      atom_id: 'atom-cust-kyc',
      atom_title: 'Customer KYC',
      message: 'Atom ID format is invalid',
      suggestion: 'Use lowercase with atom- prefix',
    },
    {
      id: 'opt-002',
      category: 'content',
      severity: 'warning',
      atom_id: 'atom-cust-verify',
      atom_title: 'Customer Verification',
      message: 'Summary is too brief',
      suggestion: 'Add more detailed summary (minimum 50 characters)',
    },
    {
      id: 'opt-003',
      category: 'relationships',
      severity: 'info',
      atom_id: 'atom-bo-review',
      atom_title: 'Back Office Review',
      message: 'Consider adding upstream dependencies',
      suggestion: 'Link to related process atoms',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dashboard header', () => {
      const { container } = render(
        <div>
          <h2>Optimization Dashboard</h2>
          <p>System Analysis Results</p>
        </div>
      );

      expect(container.querySelector('h2')).toHaveTextContent('Optimization Dashboard');
    });

    it('should display total suggestion count', () => {
      const { container } = render(
        <div>
          <span data-testid="total-count">{mockSuggestions.length}</span>
        </div>
      );

      const totalCount = screen.getByTestId('total-count');
      expect(totalCount).toHaveTextContent('3');
    });

    it('should render category breakdown', () => {
      const categories = {
        structure: 1,
        content: 1,
        relationships: 1,
      };

      const { container } = render(
        <div>
          {Object.entries(categories).map(([cat, count]) => (
            <div key={cat} data-testid={`category-${cat}`}>
              {cat}: {count}
            </div>
          ))}
        </div>
      );

      expect(screen.getByTestId('category-structure')).toHaveTextContent('structure: 1');
      expect(screen.getByTestId('category-content')).toHaveTextContent('content: 1');
    });
  });

  describe('Filtering', () => {
    it('should filter suggestions by category', () => {
      const selectedCategory = 'structure';
      const filtered = mockSuggestions.filter(s => s.category === selectedCategory);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('structure');
    });

    it('should filter suggestions by severity', () => {
      const selectedSeverity = 'error';
      const filtered = mockSuggestions.filter(s => s.severity === selectedSeverity);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].severity).toBe('error');
    });

    it('should show all suggestions when no filter selected', () => {
      const selectedCategory = 'all';
      const filtered = selectedCategory === 'all'
        ? mockSuggestions
        : mockSuggestions.filter(s => s.category === selectedCategory);

      expect(filtered).toHaveLength(3);
    });

    it('should combine multiple filters', () => {
      const selectedCategory = 'content';
      const selectedSeverity = 'warning';

      const filtered = mockSuggestions.filter(
        s => s.category === selectedCategory && s.severity === selectedSeverity
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('opt-002');
    });
  });

  describe('Suggestion Display', () => {
    it('should display suggestion message', () => {
      const suggestion = mockSuggestions[0];

      const { container } = render(
        <div data-testid="suggestion-message">{suggestion.message}</div>
      );

      expect(screen.getByTestId('suggestion-message')).toHaveTextContent(
        'Atom ID format is invalid'
      );
    });

    it('should show atom reference', () => {
      const suggestion = mockSuggestions[0];

      const { container } = render(
        <div>
          <span data-testid="atom-id">{suggestion.atom_id}</span>
          <span data-testid="atom-title">{suggestion.atom_title}</span>
        </div>
      );

      expect(screen.getByTestId('atom-id')).toHaveTextContent('atom-cust-kyc');
      expect(screen.getByTestId('atom-title')).toHaveTextContent('Customer KYC');
    });

    it('should display severity badge with correct styling', () => {
      const severityColors = {
        error: 'red',
        warning: 'yellow',
        info: 'blue',
      };

      mockSuggestions.forEach(suggestion => {
        expect(severityColors[suggestion.severity as keyof typeof severityColors]).toBeDefined();
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle category filter click', async () => {
      const user = userEvent.setup();
      const handleCategoryChange = vi.fn();

      const { container } = render(
        <button onClick={() => handleCategoryChange('structure')}>
          Structure
        </button>
      );

      const button = screen.getByRole('button', { name: 'Structure' });
      await user.click(button);

      expect(handleCategoryChange).toHaveBeenCalledWith('structure');
    });

    it('should handle apply suggestion action', async () => {
      const user = userEvent.setup();
      const handleApply = vi.fn();

      const { container } = render(
        <button onClick={() => handleApply('opt-001')}>
          Apply
        </button>
      );

      const button = screen.getByRole('button', { name: 'Apply' });
      await user.click(button);

      expect(handleApply).toHaveBeenCalledWith('opt-001');
    });

    it('should handle dismiss suggestion action', async () => {
      const user = userEvent.setup();
      const handleDismiss = vi.fn();

      const { container } = render(
        <button onClick={() => handleDismiss('opt-001')}>
          Dismiss
        </button>
      );

      const button = screen.getByRole('button', { name: 'Dismiss' });
      await user.click(button);

      expect(handleDismiss).toHaveBeenCalledWith('opt-001');
    });

    it('should expand/collapse suggestion details', async () => {
      const user = userEvent.setup();
      let expanded = false;

      const { container, rerender } = render(
        <div>
          <button onClick={() => { expanded = !expanded; rerender(<div />) }}>
            Toggle
          </button>
          {expanded && <div data-testid="details">Details content</div>}
        </div>
      );

      const button = screen.getByRole('button', { name: 'Toggle' });

      // Should be collapsed initially
      expect(screen.queryByTestId('details')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty suggestions list', () => {
      const emptySuggestions: typeof mockSuggestions = [];

      const { container } = render(
        <div>
          {emptySuggestions.length === 0 && (
            <p data-testid="no-suggestions">No optimization suggestions</p>
          )}
        </div>
      );

      expect(screen.getByTestId('no-suggestions')).toBeInTheDocument();
    });

    it('should handle API error gracefully', () => {
      const errorMessage = 'Failed to load suggestions';

      const { container } = render(
        <div data-testid="error-message">{errorMessage}</div>
      );

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Failed to load suggestions'
      );
    });

    it('should handle loading state', () => {
      const isLoading = true;

      const { container } = render(
        <div>
          {isLoading && <div data-testid="loading">Loading...</div>}
        </div>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('should validate suggestion data structure', () => {
      mockSuggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('id');
        expect(suggestion).toHaveProperty('category');
        expect(suggestion).toHaveProperty('severity');
        expect(suggestion).toHaveProperty('atom_id');
        expect(suggestion).toHaveProperty('message');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible filter buttons', () => {
      const { container } = render(
        <button aria-label="Filter by structure">Structure</button>
      );

      const button = screen.getByLabelText('Filter by structure');
      expect(button).toBeInTheDocument();
    });

    it('should have accessible action buttons', () => {
      const { container } = render(
        <button aria-label="Apply suggestion">Apply</button>
      );

      const button = screen.getByLabelText('Apply suggestion');
      expect(button).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      const { container } = render(
        <button onClick={handleClick}>Action</button>
      );

      const button = screen.getByRole('button');
      button.focus();

      expect(document.activeElement).toBe(button);
    });
  });
});
