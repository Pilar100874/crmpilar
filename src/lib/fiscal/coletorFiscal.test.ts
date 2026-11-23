import {createRequire} from 'node:module';
import {describe, expect, it} from 'vitest';
import {emissorOnline} from './saudeEmissor';
const require = createRequire(import.meta.url);
const {CUF, AUTORIZADORES, endereco} = require('../../../coletor/fiscal/webservices.js');
const {responsavelTecnico, montarNfe} = require('../../../coletor/fiscal/xml.js');
const ufs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
const tecnico = {responsavel_tecnico_cnpj:'12.345.678/0001-90',responsavel_tecnico_contato:'Equipe Fiscal',responsavel_tecnico_email:'fiscal@example.com',responsavel_tecnico_fone:'(11) 1234-5678'};
describe('Emissor fiscal do Coletor', () => {
  it('cobre todas as 27 UFs nos dois ambientes e em todos os serviços', () => {
    expect(Object.keys(CUF).sort()).toEqual(ufs);
    expect(Object.keys(AUTORIZADORES).sort()).toEqual(ufs);
    for (const uf of ufs) for (const ambiente of ['homologacao','producao']) for (const servico of ['autorizacao','retAutorizacao','consulta','status','evento','inutilizacao','distribuicao','evento_an']) {
      const url = new URL(endereco(uf,ambiente,servico));
      expect(url.protocol).toBe('https:');
      expect(url.pathname.length).toBeGreaterThan(4);
    }
  });
  it('encaminha CE à SVRS e MA à SVAN, sem usar SVRS para estados com servidor próprio', () => {
    expect(new URL(endereco('CE','producao','autorizacao')).hostname).toBe('nfe.svrs.rs.gov.br');
    expect(new URL(endereco('MA','producao','autorizacao')).hostname).toBe('www.sefazvirtual.fazenda.gov.br');
    expect(new URL(endereco('BA','producao','autorizacao')).hostname).toBe('nfe.sefaz.ba.gov.br');
    expect(new URL(endereco('AM','homologacao','consulta')).pathname).toBe('/services2/services/NfeConsulta4');
  });
  it('não encaminha UF ou ambiente inválido a um servidor padrão', () => {
    expect(() => endereco('XX','producao','status')).toThrow('UF inválida');
    expect(() => endereco('SP','teste','status')).toThrow('Ambiente fiscal inválido');
  });
  it('só considera conectado o módulo fiscal com comunicação nos últimos 2 minutos', () => {
    const agora = Date.parse('2026-11-23T14:00:00Z');
    expect(emissorOnline('2026-11-23T13:58:01Z',agora)).toBe(true);
    expect(emissorOnline('2026-11-23T13:58:00Z',agora)).toBe(false);
    expect(emissorOnline(null,agora)).toBe(false);
    expect(emissorOnline('inválido',agora)).toBe(false);
    expect(emissorOnline('2026-11-23T14:01:00Z',agora)).toBe(false);
  });
  it('responsável técnico incompleto impede gerar informação fiscal parcial', () => {
    expect(responsavelTecnico({})).toBe('');
    expect(() => responsavelTecnico({...tecnico,responsavel_tecnico_email:null})).toThrow('Complete');
    expect(responsavelTecnico(tecnico)).toContain('<CNPJ>12345678000190</CNPJ>');
    expect(responsavelTecnico(tecnico)).toContain('<fone>1112345678</fone>');
  });
  it('inclui o responsável da unidade no XML completo, antes da assinatura', async () => {
    const op = {ambiente:'homologacao',unidade:{...tecnico,uf:'SP',cnpj:'12345678000190',nome:'Filial',cep:'01001000',logradouro:'Rua A',numero:'1',bairro:'Centro',cidade:'São Paulo',inscricao_estadual:'123456789',crt:'1'},destinatario:{estado:'SP',cnpj:'12345678000190',nome:'Cliente',cep:'01001000',endereco:'Rua B',cidade:'São Paulo'},nota:{id:'teste',serie:1,numero:1,dados_emissao:{pagamentos:[{meio:'90',valor:0}]},notas_fiscais_itens:[{descricao:'Produto',quantidade:1,valor_unitario:10,unidade:'UN',ncm:'39232190',cfop:'5101',tributacao:{icms:{csosn:'102'},pis:{cst:'07'},cofins:{cst:'07'}}}]}};
    const {xml} = await montarNfe(op,async () => '3550308');
    expect(xml).toContain('<infRespTec><CNPJ>12345678000190</CNPJ><xContato>Equipe Fiscal</xContato><email>fiscal@example.com</email><fone>1112345678</fone></infRespTec></infNFe>');
  });
});