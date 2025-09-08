import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { draft_id } = useParams();

  useEffect(() => {
    if (user) {
      fetchDrafts();
    }
  }, [user]);

  const fetchDrafts = async () => {
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
  };

  const handleNewDraft = () => {
    navigate('/chat/new');
    if (window.innerWidth < 1024) {
      onToggle(); // Close sidebar on mobile
    }
  };

  const handleSignOut = async () => {
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
  };

  const EmptyState = () => (
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
  );

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
            className="text-foreground hover:bg-glass/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={handleNewDraft}
          className="w-full mt-4 chat-message-user text-primary-foreground"
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
                  className={`block glass-hover rounded-lg p-3 transition-all ${
                    draft_id === draft.id ? 'ring-2 ring-primary' : ''
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
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
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
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ 
          x: isOpen ? 0 : -320,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`fixed left-0 top-0 h-full w-80 glass z-50 lg:relative lg:translate-x-0 lg:z-auto ${
          isOpen ? 'block' : 'hidden lg:block'
        }`}
      >
        {sidebarContent}
      </motion.div>

      {/* Mobile Toggle Button */}
      {!isOpen && (
        <Button
          onClick={onToggle}
          variant="ghost"
          size="sm"
          className="fixed top-4 left-4 z-30 lg:hidden glass"
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}
    </>
  );
};

export default Sidebar;