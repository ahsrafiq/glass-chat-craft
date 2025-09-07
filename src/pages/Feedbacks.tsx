import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/Sidebar';
import EmptyState from '@/components/EmptyState';
import { MessageSquare, Trash2, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

interface Feedback {
  id: string;
  feedback_text: string;
  is_valid: boolean;
  created_at: string;
  drafts: {
    id: string;
    email_type: string;
    brands: {
      name: string;
    };
  };
}

interface FeedbacksProps {
  sidebarOpen?: boolean;
  onSidebarToggle: () => void;
}

const Feedbacks = ({ sidebarOpen = false, onSidebarToggle }: FeedbacksProps) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchFeedbacks();
  }, [user, navigate]);

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from('email_feedbacks')
        .select(`
          *,
          drafts!inner(
            id,
            email_type,
            brands!inner(name)
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast({
        title: "Error loading feedbacks",
        description: "Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('email_feedbacks')
        .delete()
        .eq('id', feedbackId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Feedback deleted",
        description: "The feedback has been successfully deleted.",
      });
      
      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast({
        title: "Error deleting feedback",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    if (filter === 'valid') return feedback.is_valid;
    if (filter === 'invalid') return !feedback.is_valid;
    return true;
  });

  const groupedFeedbacks = filteredFeedbacks.reduce((acc, feedback) => {
    const key = `${feedback.drafts.brands.name}-${feedback.drafts.email_type}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(feedback);
    return acc;
  }, {} as Record<string, Feedback[]>);

  if (!user) return null;

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={sidebarOpen} onToggle={onSidebarToggle} />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="glass border-b border-glass-border/20 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/chat/new')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chat
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Feedback Management</h1>
                <p className="text-sm text-muted-foreground">
                  Review and manage your email draft feedback
                </p>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'chat-message-user text-primary-foreground' : 'glass-hover'}
            >
              All ({feedbacks.length})
            </Button>
            <Button
              variant={filter === 'valid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('valid')}
              className={filter === 'valid' ? 'chat-message-user text-primary-foreground' : 'glass-hover'}
            >
              Valid ({feedbacks.filter(f => f.is_valid).length})
            </Button>
            <Button
              variant={filter === 'invalid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('invalid')}
              className={filter === 'invalid' ? 'chat-message-user text-primary-foreground' : 'glass-hover'}
            >
              Invalid ({feedbacks.filter(f => !f.is_valid).length})
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="glass rounded-lg p-6 animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-5 bg-glass/20 rounded w-48"></div>
                    <div className="h-6 bg-glass/10 rounded w-20"></div>
                  </div>
                  <div className="h-4 bg-glass/10 rounded mb-2"></div>
                  <div className="h-4 bg-glass/10 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={
                filter === 'all' 
                  ? "No feedback yet" 
                  : filter === 'valid'
                  ? "No valid feedback"
                  : "No invalid feedback"
              }
              description={
                filter === 'all'
                  ? "Start creating email drafts and providing feedback to see them here."
                  : filter === 'valid'
                  ? "Valid feedback helps improve your drafts."
                  : "Invalid feedback are marked for review and can be deleted."
              }
              actionLabel="Start Drafting"
              onAction={() => navigate('/chat/new')}
            />
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedFeedbacks).map(([key, groupFeedbacks]) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      {key.replace('-', ' • ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                    <Badge variant="secondary" className="glass">
                      {groupFeedbacks.length} feedback{groupFeedbacks.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {groupFeedbacks.map((feedback) => (
                      <motion.div
                        key={feedback.id}
                        whileHover={{ scale: 1.01 }}
                        className={`rounded-lg p-4 border ${
                          feedback.is_valid
                            ? 'glass border-glass-border/20'
                            : 'error-glass border-destructive/30'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {feedback.is_valid ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                            <Badge 
                              variant={feedback.is_valid ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {feedback.is_valid ? 'Valid' : 'Invalid'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(feedback.created_at).toLocaleDateString()}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteFeedback(feedback.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-auto p-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-foreground leading-relaxed">
                          {feedback.feedback_text}
                        </p>
                        
                        <div className="mt-3 pt-3 border-t border-glass-border/10">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/chat/${feedback.drafts.id}`)}
                            className="text-primary hover:text-primary-glow text-xs h-auto p-0"
                          >
                            View Draft →
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Feedbacks;