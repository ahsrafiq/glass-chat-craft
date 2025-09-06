import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Zap } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/chat/new');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-8">
          <div className="animate-pulse text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-full w-24 h-24 mx-auto mb-8 flex items-center justify-center"
        >
          <Mail className="h-12 w-12 text-primary" />
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6 text-5xl font-bold text-foreground"
        >
          AI Email Drafts
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xl text-muted-foreground mb-8 leading-relaxed"
        >
          Create stunning, personalized email campaigns with the power of AI. 
          Transform your ideas into compelling content that converts.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => navigate('/auth')}
            className="chat-message-user text-primary-foreground px-8 py-4 text-lg"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Get Started
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/auth')}
            className="glass-hover px-8 py-4 text-lg"
          >
            <Zap className="h-5 w-5 mr-2" />
            Learn More
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Index;
