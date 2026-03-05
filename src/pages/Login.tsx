import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Moon, Sun, LogIn, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import lauLogo from "@/assets/lau-logo-white.png";

export default function Login() {
  const { isAuthenticated } = useAuth();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Contact form state
  const [contactOpen, setContactOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSending, setContactSending] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanUsername = username.trim().toLowerCase();

    // Lookup auth_email from profiles table via security definer function
    const { data: authEmail, error: lookupError } = await supabase.rpc("get_auth_email_by_username", {
      _username: cleanUsername,
    });

    if (lookupError || !authEmail) {
      setLoading(false);
      setError("Invalid username or password");
      return;
    }

    const err = await login(authEmail as string, password);
    setLoading(false);
    if (err) setError("Invalid username or password");
  };

  const handleContactSubmit = async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setContactSending(true);
    try {
      const { error } = await supabase.from("contact_requests").insert({
        name: contactName.trim(),
        email: contactEmail.trim(),
        message: contactMessage.trim(),
      });
      if (error) throw error;
      toast.success("Request sent! An administrator will get back to you.");
      setContactOpen(false);
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    } catch (err: any) {
      toast.error("Failed to send request: " + err.message);
    }
    setContactSending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 40%, hsl(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 70% 60%, hsl(var(--primary)) 0%, transparent 50%)",
        }}
      />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors"
      >
        {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>

      <motion.div
        className="w-full max-w-sm mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
          {/* Logo & Title */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-xl overflow-hidden mb-4 shadow-lg bg-primary">
              <img src={lauLogo} alt="LAU" className="w-full h-full object-contain p-2" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground">SP Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
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
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
              Sign in
            </Button>

            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
            >
              Need an account or forgot your password? <br /> Contact admin
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">Strategic Plan IV — Intelligence Dashboard</p>
      </motion.div>

      {/* Contact Admin Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Administrator</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Submit a request for a new account or password reset. An administrator will follow up.
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-username">Username</Label>
              <Input
                id="contact-username"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="Your username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-msg">Message</Label>
              <Textarea
                id="contact-msg"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="e.g. I need access to the GSR dashboard..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleContactSubmit} disabled={contactSending}>
              {contactSending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
