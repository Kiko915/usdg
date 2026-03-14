-- Enable public read access for authenticated users to search profiles
CREATE POLICY "Public Profiles are viewable by everyone"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
