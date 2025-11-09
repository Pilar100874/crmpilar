import { supabase } from "@/integrations/supabase/client";

export async function uploadFooterLogo() {
  try {
    // Fetch the logo from public folder
    const response = await fetch('/footer-logo.jpg');
    const blob = await response.blob();
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('bot-media')
      .upload('footer-logo.jpg', blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Error uploading footer logo:', error);
      return false;
    }

    console.log('Footer logo uploaded successfully:', data);
    return true;
  } catch (error) {
    console.error('Error uploading footer logo:', error);
    return false;
  }
}
