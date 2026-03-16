import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import Field from "../components/ui/Field";
import "./login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"signin" | "request">("signin");
  const [isInviteFlow, setIsInviteFlow] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      setIsInviteFlow(true);
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setIsInviteFlow(true);
      });
    }
  }, []);

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return alert(error.message);
    nav("/");
  };

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    setSettingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      window.location.href = '/CipherDispatch/';
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSettingPassword(false);
    }
  };

  return (
    <div className="login">
      <div className="login__wrap">
        <div className="login__card">

          <div className="login__logo-section">
            <div className="login__mark">CD</div>
            <div>
              <div className="login__wordmark">
                <span>CIPHER</span>DISPATCH
              </div>
              <div className="login__tagline">Claims Operations Platform</div>
            </div>
          </div>

          {isInviteFlow ? (
            <>
              <div className="login__body">
                <div className="login__invite-title">SET YOUR PASSWORD</div>
                <div className="login__invite-sub">
                  Welcome to Cipher Dispatch. Create a password to access your account.
                </div>
                <Field label="New Password">
                  <input
                    className="field__input"
                    type="password"
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </Field>
              </div>
              <div className="login__footer">
                <button
                  className="btn btn--primary btn--full"
                  onClick={handleSetPassword}
                  disabled={settingPassword}
                >
                  {settingPassword ? 'Setting up...' : 'Set Password & Enter'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="login__tabs">
                <button
                  className={`login__tab${activeTab === "signin" ? " login__tab--active" : ""}`}
                  onClick={() => setActiveTab("signin")}
                >
                  Sign In
                </button>
                <button
                  className={`login__tab${activeTab === "request" ? " login__tab--active" : ""}`}
                  onClick={() => setActiveTab("request")}
                >
                  Request Access
                </button>
              </div>

              <div className="login__body">
                <Field label="Email">
                  <input
                    className="field__input"
                    type="email"
                    placeholder="adjuster@firm.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field label="Password">
                  <input
                    className="field__input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
              </div>

              <div className="login__footer">
                <button className="btn btn--primary btn--full" onClick={signIn}>
                  Drop In
                </button>
                <button className="login__forgot">Forgot credentials?</button>
                <div className="login__divider">
                  <div className="login__divider-line" />
                  <div className="login__divider-text">or</div>
                  <div className="login__divider-line" />
                </div>
                <button className="btn btn--ghost btn--full">
                  Request Dispatcher Access
                </button>
              </div>
            </>
          )}

          <div className="login__card-footer">
            <div className="login__status-dot" />
            <div className="login__status-text">
              Cipher Dispatch · Admin Portal · Secure
            </div>
          </div>

        </div>
        <div className="login__version-bar">
          <span>v1.0</span>
          <span>CipherDispatch.io</span>
        </div>
      </div>
    </div>
  );
}
