import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const VerifyEmail: React.FC = () => {
  const { currentUser, sendVerificationEmail, reloadUser } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [manualPassword, setManualPassword] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [cooldown, setCooldown] = useState(0);

  // 3D card effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);

  // Get the registered email from sessionStorage
  const registerEmail = sessionStorage.getItem('registerEmail');

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseXFromCenter = e.clientX - centerX;
    const mouseYFromCenter = e.clientY - centerY;
    mouseX.set(mouseXFromCenter);
    mouseY.set(mouseYFromCenter);
    setMousePosition({ x: mouseXFromCenter, y: mouseYFromCenter });
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setMousePosition({ x: 0, y: 0 });
  };

  const handleSendVerificationEmail = async () => {
    setIsSending(true);
    try {
      if (currentUser) {
        await sendVerificationEmail();
        toast({
          title: 'Verification Email Sent',
          description: 'Please check your email and click the verification link.',
        });
        setCooldown(60); // Start cooldown after successful send
      } else if (registerEmail) {
        // Try to get password from localStorage
        const savedFormData = localStorage.getItem('registerForm');
        let password = '';
        if (savedFormData) {
          try {
            const parsed = JSON.parse(savedFormData);
            password = parsed.password || parsed.formData?.password || '';
          } catch {}
        }
        if (!password && !manualPassword) {
          setShowPasswordInput(true);
          setIsSending(false);
          setTimeout(() => passwordInputRef.current?.focus(), 100);
          return;
        }
        if (!password) password = manualPassword;
        if (password) {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, registerEmail, password);
            await sendEmailVerification(userCredential.user);
            await signOut(auth);
            toast({
              title: 'Verification Email Sent',
              description: `A verification email has been sent to ${registerEmail}. Please check your inbox.`,
            });
            setShowPasswordInput(false);
            setManualPassword('');
            setCooldown(60); // Start cooldown after successful send
          } catch (error: any) {
            if (error.code === 'auth/too-many-requests') {
              toast({
                title: 'Too Many Requests',
                description: 'You have requested too many verification emails. Please wait a minute before trying again.',
                variant: 'destructive',
              });
              setCooldown(60); // Start cooldown on too many requests
            } else {
              toast({
                title: 'Error',
                description: error.message || 'Failed to send verification email.',
                variant: 'destructive',
              });
            }
          }
        } else {
          toast({
            title: 'Error',
            description: 'Password not found. Please try registering again.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Error',
          description: 'No email found to resend verification. Please register again.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        toast({
          title: 'Too Many Requests',
          description: 'You have requested too many verification emails. Please wait a minute before trying again.',
          variant: 'destructive',
        });
        setCooldown(60); // Start cooldown on too many requests
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to send verification email.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!currentUser) return;
    setIsChecking(true);
    try {
      await reloadUser();
      if (auth.currentUser && auth.currentUser.emailVerified) {
        toast({
          title: 'Email Verified!',
          description: 'Your email has been verified successfully.',
        });
        // Clear justRegistered flag and redirect to dashboard after a short delay
        sessionStorage.removeItem('justRegistered');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        toast({
          title: 'Not Verified Yet',
          description: 'Please verify your email and click the verification link.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to check verification status.',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  // If user is not logged in and not just registered, redirect to login
  if (!currentUser && !sessionStorage.getItem('justRegistered')) {
    return <Navigate to="/login" replace />;
  }
  // If user is logged in and verified, redirect to dashboard
  if (currentUser && currentUser.emailVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="flex w-full min-h-screen justify-center items-center bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 -mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md relative z-10 px-4 sm:px-4"
          style={{ perspective: 1500 }}
        >
          <motion.div
            className="relative"
            style={{ rotateX, rotateY }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ z: 10 }}
          >
            <div className="relative group">
              {/* Card glow effect */}
              <motion.div 
                className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-700"
                animate={{
                  boxShadow: [
                    "0 0 10px 2px rgba(255,255,255,0.03)",
                    "0 0 15px 5px rgba(255,255,255,0.05)",
                    "0 0 10px 2px rgba(255,255,255,0.03)"
                  ],
                  opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  ease: "easeInOut", 
                  repeatType: "mirror" 
                }}
              />
              {/* Glass card background */}
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 py-12 sm:p-8 sm:py-12 min-h-[420px] sm:min-h-[480px] border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
                {/* Icon and header */}
                <div className="text-center space-y-1 mb-5">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.8 }}
                    className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-0 mt-[-10px]"
                  >
                    <Mail className="w-6 h-6 text-primary-foreground" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span className="block text-2xl font-bold text-primary">Verify Your Email</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="text-muted-foreground block mt-2">We've sent a verification email to:</span>
                    <span className="font-medium text-primary block mt-1">
                      {currentUser ? currentUser.email : registerEmail || 'your email address'}
                    </span>
                  </motion.div>
                </div>
                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium mb-1">What to do next:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Check your email inbox</li>
                        <li>• Click the verification link in the email</li>
                        <li>• Back to login.</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Show different content based on login status */}
                <div className="space-y-3">
                  <Button
                    onClick={handleSendVerificationEmail}
                    disabled={isSending || cooldown > 0}
                    className="w-full"
                    variant="outline"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : cooldown > 0 ? (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Resend Verification Email ({cooldown}s)
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Resend Verification Email
                      </>
                    )}
                  </Button>
                  {showPasswordInput && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSending(true);
                        await handleSendVerificationEmail();
                      }}
                      className="flex flex-col gap-2 mt-2"
                    >
                      <Input
                        ref={passwordInputRef}
                        type="password"
                        placeholder="Enter your password to resend verification email"
                        value={manualPassword}
                        onChange={e => setManualPassword(e.target.value)}
                        required
                        className="w-full"
                      />
                      <Button type="submit" className="w-full" disabled={isSending}>
                        {isSending ? 'Sending...' : 'Submit Password'}
                      </Button>
                    </form>
                  )}
                </div>
                <div className="space-y-2 mt-3">
                  <Button
                    asChild
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200 rounded-lg h-10 px-6 shadow font-medium"
                  >
                    <Link to="/login">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Login
                    </Link>
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground text-center mt-4">
                  <p>Didn't receive the email? Check your spam folder.</p>
                  <p className="mt-1">
                    Make sure to add <span className="font-medium">noreply@spendwisego.firebaseapp.com</span> to your contacts.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default VerifyEmail; 