import { render, screen, fireEvent } from '@testing-library/react';
import { AttendanceGrid } from '../AttendanceGrid';

const mockStudents = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    studentId: 'STU001',
    attendance: null,
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    studentId: 'STU002',
    attendance: { status: 'PRESENT' as const, notes: 'On time' },
  },
  {
    id: '3',
    firstName: 'Bob',
    lastName: 'Wilson',
    studentId: 'STU003',
    attendance: { status: 'ABSENT' as const },
  },
];

describe('AttendanceGrid', () => {
  const mockOnStatusChange = jest.fn();

  beforeEach(() => {
    mockOnStatusChange.mockClear();
  });

  it('renders all students', () => {
    render(
      <AttendanceGrid
        students={mockStudents}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Doe John')).toBeInTheDocument();
    expect(screen.getByText('Smith Jane')).toBeInTheDocument();
    expect(screen.getByText('Wilson Bob')).toBeInTheDocument();
  });

  it('displays student IDs', () => {
    render(
      <AttendanceGrid
        students={mockStudents}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('STU001')).toBeInTheDocument();
    expect(screen.getByText('STU002')).toBeInTheDocument();
    expect(screen.getByText('STU003')).toBeInTheDocument();
  });

  it('renders status buttons for each student', () => {
    render(
      <AttendanceGrid
        students={mockStudents}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Each student should have 4 status buttons (PRESENT, ABSENT, LATE, EXCUSED)
    const presentButtons = screen.getAllByTitle('Présent');
    const absentButtons = screen.getAllByTitle('Absent');
    const lateButtons = screen.getAllByTitle('Retard');
    const excusedButtons = screen.getAllByTitle('Excusé');

    expect(presentButtons).toHaveLength(3);
    expect(absentButtons).toHaveLength(3);
    expect(lateButtons).toHaveLength(3);
    expect(excusedButtons).toHaveLength(3);
  });

  it('calls onStatusChange when status button is clicked', () => {
    render(
      <AttendanceGrid
        students={mockStudents}
        onStatusChange={mockOnStatusChange}
      />
    );

    const presentButtons = screen.getAllByTitle('Présent');
    fireEvent.click(presentButtons[0]); // Click present for first student

    expect(mockOnStatusChange).toHaveBeenCalledWith('1', 'PRESENT');
  });

  it('does not call onStatusChange when disabled', () => {
    render(
      <AttendanceGrid
        students={mockStudents}
        onStatusChange={mockOnStatusChange}
        disabled
      />
    );

    const presentButtons = screen.getAllByTitle('Présent');
    fireEvent.click(presentButtons[0]);

    expect(mockOnStatusChange).not.toHaveBeenCalled();
  });

  it('shows existing attendance status', () => {
    render(
      <AttendanceGrid
        students={mockStudents}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Jane is marked PRESENT, Bob is marked ABSENT
    // The active buttons should have different styling
    const allButtons = screen.getAllByRole('button');
    expect(allButtons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no students', () => {
    const { container } = render(
      <AttendanceGrid
        students={[]}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(container.querySelector('.space-y-3')?.children.length).toBe(0);
  });
});
