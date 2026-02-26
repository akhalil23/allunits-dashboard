import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import lauLogo from '@/assets/lau-logo.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

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
            <h1 className="text-lg font-display font-bold text-foreground">Reset Password</h1>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-foreground">Check your email for a password reset link.</p>
              <Link to="/login" className="text-sm text-primary hover:underline inline-block">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
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
                Send Reset Link
              </Button>

              <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3 h-3" />
                Back to login
              </Link>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
