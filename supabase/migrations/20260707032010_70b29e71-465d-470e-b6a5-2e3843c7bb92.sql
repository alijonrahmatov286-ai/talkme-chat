
CREATE POLICY "media read all" ON storage.objects
  FOR SELECT USING (bucket_id IN ('avatars','chat-media'));
CREATE POLICY "media insert all" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('avatars','chat-media'));
CREATE POLICY "media update all" ON storage.objects
  FOR UPDATE USING (bucket_id IN ('avatars','chat-media'));
CREATE POLICY "media delete all" ON storage.objects
  FOR DELETE USING (bucket_id IN ('avatars','chat-media'));
