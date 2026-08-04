export type DisplayCurriculumItem = {
  lessonId: string;
  sectionId?: string;
  sectionTitle?: string;
  title: string;
  description?: string;
  durationText: string;
};

export type DisplayCurriculumGroup<T extends DisplayCurriculumItem = DisplayCurriculumItem> = {
  key: string;
  title: string;
  items: T[];
  totalMinutes: number;
};

const parseDurationMinutes = (durationText: string) => {
  const hours = durationText.match(/(\d+)\s*시간/)?.[1];
  const minutes = durationText.match(/(\d+)\s*분/)?.[1];
  if (hours || minutes) return Number(hours || 0) * 60 + Number(minutes || 0);
  return Number(durationText.match(/\d+/)?.[0] || 0);
};

export const formatSectionSummary = (count: number, minutes: number) => {
  if (!minutes) return `${count}개 차시`;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${count}개 차시 · ${hours}시간${remainder ? ` ${remainder}분` : ''}`;
  }
  return `${count}개 차시 · ${minutes}분`;
};

export const groupCurriculumItems = <T extends DisplayCurriculumItem>(items: T[]) => {
  const groups = items.reduce<DisplayCurriculumGroup<T>[]>((result, item, index) => {
    const title = item.sectionTitle || '커리큘럼';
    const key = item.sectionId || item.sectionTitle || `default-${index}`;
    const previous = result[result.length - 1];

    if (previous && previous.key === key) {
      previous.items.push(item);
      previous.totalMinutes += parseDurationMinutes(item.durationText);
      return result;
    }

    result.push({
      key,
      title,
      items: [item],
      totalMinutes: parseDurationMinutes(item.durationText),
    });
    return result;
  }, []);

  return groups.map((group, index) => ({
    ...group,
    title:
      !group.title.trim() || group.title.trim() === '커리큘럼'
        ? index === 0
          ? '전체 과정'
          : `섹션 ${index + 1}`
        : group.title,
  }));
};
