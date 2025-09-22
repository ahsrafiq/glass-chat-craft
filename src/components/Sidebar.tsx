import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MessageSquare, LogOut, Settings, Menu, X, MoreVertical, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EmptyState from '@/components/EmptyState';

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
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { draft_id } = useParams();

  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

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

  const handleDeleteDraft = useCallback(async (draftId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Prevent event bubbling
    
    setDeletingDraftId(draftId);
    
    try {
      // First delete all draft versions
      const { error: versionsError } = await supabase
        .from('draft_versions')
        .delete()
        .eq('draft_id', draftId);

      if (versionsError) {
        console.error('Error deleting draft versions:', versionsError);
        throw new Error('Failed to delete draft versions');
      }

      // Delete all feedback related to this draft
      const { error: feedbackError } = await supabase
        .from('email_feedbacks')
        .delete()
        .eq('draft_id', draftId);

      if (feedbackError) {
        console.error('Error deleting draft feedback:', feedbackError);
        throw new Error('Failed to delete draft feedback');
      }

      // Finally delete the draft itself
      const { error: draftError } = await supabase
        .from('drafts')
        .delete()
        .eq('id', draftId)
        .eq('user_id', user?.id);

      if (draftError) {
        console.error('Error deleting draft:', draftError);
        throw new Error('Failed to delete draft');
      }

      // Remove draft from local state
      setDrafts(prevDrafts => prevDrafts.filter(draft => draft.id !== draftId));
      
      // If we're currently viewing the deleted draft, navigate to new chat
      if (draft_id === draftId) {
        navigate('/chat/new');
      }

      toast({
        title: "Draft deleted",
        description: "The draft and all its versions have been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Error deleting draft",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingDraftId(null);
    }
  }, [user?.id, draft_id, navigate, toast]);

  const EmptyStateComponent = useMemo(() => (
    <EmptyState
      icon={MessageSquare}
      title="No drafts yet"
      description="Start by creating your first email draft!"
      actionLabel="Start a New Draft"
      onAction={handleNewDraft}
    />
  ), [handleNewDraft]);

  const sidebarContent = useMemo(() => (
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
          EmptyStateComponent
        ) : (
          <div className="p-3 space-y-2">
            {drafts.map((draft) => (
              <motion.div
                key={draft.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative"
              >
                <Link
                  to={`/chat/${draft.id}`}
                  className={`block glass-hover rounded-lg p-3 pr-10 transition-all ${
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
                
                {/* Three-dot menu */}
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-glass/20"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass">
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteDraft(draft.id, e)}
                        disabled={deletingDraftId === draft.id}
                        className="text-destructive hover:text-destructive focus:text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingDraftId === draft.id ? 'Deleting...' : 'Delete Draft'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
  ), [loading, drafts, draft_id, onToggle, handleNewDraft, handleSignOut, navigate, EmptyStateComponent, handleDeleteDraft, deletingDraftId]);

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
        className={`fixed left-0 top-0 h-full w-80 glass z-50 ${
          isMobile 
            ? '' // On mobile: only show when isOpen is true
            : 'lg:relative lg:translate-x-0 lg:z-auto lg:opacity-100 lg:pointer-events-auto' // On desktop: always visible
        }`}
        style={{
          pointerEvents: isOpen ? 'auto' : isMobile ? 'none' : 'auto',
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