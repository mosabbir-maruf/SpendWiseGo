import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

const VerifyAction: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // 3D card effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [15, -15]);
  const rotateY = useTransform(mouseX, [-300, 300], [-15, 15]);

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

  // Helper to get query params
  function getQueryParam(param: string) {
    return new URLSearchParams(location.search).get(param);
  }

  useEffect(() => {
    // If already logged in and verified, redirect
    if (currentUser && currentUser.emailVerified) {
      navigate('/dashboard', { replace: true });
      return;
    }
    const oobCode = getQueryParam('oobCode');
    if (!oobCode) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }
    applyActionCode(auth, oobCode)
      .then(() => {
        setStatus('success');
        setMessage('Your email has been verified! You can now sign in with your new account.');
        setTimeout(() => navigate('/login', { replace: true }), 4000);
      })
      .catch(() => {
        setStatus('error');
        setMessage('Verification failed. The link may be invalid or expired.');
      });
    // eslint-disable-next-line
  }, [currentUser]);

  return (
    <Layout>
      <div className="flex w-full min-h-screen justify-center items-center bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 -mt-8">
        <motion.div
          className="w-full max-w-md relative z-10 px-4 sm:px-4"
          style={{ perspective: 1500 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            className="relative"
            style={{ rotateX, rotateY }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            whileHover={{ z: 10 }}
          >
            <div className="relative group">
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
              <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-2xl text-center overflow-hidden">
                {status === 'success' ? (
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                ) : status === 'error' ? (
                  <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                ) : null}
                <h2 className="text-2xl font-bold mb-2">
                  {status === 'success' ? 'Email Verified' : status === 'error' ? 'Verification Failed' : 'Verifying...'}
                </h2>
                <p className="mb-6 text-muted-foreground">{message}</p>
                <Button onClick={() => navigate('/login', { replace: true })} className="w-full">
                  Go to Login
                </Button>
                {status === 'success' && (
                  <p className="text-xs text-muted-foreground mt-4">Redirecting to login in a few seconds...</p>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default VerifyAction; 