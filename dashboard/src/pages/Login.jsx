import { useState } from 'react';
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
    const office = username.toLowerCase() === 'oday' && password === 'oday';
    if (desktop) {
      const next = await persistServerUrl(serverUrl);
      if (!next && !office) throw taggedError('SERVER');
    }

    if (!needOtp && !office) {
      try {
        const check = await precheckLogin(username);
        if (check.totp_required) {
          setNeedOtp(true);
          throw taggedError('OTP_REQUIRED');
        }
      } catch (err) {
        if (err?.code === 'OTP_REQUIRED') throw err;
      }
    }

    try {
      return await authenticate(username, password, otp || undefined);
    } catch (err) {
      if (String(err?.message || '').includes('رمز التحقق')) {
        setNeedOtp(true);
        throw taggedError('OTP_REQUIRED');
      }
      throw err;
    }
  }

  return (
    <div className="h-full min-h-0 overflow-hidden bg-[#0a0a0a]">
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
