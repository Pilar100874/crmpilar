# Emissor NF-e próprio dentro do Coletor

## Objetivo
Emitir NF-e pelo próprio sistema, sem o Focus. O Coletor Desktop ganha um módulo **Fiscal**, que conversa direto com a SEFAZ usando o certificado A1 da unidade.

## Por que no Coletor
A SEFAZ exige conexão com o certificado digital do emitente (TLS mútuo). O Coletor roda em Node/Electron na rede da empresa e faz isso de forma nativa. As funções do servidor na nuvem não garantem esse tipo de conexão. Assim, o CRM prepara e guarda as notas, e o Coletor transmite.

```text
CRM (Nova NF-e, eventos) -> fila fiscal_operacoes -> Coletor/Fiscal -> SEFAZ
                         <- resultado, XML, protocolo <-
```

## O que será construído
1. **Módulo Fiscal no Coletor** (`coletor/fiscal/`), com chave liga/desliga na configuração, como Voz e Câmeras.
   - Busca as operações pendentes da empresa (emitir, consultar, cancelar, CC-e, inutilizar, distribuição DF-e, manifestar, status do serviço).
   - Baixa o certificado A1 e a senha por um canal protegido, usando a chave do app. Nada fica gravado em disco sem criptografia.
2. **Gerador de XML NF-e 4.00**: identificação, emitente, destinatário, itens, tributos vindos do Systax (ICMS/ST/FCP/DIFAL, IPI, PIS, COFINS e grupos IBS/CBS quando o Systax os informar), transporte, pagamento, duplicatas e informações adicionais. Inclui a chave de acesso com dígito verificador.
3. **Assinatura digital** (XMLDSig, RSA-SHA1/C14N, como a SEFAZ exige) com o A1 e validação contra os schemas oficiais (XSD do pacote vigente, incluído no Coletor).
4. **Webservices SOAP** por UF e ambiente: autorização síncrona, consulta de recibo e protocolo, eventos (cancelamento, CC-e, manifestação), inutilização, status do serviço e distribuição DF-e com controle de NSU e espera mínima. Usa a tabela oficial de endereços, incluindo SVRS/SVAN.
5. **DANFE em PDF** gerado a partir do XML autorizado, com marca "sem valor fiscal" em homologação.
6. **Retorno ao CRM** pela função `fiscal-engine`, que muda de papel: deixa de chamar um serviço externo e passa a administrar a fila e receber os resultados assinados pelo Coletor. A trava de produção continua até haver uma autorização real em homologação.
7. **Remoção do Focus**, só depois que a homologação passar: sai a função `nfe-focus`, a tela de configuração Focus e as rotas e botões "Integração Focus". Os registros já emitidos continuam consultáveis.

## Ordem de entrega
1. Fila e retorno no CRM. Módulo Fiscal no Coletor com status do serviço SEFAZ (primeiro teste real do certificado).
2. XML, assinatura, XSD e autorização em homologação, com consulta e DANFE.
3. Eventos, inutilização, DF-e e manifestação.
4. Remover o Focus e publicar uma nova versão do Coletor (Windows/Mac/Linux).

## Dependências que só você tem
- Certificado A1 válido de uma unidade cadastrada, e a unidade habilitada para homologação na SEFAZ do estado.
- Um computador com o Coletor ligado na empresa: as notas só saem enquanto ele estiver ligado.
- Credenciais do Systax ativas, já que os tributos vêm dele.

## Riscos
- Os webservices e as regras de validação da SEFAZ mudam por nota técnica, então o módulo vai precisar de atualizações periódicas.
- Até a homologação passar, desligar o Focus deixaria a empresa sem emissão. Por isso a remoção é a última etapa.
