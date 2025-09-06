-- Create custom types
CREATE TYPE public.email_type AS ENUM ('product', 'sales', 'news', 'community');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create drafts table (conversations)
CREATE TABLE public.drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  email_type public.email_type NOT NULL,
  product_info JSONB,
  user_input TEXT NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create draft versions table
CREATE TABLE public.draft_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES public.drafts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email feedbacks table
CREATE TABLE public.email_feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES public.drafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_feedbacks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for brands
CREATE POLICY "Users can view their own brands" ON public.brands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own brands" ON public.brands FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own brands" ON public.brands FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own brands" ON public.brands FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for drafts
CREATE POLICY "Users can view their own drafts" ON public.drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own drafts" ON public.drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own drafts" ON public.drafts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own drafts" ON public.drafts FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for draft versions
CREATE POLICY "Users can view draft versions for their drafts" ON public.draft_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.drafts WHERE drafts.id = draft_versions.draft_id AND drafts.user_id = auth.uid())
);
CREATE POLICY "Users can create draft versions for their drafts" ON public.draft_versions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.drafts WHERE drafts.id = draft_versions.draft_id AND drafts.user_id = auth.uid())
);

-- Create RLS policies for email feedbacks
CREATE POLICY "Users can view their own feedbacks" ON public.email_feedbacks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own feedbacks" ON public.email_feedbacks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own feedbacks" ON public.email_feedbacks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own feedbacks" ON public.email_feedbacks FOR DELETE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON public.drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'name');
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();