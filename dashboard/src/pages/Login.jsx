import { useState } from 'react';
import { C } from '../theme';
import { isDesktop } from '../lib/desktop';
import { getRuntimeServerUrl, persistServerUrl } from '../lib/env';
import { precheckLogin } from '../lib/api/auth';
import { useAuth } from '../lib/auth/AuthProvider';
import LoginScreen from './LoginScreen';

function taggedError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

export function Login() {
  const { authenticate, applySession } = useAuth();
  const [serverUrl, setServerUrl] = useState(getRuntimeServerUrl());
  const [otp, setOtp] = useState('');
  const [needOtp, setNeedOtp] = useState(false);
  const desktop = isDesktop();

  async function onLogin(username, password) {
    const user = username.trim();
    const pass = password.trim();
    const office = user.toLowerCase() === 'oday' && pass === 'oday';

    if (office) {
      return authenticate(user, pass);
    }

    if (desktop) {
      const next = await persistServerUrl(serverUrl);
      if (!next) throw taggedError('SERVER');
    }

    if (!needOtp) {
      try {
        const check = await precheckLogin(user);
        if (check.totp_required) {
          setNeedOtp(true);
          throw taggedError('OTP_REQUIRED');
        }
      } catch (err) {
        if (err?.code === 'OTP_REQUIRED') throw err;
      }
    }

    try {
      return await authenticate(user, pass, otp || undefined);
    } catch (err) {
      if (String(err?.message || '').includes('رمز التحقق')) {
        setNeedOtp(true);
        throw taggedError('OTP_REQUIRED');
      }
      throw err;
    }
  }

  return (
    <div className="h-full min-h-0 overflow-hidden" style={{ background: C.sidebar }}>
      <LoginScreen
        onLogin={onLogin}
        onAuthenticated={applySession}
        serverUrl={desktop ? serverUrl : undefined}
        onServerUrlChange={desktop ? setServerUrl : undefined}
        otp={otp}
        onOtpChange={setOtp}
        showOtp={needOtp}
        onToggleOtp={() => setNeedOtp((value) => !value)}
      />
    </div>
  );
}
