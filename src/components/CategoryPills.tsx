interface CategoryPillsProps {
  categories: string[];
  activeCategory: string;
  onSelect: (cat: string) => void;
}

export default function CategoryPills({ categories, activeCategory, onSelect }: CategoryPillsProps) {
  return (
    <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px', scrollbarWidth: 'none' }}>
      <button 
        style={{
          padding: '8px 16px',
          borderRadius: '999px',
          border: '1px solid var(--glass-border)',
          background: activeCategory === '' ? 'var(--accent-purple)' : 'var(--glass-bg)',
          color: '#fff',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          transition: 'var(--transition)'
        }}
        onClick={() => onSelect('')}
      >
        All Products
      </button>
      {categories.map(cat => (
        <button
          key={cat}
          style={{
            padding: '8px 16px',
            borderRadius: '999px',
            border: '1px solid var(--glass-border)',
            background: activeCategory === cat ? 'var(--accent-purple)' : 'var(--glass-bg)',
            color: '#fff',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
          onClick={() => onSelect(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
