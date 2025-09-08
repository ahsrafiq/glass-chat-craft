-- Add missing columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN display_name TEXT,
ADD COLUMN bio TEXT;