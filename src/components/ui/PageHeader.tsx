import "./page-header.css";

interface PageHeaderProps {
  label: string;
  title: string;
  sub?: string;
  compact?: boolean;
  aside?: React.ReactNode;
}

export default function PageHeader({
  label,
  title,
  sub,
  compact = false,
  aside,
}: PageHeaderProps) {
  return (
    <div className={`page-header${compact ? " page-header--compact" : ""}`}>
      <div className="page-header__inner">
        <div>
          <div className="page-header__label">{label}</div>
          <div className="page-header__title">{title}</div>
          {sub && <div className="page-header__sub">{sub}</div>}
        </div>
        {aside && <div className="page-header__aside">{aside}</div>}
      </div>
    </div>
  );
}
