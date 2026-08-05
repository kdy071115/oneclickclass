export function getClassTiming(time: string, now = new Date()) {
  const [hours, minutes] = time.split(':').map(Number);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return { canStartAttendance: false, label: '시작 시간 확인 필요' };
  }

  const startsAt = new Date(now);
  startsAt.setHours(hours, minutes, 0, 0);
  const minutesUntilStart = Math.ceil((startsAt.getTime() - now.getTime()) / 60_000);

  if (minutesUntilStart <= 0) {
    return { canStartAttendance: true, label: '수업 시작 시간 도달' };
  }

  const remainingHours = Math.floor(minutesUntilStart / 60);
  const remainingMinutes = minutesUntilStart % 60;
  const label = remainingHours
    ? `수업까지 ${remainingHours}시간${remainingMinutes ? ` ${remainingMinutes}분` : ''}`
    : `수업까지 ${remainingMinutes}분`;

  return { canStartAttendance: false, label };
}
