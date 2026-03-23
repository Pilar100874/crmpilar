import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const PublicPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await supabase
        .from('published_pages')
        .select('sections, config, publicado')
        .eq('slug', slug)
        .eq('publicado', true)
        .maybeSingle();

      if (!data || error) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const sections = (data.sections as any[]) || [];
      const config = (data.config as any) || {};
      setHtml(generateFullHTML(sections, config));
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-background"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (notFound) return <div className="flex items-center justify-center min-h-screen bg-background"><div className="text-center"><h1 className="text-4xl font-bold mb-2">404</h1><p className="text-muted-foreground">Página não encontrada</p></div></div>;

  return <iframe srcDoc={html || ''} className="w-full h-screen border-0" title="Página publicada" />;
};

function generateFullHTML(sections: any[], config: any): string {
  const visibleSections = sections.filter((s: any) => s.visible !== false);
  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${config.title || 'Página'}</title>
<meta name="description" content="${config.description || ''}">
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(config.fontDisplay || 'Inter')}:wght@400;600;700&family=${encodeURIComponent(config.fontBody || 'Inter')}:wght@400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'${config.fontBody || 'Inter'}',sans-serif;color:${config.textColor || '#1f2937'};background:${config.backgroundColor || '#ffffff'}}
.container{max-width:${config.maxWidth || '1200px'};margin:0 auto;padding:0 24px}
img{max-width:100%}
a{text-decoration:none}
.btn{display:inline-block;padding:14px 36px;border-radius:8px;font-weight:600;font-size:1.1rem;cursor:pointer;transition:opacity .2s}
.btn:hover{opacity:.9}
.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}
.text-center{text-align:center}
@media(max-width:768px){.grid-3,.grid-2{grid-template-columns:1fr}}
</style>
</head>
<body>
`;

  for (const s of visibleSections) {
    const c = s.content || {};
    switch (s.type) {
      case 'hero':
        html += `<section style="padding:80px 24px;text-align:center;${c.background_image ? `background:linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5)),url(${c.background_image}) center/cover` : `background:${config.primaryColor || '#1e40af'}`};color:#fff">
<div class="container">
<h1 style="font-size:clamp(2rem,5vw,3.5rem);font-weight:700;margin-bottom:16px;font-family:'${config.fontDisplay || 'Inter'}',sans-serif">${c.headline || ''}</h1>
<p style="font-size:clamp(1rem,2vw,1.3rem);margin-bottom:32px;opacity:.9;max-width:700px;margin-left:auto;margin-right:auto">${c.subheadline || ''}</p>
<a href="${c.cta_url || '#'}" class="btn" style="background:${config.accentColor || '#f59e0b'};color:#fff">${c.cta_text || 'Começar'}</a>
</div></section>\n`;
        break;
      case 'text':
        html += `<section style="padding:48px 24px"><div class="container" style="max-width:768px;text-align:${c.alignment || 'left'}"><p style="font-size:1.1rem;line-height:1.8;white-space:pre-wrap">${c.body || ''}</p></div></section>\n`;
        break;
      case 'image':
        html += `<section style="padding:40px 24px"><div class="container text-center">${c.url ? `<img src="${c.url}" alt="${c.alt || ''}" style="border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.1);width:100%;object-fit:${c.fit || 'cover'}">` : ''}${c.caption ? `<p style="margin-top:12px;color:#6b7280;font-size:.9rem">${c.caption}</p>` : ''}</div></section>\n`;
        break;
      case 'video':
        html += `<section style="padding:40px 24px"><div class="container" style="max-width:900px">${c.url ? `<video src="${c.url}" controls ${c.poster ? `poster="${c.poster}"` : ''} style="width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.1)"></video>` : ''}</div></section>\n`;
        break;
      case 'features':
        html += `<section style="padding:64px 24px"><div class="container"><div class="grid-3">${(c.items || []).map((item: any) => `<div style="text-align:center;padding:32px 20px;border-radius:16px;border:1px solid #e5e7eb;background:#fff"><span style="font-size:2.5rem;display:block;margin-bottom:12px">${item.icon || '✨'}</span><h3 style="font-weight:600;font-size:1.2rem;margin-bottom:8px">${item.title || ''}</h3><p style="color:#6b7280;font-size:.95rem">${item.description || ''}</p></div>`).join('')}</div></div></section>\n`;
        break;
      case 'testimonials':
        html += `<section style="padding:64px 24px;background:#f9fafb"><div class="container"><div class="grid-2">${(c.items || []).map((item: any) => `<div style="padding:28px;border-radius:16px;background:#fff;border:1px solid #e5e7eb;font-style:italic"><p style="margin-bottom:16px;font-size:1.05rem;line-height:1.7">"${item.text || ''}"</p><p style="font-weight:600;font-style:normal;font-size:.95rem">${item.name || ''}${item.role ? ` — ${item.role}` : ''}</p></div>`).join('')}</div></div></section>\n`;
        break;
      case 'cta':
        html += `<section style="padding:80px 24px;text-align:center;background:${config.primaryColor || '#1e40af'};color:#fff"><div class="container"><h2 style="font-size:clamp(1.5rem,4vw,2.5rem);font-weight:700;margin-bottom:12px">${c.headline || ''}</h2><p style="font-size:1.2rem;margin-bottom:32px;opacity:.9">${c.description || ''}</p><a href="${c.button_url || '#'}" class="btn" style="background:${config.accentColor || '#f59e0b'};color:#fff">${c.button_text || 'Saiba mais'}</a></div></section>\n`;
        break;
      case 'faq':
        html += `<section style="padding:64px 24px"><div class="container" style="max-width:768px">${(c.items || []).map((item: any) => `<div style="padding:20px 0;border-bottom:1px solid #e5e7eb"><h4 style="font-weight:600;font-size:1.1rem;margin-bottom:8px">${item.question || ''}</h4><p style="color:#6b7280;line-height:1.7">${item.answer || ''}</p></div>`).join('')}</div></section>\n`;
        break;
      case 'gallery':
        html += `<section style="padding:40px 24px"><div class="container"><div class="grid-3">${(c.images || []).map((url: string) => `<img src="${url}" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px">`).join('')}</div></div></section>\n`;
        break;
      case 'footer':
        html += `<footer style="padding:40px 24px;text-align:center;border-top:1px solid #e5e7eb;background:#f9fafb"><p style="font-weight:600;margin-bottom:8px">${c.company || ''}</p><p style="color:#9ca3af;font-size:.85rem">${c.copyright || ''}</p></footer>\n`;
        break;
      case 'spacer':
        html += `<div style="height:${c.height || 60}px"></div>\n`;
        break;
      case 'custom_html':
        html += c.code || '';
        break;
    }
  }

  html += `</body></html>`;
  return html;
}

export default PublicPage;
