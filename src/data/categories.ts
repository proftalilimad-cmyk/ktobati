import type { Category } from './types';

/**
 * Only categories that actually exist in the source data are listed.
 * Slugs match the real source library taxonomy.
 */
export const categories: Category[] = [
  {
    slug: 'novels',
    name: 'روايات',
    icon: '📖',
    description: 'روايات عربية وعالمية مترجمة تأخذك إلى عوالم لا تنتهي.',
    group: 'الأدب والروايات',
  },
  {
    slug: 'literature',
    name: 'أدب',
    icon: '✍️',
    description: 'نصوص أدبية ومقالات ونثر يثري الذائقة ويوسّع الأفق.',
    group: 'الأدب والروايات',
  },
  {
    slug: 'plays',
    name: 'مسرحيات',
    icon: '🎭',
    description: 'أعمال مسرحية تمزج الدراما بالفكر والسخرية.',
    group: 'الأدب والروايات',
  },
  {
    slug: 'literary.criticism',
    name: 'نقد أدبي',
    icon: '📝',
    description: 'دراسات ومقاربات نقدية في الأدب والفنون السردية.',
    group: 'الأدب والروايات',
  },
  {
    slug: 'philosophy',
    name: 'فلسفة',
    icon: '🧠',
    description: 'أمهات الفكر الفلسفي وأحدث المقاربات المعاصرة.',
    group: 'الفكر والمعرفة',
  },
  {
    slug: 'history',
    name: 'تاريخ',
    icon: '🏛️',
    description: 'قراءات في التاريخ والحضارات والثورات الكبرى.',
    group: 'الفكر والمعرفة',
  },
  {
    slug: 'social.sciences',
    name: 'علوم اجتماعية',
    icon: '🌐',
    description: 'دراسات في المجتمع والإنسان والظواهر الاجتماعية.',
    group: 'الفكر والمعرفة',
  },
  {
    slug: 'psychology',
    name: 'علم نفس',
    icon: '🧩',
    description: 'كتب في النفس البشرية والسعادة والتطور الذاتي.',
    group: 'العلوم والحياة',
  },
  {
    slug: 'science',
    name: 'علوم',
    icon: '🔬',
    description: 'مقدمات علمية مبسّطة في الفيزياء والفلك والطبيعة.',
    group: 'العلوم والحياة',
  },
  {
    slug: 'arts',
    name: 'فنون',
    icon: '🎨',
    description: 'كتب في الفن التشكيلي والجمال والإبداع البصري.',
    group: 'العلوم والحياة',
  },
  {
    slug: 'biographies',
    name: 'سير الأعلام',
    icon: '👤',
    description: 'سير ذاتية وتراجم لأعلام الفكر والفن والعلم.',
    group: 'المجتمع',
  },
  {
    slug: 'travel.literature',
    name: 'أدب رحلات',
    icon: '🧭',
    description: 'مشاهدات ورحلات توثّق لقاء الثقافات والحضارات.',
    group: 'المجتمع',
  },
];

export const categoryBySlug = (slug: string): Category | undefined =>
  categories.find((c) => c.slug === slug);
