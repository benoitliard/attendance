import Cookies from 'js-cookie';
import { api } from '../api';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    (Cookies.get as jest.Mock).mockClear();
    (Cookies.set as jest.Mock).mockClear();
    (Cookies.remove as jest.Mock).mockClear();
  });

  describe('request', () => {
    it('makes GET request by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await api.getClasses();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/classes'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('includes auth token when available', async () => {
      (Cookies.get as jest.Mock).mockReturnValue('test-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ classes: [] }),
      });

      await api.getClasses();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      await expect(api.getClasses()).rejects.toThrow('Unauthorized');
    });
  });

  describe('login', () => {
    it('stores token in cookie on success', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@test.com', name: 'Test' },
        token: 'jwt-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.login('test@test.com', 'password');

      expect(Cookies.set).toHaveBeenCalledWith('token', 'jwt-token', { expires: 7 });
      expect(result.token).toBe('jwt-token');
    });
  });

  describe('register', () => {
    it('stores token in cookie on success', async () => {
      const mockResponse = {
        user: { id: '1', email: 'test@test.com', name: 'Test' },
        token: 'jwt-token',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await api.register('test@test.com', 'password', 'Test');

      expect(Cookies.set).toHaveBeenCalledWith('token', 'jwt-token', { expires: 7 });
    });
  });

  describe('logout', () => {
    it('removes token from cookies', () => {
      api.logout();
      expect(Cookies.remove).toHaveBeenCalledWith('token');
    });
  });

  describe('getStudents', () => {
    it('includes classId query parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ students: [] }),
      });

      await api.getStudents('class-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('classId=class-123'),
        expect.any(Object)
      );
    });

    it('includes search query parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ students: [] }),
      });

      await api.getStudents(undefined, 'john');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=john'),
        expect.any(Object)
      );
    });
  });

  describe('markAttendance', () => {
    it('sends correct payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ attendance: {} }),
      });

      await api.markAttendance('session-1', 'student-1', 'PRESENT', 'Notes');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/attendance/mark'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            sessionId: 'session-1',
            studentId: 'student-1',
            status: 'PRESENT',
            notes: 'Notes',
          }),
        })
      );
    });
  });

  describe('quickAttendance', () => {
    it('sends bulk attendance with topic', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ session: {}, attendances: [] }),
      });

      await api.quickAttendance(
        'class-1',
        [{ studentId: 's1', status: 'PRESENT' }],
        'Math class'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/attendance/quick'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Math class'),
        })
      );
    });
  });
});
