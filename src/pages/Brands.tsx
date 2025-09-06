import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/Sidebar';
import EmptyState from '@/components/EmptyState';
import { Plus, Building2, Edit, Trash2, ArrowLeft } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

const Brands = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchBrands();
  }, [user, navigate]);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: "Error loading brands",
        description: "Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a brand name.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingBrand) {
        // Update existing brand
        const { error } = await supabase
          .from('brands')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim(),
          })
          .eq('id', editingBrand.id)
          .eq('user_id', user?.id);

        if (error) throw error;

        toast({
          title: "Brand updated",
          description: "Your brand has been successfully updated.",
        });
      } else {
        // Create new brand
        const { error } = await supabase
          .from('brands')
          .insert({
            user_id: user?.id,
            name: formData.name.trim(),
            description: formData.description.trim(),
          });

        if (error) throw error;

        toast({
          title: "Brand created",
          description: "Your new brand has been successfully created.",
        });
      }

      // Reset form and close dialog
      setFormData({ name: '', description: '' });
      setEditingBrand(null);
      setIsDialogOpen(false);
      fetchBrands();
    } catch (error) {
      console.error('Error saving brand:', error);
      toast({
        title: "Error saving brand",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      description: brand.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Brand deleted",
        description: "The brand has been successfully deleted.",
      });
      fetchBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast({
        title: "Error deleting brand",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const openNewBrandDialog = () => {
    setEditingBrand(null);
    setFormData({ name: '', description: '' });
    setIsDialogOpen(true);
  };

  if (!user) return null;

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="glass border-b border-glass-border/20 p-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-lg font-semibold text-foreground">Brand Management</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your brands for personalized email drafts
                </p>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={openNewBrandDialog}
                  className="chat-message-user text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Brand
                </Button>
              </DialogTrigger>
              <DialogContent className="glass">
                <DialogHeader>
                  <DialogTitle>
                    {editingBrand ? 'Edit Brand' : 'Create New Brand'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Brand Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter brand name"
                      className="glass-hover"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of your brand"
                      className="glass-hover"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleSave}
                      className="flex-1 chat-message-user text-primary-foreground"
                    >
                      {editingBrand ? 'Update Brand' : 'Create Brand'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="glass-hover"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass rounded-lg p-6 animate-pulse">
                  <div className="h-6 bg-glass/20 rounded mb-2"></div>
                  <div className="h-4 bg-glass/10 rounded w-2/3 mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-glass/10 rounded flex-1"></div>
                    <div className="h-8 bg-glass/10 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : brands.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No brands yet"
              description="Create your first brand to start generating personalized email drafts. Brands help tailor your content to match your business identity."
              actionLabel="Create Your First Brand"
              onAction={openNewBrandDialog}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brands.map((brand) => (
                <motion.div
                  key={brand.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className="glass-hover rounded-lg p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="glass rounded-full p-3">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-foreground mb-2 text-lg">
                    {brand.name}
                  </h3>
                  
                  {brand.description && (
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                      {brand.description}
                    </p>
                  )}
                  
                  <div className="text-xs text-muted-foreground mb-4">
                    Created {new Date(brand.created_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(brand)}
                      className="flex-1 glass-hover"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(brand.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 glass-hover"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
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

export default Brands;