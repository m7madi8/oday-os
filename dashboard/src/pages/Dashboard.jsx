import {
  CircleDollarSign,
  FileText,
  FolderPlus,
  ScrollText,
} from 'lucide-react';
import { QuickNotes } from '../components/QuickNotes';
import { ProjectSketches } from '../components/dashboard/ProjectSketches';

const ICON = 1.65;

const QUICK_ACTIONS = [
  { id: 'projects', label: 'مشروع جديد', hint: 'ابدأ عملًا جديدًا', icon: FolderPlus, primary: false },
  { id: 'invoices', label: 'فاتورة عميل', hint: 'إصدار فاتورة', icon: FileText, primary: true },
  { id: 'payments', label: 'تسجيل تحصيل', hint: 'دفعة واردة', icon: CircleDollarSign, primary: false },
  { id: 'checks', label: 'متابعة شيك', hint: 'موعد أو حالة', icon: ScrollText, primary: false },
];

export function Dashboard({ onNavigate }) {
  return (
    <div className="os-today min-w-0">
      {onNavigate ? (
        <section className="os-quick-actions os-today-actions" aria-label="إجراءات سريعة">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                className={`os-quick-action ${action.primary ? 'is-primary' : ''}`}
                onClick={() => onNavigate(action.id)}
              >
                <span className="os-quick-action__icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={ICON} />
                </span>
                <span className="os-quick-action__text">
                  <strong>{action.label}</strong>
                  <em>{action.hint}</em>
                </span>
              </button>
            );
          })}
        </section>
      ) : null}

      <div className="os-today-desk">
        <QuickNotes variant="desk" />
        <ProjectSketches onNavigate={onNavigate} />
      </div>
    </div>
  );
}
