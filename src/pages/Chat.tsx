import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import ChatMessage from '@/components/ChatMessage';
import EmptyState from '@/components/EmptyState';
import Sidebar from '@/components/Sidebar';
import { Send, Sparkles, Plus } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
}

interface Draft {
  id: string;
  brand_id: string;
  email_type: string;
  product_info: any;
  user_input: string;
  current_version: number;
  brands: {
    name: string;
  };
}

interface DraftVersion {
  id: string;
  version: number;
  content: string;
  created_at: string;
}

interface Feedback {
  id: string;
  feedback_text: string;
  is_valid: boolean;
  created_at: string;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  isError?: boolean;
  feedbackId?: string;
}

interface ChatProps {
  sidebarOpen?: boolean;
  onSidebarToggle: () => void;
}

const Chat = ({ sidebarOpen = false, onSidebarToggle }: ChatProps) => {
  const { draft_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [draft, setDraft] = useState<Draft | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  // Form states for new draft
  const [selectedBrand, setSelectedBrand] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [emailType, setEmailType] = useState('');
  const [userInput, setUserInput] = useState('');
  
  // Product details
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productFeatures, setProductFeatures] = useState<string[]>([]);
  
  // Sales details
  const [targetAudience, setTargetAudience] = useState('');
  const [specialOffer, setSpecialOffer] = useState('');
  
  // News details
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  
  // Community details
  const [communityTopics, setCommunityTopics] = useState('');
  const [keyHighlights, setKeyHighlights] = useState('');
  
  // Feedback input
  const [feedbackText, setFeedbackText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (draft_id === 'new') {
      setIsFirstTime(true);
      fetchBrands();
    } else if (draft_id) {
      fetchDraft();
    }
  }, [draft_id, user, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: "Error loading brands",
        description: "Please try again or create a brand first.",
        variant: "destructive",
      });
    }
  };

  const fetchDraft = async () => {
    if (!draft_id || draft_id === 'new') return;
    
    setLoading(true);
    try {
      // Fetch draft
      const { data: draftData, error: draftError } = await supabase
        .from('drafts')
        .select(`
          *,
          brands!inner(name)
        `)
        .eq('id', draft_id)
        .eq('user_id', user?.id)
        .single();

      if (draftError) throw draftError;
      setDraft(draftData);

      // Fetch draft versions and feedbacks to build message history
      const [versionsResult, feedbacksResult] = await Promise.all([
        supabase
          .from('draft_versions')
          .select('*')
          .eq('draft_id', draft_id)
          .order('version'),
        supabase
          .from('email_feedbacks')
          .select('*')
          .eq('draft_id', draft_id)
          .order('created_at')
      ]);

      if (versionsResult.error) throw versionsResult.error;
      if (feedbacksResult.error) throw feedbacksResult.error;

      const versions = versionsResult.data || [];
      const feedbacks = feedbacksResult.data || [];

      // Build message history
      const messageHistory: Message[] = [];
      
      // Add initial user input
      messageHistory.push({
        id: 'initial',
        type: 'user',
        content: draftData.user_input,
      });

      // Interleave versions and feedbacks
      versions.forEach((version, index) => {
        // Add draft version
        messageHistory.push({
          id: `version-${version.id}`,
          type: 'assistant',
          content: version.content,
        });

        // Add feedback that came after this version (if any)
        const nextVersionDate = versions[index + 1]?.created_at;
        const relevantFeedbacks = feedbacks.filter(f => {
          const feedbackDate = new Date(f.created_at);
          const versionDate = new Date(version.created_at);
          const nextVersionDateObj = nextVersionDate ? new Date(nextVersionDate) : new Date();
          
          return feedbackDate > versionDate && feedbackDate < nextVersionDateObj;
        });

        relevantFeedbacks.forEach(feedback => {
          messageHistory.push({
            id: `feedback-${feedback.id}`,
            type: 'user',
            content: feedback.feedback_text,
            isError: !feedback.is_valid,
            feedbackId: feedback.id,
          });
        });
      });

      setMessages(messageHistory);
    } catch (error) {
      console.error('Error fetching draft:', error);
      toast({
        title: "Error loading draft",
        description: "Please try again.",
        variant: "destructive",
      });
      navigate('/chat/new');
    } finally {
      setLoading(false);
    }
  };

  const createFirstDraft = async () => {
    if (!selectedBrand || !emailType || !userInput.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get selected brand details
      const selectedBrandData = brands.find(b => b.id === selectedBrand);
      
      // Build request with only relevant details object populated
      const requestBody = {
        draft_id: "",
        user_id: user?.id,
        email_type: emailType,
        user_input: userInput,
        brand_details: {
          brand_name: selectedBrandData?.name || '',
          brand_description: brandDescription
        },
        products_details: emailType === 'product' ? {
          name: productName,
          price: parseFloat(productPrice) || 0,
          key_features: productFeatures
        } : {},
        sales_details: emailType === 'sales' ? {
          target_audience: targetAudience,
          special_offer: specialOffer
        } : {},
        news_details: emailType === 'news' ? {
          website_url: websiteUrl,
          keywords: keywords
        } : {},
        community: emailType === 'community' ? {
          community_topics: communityTopics,
          key_highlights: keyHighlights
        } : {}
      };

      // Add user message immediately
      const userMessage: Message = {
        id: 'user-input',
        type: 'user',
        content: userInput,
      };
      setMessages([userMessage]);

      // Call n8n webhook for first time email generation
      const response = await fetch('https://mr8v10.app.n8n.cloud/webhook-test/start-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Add assistant response
      const assistantMessage: Message = {
        id: 'assistant-response',
        type: 'assistant',
        content: data.email_draft_result,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Navigate to the new draft
      navigate(`/chat/${data.draft_id}`);
      
      toast({
        title: "Draft created!",
        description: "Your email draft has been generated successfully.",
      });

      setIsFirstTime(false);
    } catch (error) {
      console.error('Error creating draft:', error);
      toast({
        title: "Error creating draft",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim() || !draft) return;

    setLoading(true);
    try {
      // Add user feedback message immediately
      const feedbackMessage: Message = {
        id: `feedback-${Date.now()}`,
        type: 'user',
        content: feedbackText,
      };
      setMessages(prev => [...prev, feedbackMessage]);
      const currentFeedback = feedbackText;
      setFeedbackText('');

      // Call n8n webhook for feedback
      const response = await fetch('https://mr8v10.app.n8n.cloud/webhook-test/start-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draft_id: draft.id,
          user_id: user?.id,
          user_input: currentFeedback
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Add assistant response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: data.email_draft_result,
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error submitting feedback",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete feedback');
      }

      // Remove message from UI
      setMessages(prev => prev.filter(m => m.feedbackId !== feedbackId));
      
      toast({
        title: "Feedback deleted",
        description: "The feedback has been removed.",
      });
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast({
        title: "Error deleting feedback",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={onSidebarToggle} />
      
      <div className="flex-1 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {isFirstTime && brands.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No brands found"
              description="You need to create a brand before you can start drafting emails. Brands help personalize your email content."
              actionLabel="Create Your First Brand"
              onAction={() => navigate('/brands')}
            />
          ) : isFirstTime ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto"
            >
              <div className="glass rounded-2xl p-8">
                <div className="text-center mb-8">
                  <div className="glass rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Create Your Email Draft
                  </h2>
                  <p className="text-muted-foreground">
                    Tell us about your brand and what kind of email you'd like to create
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="brand">Brand *</Label>
                      <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                        <SelectTrigger className="glass-hover">
                          <SelectValue placeholder="Select a brand" />
                        </SelectTrigger>
                        <SelectContent className="glass">
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="email-type">Email Type *</Label>
                      <Select value={emailType} onValueChange={setEmailType}>
                        <SelectTrigger className="glass-hover">
                          <SelectValue placeholder="Select email type" />
                        </SelectTrigger>
                        <SelectContent className="glass">
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="news">Newsletter</SelectItem>
                          <SelectItem value="community">Community</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="brand-description">Brand Description</Label>
                    <Textarea
                      id="brand-description"
                      value={brandDescription}
                      onChange={(e) => setBrandDescription(e.target.value)}
                      placeholder="Describe your brand, its values, and target market..."
                      className="glass-hover"
                      rows={3}
                    />
                  </div>

                  {/* Dynamic fields based on email type */}
                  {emailType === 'product' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="product-name">Product Name</Label>
                          <Input
                            id="product-name"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="Enter product name"
                            className="glass-hover"
                          />
                        </div>
                        <div>
                          <Label htmlFor="product-price">Price</Label>
                          <Input
                            id="product-price"
                            value={productPrice}
                            onChange={(e) => setProductPrice(e.target.value)}
                            placeholder="299.99"
                            type="number"
                            step="0.01"
                            className="glass-hover"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="product-features">Key Features (comma separated)</Label>
                        <Input
                          id="product-features"
                          value={productFeatures.join(', ')}
                          onChange={(e) => setProductFeatures(e.target.value.split(',').map(f => f.trim()).filter(f => f))}
                          placeholder="Wrinkle-resistant fabric, Machine washable, Tailored fit"
                          className="glass-hover"
                        />
                      </div>
                    </div>
                  )}

                  {emailType === 'sales' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="target-audience">Target Audience</Label>
                        <Input
                          id="target-audience"
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          placeholder="Small Business Owners"
                          className="glass-hover"
                        />
                      </div>
                      <div>
                        <Label htmlFor="special-offer">Special Offer</Label>
                        <Input
                          id="special-offer"
                          value={specialOffer}
                          onChange={(e) => setSpecialOffer(e.target.value)}
                          placeholder="20% discount"
                          className="glass-hover"
                        />
                      </div>
                    </div>
                  )}

                  {emailType === 'news' && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="website-url">Website URL</Label>
                        <Input
                          id="website-url"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="www.example.com"
                          className="glass-hover"
                        />
                      </div>
                      <div>
                        <Label htmlFor="keywords">Keywords (comma separated)</Label>
                        <Input
                          id="keywords"
                          value={keywords.join(', ')}
                          onChange={(e) => setKeywords(e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                          placeholder="Floods, Earthquake"
                          className="glass-hover"
                        />
                      </div>
                    </div>
                  )}

                  {emailType === 'community' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="community-topics">Community Topics</Label>
                        <Input
                          id="community-topics"
                          value={communityTopics}
                          onChange={(e) => setCommunityTopics(e.target.value)}
                          placeholder="Weekly Update"
                          className="glass-hover"
                        />
                      </div>
                      <div>
                        <Label htmlFor="key-highlights">Key Highlights</Label>
                        <Input
                          id="key-highlights"
                          value={keyHighlights}
                          onChange={(e) => setKeyHighlights(e.target.value)}
                          placeholder="New Features"
                          className="glass-hover"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="user-input">What would you like to communicate? *</Label>
                    <Textarea
                      id="user-input"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Write an email announcing a 50% discount on our new shoes collection."
                      className="glass-hover min-h-[120px]"
                      required
                    />
                  </div>

                  <Button
                    onClick={createFirstDraft}
                    disabled={loading || !selectedBrand || !emailType || !userInput.trim()}
                    className="w-full chat-message-user text-primary-foreground"
                  >
                    {loading ? (
                      <>Creating Draft...</>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Email Draft
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {messages.length === 0 && !loading ? (
                <EmptyState
                  icon={Sparkles}
                  title="Ready for conversation"
                  description="Start by providing feedback on the current draft or ask for specific changes."
                  actionLabel="Get Started"
                  onAction={() => {}}
                />
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      type={message.type}
                      content={message.content}
                      isError={message.isError}
                      canDelete={!!(message.isError && message.feedbackId)}
                      onDelete={message.feedbackId ? () => deleteFeedback(message.feedbackId!) : undefined}
                    />
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {draft && !isFirstTime && (
          <div className="glass border-t border-glass-border/20 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Provide feedback on the draft or request changes..."
                    className="glass-hover resize-none"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        submitFeedback();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={submitFeedback}
                  disabled={loading || !feedbackText.trim()}
                  className="chat-message-user text-primary-foreground shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Press Cmd/Ctrl + Enter to send
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;