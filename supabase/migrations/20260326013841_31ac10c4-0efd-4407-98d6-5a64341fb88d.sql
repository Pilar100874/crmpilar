UPDATE chat_agents 
SET regras_busca_personalizada = REPLACE(
  REPLACE(
    regras_busca_personalizada,
    '- **Para produtos exatos:** "Exato"',
    '- **Para produtos exatos:** "Nenhuma"'
  ),
  '→ Diferença: "Exato"',
  '→ Diferença: "Nenhuma"'
)
WHERE id = '25706f5c-d715-4338-a2db-a542e778e90e'