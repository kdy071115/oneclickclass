import type { OneClickLearnRoom, OneClickLesson } from '../api/oneclick';

export const hasLessonContent = (lesson: OneClickLesson) =>
  Boolean(lesson.contentUrl || lesson.resources?.length);

export const isPlayableLesson = (lesson: OneClickLesson) =>
  !lesson.locked && lesson.playable && hasLessonContent(lesson);

export const getResumeLessonIndex = (room: OneClickLearnRoom) => {
  const savedIndex = room.resumeLessonId
    ? room.lessons.findIndex(
        (lesson) => lesson.lessonId === room.resumeLessonId && isPlayableLesson(lesson),
      )
    : -1;
  if (savedIndex >= 0) return savedIndex;

  const legacyIndex = Number.parseInt(room.lastPosition, 10) - 1;
  if (legacyIndex >= 0 && isPlayableLesson(room.lessons[legacyIndex])) return legacyIndex;

  const inProgressIndex = room.lessons.findIndex(
    (lesson) => isPlayableLesson(lesson) && !lesson.completed && (lesson.currentSeconds ?? 0) > 0,
  );
  if (inProgressIndex >= 0) return inProgressIndex;

  const incompleteIndex = room.lessons.findIndex(
    (lesson) => isPlayableLesson(lesson) && !lesson.completed,
  );
  if (incompleteIndex >= 0) return incompleteIndex;

  return room.lessons.findIndex(isPlayableLesson);
};
