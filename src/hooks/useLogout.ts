import { useNavigate } from 'react-router-dom';
import { authService } from '../api/services';
import { clearSession } from '../auth/session';

export function useLogout() {
  const navigate = useNavigate();

  return async () => {
    try {
      await authService.logout();
    } catch {
      // The local session must still be cleared when the server is unavailable.
    }
    clearSession();
    navigate('/login', { replace: true });
  };
}
