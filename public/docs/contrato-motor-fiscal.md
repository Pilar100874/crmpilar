# Contrato Pilar Fiscal v1

Este documento é um contrato de integração, não um motor de emissão implantado.
O serviço deve ser executado numa infraestrutura externa com bibliotecas fiscais mantidas e acesso TLS aos webservices oficiais SEFAZ.

## Transporte e segurança

- Endpoint: `POST /v1/fiscal` no domínio HTTPS configurado.
- Autenticação: cabeçalho Bearer com token da empresa; nunca registrar token, PFX ou senha.
- Chave de idempotência: cabeçalho `Idempotency-Key` e propriedade `idempotencia`; persistir a chave e o resultado. Repetir uma emissão não pode gerar nova NF-e.
- Corpo: `acao`, `ambiente`, `unidade`, `nota`, `serie`, parâmetros da operação e, quando necessário, `certificado: {pfx_base64, senha}`.
- O certificado é enviado somente pelo serviço protegido. Nunca enviar credenciais ao navegador, respostas ou logs.
- Usar versão vigente dos schemas, tabelas de endpoints por UF/ambiente e validações de reforma tributária; respeitar grupos e vigências aplicáveis. Não inventar alíquotas: Systax é a fonte tributária.

## Ações obrigatórias

| Ação | Entrada | Resultado |
|---|---|---|
| testar | ambiente | contrato, capacidades e prova de homologação |
| emitir | nota com itens/tributos, unidade, certificado, numeração reservada | situação, chave, protocolo, status_sefaz, mensagem, XML processado |
| consultar | nota/chave/referência idempotente | situação oficial atual |
| arquivo | nota, tipo xml ou danfe | bytes, Content-Type application/xml ou application/pdf |
| cancelamento | nota, justificativa | aceito, protocolo, status_sefaz, mensagem, XML do evento |
| carta_correcao | nota, texto | aceito, protocolo, sequência e XML do evento |
| inutilizacao | unidade, série, início/fim, justificativa | aceito, protocolo e XML |
| distribuir | unidade, certificado, último NSU | documentos, ultimo_nsu, max_nsu, status_sefaz e aguardar_segundos |
| manifestar | unidade, chave, evento, justificativa quando aplicável | aceito, protocolo, status_sefaz e XML completo se obtido |
| servico | unidade, ambiente | status_sefaz e mensagem do serviço |

## Confirmação do contrato

`testar` responde:

```json
{
  "contrato": "pilar-fiscal-v1",
  "capacidades": {"xsd": true, "assinatura_a1": true, "transmissao_sefaz": true},
  "homologacao": {"autorizada": false},
  "mensagem": "Situação real da implantação"
}
```

A homologação deve trazer chave de 44 dígitos e protocolo de uma autorização REAL no ambiente de testes. Não fornecer valores fictícios. Sem essa prova o CRM mantém produção bloqueada.

## Emissão

1. Validar emitente, destinatário, valores, pagamentos, referências, regras tributárias, certificado e ambiente.
2. Gerar chave e XML de NF-e 4.00 com grupos aplicáveis, assinar com o certificado A1 e validar XSD vigente.
3. Transmitir e consultar recibos em fila com retries limitados e backoff. Não repetir autorização após timeout: consultar primeiro pela chave/referência.
4. Gravar XML assinado/processado, recibos, protocolos e eventos, sem segredos.
5. Produzir DANFE a partir do XML autorizado; a prévia não autorizada deve conter indicação explícita.

Situações: `processando`, `na_fila`, `autorizada`, `rejeitada`, `cancelada`, `erro_comunicacao`, `desconhecida`, `contingencia`. Autorização exige chave e protocolo; comunicação falha não significa rejeição. Contingência exige procedimento oficial aplicável e posterior regularização, nunca autorização simulada.

## DF-e

Documento: `nsu` com 15 dígitos, `chave`, `esquema`, `resumo` (emitente_nome, documento, valor_total, emissão) e `xml` quando disponível. Descompactar docZip e conservar schema. NSU é independente por unidade/ambiente. Respeitar bloqueios SEFAZ, limitar consultas e avançar NSU somente após persistir os documentos. Para ausência de documentos ou consumo indevido o CRM aguarda no mínimo uma hora.

## Eventos e financeiro

CC-e não pode corrigir dados vedados pela legislação; sequências e prazos devem ser validados pelo serviço. Cancelamento só é aplicado localmente após retorno oficial aceito com protocolo. Títulos de parcela são registros pendentes de aprovação; não representam pagamento ou baixa bancária. Estoque de saída é movimentado uma única vez após autorização em PRODUÇÃO. Entradas são conferidas e lançadas por ação explícita.

## Homologação obrigatória

Testar certificado inválido/vencido, autorização/rejeição, timeout e consulta posterior, duplicidade, cancelamento, CC-e, inutilização, distribuição/manifestação e DANFE/XML. O CRM não substitui responsabilidade fiscal nem apuração de obrigações acessórias.
