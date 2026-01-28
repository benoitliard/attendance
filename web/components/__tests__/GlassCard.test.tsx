import { render, screen, fireEvent } from '@testing-library/react';
import { GlassCard } from '../ui/GlassCard';

describe('GlassCard', () => {
  it('renders children correctly', () => {
    render(
      <GlassCard>
        <p>Test content</p>
      </GlassCard>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies base glass-card class', () => {
    const { container } = render(
      <GlassCard>Content</GlassCard>
    );

    expect(container.firstChild).toHaveClass('glass-card');
  });

  it('applies custom className', () => {
    const { container } = render(
      <GlassCard className="custom-class">Content</GlassCard>
    );

    expect(container.firstChild).toHaveClass('glass-card');
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies hover styles when hover prop is true', () => {
    const { container } = render(
      <GlassCard hover>Content</GlassCard>
    );

    expect(container.firstChild).toHaveClass('cursor-pointer');
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();

    render(
      <GlassCard onClick={handleClick}>Clickable</GlassCard>
    );

    fireEvent.click(screen.getByText('Clickable'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not have cursor-pointer without hover prop', () => {
    const { container } = render(
      <GlassCard>Content</GlassCard>
    );

    expect(container.firstChild).not.toHaveClass('cursor-pointer');
  });
});
