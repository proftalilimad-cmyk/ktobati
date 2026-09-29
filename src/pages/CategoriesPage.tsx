import { usePublicLibrary } from '../store/useLibrary';
import CategoryCard from '../components/CategoryCard';
import Breadcrumb from '../components/Breadcrumb';
import Reveal from '../components/Reveal';
import { useSeo } from '../hooks/useSeo';

export default function CategoriesPage() {
  const { categories } = usePublicLibrary();
  const groups = [...new Set(categories.map((c) => c.group))];
  useSeo({
    title: 'تصنيفات الكتب — تصفّح المكتبة حسب المجال',
    description: 'استكشف جميع تصنيفات المكتبة: الأدب والروايات، الفلسفة والفكر، العلوم والحياة، والمجتمع.',
  });

  return (
    <div className="container page">
      <Breadcrumb items={[{ label: 'التصنيفات' }]} />
      <Reveal>
        <div className="page-head">
          <div>
            <h1 className="page-title">📚 تصنيفات الكتب</h1>
            <p className="muted">تصفّح المكتبة حسب المجال الذي يهمّك</p>
          </div>
        </div>
      </Reveal>

      {groups.map((g) => (
        <section key={g} className="cat-group">
          <Reveal>
            <h2 className="cat-group-title">{g}</h2>
          </Reveal>
          <div className="cat-grid">
            {categories
              .filter((c) => c.group === g)
              .map((c, i) => (
                <Reveal key={c.slug} delay={Math.min(i * 50, 250)}>
                  <CategoryCard category={c} large />
                </Reveal>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
