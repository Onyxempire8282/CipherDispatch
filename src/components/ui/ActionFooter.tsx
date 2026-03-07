import "./action-footer.css";

interface ActionFooterProps {
  title: string;
  sub?: string;
  children: React.ReactNode;
}

export default function ActionFooter({ title, sub, children }: ActionFooterProps) {
  return (
    <div className="action-footer">
      <div>
        <div className="action-footer__title">{title}</div>
        {sub && <div className="action-footer__sub">{sub}</div>}
      </div>
      <div className="action-footer__buttons">{children}</div>
    </div>
  );
}
