import { Component } from 'react';
import { C, FONT_BODY, FONT_HEAD, RADIUS } from '../theme';

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ODAY OS]', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        className="min-h-dvh flex items-center justify-center p-6"
        style={{ background: C.paper, color: C.ink, fontFamily: FONT_BODY }}
        dir="rtl"
        lang="ar"
      >
        <div
          className="os-surface max-w-md w-full p-6 text-center"
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.md,
          }}
          role="alert"
        >
          <h1 className="text-xl mb-2" style={{ fontFamily: FONT_HEAD, fontWeight: 600 }}>
            حدث خلل في الواجهة
          </h1>
          <p className="text-base mb-5" style={{ color: C.inkSoft }}>
            تعذر عرض هذه الشاشة. أعد تحميل التطبيق للمتابعة.
          </p>
          <button
            type="button"
            className="no-drag inline-flex items-center justify-center px-4 py-2.5 text-base min-h-11"
            style={{ background: C.sidebar, color: C.sidebarTitle, borderRadius: RADIUS.md }}
            onClick={this.handleReload}
          >
            إعادة التحميل
          </button>
        </div>
      </div>
    );
  }
}
