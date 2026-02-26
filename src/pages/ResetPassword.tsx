import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import lauLogo from '@/assets/lau-logo.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [hasRecoveryToken, setHasRecoveryToken] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setHasRecoveryToken(true);
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    }
  };

  if (!hasRecoveryToken && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-sm text-foreground font-medium">Invalid or expired reset link</p>
          <button onClick={() => navigate('/forgot-password')} className="text-sm text-primary hover:underline">
            Request a new one
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 30% 40%, hsl(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 70% 60%, hsl(var(--primary)) 0%, transparent 50%)',
      }} />

      <motion.div
        className="w-full max-w-sm mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 shadow-lg">
              <img src={lauLogo} alt="LAU" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-lg font-display font-bold text-foreground">Set New Password</h1>
          </div>

          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-primary mx-auto" />
              <p className="text-sm text-foreground">Password updated! Redirecting to login…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <motion.p
                  className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Password
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
