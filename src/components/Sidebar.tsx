import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, LogOut, Settings, Menu, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Draft {
  id: string;
  user_input: string;
  email_type: string;
  created_at: string;
  brands: {
    name: string;
  };
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = memo(({ isOpen, onToggle }: SidebarProps) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { draft_id } = useParams();

  const fetchDrafts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('drafts')
        .select(`
          *,
          brands!inner(name)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast({
        title: "Error loading drafts",
        description: "Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    if (user) {
      fetchDrafts();
    }
  }, [user, fetchDrafts]);

  const handleNewDraft = useCallback(() => {
    navigate('/chat/new');
    if (window.innerWidth < 1024) {
      onToggle(); // Close sidebar on mobile
    }
  }, [navigate, onToggle]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      navigate('/auth');
      toast({
        title: "Signed out successfully",
        description: "See you next time!",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  }, [signOut, navigate, toast]);

  const EmptyState = useCallback(() => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="glass rounded-full p-6 mb-6">
        <MessageSquare className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">No drafts yet</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Start by creating your first email draft!
      </p>
      <Button
        onClick={handleNewDraft}
        className="chat-message-user text-primary-foreground"
      >
        <Plus className="h-4 w-4 mr-2" />
        Start a New Draft
      </Button>
    </motion.div>
  ), [handleNewDraft]);

  const sidebarContent = (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-glass-border/20">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Email Drafts</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={handleNewDraft}
          className="w-full mt-4 chat-message-user text-primary-foreground hover:bg-gray-200 hover:text-black"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Draft
        </Button>

      </div>

      {/* Drafts List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="glass rounded-lg p-3 animate-pulse">
                  <div className="h-4 bg-glass/20 rounded mb-2"></div>
                  <div className="h-3 bg-glass/10 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        ) : drafts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="p-3 space-y-2">
            {drafts.map((draft) => (
              <motion.div
                key={draft.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to={`/chat/${draft.id}`}
                  className={`block glass-hover rounded-lg p-3 transition-all ${draft_id === draft.id ? 'ring-2 ring-primary' : ''
                    }`}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {draft.brands.name} • {draft.email_type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {draft.user_input}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(draft.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-glass-border/20">
        <div className="space-y-2">
          <Button
            variant="ghost"
            onClick={() => navigate('/brands')}
            className="w-full justify-start text-foreground hover:text-primary hover:bg-primary/10 bg-background/50 backdrop-blur-sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage Brands
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/feedbacks')}
            className="w-full justify-start text-foreground hover:text-primary hover:bg-primary/10 bg-background/50 backdrop-blur-sm"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            View Feedback
          </Button>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-destructive hover:text-destructive dark:hover:bg-destructive/20 dark:hover:border-destructive dark:hover:border dark:hover:shadow-lg dark:hover:shadow-destructive/20 hover:bg-destructive/10 transition-all duration-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: isOpen ? 0 : -320,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 h-full w-80 glass z-50 lg:relative lg:translate-x-0 lg:z-auto lg:opacity-100 lg:pointer-events-auto"
        style={{
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {sidebarContent}
      </motion.div>

      {/* Toggle Button for both Mobile and Desktop */}
      {!isOpen && (
        <Button
          onClick={onToggle}
          variant="ghost"
          size="sm"
          className="fixed top-4 left-4 z-30 glass"
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}
    </>
  );
});

export default Sidebar;