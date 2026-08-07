import type { ClassDraft } from '../types/class';

export const initialClassDraft: ClassDraft = {
  type: 'online',
  title: '',
  summary: '',
  description: '',
  thumbnail: '',
  thumbnailPosition: 'center',
  startDate: '',
  recruitEndDate: '',
  capacity: 30,
  payment: 'free',
  price: 0,
  questions: [],
  url: '',
  address: '',
  detailedAddress: '',
  instructorName: '',
  instructorBio: '',
  instructorImage: '',
  instructorLinks: [],
};

export const addressSuggestions = [
  '서울 마포구 연남로 12',
  '서울 마포구 양화로 45',
  '서울 성동구 왕십리로 115',
] as const;
