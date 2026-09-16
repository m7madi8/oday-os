import { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import portrait from '../assets/owner-portrait-desktop.webp';
import { isDesktop } from '../lib/desktop';
import './LoginScreen.css';

const copy = {
  ar: {
    dir: 'rtl',
    ownerRole: 'المؤسس والشريك الرئيسي',
    userLabel: 'اسم المستخدم',
    userPlaceholder: 'oday',
    passwordLabel: 'كلمة المرور',
    forgot: 'نسيت كلمة المرور؟',
    forgotTitle: 'استعادة الدخول',
    forgotBody: 'تواصل مع إدارة المكتب لإعادة تعيين كلمة المرور.',
    submit: 'تسجيل الدخول',
    submitting: 'جارٍ التحقق…',
    signedIn: 'تم تسجيل الدخول',
    otpLabel: 'رمز التحقق',
    otpShow: 'لدي رمز تحقق',
    otpHide: 'إخفاء رمز التحقق',
    errorRequired: 'الرجاء إدخال اسم المستخدم وكلمة المرور.',
    errorServer: 'أدخل عنوان خادم Laravel.',
    errorAuth: 'تعذر تسجيل الدخول. تحقق من اسم المستخدم وكلمة المرور.',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    footer: 'خاص ومحمي',
    serverLabel: 'عنوان الخادم',
    serverPlaceholder: 'http://127.0.0.1:8000',
  },
  en: {
    dir: 'ltr',
    ownerRole: 'FOUNDING PRINCIPAL',
    userLabel: 'Username',
    userPlaceholder: 'oday',
    passwordLabel: 'Password',
    forgot: 'Forgot password?',
    forgotTitle: 'Password help',
    forgotBody: 'Contact the office administrator to reset your password.',
    submit: 'Sign in',
    submitting: 'Verifying…',
    signedIn: 'Signed in',
    otpLabel: 'Verification code',
    otpShow: 'I have a verification code',
    otpHide: 'Hide verification code',
    errorRequired: 'Enter your username and password.',
    errorServer: 'Enter the Laravel server address.',
    errorAuth: "Couldn't sign in. Check your username and password.",
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    footer: 'Private and secured',
    serverLabel: 'Server address',
    serverPlaceholder: 'http://127.0.0.1:8000',
  },
};

function resolveErrorMessage(err, t) {
  if (err?.code === 'SERVER') return t.errorServer;
  if (err?.message) return err.message;
  return t.errorAuth;
}

export default function LoginScreen({
  onLogin,
  onAuthenticated,
  initialLang = 'ar',
  serverUrl,
  onServerUrlChange,
  otp,
  onOtpChange,
  showOtp = false,
  onToggleOtp,
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [revealed, setRevealed] = useState(false);

  const lang = initialLang === 'en' ? 'en' : 'ar';
  const t = copy[lang];
  const ArrowIcon = t.dir === 'rtl' ? ArrowLeft : ArrowRight;
  const showServer = typeof onServerUrlChange === 'function';
  const desktop = isDesktop();

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setRevealed(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === 'loading' || status === 'success') return;

    if (!username.trim() || !password) {
      setStatus('error');
      setErrorMsg(t.errorRequired);
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    try {
      const payload = await onLogin(username.trim(), password);
      setStatus('success');
      await new Promise((resolve) => setTimeout(resolve, 720));
      await onAuthenticated?.(payload);
    } catch (err) {
      if (err?.code === 'OTP_REQUIRED') {
        setStatus('idle');
        return;
      }
      setStatus('error');
      setErrorMsg(resolveErrorMessage(err, t));
    }
  }

  return (
    <div
      className={`oe ${revealed ? 'is-revealed' : ''} ${desktop ? 'oe--app' : ''}`}
      dir={t.dir}
      lang={lang}
    >
      <div className="oe-grid">
        <div className="oe-visual">
          <img src={portrait} alt="" />
          <div className="oe-visual-caption">
            <p className="oe-visual-name">عدي أبو ضحى</p>
            <p className="oe-visual-role">{t.ownerRole}</p>
          </div>
        </div>

        <div className="oe-panel">
          <div className="oe-panel-inner">
            <div className="oe-top-row">
              <span className="oe-brand">ODAY OS</span>
            </div>

            <form className="oe-form" onSubmit={handleSubmit} noValidate>
              {showServer ? (
                <div className="oe-field">
                  <label htmlFor="oe-server">{t.serverLabel}</label>
                  <div className="oe-input-wrap">
                    <input
                      id="oe-server"
                      type="url"
                      inputMode="url"
                      dir="ltr"
                      autoComplete="off"
                      placeholder={t.serverPlaceholder}
                      value={serverUrl}
                      onChange={(e) => onServerUrlChange(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              <div className="oe-field">
                <label htmlFor="oe-user">{t.userLabel}</label>
                <div className="oe-input-wrap">
                  <input
                    id="oe-user"
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={t.userPlaceholder}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    aria-invalid={status === 'error'}
                    required
                  />
                </div>
              </div>

              <div className="oe-field">
                <div className="oe-field-row">
                  <label htmlFor="oe-password">{t.passwordLabel}</label>
                  <button
                    type="button"
                    className="oe-forgot"
                    onClick={() => window.alert(`${t.forgotTitle}\n${t.forgotBody}`)}
                  >
                    {t.forgot}
                  </button>
                </div>
                <div className="oe-input-wrap has-toggle">
                  <input
                    id="oe-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={status === 'error'}
                    required
                  />
                  <button
                    type="button"
                    className="oe-toggle-visibility"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? t.hidePassword : t.showPassword}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {showOtp ? (
                <div className="oe-field">
                  <label htmlFor="oe-otp">{t.otpLabel}</label>
                  <div className="oe-input-wrap">
                    <input
                      id="oe-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => onOtpChange?.(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              <div className={`oe-error ${status === 'error' ? 'is-visible' : ''}`} role="alert" aria-live="polite">
                {status === 'error' ? errorMsg : ''}
              </div>

              <button
                type="submit"
                className={`oe-submit ${status === 'success' ? 'is-success' : ''}`}
                disabled={status === 'loading' || status === 'success'}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="oe-spinner" size={16} />
                    <span>{t.submitting}</span>
                  </>
                ) : null}
                {status === 'success' ? (
                  <>
                    <Check size={16} />
                    <span>{t.signedIn}</span>
                  </>
                ) : null}
                {status !== 'loading' && status !== 'success' ? (
                  <>
                    <span>{t.submit}</span>
                    <ArrowIcon size={16} />
                  </>
                ) : null}
              </button>

              {onToggleOtp ? (
                <button type="button" className="oe-otp-toggle" onClick={onToggleOtp}>
                  {showOtp ? t.otpHide : t.otpShow}
                </button>
              ) : null}
            </form>

            <p className="oe-footer">{t.footer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
