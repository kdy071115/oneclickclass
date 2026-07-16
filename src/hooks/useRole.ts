import { useEffect, useState } from 'react';

export type UserRole = 'teacher' | 'student';

const key = 'oneclick.role';
const event = 'oneclick-role';

function readRole(): UserRole {
  return localStorage.getItem(key) === 'student' ? 'student' : 'teacher';
}

export function useRole() {
  const [role, setRoleState] = useState<UserRole>(readRole);

  useEffect(() => {
    const sync = () => setRoleState(readRole());
    window.addEventListener(storageEvent, sync);
    window.addEventListener(event, sync);
    return () => {
      window.removeEventListener(storageEvent, sync);
      window.removeEventListener(event, sync);
    };
  }, []);

  const setRole = (next: UserRole) => {
    localStorage.setItem(key, next);
    window.dispatchEvent(new Event(event));
  };

  return { role, setRole };
}

const storageEvent = 'storage';
